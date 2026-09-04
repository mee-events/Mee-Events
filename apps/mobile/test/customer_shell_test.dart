import 'dart:convert';
import 'dart:ui' show Tristate;

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/core/providers/catalog_provider.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/app_gateway.dart';
import 'package:mee_events/features/auth/role_switcher/role_switcher_sheet.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/favorites/favorites_provider.dart';
import 'package:mee_events/features/customer/favorites/favorites_store.dart';
import 'package:mee_events/features/customer/navigation/customer_tab.dart';
import 'package:mee_events/features/customer/plan/event_plan_store.dart';
import 'package:mee_events/features/customer/providers/explore_intent_provider.dart';
import 'package:mee_events/features/customer/screens/customer_dashboard_screen.dart';
import 'package:mee_events/features/customer/screens/enquiries_tab.dart';
import 'package:mee_events/features/customer/screens/explore_tab.dart';
import 'package:mee_events/features/customer/screens/favorites_screen.dart';
import 'package:mee_events/features/customer/screens/home_tab.dart';
import 'package:mee_events/features/customer/screens/plan_tab.dart';
import 'package:mee_events/features/customer/widgets/home/home_planning_guidance.dart';
import 'package:mee_events/features/customer/widgets/home/home_planning_hero.dart';
import 'package:mee_events/features/customer/search/customer_search_screen.dart';
import 'package:mee_events/features/customer/search/search_provider.dart';
import 'package:mee_events/models/bootstrap_response.dart';
import 'package:mee_events/models/auth_session.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/models/catalog_service.dart';
import 'package:mee_events/models/client_surface.dart';
import 'package:mee_events/theme/theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const wedding = CatalogItem(
    code: 'wedding',
    displayName: 'Wedding',
    displayOrder: 1,
  );

  List<Override> catalogOverrides() => [
    eventTypesProvider.overrideWith((ref) async => const [wedding]),
    serviceCategoriesProvider.overrideWith(
      (ref) async => const <CatalogItem>[],
    ),
    catalogServicesProvider(
      null,
    ).overrideWith((ref) async => const <CatalogService>[]),
  ];

  Map<String, Object> threeItemPlanPrefs([String userId = 'shell-user']) {
    return {
      eventPlanStorageKey(userId): [
        jsonEncode(
          const EventPlanItem(
            productCode: 'photo.A1',
            displayName: 'Album',
            serviceCode: 'photography',
          ).toJson(),
        ),
        jsonEncode(
          const EventPlanItem(
            productCode: 'food.A1',
            displayName: 'Buffet',
            serviceCode: 'catering',
          ).toJson(),
        ),
        jsonEncode(
          const EventPlanItem(
            productCode: 'decor.A1',
            displayName: 'Mandap',
            serviceCode: 'decoration',
          ).toJson(),
        ),
      ],
    };
  }

  Future<void> pumpDashboard(
    WidgetTester tester, {
    String branchCode = 'HYD',
    String branchName = 'Hyderabad',
    String userId = 'shell-user',
    Map<String, Object> prefs = const {},
    List<Override> extraOverrides = const [],
    bool hostBootstrap = false,
    Size size = const Size(390, 844),
    double textScale = 1,
  }) async {
    SharedPreferences.setMockInitialValues(prefs);
    tester.view.physicalSize = Size(size.width * 3, size.height * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final dashboard = hostBootstrap
        ? _GatewayBootstrapHost(
            child: CustomerDashboardScreen(
              branchCode: branchCode,
              branchName: branchName,
            ),
          )
        : CustomerDashboardScreen(
            branchCode: branchCode,
            branchName: branchName,
          );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sessionUserIdProvider.overrideWithValue(userId),
          ...catalogOverrides(),
          ...extraOverrides,
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: MediaQuery(
            data: MediaQueryData(
              size: size,
              textScaler: TextScaler.linear(textScale),
            ),
            child: dashboard,
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 80));
    expect(
      tester.takeException(),
      isNull,
      reason: 'Customer shell produced an unexpected Flutter exception',
    );
  }

  Future<void> pumpShellChrome(
    WidgetTester tester, {
    Size size = const Size(390, 844),
    double textScale = 1,
    String? planBadge,
    int currentIndex = 0,
    ValueChanged<int>? onTap,
    VoidCallback? onSearch,
    VoidCallback? onFavourite,
    VoidCallback? onSwitchRole,
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
            backgroundColor: AppColors.canvas,
            appBar: AppHeader(
              roleLabel: 'Customer',
              onSwitchRole: onSwitchRole,
              onSearch: onSearch ?? () {},
              onFavourite: onFavourite ?? () {},
            ),
            body: const SizedBox.expand(),
            bottomNavigationBar: MeBottomNav(
              items: [
                for (final tab in CustomerTab.values)
                  MeBottomNavItem(
                    icon: tab.outlinedIcon,
                    selectedIcon: tab.selectedIcon,
                    label: tab.navLabel,
                    badgeLabel: tab == CustomerTab.plan ? planBadge : null,
                    semanticLabel: tab == CustomerTab.plan
                        ? customerPlanSemanticLabel(
                            planBadge == null
                                ? 0
                                : (planBadge == '99+'
                                      ? 100
                                      : int.tryParse(planBadge)),
                          )
                        : tab.navLabel,
                  ),
              ],
              currentIndex: currentIndex,
              onTap: onTap ?? (_) {},
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    expect(
      tester.takeException(),
      isNull,
      reason: 'Customer shell produced an unexpected Flutter exception',
    );
  }

  Finder navText(String label) => find.descendant(
    of: find.byType(NavigationBar),
    matching: find.text(label),
  );

  int stackIndex(WidgetTester tester) {
    return tester.widget<IndexedStack>(find.byType(IndexedStack)).index ?? 0;
  }

  void expectRootTickerModes(
    WidgetTester tester, {
    required CustomerTab active,
  }) {
    final stack = tester.widget<IndexedStack>(find.byType(IndexedStack));
    expect(stack.children, hasLength(CustomerTab.values.length));
    expect(stack.index, active.tabIndex);
    var enabledCount = 0;
    for (var i = 0; i < stack.children.length; i++) {
      expect(stack.children[i], isA<TickerMode>());
      final mode = stack.children[i] as TickerMode;
      expect(mode.enabled, i == active.tabIndex);
      if (mode.enabled) enabledCount += 1;
    }
    expect(enabledCount, 1);
  }

  List<String> navLabels(WidgetTester tester) {
    final bar = tester.widget<NavigationBar>(find.byType(NavigationBar));
    return bar.destinations
        .cast<NavigationDestination>()
        .map((destination) => destination.label)
        .toList();
  }

  List<String> semanticsLabels(SemanticsNode node) {
    final labels = <String>[];
    void walk(SemanticsNode current) {
      if (current.label.isNotEmpty) {
        labels.add(current.label);
      }
      current.visitChildren((child) {
        walk(child);
        return true;
      });
    }

    walk(node);
    return labels;
  }

  group('CustomerTab contract', () {
    test('declaration order is Home, Explore, Plan, Enquiries, Account', () {
      expect(CustomerTab.values.map((tab) => tab.navLabel).toList(), [
        'Home',
        'Explore',
        'Plan',
        'Enquiries',
        'Account',
      ]);
      expect(CustomerTab.home.tabIndex, 0);
      expect(CustomerTab.explore.tabIndex, 1);
      expect(CustomerTab.plan.tabIndex, 2);
      expect(CustomerTab.enquiries.tabIndex, 3);
      expect(CustomerTab.account.tabIndex, 4);
    });

    test('plan badge is hidden, counted, then capped at 99+', () {
      expect(customerPlanBadgeLabel(null), isNull);
      expect(customerPlanBadgeLabel(0), isNull);
      expect(customerPlanBadgeLabel(3), '3');
      expect(customerPlanBadgeLabel(99), '99');
      expect(customerPlanBadgeLabel(100), '99+');
      expect(customerPlanSemanticLabel(3), 'Plan, 3 items');
      expect(customerPlanSemanticLabel(1), 'Plan, 1 item');
      expect(customerPlanSemanticLabel(120), 'Plan, 99+ items');
    });
  });

  testWidgets('bottom navigation labels follow the typed tab order', (
    tester,
  ) async {
    await pumpDashboard(tester);
    expect(navLabels(tester), [
      'Home',
      'Explore',
      'Plan',
      'Enquiries',
      'Account',
    ]);
  });

  testWidgets('tapping Plan opens PlanTab at index 2', (tester) async {
    await pumpDashboard(tester);
    await tester.tap(navText('Plan'));
    await tester.pump();

    expect(stackIndex(tester), CustomerTab.plan.tabIndex);
    expect(find.byType(PlanTab), findsOneWidget);
    expectUnifiedHeader(tester);
  });

  testWidgets('tapping Enquiries opens EnquiriesTab at index 3', (
    tester,
  ) async {
    await pumpDashboard(tester);
    await tester.tap(navText('Enquiries'));
    await tester.pump();

    expect(stackIndex(tester), CustomerTab.enquiries.tabIndex);
    expect(find.byType(EnquiriesTab), findsOneWidget);
    expectUnifiedHeader(tester);
  });

  testWidgets('header role control opens the existing Role Switcher', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      final notifier = SessionNotifier(
        (refreshToken) async => SessionTokens(
          accessToken: 'refreshed-shell-access',
          refreshToken: refreshToken,
          accessTokenExpiresInSeconds: 900,
          sessionId: '00000000-0000-4000-8000-000000000201',
          activeRole: 'customer',
        ),
        store: MemoryAuthSessionStore(),
      );
      await notifier.signIn(
        AuthSession(
          accessToken: 'customer-shell-access',
          refreshToken: 'customer-shell-refresh-token-value-32chars',
          accessTokenExpiresInSeconds: 900,
          accessTokenExpiresAt: DateTime.utc(2099),
          sessionId: '00000000-0000-4000-8000-000000000201',
          userId: 'customer-shell-user',
          mobileNumber: '+919876543210',
          lastActiveRole: 'customer',
        ),
      );
      await pumpDashboard(
        tester,
        hostBootstrap: true,
        extraOverrides: [
          sessionProvider.overrideWith((ref) => notifier),
          platformBootstrapProvider.overrideWith(
            (ref) async => const PlatformBootstrapResponse(
              schemaVersion: platformBootstrapSchemaVersion,
              minimumClientBootstrapVersion: platformBootstrapClientVersion,
              policyVersion: platformBootstrapPolicyVersion,
              generatedAt: '2026-09-02T10:00:00.000Z',
              requestId: 'request-customer-shell',
              actorUserId: 'customer-shell-user',
              actorSessionId: '00000000-0000-4000-8000-000000000201',
              surface: ClientSurface.customerMobile,
              activeRole: 'customer',
              landingModule: 'customer_home',
              branchId: hyderabadBranchId,
              branchCode: 'HYD',
              branchName: 'Hyderabad',
              assignedRoles: ['customer', 'worker'],
              modules: [
                'customer_home',
                'customer_enquiries',
                'customer_quotations',
                'customer_bookings',
                'customer_payments',
                'customer_event_tracking',
                'customer_changes',
                'customer_support',
              ],
              capabilities: [
                'enquiry.create_own',
                'enquiry.read_own',
                'quotation.read_own',
                'quotation.approve_own',
                'quotation.reject_own',
                'quotation.request_revision_own',
                'booking.read_own',
                'payment.submit_own',
                'payment.read_own',
                'event.track_own',
                'change_request.create_own',
                'support.contact_assigned_manager',
              ],
            ),
          ),
        ],
      );
      await tester.pump();
      await tester.pump();

      expect(
        find.bySemanticsLabel('Switch role, current role Customer'),
        findsOneWidget,
      );
      await tester.tap(find.byTooltip('Switch role, current role Customer'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));

      expect(find.byType(RoleSwitcherSheet), findsOneWidget);
      expect(
        find.text('Use one account across Customer, Vendor, and Worker.'),
        findsOneWidget,
      );
      expect(stackIndex(tester), CustomerTab.home.tabIndex);
    } finally {
      semantics.dispose();
    }
  });

  testWidgets('Home Create CTA still reaches Plan after the index change', (
    tester,
  ) async {
    await pumpDashboard(tester);
    await tester.ensureVisible(find.text('Start planning'));
    await tester.tap(find.text('Start planning'));
    await tester.pump();

    expect(stackIndex(tester), CustomerTab.plan.tabIndex);
    expect(stackIndex(tester), isNot(3));
  });

  testWidgets('Home View all still reaches Explore', (tester) async {
    await pumpDashboard(tester);
    await tester.ensureVisible(find.text('View all'));
    await tester.tap(find.text('View all'));
    await tester.pump();

    expect(stackIndex(tester), CustomerTab.explore.tabIndex);
    expect(find.byType(ExploreTab), findsOneWidget);
    expect(
      tester.widget<MeSegmentedControl>(find.byType(MeSegmentedControl)).index,
      0,
    );
  });

  testWidgets('Favorites empty CTA navigates to Explore via typed tab', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    CustomerTab? destination;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sessionUserIdProvider.overrideWithValue('fav-user'),
          favoritesStoreProvider.overrideWith(
            (ref) => FavoritesStore(prefs: prefs, userId: 'fav-user'),
          ),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: FavoritesScreen(onNavigateTab: (tab) => destination = tab),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    await tester.tap(find.text('Browse services'));
    await tester.pump();
    expect(destination, CustomerTab.explore);
  });

  testWidgets('Search empty CTAs request typed tab destinations', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    CustomerTab? destination;
    final container = ProviderContainer(
      overrides: [
        sessionUserIdProvider.overrideWithValue('search-user'),
        trendingSearchesProvider.overrideWith((ref) async => const <String>[]),
        searchQueryProvider.overrideWith(
          (ref) => _EmptyResultsSearchNotifier(ref),
        ),
      ],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          home: CustomerSearchScreen(onNavigateTab: (tab) => destination = tab),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pump();

    await tester.ensureVisible(find.text('Browse Services'));
    await tester.tap(find.text('Browse Services'));
    await tester.pump();
    expect(destination, CustomerTab.explore);
    expect(container.read(exploreIntentProvider), 1);

    destination = null;
    await tester.ensureVisible(find.text('Browse Occasions'));
    await tester.tap(find.text('Browse Occasions'));
    await tester.pump();
    expect(destination, CustomerTab.explore);
    expect(container.read(exploreIntentProvider), 0);
  });

  testWidgets('Event Plan badge stays hidden when the plan is empty', (
    tester,
  ) async {
    await pumpDashboard(tester);
    expect(find.byType(Badge), findsNothing);
    expect(
      tester
          .widget<NavigationDestination>(
            find
                .descendant(
                  of: find.byType(NavigationBar),
                  matching: find.byType(NavigationDestination),
                )
                .at(CustomerTab.plan.tabIndex),
          )
          .tooltip,
      'Plan',
    );
  });

  testWidgets('Event Plan badge shows the live count', (tester) async {
    await pumpDashboard(tester, prefs: threeItemPlanPrefs());

    expect(find.byType(Badge), findsWidgets);
    expect(
      find.descendant(of: find.byType(NavigationBar), matching: find.text('3')),
      findsOneWidget,
    );
    expect(
      tester
          .widget<NavigationDestination>(
            find
                .descendant(
                  of: find.byType(NavigationBar),
                  matching: find.byType(NavigationDestination),
                )
                .at(CustomerTab.plan.tabIndex),
          )
          .tooltip,
      'Plan, 3 items',
    );
  });

  testWidgets('Event Plan badge caps at 99+', (tester) async {
    await pumpDashboard(
      tester,
      prefs: {
        eventPlanStorageKey('shell-user'): [
          for (var i = 0; i < 100; i++)
            jsonEncode(
              EventPlanItem(
                productCode: 'item.$i',
                displayName: 'Item $i',
                serviceCode: 'svc',
              ).toJson(),
            ),
        ],
      },
    );

    expect(find.text('99+'), findsOneWidget);
    expect(
      tester
          .widget<NavigationDestination>(
            find
                .descendant(
                  of: find.byType(NavigationBar),
                  matching: find.byType(NavigationDestination),
                )
                .at(CustomerTab.plan.tabIndex),
          )
          .tooltip,
      'Plan, 99+ items',
    );
  });

  testWidgets('empty Event Plan exposes a single Plan destination label', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      await pumpShellChrome(tester);

      expect(find.byType(Badge), findsNothing);
      expect(find.bySemanticsLabel(RegExp('Plan')), findsOneWidget);
      expect(find.bySemanticsLabel(RegExp('Plan, 3 items')), findsNothing);

      final labels = semanticsLabels(
        tester.getSemantics(find.byType(MeBottomNav)),
      );
      expect(
        labels.where((label) => _announcesPhrase(label, 'Plan')),
        hasLength(1),
      );
      expect(labels.where((label) => _announcesPhrase(label, '3')), isEmpty);

      final plan = tester.getSemantics(find.bySemanticsLabel(RegExp('Plan')));
      expect(plan.flagsCollection.isButton, isTrue);
      expect(plan.flagsCollection.isSelected, Tristate.isFalse);
    } finally {
      semantics.dispose();
    }
  });

  testWidgets(
    'three-item Event Plan has one Plan, 3 items node and no standalone 3',
    (tester) async {
      final semantics = tester.ensureSemantics();
      var index = 0;
      try {
        await tester.pumpWidget(
          MaterialApp(
            theme: AppTheme.light,
            home: StatefulBuilder(
              builder: (context, setState) {
                return Scaffold(
                  backgroundColor: AppColors.canvas,
                  appBar: const AppHeader(
                    roleLabel: 'Customer',
                    onSearch: _noop,
                    onFavourite: _noop,
                  ),
                  body: const SizedBox.expand(),
                  bottomNavigationBar: MeBottomNav(
                    currentIndex: index,
                    onTap: (value) => setState(() => index = value),
                    items: [
                      for (final tab in CustomerTab.values)
                        MeBottomNavItem(
                          icon: tab.outlinedIcon,
                          selectedIcon: tab.selectedIcon,
                          label: tab.navLabel,
                          badgeLabel: tab == CustomerTab.plan ? '3' : null,
                          semanticLabel: tab == CustomerTab.plan
                              ? 'Plan, 3 items'
                              : tab.navLabel,
                        ),
                    ],
                  ),
                );
              },
            ),
          ),
        );
        await tester.pump();
        expect(
          tester.takeException(),
          isNull,
          reason: 'Customer shell produced an unexpected Flutter exception',
        );

        expect(find.byType(Badge), findsWidgets);
        expect(find.text('3'), findsOneWidget);
        expect(find.bySemanticsLabel(RegExp('Plan, 3 items')), findsOneWidget);
        expect(find.bySemanticsLabel(RegExp(r'^3$')), findsNothing);

        final labels = semanticsLabels(
          tester.getSemantics(find.byType(MeBottomNav)),
        );
        expect(
          labels.where((label) => label.contains('Plan, 3 items')),
          hasLength(1),
        );
        expect(labels.where((label) => _announcesPhrase(label, '3')), isEmpty);

        final unselected = tester.getSemantics(
          find.bySemanticsLabel(RegExp('Plan, 3 items')),
        );
        expect(unselected.flagsCollection.isButton, isTrue);
        expect(unselected.flagsCollection.isSelected, Tristate.isFalse);

        await tester.tap(find.bySemanticsLabel(RegExp('Plan, 3 items')));
        await tester.pump();

        expect(index, CustomerTab.plan.tabIndex);
        final selected = tester.getSemantics(
          find.bySemanticsLabel(RegExp('Plan, 3 items')),
        );
        expect(selected.flagsCollection.isButton, isTrue);
        expect(selected.flagsCollection.isSelected, Tristate.isTrue);
      } finally {
        semantics.dispose();
      }
    },
  );

  testWidgets('unified header is consistent across every root tab', (
    tester,
  ) async {
    await pumpDashboard(tester);
    for (final tab in CustomerTab.values) {
      await tester.tap(navText(tab.navLabel));
      await tester.pump();
      expect(find.byType(AppHeader), findsOneWidget);
      expectUnifiedHeader(tester);
      expect(find.byType(MeBottomNav), findsOneWidget);
      expect(navLabels(tester), [
        'Home',
        'Explore',
        'Plan',
        'Enquiries',
        'Account',
      ]);
    }
  });

  testWidgets('header search opens one CustomerSearchScreen', (tester) async {
    await pumpDashboard(tester);
    await tester.tap(
      find.descendant(
        of: find.byType(AppHeader),
        matching: find.byTooltip('Search'),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byType(CustomerSearchScreen), findsOneWidget);
  });

  testWidgets('header favorites opens one FavoritesScreen', (tester) async {
    await pumpDashboard(tester);
    await tester.tap(
      find.descendant(
        of: find.byType(AppHeader),
        matching: find.byTooltip('Favorites'),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byType(FavoritesScreen), findsOneWidget);
  });

  testWidgets('notification icon is visible, disabled, and has no badge', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      await pumpDashboard(tester);
      expect(
        find.descendant(
          of: find.byType(AppHeader),
          matching: find.byIcon(Icons.notifications_none_rounded),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: find.byType(AppHeader),
          matching: find.byType(Badge),
        ),
        findsNothing,
      );
      expect(find.text('PS'), findsNothing);
      expect(find.textContaining('Phase 3'), findsNothing);
      expect(find.textContaining('Notifications coming'), findsNothing);
      final node = tester.getSemantics(
        find.bySemanticsLabel('Notifications unavailable'),
      );
      expect(node.flagsCollection.isEnabled, Tristate.isFalse);
    } finally {
      semantics.dispose();
    }
  });

  testWidgets('header is not recreated inside tab bodies', (tester) async {
    await pumpDashboard(tester);
    expect(find.byType(AppHeader), findsOneWidget);
    await tester.tap(navText('Explore'));
    await tester.pump();
    expect(find.byType(AppHeader), findsOneWidget);
    expect(
      find.descendant(
        of: find.byType(IndexedStack),
        matching: find.byType(AppHeader),
      ),
      findsNothing,
    );
  });

  testWidgets('system back from a non-Home tab returns to Home', (
    tester,
  ) async {
    await pumpDashboard(tester);
    await tester.tap(navText('Explore'));
    await tester.pump();
    expect(stackIndex(tester), CustomerTab.explore.tabIndex);

    final handled = await tester.binding.handlePopRoute();
    expect(handled, isTrue);
    await tester.pump();
    expect(stackIndex(tester), CustomerTab.home.tabIndex);
  });

  testWidgets('Mee Events is visually centred at 390 logical width', (
    tester,
  ) async {
    await pumpShellChrome(tester, size: const Size(390, 844));
    final geometry = _headerGeometry(tester);
    _expectReadableBrand(geometry, globallyCentred: true);
  });

  testWidgets('header actions meet 44x44 targets and unique semantics', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      await pumpShellChrome(tester, size: const Size(390, 844));
      void expectMinTarget(Finder finder) {
        final rect = tester.getRect(finder);
        expect(rect.width, greaterThanOrEqualTo(kHeaderActionSize));
        expect(rect.height, greaterThanOrEqualTo(kHeaderActionSize));
      }

      expectMinTarget(find.byTooltip('Search'));
      expectMinTarget(find.byTooltip('Favorites'));
      expectMinTarget(
        find.bySemanticsLabel('Switch role, current role Customer'),
      );
      expectMinTarget(find.byTooltip('Notifications unavailable'));

      final labels = semanticsLabels(
        tester.getSemantics(find.byType(AppHeader)),
      );
      expect(labels.where((label) => label == 'Search'), hasLength(1));
      expect(labels.where((label) => label == 'Favorites'), hasLength(1));
      expect(
        labels.where((label) => label == 'Notifications unavailable'),
        hasLength(1),
      );
      expect(
        labels.where((label) => label == 'Switch role, current role Customer'),
        hasLength(1),
      );
      expect(labels.where((label) => label == 'Mee Events'), hasLength(1));
    } finally {
      semantics.dispose();
    }
  });

  testWidgets('shell chrome does not overflow at 390x844 text 1.0', (
    tester,
  ) async {
    await pumpShellChrome(tester, size: const Size(390, 844), textScale: 1);
    expectUnifiedHeader(tester);
    _expectReadableBrand(_headerGeometry(tester), globallyCentred: true);
    expect(find.byType(MeBottomNav), findsOneWidget);
  });

  testWidgets('shell chrome does not overflow at 320x844 text 1.0', (
    tester,
  ) async {
    await pumpShellChrome(tester, size: const Size(320, 844), textScale: 1);
    expectUnifiedHeader(tester);
    _expectReadableBrand(_headerGeometry(tester), globallyCentred: false);
    expect(find.byType(MeBottomNav), findsOneWidget);
  });

  testWidgets('shell chrome does not overflow at 390x844 text 1.3', (
    tester,
  ) async {
    await pumpShellChrome(tester, size: const Size(390, 844), textScale: 1.3);
    expectUnifiedHeader(tester);
    _expectReadableBrand(_headerGeometry(tester), globallyCentred: true);
    expect(find.byType(MeBottomNav), findsOneWidget);
  });

  testWidgets('shell chrome does not overflow at 320x844 text 1.3', (
    tester,
  ) async {
    await pumpShellChrome(tester, size: const Size(320, 844), textScale: 1.3);
    expectUnifiedHeader(tester);
    _expectReadableBrand(_headerGeometry(tester), globallyCentred: false);
    expect(find.byType(MeBottomNav), findsOneWidget);
  });

  testWidgets('320px brand at text 1.3 is not smaller than text 1.0', (
    tester,
  ) async {
    await pumpShellChrome(tester, size: const Size(320, 844), textScale: 1);
    final atOne = _headerGeometry(tester);
    _expectReadableBrand(atOne, globallyCentred: false);
    final heightAtOne = atOne.brand.height;

    await pumpShellChrome(tester, size: const Size(320, 844), textScale: 1.3);
    final atScale = _headerGeometry(tester);
    _expectReadableBrand(atScale, globallyCentred: false);
    expect(atScale.brand.height, greaterThanOrEqualTo(heightAtOne));
    expect(find.text('Mee Events'), findsOneWidget);
    expect(find.byTooltip('Search'), findsOneWidget);
    expect(find.byTooltip('Favorites'), findsOneWidget);
    expect(find.byTooltip('Notifications unavailable'), findsOneWidget);
  });

  testWidgets('Home state is preserved while another root tab is selected', (
    tester,
  ) async {
    await pumpDashboard(tester);
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.byType(CustomerDashboardScreen), findsOneWidget);
    expect(find.byType(PageView), findsNothing);
    expect(find.byType(HomePlanningHero), findsOneWidget);
    expect(find.byKey(HomePlanningHero.ctaKey), findsOneWidget);
    expectRootTickerModes(tester, active: CustomerTab.home);

    final homeState = tester.state(
      find.byType(CustomerHomeTab, skipOffstage: false),
    );
    final exploreState = tester.state(
      find.byType(ExploreTab, skipOffstage: false),
    );

    await tester.tap(navText('Explore'));
    await tester.pump();
    expect(stackIndex(tester), CustomerTab.explore.tabIndex);
    expect(find.byType(ExploreTab), findsOneWidget);
    expectRootTickerModes(tester, active: CustomerTab.explore);

    await tester.pump(const Duration(seconds: 12));
    expect(
      find.byKey(HomePlanningHero.ctaKey, skipOffstage: false),
      findsOneWidget,
    );
    expect(find.byType(PageView), findsNothing);

    await tester.tap(navText('Home'));
    await tester.pump();
    expect(stackIndex(tester), CustomerTab.home.tabIndex);
    expectRootTickerModes(tester, active: CustomerTab.home);
    expect(find.text('Start planning'), findsOneWidget);
    expect(
      identical(tester.state(find.byType(CustomerHomeTab)), homeState),
      isTrue,
    );
    expect(
      identical(
        tester.state(find.byType(ExploreTab, skipOffstage: false)),
        exploreState,
      ),
      isTrue,
    );

    await tester.tap(navText('Explore'));
    await tester.pump();
    expectRootTickerModes(tester, active: CustomerTab.explore);

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(seconds: 6));
    expect(tester.takeException(), isNull);
  });

  List<Override> longHomeFeedOverrides() {
    final occasions = <CatalogItem>[
      for (var i = 1; i <= 8; i++)
        CatalogItem(
          code: 'occasion-$i',
          displayName: 'Occasion $i',
          displayOrder: i,
        ),
    ];
    final services = <CatalogService>[
      for (var i = 1; i <= 10; i++)
        CatalogService(
          code: 'service-$i',
          displayName: 'Service $i',
          departmentCode: 'GEN',
          entityKind: 'service',
          displayOrder: i,
        ),
    ];
    return [
      eventTypesProvider.overrideWith((ref) async => occasions),
      catalogServicesProvider(null).overrideWith((ref) async => services),
    ];
  }

  Finder homeVerticalScrollable() {
    return find.descendant(
      of: find.byType(CustomerHomeTab),
      matching: find.byWidgetPredicate(
        (widget) => widget is Scrollable && widget.axis == Axis.vertical,
      ),
    );
  }

  Future<void> scrollHomeToEnd(WidgetTester tester) async {
    final scrollable = homeVerticalScrollable();
    final position = tester.state<ScrollableState>(scrollable).position;
    for (var i = 0; i < 10; i++) {
      if (position.pixels >= position.maxScrollExtent - 1) {
        break;
      }
      await tester.fling(scrollable, const Offset(0, -720), 2200);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
    }
    for (var i = 0; i < 24; i++) {
      if ((position.pixels - position.maxScrollExtent).abs() <= 1) {
        break;
      }
      await tester.pump(const Duration(milliseconds: 50));
    }
    expect(position.pixels, greaterThan(80));
    expect(position.pixels, closeTo(position.maxScrollExtent, 8));
  }

  Rect actionTarget(WidgetTester tester, Key key) {
    return tester.getRect(
      find
          .ancestor(of: find.byKey(key), matching: find.byType(ConstrainedBox))
          .first,
    );
  }

  void expectHomeBottomGeometry(WidgetTester tester, {required Size screen}) {
    final panel = tester.getRect(find.byKey(HomeFinalPlanPanel.panelKey));
    final explore = actionTarget(tester, HomeFinalPlanPanel.exploreKey);
    final plan = actionTarget(tester, HomeFinalPlanPanel.planKey);
    final nav = tester.getRect(find.byType(NavigationBar));
    final header = tester.getRect(find.byType(AppHeader));

    expect(panel.top, greaterThanOrEqualTo(header.bottom));
    expect(panel.bottom, lessThanOrEqualTo(nav.top));
    expect(explore.top, greaterThanOrEqualTo(panel.top));
    expect(explore.bottom, lessThanOrEqualTo(panel.bottom));
    expect(plan.top, greaterThanOrEqualTo(panel.top));
    expect(plan.bottom, lessThanOrEqualTo(panel.bottom));
    expect(explore.bottom, lessThanOrEqualTo(nav.top));
    expect(plan.bottom, lessThanOrEqualTo(nav.top));
    expect(explore.height, greaterThanOrEqualTo(44));
    expect(plan.height, greaterThanOrEqualTo(44));
    expect(nav.contains(explore.center), isFalse);
    expect(nav.contains(plan.center), isFalse);

    final gap = nav.top - panel.bottom;
    expect(gap, greaterThanOrEqualTo(AppSpacing.lg));
    expect(gap, lessThanOrEqualTo(AppSpacing.xxxl * 2));
    expect(gap, lessThan(120));

    expect(
      find.byWidgetPredicate(
        (widget) => widget is SizedBox && widget.height == 120,
      ),
      findsNothing,
    );
    expect(header.top, lessThan(8));
    expect(nav.bottom, closeTo(screen.height, 1));
    expect(tester.takeException(), isNull);
  }

  for (final fixture in const [
    (Size(390, 844), 1.0),
    (Size(320, 844), 1.0),
    (Size(390, 844), 1.3),
    (Size(320, 844), 1.3),
  ]) {
    testWidgets(
      'Home final panel clears the shell nav at ${fixture.$1.width.toInt()} text ${fixture.$2}',
      (tester) async {
        await pumpDashboard(
          tester,
          size: fixture.$1,
          textScale: fixture.$2,
          extraOverrides: longHomeFeedOverrides(),
        );

        final headerStart = tester.getRect(find.byType(AppHeader));
        final navStart = tester.getRect(find.byType(NavigationBar));
        final scrollable = homeVerticalScrollable();
        final position = tester.state<ScrollableState>(scrollable).position;
        expect(position.pixels, 0);
        expect(find.byKey(HomeFinalPlanPanel.panelKey), findsNothing);
        expect(position.maxScrollExtent, greaterThan(AppSpacing.xxxl * 4));

        await scrollHomeToEnd(tester);
        expectHomeBottomGeometry(tester, screen: fixture.$1);

        expect(tester.getRect(find.byType(AppHeader)), headerStart);
        expect(tester.getRect(find.byType(NavigationBar)), navStart);

        final heldPixels = position.pixels;
        await tester.tap(navText('Explore'));
        await tester.pump();
        expect(stackIndex(tester), CustomerTab.explore.tabIndex);
        await tester.tap(navText('Home'));
        await tester.pump();
        expect(stackIndex(tester), CustomerTab.home.tabIndex);
        expect(
          tester
              .state<ScrollableState>(homeVerticalScrollable())
              .position
              .pixels,
          closeTo(heldPixels, 8),
        );
        expectHomeBottomGeometry(tester, screen: fixture.$1);
        expectUnifiedHeader(tester);
      },
    );
  }

  testWidgets('Production shell Home bottom actions reach Explore and Plan', (
    tester,
  ) async {
    await pumpDashboard(tester, extraOverrides: longHomeFeedOverrides());
    final scrollable = homeVerticalScrollable();
    final position = tester.state<ScrollableState>(scrollable).position;
    expect(position.pixels, 0);
    expect(find.byKey(HomeFinalPlanPanel.panelKey), findsNothing);

    await scrollHomeToEnd(tester);
    expectHomeBottomGeometry(tester, screen: const Size(390, 844));

    await tester.tap(find.byKey(HomeFinalPlanPanel.exploreKey));
    await tester.pump();
    expect(stackIndex(tester), CustomerTab.explore.tabIndex);
    expect(find.byType(ExploreTab), findsOneWidget);
    final container = ProviderScope.containerOf(
      tester.element(find.byType(CustomerDashboardScreen)),
    );
    expect(container.read(exploreIntentProvider), 0);

    await tester.tap(navText('Home'));
    await tester.pump();
    expect(stackIndex(tester), CustomerTab.home.tabIndex);

    await scrollHomeToEnd(tester);
    await tester.tap(find.byKey(HomeFinalPlanPanel.planKey));
    await tester.pump();
    expect(stackIndex(tester), CustomerTab.plan.tabIndex);
    expect(find.byType(PlanTab), findsOneWidget);
    expectUnifiedHeader(tester);
    expect(tester.takeException(), isNull);
  });
}

bool _announcesPhrase(String label, String phrase) {
  return label == phrase || label.split('\n').contains(phrase);
}

void _noop() {}

void expectUnifiedHeader(WidgetTester tester) {
  expect(find.byType(AppHeader), findsOneWidget);
  expect(
    find.descendant(
      of: find.byType(AppHeader),
      matching: find.text('Mee Events'),
    ),
    findsOneWidget,
  );
  expect(
    find.descendant(
      of: find.byType(AppHeader),
      matching: find.byIcon(Icons.search_rounded),
    ),
    findsOneWidget,
  );
  expect(
    find.descendant(
      of: find.byType(AppHeader),
      matching: find.byIcon(Icons.favorite_border_rounded),
    ),
    findsOneWidget,
  );
  expect(
    find.descendant(
      of: find.byType(AppHeader),
      matching: find.byIcon(Icons.notifications_none_rounded),
    ),
    findsOneWidget,
  );
  expect(
    find.descendant(
      of: find.byType(AppHeader),
      matching: find.byIcon(Icons.location_on_outlined),
    ),
    findsNothing,
  );
  for (final title in ['Explore', 'Plan', 'Enquiries', 'Account', 'Home']) {
    expect(
      find.descendant(of: find.byType(AppHeader), matching: find.text(title)),
      findsNothing,
    );
  }
  expect(
    find.descendant(
      of: find.byType(AppHeader),
      matching: find.text('Hyderabad'),
    ),
    findsNothing,
  );
}

class _GatewayBootstrapHost extends ConsumerWidget {
  const _GatewayBootstrapHost({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bootstrap = ref.watch(platformBootstrapProvider);
    return bootstrap.when(
      data: (response) => response == null ? const SizedBox.shrink() : child,
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
    );
  }
}

class _HeaderGeometry {
  const _HeaderGeometry({
    required this.header,
    required this.brand,
    required this.role,
    required this.search,
    required this.favorite,
    required this.notification,
  });

  final Rect header;
  final Rect brand;
  final Rect role;
  final Rect search;
  final Rect favorite;
  final Rect notification;
}

_HeaderGeometry _headerGeometry(WidgetTester tester) {
  return _HeaderGeometry(
    header: tester.getRect(find.byType(AppHeader)),
    brand: tester.getRect(find.byKey(kCustomerBrandKey)),
    role: tester.getRect(find.byTooltip('Switch role, current role Customer')),
    search: tester.getRect(find.byTooltip('Search')),
    favorite: tester.getRect(find.byTooltip('Favorites')),
    notification: tester.getRect(find.byTooltip('Notifications unavailable')),
  );
}

void _expectReadableBrand(
  _HeaderGeometry geometry, {
  required bool globallyCentred,
}) {
  expect(
    geometry.brand.width,
    greaterThan(80),
    reason: 'rejected 40px-wide brand must not pass',
  );
  expect(
    geometry.brand.height,
    greaterThanOrEqualTo(16),
    reason: 'rejected ~10px-tall brand must not pass',
  );
  expect(geometry.brand.overlaps(geometry.role), isFalse);
  expect(geometry.brand.overlaps(geometry.search), isFalse);
  expect(geometry.role.right, lessThan(geometry.brand.left));
  expect(geometry.brand.right, lessThan(geometry.search.left));
  expect(
    geometry.brand.left - geometry.role.right,
    greaterThanOrEqualTo(kHeaderBrandGap),
  );
  expect(
    geometry.search.left - geometry.brand.right,
    greaterThanOrEqualTo(kHeaderBrandGap),
  );
  expect(
    geometry.search.right,
    lessThanOrEqualTo(geometry.favorite.left + 0.5),
  );
  expect(
    geometry.favorite.right,
    lessThanOrEqualTo(geometry.notification.left + 0.5),
  );
  if (globallyCentred) {
    expect(
      (geometry.brand.center.dx - geometry.header.center.dx).abs(),
      lessThan(8),
    );
  } else {
    final laneCentre = (geometry.role.right + geometry.search.left) / 2;
    expect((geometry.brand.center.dx - laneCentre).abs(), lessThan(8));
  }
}

class _EmptyResultsSearchNotifier extends SearchQueryNotifier {
  _EmptyResultsSearchNotifier(super.ref) {
    state = const SearchQueryState(
      query: 'zzzz',
      debouncedQuery: 'zzzz',
      hasSearched: true,
    );
  }
}
