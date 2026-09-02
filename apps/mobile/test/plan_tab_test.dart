import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/screens/login_screen.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/navigation/customer_tab.dart';
import 'package:mee_events/features/customer/plan/event_plan_provider.dart';
import 'package:mee_events/features/customer/plan/event_plan_store.dart';
import 'package:mee_events/features/customer/providers/explore_intent_provider.dart';
import 'package:mee_events/features/customer/screens/enquiry_checkout_screen.dart';
import 'package:mee_events/features/customer/screens/plan_tab.dart';
import 'package:mee_events/features/customer/screens/product_detail_screen.dart';
import 'package:mee_events/models/auth_session.dart';
import 'package:mee_events/theme/theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _CustomEventPlanStore extends EventPlanStore {
  _CustomEventPlanStore({
    required super.prefs,
    super.userId = 'plan-test-user',
    this.hangLoad = false,
    this.loadError,
  });

  final bool hangLoad;
  final Object? loadError;
  final Completer<void> loadGate = Completer<void>();

  @override
  Future<List<EventPlanItem>> load() async {
    if (hangLoad) {
      await loadGate.future;
    }
    if (loadError != null) {
      throw loadError!;
    }
    return super.load();
  }
}

class _MockSessionNotifier extends SessionNotifier {
  _MockSessionNotifier(AuthSession? session)
    : super(
        (_) => throw UnimplementedError(),
        store: MemoryAuthSessionStore(),
      ) {
    state = session;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const testUserId = 'plan-test-user';

  const itemA = EventPlanItem(
    productCode: 'photo.A1',
    displayName: 'Cinematic Photography Package',
    serviceCode: 'photography',
    coverImageUrl: 'assets/images/categories/wedding.jpg',
  );
  const itemB = EventPlanItem(
    productCode: 'food.B1',
    displayName: 'Royal Buffet Catering',
    serviceCode: 'catering',
  );
  const itemC = EventPlanItem(
    productCode: 'decor.C1',
    displayName: 'Grand Floral Mandap Setup',
    serviceCode: 'decoration',
  );

  final mockSession = AuthSession(
    accessToken: 'access-token',
    refreshToken: 'refresh-token-value-at-least-32-chars',
    accessTokenExpiresInSeconds: 900,
    accessTokenExpiresAt: DateTime.utc(2099),
    userId: testUserId,
    mobileNumber: '+919876543210',
    lastActiveRole: 'customer',
  );

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  Future<void> pumpPlan(
    WidgetTester tester, {
    Size size = const Size(390, 844),
    double textScale = 1.0,
    List<EventPlanItem>? initialItems,
    bool hangLoad = false,
    Object? loadError,
    bool signedOut = false,
    ValueChanged<CustomerTab>? onNavigate,
    List<Override> extraOverrides = const [],
  }) async {
    final prefsMap = <String, Object>{};
    if (initialItems != null) {
      prefsMap[eventPlanStorageKey(testUserId)] = [
        for (final item in initialItems) jsonEncode(item.toJson()),
      ];
    }
    SharedPreferences.setMockInitialValues(prefsMap);
    final prefs = await SharedPreferences.getInstance();

    tester.view.physicalSize = Size(size.width * 3, size.height * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final store = _CustomEventPlanStore(
      prefs: prefs,
      userId: testUserId,
      hangLoad: hangLoad,
      loadError: loadError,
    );

    final widget = ProviderScope(
      overrides: [
        sessionUserIdProvider.overrideWithValue(testUserId),
        sessionProvider.overrideWith(
          (ref) => _MockSessionNotifier(signedOut ? null : mockSession),
        ),
        eventPlanStoreProvider.overrideWithValue(store),
        ...extraOverrides,
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        home: MediaQuery(
          data: MediaQueryData(
            size: size,
            textScaler: TextScaler.linear(textScale),
          ),
          child: PlanTab(onNavigate: onNavigate),
        ),
      ),
    );

    await tester.pumpWidget(widget);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 60));
  }

  void expectNoFlutterException(WidgetTester tester) {
    final exc = tester.takeException();
    if (exc != null) {
      if (exc is FlutterError) {
        for (final d in exc.diagnostics) {
          debugPrint(d.toStringDeep());
        }
      } else {
        debugPrint('Caught Flutter exception: $exc');
      }
    }
    expect(
      exc,
      isNull,
      reason: 'PlanTab produced an unexpected Flutter exception: $exc',
    );
  }

  testWidgets('Loading state is not collapsed into empty state', (
    tester,
  ) async {
    await pumpPlan(tester, hangLoad: true);
    expect(find.byType(ListView), findsOneWidget);
    expect(find.byType(MeSkeleton), findsWidgets);
    expect(find.text('Your Event Plan is empty'), findsNothing);
    expect(find.text('Continue to enquiry'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets(
    'Initial error shows safe retry state without raw exception text',
    (tester) async {
      await pumpPlan(tester, loadError: Exception('internal-storage-crash'));
      expect(find.text('Event Plan unavailable'), findsOneWidget);
      expect(find.text('Please try again.'), findsOneWidget);
      expect(find.textContaining('internal-storage-crash'), findsNothing);
      expect(find.text('Retry'), findsOneWidget);
      expect(find.text('Continue to enquiry'), findsNothing);
      expectNoFlutterException(tester);
    },
  );

  testWidgets('Empty plan displays explanation and browse actions', (
    tester,
  ) async {
    await pumpPlan(tester, initialItems: const []);

    expect(find.text('Your Event Plan is empty'), findsOneWidget);
    expect(
      find.text(
        'Browse services and add options to your plan before sending a single enquiry.',
      ),
      findsOneWidget,
    );
    expect(find.text('Browse services'), findsOneWidget);
    expect(find.text('Browse occasions'), findsOneWidget);
    expect(find.text('Continue to enquiry'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets(
    'Empty plan Browse services selects Explore with Services intent',
    (tester) async {
      CustomerTab? navigatedTab;
      await pumpPlan(
        tester,
        initialItems: const [],
        onNavigate: (tab) => navigatedTab = tab,
      );

      await tester.tap(find.text('Browse services'));
      await tester.pump();

      expect(navigatedTab, CustomerTab.explore);
      final container = ProviderScope.containerOf(
        tester.element(find.byType(PlanTab)),
      );
      expect(container.read(exploreIntentProvider), 1);
      expectNoFlutterException(tester);
    },
  );

  testWidgets(
    'Empty plan Browse occasions selects Explore with Occasions intent',
    (tester) async {
      CustomerTab? navigatedTab;
      await pumpPlan(
        tester,
        initialItems: const [],
        onNavigate: (tab) => navigatedTab = tab,
      );

      await tester.tap(find.text('Browse occasions'));
      await tester.pump();

      expect(navigatedTab, CustomerTab.explore);
      final container = ProviderScope.containerOf(
        tester.element(find.byType(PlanTab)),
      );
      expect(container.read(exploreIntentProvider), 0);
      expectNoFlutterException(tester);
    },
  );

  testWidgets('Single item displays singular count text', (tester) async {
    await pumpPlan(tester, initialItems: const [itemA]);

    expect(find.text('Event Plan'), findsOneWidget);
    expect(find.text('1 item in your plan'), findsOneWidget);
    expect(find.text('1 item'), findsOneWidget);
    expect(find.text('Cinematic Photography Package'), findsOneWidget);
    expect(find.text('Continue to enquiry'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Multiple items display plural count text', (tester) async {
    await pumpPlan(tester, initialItems: const [itemA, itemB, itemC]);

    expect(find.text('Event Plan'), findsOneWidget);
    expect(find.text('3 items in your plan'), findsOneWidget);
    expect(find.text('3 items'), findsOneWidget);
    expect(find.text('Cinematic Photography Package'), findsOneWidget);
    expect(find.text('Royal Buffet Catering'), findsOneWidget);
    expect(find.text('Grand Floral Mandap Setup'), findsOneWidget);
    expect(find.text('Continue to enquiry'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Tapping product card opens ProductDetailScreen exactly once', (
    tester,
  ) async {
    await pumpPlan(tester, initialItems: const [itemA]);

    await tester.tap(find.text('Cinematic Photography Package'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.byType(ProductDetailScreen), findsOneWidget);
    final detail = tester.widget<ProductDetailScreen>(
      find.byType(ProductDetailScreen),
    );
    expect(detail.code, 'photo.A1');
    expect(detail.title, 'Cinematic Photography Package');
    expect(detail.serviceCode, 'photography');
    expect(detail.imageUrl, 'assets/images/categories/wedding.jpg');
    expectNoFlutterException(tester);
  });

  testWidgets('Remove button removes the specific item', (tester) async {
    final semantics = tester.ensureSemantics();
    try {
      await pumpPlan(tester, initialItems: const [itemA, itemB]);

      expect(find.text('Cinematic Photography Package'), findsOneWidget);
      expect(find.text('Royal Buffet Catering'), findsOneWidget);

      final removeFinder = find.bySemanticsLabel(
        'Remove Cinematic Photography Package from Event Plan',
      );
      expect(removeFinder, findsOneWidget);

      await tester.tap(removeFinder);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('Cinematic Photography Package'), findsNothing);
      expect(find.text('Royal Buffet Catering'), findsOneWidget);
      expect(find.text('1 item in your plan'), findsOneWidget);
      expectNoFlutterException(tester);
    } finally {
      semantics.dispose();
    }
  });

  testWidgets('Clear plan cancellation preserves plan items', (tester) async {
    await pumpPlan(tester, initialItems: const [itemA, itemB]);

    await tester.tap(find.text('Clear plan'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('Clear Event Plan?'), findsOneWidget);
    expect(
      find.text('This will remove all items from your plan.'),
      findsOneWidget,
    );

    await tester.tap(find.text('Keep plan'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('Cinematic Photography Package'), findsOneWidget);
    expect(find.text('Royal Buffet Catering'), findsOneWidget);
    expect(find.text('2 items in your plan'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Clear plan confirmation empties the plan', (tester) async {
    await pumpPlan(tester, initialItems: const [itemA, itemB]);

    await tester.tap(find.text('Clear plan'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('Clear Event Plan?'), findsOneWidget);

    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('Clear plan'),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 80));

    expect(find.text('Your Event Plan is empty'), findsOneWidget);
    expect(find.text('Cinematic Photography Package'), findsNothing);
    expect(find.text('Royal Buffet Catering'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets(
    'Continue to enquiry opens EnquiryCheckoutScreen when logged in',
    (tester) async {
      await pumpPlan(tester, initialItems: const [itemA]);

      await tester.tap(find.text('Continue to enquiry'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.byType(EnquiryCheckoutScreen), findsOneWidget);
      expect(find.byType(LoginScreen), findsNothing);
      expectNoFlutterException(tester);
    },
  );

  testWidgets('Continue to enquiry opens LoginScreen when logged out', (
    tester,
  ) async {
    await pumpPlan(tester, initialItems: const [itemA], signedOut: true);

    await tester.tap(find.text('Continue to enquiry'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.byType(LoginScreen), findsOneWidget);
    expect(find.byType(EnquiryCheckoutScreen), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Add more services routes to Explore with Services intent', (
    tester,
  ) async {
    CustomerTab? navigatedTab;
    await pumpPlan(
      tester,
      initialItems: const [itemA],
      onNavigate: (tab) => navigatedTab = tab,
    );

    await tester.tap(find.text('Add more services'));
    await tester.pump();

    expect(navigatedTab, CustomerTab.explore);
    final container = ProviderScope.containerOf(
      tester.element(find.byType(PlanTab)),
    );
    expect(container.read(exploreIntentProvider), 1);
    expectNoFlutterException(tester);
  });

  testWidgets('No fake commercial, prices, or currency symbols appear', (
    tester,
  ) async {
    await pumpPlan(tester, initialItems: const [itemA, itemB, itemC]);

    expect(find.textContaining('₹'), findsNothing);
    expect(find.textContaining('Total:'), findsNothing);
    expect(find.textContaining('Delivery'), findsNothing);
    expect(find.textContaining('Cart'), findsNothing);
    expect(find.textContaining('Discount'), findsNothing);
    expect(find.textContaining('Checkout ₹'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Actions meet minimum 44px touch targets', (tester) async {
    final semantics = tester.ensureSemantics();
    try {
      await pumpPlan(tester, initialItems: const [itemA]);

      final ctaFinder = find.bySemanticsLabel('Continue to enquiry');
      expect(ctaFinder, findsOneWidget);
      final ctaRect = tester.getRect(ctaFinder);
      expect(ctaRect.height, greaterThanOrEqualTo(44));
      expect(ctaRect.width, greaterThanOrEqualTo(44));

      final removeFinder = find.bySemanticsLabel(
        'Remove Cinematic Photography Package from Event Plan',
      );
      expect(removeFinder, findsOneWidget);
      final removeRect = tester.getRect(removeFinder);
      expect(removeRect.height, greaterThanOrEqualTo(44));
      expect(removeRect.width, greaterThanOrEqualTo(44));

      expectNoFlutterException(tester);
    } finally {
      semantics.dispose();
    }
  });

  for (final fixture in const [
    (Size(390, 844), 1.0),
    (Size(320, 844), 1.0),
    (Size(390, 844), 1.3),
    (Size(320, 844), 1.3),
  ]) {
    testWidgets(
      'PlanTab does not overflow at ${fixture.$1.width.toInt()}x${fixture.$1.height.toInt()} text ${fixture.$2}',
      (tester) async {
        await pumpPlan(
          tester,
          size: fixture.$1,
          textScale: fixture.$2,
          initialItems: const [itemA, itemB, itemC],
        );
        expect(find.byType(PlanTab), findsOneWidget);
        expect(find.text('Event Plan'), findsOneWidget);
        expect(find.text('Continue to enquiry'), findsOneWidget);
        expectNoFlutterException(tester);
      },
    );
  }
}
