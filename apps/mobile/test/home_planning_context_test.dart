import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/customer/planning_context/planning_context_provider.dart';
import 'package:mee_events/features/customer/planning_context/planning_context_store.dart';
import 'package:mee_events/features/customer/widgets/home/home_planning_context.dart';
import 'package:mee_events/theme/theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));

  Future<void> pumpContextControl(
    WidgetTester tester, {
    CustomerPlanningContext context = const CustomerPlanningContext(),
    DateTime? today,
    Future<PlanningContextSaveResult> Function(String, DateTime?)? onSave,
    Size size = const Size(390, 844),
    double textScale = 1,
  }) async {
    tester.view.physicalSize = Size(size.width * 3, size.height * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: MediaQuery(
          data: MediaQueryData(
            size: size,
            textScaler: TextScaler.linear(textScale),
          ),
          child: Scaffold(
            body: Builder(
              builder: (sheetContext) => Align(
                alignment: Alignment.topCenter,
                child: HomePlanningContextControl(
                  planningContext: context,
                  onTap: () => showMeBottomSheet<void>(
                    context: sheetContext,
                    builder: (_) => HomePlanningContextSheet(
                      initialContext: context,
                      today: today ?? DateTime(2026, 9, 7),
                      onSave:
                          onSave ??
                          (_, _) async => PlanningContextSaveResult.persisted,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('default control is compact, truthful, and accessible', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    await pumpContextControl(tester);

    expect(find.text('Hyderabad · Add event date'), findsOneWidget);
    expect(
      find.bySemanticsLabel(
        'Planning context. Hyderabad. No event date selected. Edit planning context',
      ),
      findsOneWidget,
    );
    final size = tester.getSize(
      find.byKey(HomePlanningContextControl.controlKey),
    );
    expect(size.height, greaterThanOrEqualTo(44));
    expect(size.width, lessThanOrEqualTo(390));
    expect(tester.takeException(), isNull);
    semantics.dispose();
  });

  testWidgets('sheet selects an exact future date and prevents past dates', (
    tester,
  ) async {
    String? savedArea;
    DateTime? savedDate;
    final today = DateTime(2026, 9, 7);
    await pumpContextControl(
      tester,
      today: today,
      onSave: (area, eventDate) async {
        savedArea = area;
        savedDate = eventDate;
        return PlanningContextSaveResult.persisted;
      },
    );

    await tester.tap(find.byKey(HomePlanningContextControl.controlKey));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(HomePlanningContextSheet.areaFieldKey),
      'Gachibowli',
    );
    await tester.tap(find.byKey(HomePlanningContextSheet.dateFieldKey));
    await tester.pumpAndSettle();

    final picker = tester.widget<CalendarDatePicker>(
      find.byType(CalendarDatePicker),
    );
    expect(picker.firstDate, today);
    await tester.tap(find.text('15').last);
    await tester.tap(find.text('OK'));
    await tester.pumpAndSettle();
    expect(find.text('15 Sep 2026'), findsOneWidget);

    await tester.tap(find.byKey(HomePlanningContextSheet.saveKey));
    await tester.pumpAndSettle();
    expect(savedArea, 'Gachibowli');
    expect(savedDate, DateTime(2026, 9, 15));
    expect(tester.takeException(), isNull);
  });

  testWidgets('sheet clears values and makes no filtering claim', (
    tester,
  ) async {
    String? savedArea;
    DateTime? savedDate = DateTime(2000);
    await pumpContextControl(
      tester,
      context: CustomerPlanningContext(
        area: 'Gachibowli',
        eventDate: DateTime(2026, 11, 15),
      ),
      onSave: (area, eventDate) async {
        savedArea = area;
        savedDate = eventDate;
        return PlanningContextSaveResult.persisted;
      },
    );

    await tester.tap(find.byKey(HomePlanningContextControl.controlKey));
    await tester.pumpAndSettle();
    expect(
      find.text(
        'This helps prepare your enquiry. It does not check live vendor availability or filter services, prices, or recommendations.',
      ),
      findsOneWidget,
    );
    await tester.tap(find.byKey(HomePlanningContextSheet.clearAreaKey));
    await tester.tap(find.byKey(HomePlanningContextSheet.clearDateKey));
    await tester.tap(find.byKey(HomePlanningContextSheet.saveKey));
    await tester.pumpAndSettle();

    expect(savedArea, isEmpty);
    expect(savedDate, isNull);
    expect(tester.takeException(), isNull);
  });

  testWidgets('guest save explains expected session-only behavior', (
    tester,
  ) async {
    final notifier = PlanningContextNotifier(
      PlanningContextStore(),
      clock: () => DateTime(2026, 9, 7),
    );
    addTearDown(notifier.dispose);
    await pumpContextControl(
      tester,
      onSave: (area, eventDate) =>
          notifier.save(area: area, eventDate: eventDate),
    );

    await tester.tap(find.byKey(HomePlanningContextControl.controlKey));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(HomePlanningContextSheet.areaFieldKey),
      'Gachibowli',
    );
    await tester.tap(find.byKey(HomePlanningContextSheet.saveKey));
    await tester.pumpAndSettle();

    expect(find.byKey(HomePlanningContextSheet.sheetKey), findsNothing);
    expect(
      find.text(HomePlanningContextSheet.guestSessionMessage),
      findsOneWidget,
    );
    expect(notifier.state.area, 'Gachibowli');
    expect(tester.takeException(), isNull);
  });

  testWidgets('failed persistence stays open with safe retry messaging', (
    tester,
  ) async {
    var calls = 0;
    final notifier = PlanningContextNotifier(
      PlanningContextStore(
        userId: 'retry-customer',
        writer: (_, _) async {
          calls += 1;
          return calls > 1;
        },
      ),
      clock: () => DateTime(2026, 9, 7),
    );
    addTearDown(notifier.dispose);
    await pumpContextControl(
      tester,
      onSave: (area, eventDate) =>
          notifier.save(area: area, eventDate: eventDate),
    );

    await tester.tap(find.byKey(HomePlanningContextControl.controlKey));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(HomePlanningContextSheet.areaFieldKey),
      'Kondapur',
    );
    await tester.tap(find.byKey(HomePlanningContextSheet.saveKey));
    await tester.pumpAndSettle();

    expect(find.byKey(HomePlanningContextSheet.sheetKey), findsOneWidget);
    expect(
      find.byKey(HomePlanningContextSheet.persistenceMessageKey),
      findsOneWidget,
    );
    expect(
      find.text(HomePlanningContextSheet.persistenceFailureMessage),
      findsOneWidget,
    );
    expect(calls, 1);
    expect(notifier.state.area, 'Kondapur');

    await tester.tap(find.byKey(HomePlanningContextSheet.saveKey));
    await tester.pumpAndSettle();

    expect(calls, 2);
    expect(find.byKey(HomePlanningContextSheet.sheetKey), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('thrown persistence error never exposes technical details', (
    tester,
  ) async {
    final notifier = PlanningContextNotifier(
      PlanningContextStore(
        userId: 'throwing-customer',
        writer: (_, _) => throw StateError('/private/device/preferences'),
      ),
      clock: () => DateTime(2026, 9, 7),
    );
    addTearDown(notifier.dispose);
    await pumpContextControl(
      tester,
      onSave: (area, eventDate) =>
          notifier.save(area: area, eventDate: eventDate),
    );

    await tester.tap(find.byKey(HomePlanningContextControl.controlKey));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(HomePlanningContextSheet.saveKey));
    await tester.pumpAndSettle();

    expect(
      find.text(HomePlanningContextSheet.persistenceFailureMessage),
      findsOneWidget,
    );
    expect(find.textContaining('/private/device'), findsNothing);
    expect(find.textContaining('StateError'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('sheet and control support narrow screens and large text', (
    tester,
  ) async {
    await pumpContextControl(
      tester,
      context: CustomerPlanningContext(
        area: 'Gachibowli',
        eventDate: DateTime(2026, 11, 15),
      ),
      size: const Size(320, 844),
      textScale: 2,
    );

    expect(find.text('Gachibowli, Hyderabad · 15 Nov'), findsOneWidget);
    expect(
      tester.getSize(find.byKey(HomePlanningContextControl.controlKey)).width,
      lessThanOrEqualTo(320),
    );
    await tester.tap(find.byKey(HomePlanningContextControl.controlKey));
    await tester.pumpAndSettle();

    for (final key in [
      HomePlanningContextSheet.clearAreaKey,
      HomePlanningContextSheet.clearDateKey,
      HomePlanningContextSheet.saveKey,
    ]) {
      final target = tester.getSize(find.byKey(key));
      expect(target.width, greaterThanOrEqualTo(44));
      expect(target.height, greaterThanOrEqualTo(44));
    }
    expect(find.textContaining('currently serves Hyderabad'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
