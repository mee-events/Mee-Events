import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/api/api_client.dart';
import 'package:mee_events/api/mobile_api.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/planning_context/planning_context_provider.dart';
import 'package:mee_events/features/customer/planning_context/planning_context_store.dart';
import 'package:mee_events/features/customer/screens/enquiry_checkout_screen.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/theme/theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

final _checkoutActiveUserProvider = StateProvider<String?>(
  (ref) => 'customer-a',
);

class _DelayedPlanningContextStore extends PlanningContextStore {
  _DelayedPlanningContextStore({
    required String userId,
    required this.loadResult,
  }) : super(userId: userId);

  final Future<CustomerPlanningContext> loadResult;

  @override
  Future<CustomerPlanningContext> load({required DateTime today}) => loadResult;
}

class _CatalogApi extends MobileApi {
  _CatalogApi()
    : super(apiClient: ApiClient(baseUrl: 'http://127.0.0.1.invalid'));

  @override
  Future<List<CatalogItem>> listEventTypes() async => const [
    CatalogItem(code: 'birthday', displayName: 'Birthday', displayOrder: 1),
  ];

  @override
  Future<List<CatalogItem>> listServiceCategories() async => const [];
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));

  Future<void> pumpCheckout(
    WidgetTester tester, {
    required CustomerPlanningContext remembered,
    String? initialLocation,
    DateTime? initialEventDate,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final store = PlanningContextStore(
      preferences: prefs,
      userId: 'checkout-customer',
    );
    await store.save(remembered);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          mobileApiProvider.overrideWithValue(_CatalogApi()),
          planningContextStoreProvider.overrideWithValue(store),
          planningContextClockProvider.overrideWithValue(
            () => DateTime(2026, 9, 7),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: EnquiryCheckoutScreen(
            initialEventTypeCode: 'birthday',
            initialLocation: initialLocation,
            initialEventDate: initialEventDate,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(ElevatedButton, 'Next'));
    await tester.pumpAndSettle();
  }

  Finder locationTextField() => find.descendant(
    of: find.byKey(const Key('enquiry-checkout-location')),
    matching: find.byType(TextField),
  );

  Future<ProviderContainer> pumpDelayedCheckout(
    WidgetTester tester, {
    required _DelayedPlanningContextStore accountAStore,
    PlanningContextStore? accountBStore,
  }) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          mobileApiProvider.overrideWithValue(_CatalogApi()),
          sessionUserIdProvider.overrideWith(
            (ref) => ref.watch(_checkoutActiveUserProvider),
          ),
          planningContextStoreProvider.overrideWith((ref) {
            final userId = ref.watch(sessionUserIdProvider);
            return userId == 'customer-a'
                ? accountAStore
                : accountBStore ?? PlanningContextStore(userId: userId);
          }),
          planningContextClockProvider.overrideWithValue(
            () => DateTime(2026, 9, 7),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const EnquiryCheckoutScreen(initialEventTypeCode: 'birthday'),
        ),
      ),
    );
    final container = ProviderScope.containerOf(
      tester.element(find.byType(EnquiryCheckoutScreen)),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(ElevatedButton, 'Next'));
    await tester.pumpAndSettle();
    return container;
  }

  testWidgets('remembered Home context pre-fills existing checkout fields', (
    tester,
  ) async {
    await pumpCheckout(
      tester,
      remembered: CustomerPlanningContext(
        area: 'Gachibowli',
        eventDate: DateTime(2026, 11, 15),
      ),
    );

    expect(locationTextField(), findsOneWidget);
    expect(
      tester.widget<TextField>(locationTextField()).controller?.text,
      'Gachibowli, Hyderabad',
    );
    expect(find.text('Nov 15, 2026'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('latest live context pre-fills checkout without store restart', (
    tester,
  ) async {
    const launcherKey = Key('open-live-context-checkout');
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          mobileApiProvider.overrideWithValue(_CatalogApi()),
          planningContextStoreProvider.overrideWithValue(
            PlanningContextStore(),
          ),
          planningContextClockProvider.overrideWithValue(
            () => DateTime(2026, 9, 7),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: Builder(
            builder: (context) => Scaffold(
              body: Center(
                child: ElevatedButton(
                  key: launcherKey,
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const EnquiryCheckoutScreen(
                        initialEventTypeCode: 'birthday',
                      ),
                    ),
                  ),
                  child: const Text('Open checkout'),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    final container = ProviderScope.containerOf(
      tester.element(find.byKey(launcherKey)),
    );
    final notifier = container.read(planningContextProvider.notifier);
    expect((await notifier.ready).area, isEmpty);
    expect(
      await notifier.save(
        area: 'Gachibowli',
        eventDate: DateTime(2026, 11, 15),
      ),
      PlanningContextSaveResult.sessionOnly,
    );

    await tester.tap(find.byKey(launcherKey));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(ElevatedButton, 'Next'));
    await tester.pumpAndSettle();

    expect(
      tester.widget<TextField>(locationTextField()).controller?.text,
      'Gachibowli, Hyderabad',
    );
    expect(find.text('Nov 15, 2026'), findsOneWidget);

    await tester.enterText(locationTextField(), 'Customer edited venue');
    await tester.tap(find.byKey(const Key('enquiry-checkout-clear-date')));
    await tester.pump();

    expect(
      tester.widget<TextField>(locationTextField()).controller?.text,
      'Customer edited venue',
    );
    expect(find.text('Nov 15, 2026'), findsNothing);
    expect(find.text('Event date'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('customer can edit or clear pre-filled checkout values', (
    tester,
  ) async {
    await pumpCheckout(
      tester,
      remembered: CustomerPlanningContext(
        area: 'Gachibowli',
        eventDate: DateTime(2026, 11, 15),
      ),
    );

    await tester.enterText(locationTextField(), 'My venue, Hyderabad');
    await tester.tap(find.byKey(const Key('enquiry-checkout-clear-date')));
    await tester.pump();

    expect(
      tester.widget<TextField>(locationTextField()).controller?.text,
      'My venue, Hyderabad',
    );
    expect(find.text('Nov 15, 2026'), findsNothing);
    expect(find.text('Event date'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('explicit checkout values are not overwritten by Home context', (
    tester,
  ) async {
    await pumpCheckout(
      tester,
      remembered: CustomerPlanningContext(
        area: 'Gachibowli',
        eventDate: DateTime(2026, 11, 15),
      ),
      initialLocation: 'Explicit venue, Hyderabad',
      initialEventDate: DateTime(2027, 1, 20),
    );

    expect(
      tester.widget<TextField>(locationTextField()).controller?.text,
      'Explicit venue, Hyderabad',
    );
    expect(find.text('Jan 20, 2027'), findsOneWidget);
    expect(find.text('Nov 15, 2026'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('old account delayed load is discarded after account switch', (
    tester,
  ) async {
    final accountALoad = Completer<CustomerPlanningContext>();
    final accountAStore = _DelayedPlanningContextStore(
      userId: 'customer-a',
      loadResult: accountALoad.future,
    );
    final prefs = await SharedPreferences.getInstance();
    final accountBStore = PlanningContextStore(
      preferences: prefs,
      userId: 'customer-b',
    );
    final container = await pumpDelayedCheckout(
      tester,
      accountAStore: accountAStore,
      accountBStore: accountBStore,
    );

    container.read(_checkoutActiveUserProvider.notifier).state = 'customer-b';
    await tester.pump();
    accountALoad.complete(
      CustomerPlanningContext(
        area: 'Customer A private area',
        eventDate: DateTime(2026, 11, 15),
      ),
    );
    await tester.pumpAndSettle();

    expect(tester.widget<TextField>(locationTextField()).controller?.text, '');
    expect(find.textContaining('Customer A private area'), findsNothing);
    expect(find.text('Nov 15, 2026'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('customer edit before delayed load is not overwritten', (
    tester,
  ) async {
    final delayedLoad = Completer<CustomerPlanningContext>();
    final store = _DelayedPlanningContextStore(
      userId: 'customer-a',
      loadResult: delayedLoad.future,
    );
    await pumpDelayedCheckout(tester, accountAStore: store);

    await tester.enterText(locationTextField(), 'Customer chosen venue');
    delayedLoad.complete(
      CustomerPlanningContext(
        area: 'Remembered area',
        eventDate: DateTime(2026, 12, 20),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      tester.widget<TextField>(locationTextField()).controller?.text,
      'Customer chosen venue',
    );
    expect(find.textContaining('Remembered area'), findsNothing);
    expect(find.text('Dec 20, 2026'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
