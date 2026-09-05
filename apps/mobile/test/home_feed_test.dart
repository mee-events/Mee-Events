import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/core/providers/catalog_provider.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/favorites/favorites_provider.dart';
import 'package:mee_events/features/customer/favorites/favorites_store.dart';
import 'package:mee_events/features/customer/navigation/customer_tab.dart';
import 'package:mee_events/features/customer/plan/event_plan_provider.dart';
import 'package:mee_events/features/customer/plan/event_plan_store.dart';
import 'package:mee_events/features/customer/providers/event_record_providers.dart';
import 'package:mee_events/features/customer/screens/favorites_screen.dart';
import 'package:mee_events/features/customer/screens/home_tab.dart';
import 'package:mee_events/features/customer/search/search_provider.dart';
import 'package:mee_events/features/customer/widgets/home/discovery_skeletons.dart';
import 'package:mee_events/features/customer/widgets/home/home_planning_guidance.dart';
import 'package:mee_events/features/customer/widgets/home/pick_up_section.dart';
import 'package:mee_events/models/auth_session.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/models/catalog_product.dart';
import 'package:mee_events/models/catalog_selection.dart';
import 'package:mee_events/models/catalog_service.dart';
import 'package:mee_events/models/catalog_subcategory.dart';
import 'package:mee_events/models/enquiry.dart';
import 'package:mee_events/models/event_record.dart';
import 'package:mee_events/models/occasion_stage.dart';
import 'package:mee_events/theme/theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'support/favorites_test_fakes.dart';

class _SessionNotifier extends SessionNotifier {
  _SessionNotifier(AuthSession? session)
    : super(
        (_) => throw UnimplementedError(),
        store: MemoryAuthSessionStore(),
      ) {
    state = session;
  }
}

class _CountingPlanStore extends EventPlanStore {
  _CountingPlanStore({
    required super.prefs,
    super.userId,
    this.onLoad,
    this.loadFn,
  });

  VoidCallback? onLoad;
  Future<List<EventPlanItem>> Function()? loadFn;

  @override
  Future<List<EventPlanItem>> load() {
    onLoad?.call();
    final scripted = loadFn;
    if (scripted != null) return scripted();
    return super.load();
  }
}

class _CountingFavoritesStore extends ScriptedFavoritesStore {
  _CountingFavoritesStore({
    required super.prefs,
    super.userId,
    super.loadFn,
    this.onLoad,
  });

  VoidCallback? onLoad;

  @override
  Future<List<FavoriteItem>> load() {
    onLoad?.call();
    return super.load();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const wedding = CatalogItem(
    code: 'wedding',
    displayName: 'Wedding',
    displayOrder: 1,
  );
  const photography = CatalogService(
    code: 'photography',
    displayName: 'Photography',
    departmentCode: 'PHOTO',
    entityKind: 'service',
    displayOrder: 1,
  );

  final session = AuthSession(
    accessToken: 'token',
    refreshToken: 'refresh-token-value-at-least-32-chars',
    accessTokenExpiresInSeconds: 900,
    accessTokenExpiresAt: DateTime.utc(2099),
    sessionId: '00000000-0000-4000-8000-000000000201',
    userId: 'home-feed-user',
    mobileNumber: '+919876543210',
    lastActiveRole: 'customer',
  );

  const planItem = EventPlanItem(
    productCode: 'photo.A1',
    displayName: 'Cinematic Album',
    serviceCode: 'photography',
  );
  const planItemTwo = EventPlanItem(
    productCode: 'food.B1',
    displayName: 'Garden Buffet',
    serviceCode: 'catering',
  );

  Enquiry enquiry({
    required String id,
    required String status,
    String submittedAt = '',
    String createdAt = '2026-01-01T00:00:00.000Z',
    String name = 'Wedding',
    String reference = 'ENQ-1',
    String? eventDate,
  }) {
    return Enquiry(
      id: id,
      referenceCode: reference,
      eventTypeCode: 'wedding',
      eventTypeName: name,
      status: status,
      createdAt: createdAt,
      submittedAt: submittedAt.isEmpty ? null : submittedAt,
      eventDate: eventDate,
    );
  }

  FavoriteItem saved(String code, DateTime savedAt) {
    return testFavorite(
      kind: FavoriteKind.product,
      code: code,
      title: 'Saved $code',
      savedAt: savedAt,
    );
  }

  test('pickHomeResumeEnquiry prefers newest valid active enquiry', () {
    final closed = enquiry(
      id: 'c',
      status: 'closed',
      submittedAt: '2026-08-01',
    );
    final cancelled = enquiry(
      id: 'x',
      status: 'cancelled',
      submittedAt: '2026-08-10',
    );
    final older = enquiry(
      id: 'old',
      status: 'submitted',
      submittedAt: '2026-04-01T00:00:00.000Z',
      reference: 'ENQ-OLD',
    );
    final newer = enquiry(
      id: 'new',
      status: 'in_discussion',
      submittedAt: '2026-07-01T00:00:00.000Z',
      reference: 'ENQ-NEW',
    );
    final invalid = enquiry(
      id: 'bad',
      status: 'received',
      submittedAt: 'not-a-date',
      createdAt: 'also-bad',
      reference: 'ENQ-BAD',
    );
    expect(
      pickHomeResumeEnquiry([
        closed,
        cancelled,
        invalid,
        older,
        newer,
      ])?.referenceCode,
      'ENQ-NEW',
    );
    expect(pickHomeResumeEnquiry([closed, cancelled]), isNull);
    expect(
      homeEnquiryStatusLabel(enquiry(id: 'u', status: 'weird_code')),
      'Update available',
    );
    expect(
      homeEnquiryStatusLabel(enquiry(id: 's', status: 'submitted')),
      'Submitted',
    );
  });

  Future<void> pumpFeed(
    WidgetTester tester, {
    List<EventPlanItem> plan = const [],
    List<FavoriteItem> favorites = const [],
    List<Enquiry> enquiries = const [],
    AuthSession? signedIn,
    Object? planError,
    Object? favoritesError,
    Object? enquiriesError,
    Future<List<EventPlanItem>> Function()? loadPlan,
    Future<List<FavoriteItem>> Function()? loadFavorites,
    Future<List<Enquiry>?> Function()? loadEnquiries,
    Future<List<CatalogService>> Function(String? department)? loadServices,
    VoidCallback? onPlanLoad,
    VoidCallback? onFavoritesLoad,
    VoidCallback? onEnquiriesLoad,
    VoidCallback? onEventTypesLoad,
    ValueChanged<CustomerTab>? onNavigate,
    Size size = const Size(390, 844),
  }) async {
    tester.view.physicalSize = Size(size.width * 3, size.height * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final userId = signedIn?.userId ?? 'home-feed-user';
    final prefsMap = <String, Object>{};
    if (plan.isNotEmpty) {
      prefsMap[eventPlanStorageKey(userId)] = [
        for (final item in plan) jsonEncode(item.toJson()),
      ];
    }
    SharedPreferences.setMockInitialValues(prefsMap);
    final prefs = await SharedPreferences.getInstance();

    await tester.pumpWidget(
      ProviderScope(
        key: UniqueKey(),
        overrides: [
          sessionProvider.overrideWith((ref) => _SessionNotifier(signedIn)),
          sessionUserIdProvider.overrideWithValue(signedIn?.userId),
          eventTypesProvider.overrideWith((ref) async {
            onEventTypesLoad?.call();
            return const [wedding];
          }),
          catalogServicesProvider.overrideWith((ref, department) async {
            final scripted = loadServices;
            if (scripted != null) return scripted(department);
            return const [photography];
          }),
          serviceCategoriesProvider.overrideWith(
            (ref) async => const <CatalogItem>[],
          ),
          eventsProvider.overrideWith(
            (ref) async => const <EventRecordSummary>[],
          ),
          occasionServicesProvider.overrideWith(
            (ref, code) async => const <CatalogService>[],
          ),
          occasionStagesProvider.overrideWith(
            (ref, code) async => const <OccasionStage>[],
          ),
          eventSelectionsProvider.overrideWith(
            (ref, code) async => const <CatalogSelection>[],
          ),
          catalogServiceProvider.overrideWith((ref, code) async => photography),
          serviceSubcategoriesProvider.overrideWith(
            (ref, code) async => const <CatalogSubcategory>[],
          ),
          serviceProductsProvider.overrideWith(
            (ref, code) async => const <CatalogProduct>[],
          ),
          trendingSearchesProvider.overrideWith(
            (ref) async => const <String>[],
          ),
          eventPlanStoreProvider.overrideWith((ref) {
            return _CountingPlanStore(
              prefs: prefs,
              userId: userId,
              onLoad: onPlanLoad,
              loadFn:
                  loadPlan ??
                  (planError == null ? null : () async => throw planError),
            );
          }),
          favoritesStoreProvider.overrideWith((ref) {
            return _CountingFavoritesStore(
              prefs: prefs,
              userId: userId,
              onLoad: onFavoritesLoad,
              loadFn: () async {
                final scripted = loadFavorites;
                if (scripted != null) return scripted();
                if (favoritesError != null) throw favoritesError;
                return favorites;
              },
            );
          }),
          if (loadEnquiries != null)
            enquiriesProvider.overrideWith((ref) => loadEnquiries())
          else if (enquiriesError != null)
            enquiriesProvider.overrideWith((ref) async => throw enquiriesError)
          else
            enquiriesProvider.overrideWith((ref) async {
              onEnquiriesLoad?.call();
              return enquiries;
            }),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: MediaQuery(
            data: MediaQueryData(size: size),
            child: Scaffold(body: CustomerHomeTab(onNavigate: onNavigate)),
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 80));
    await tester.pump(const Duration(milliseconds: 300));
  }

  Finder retryFor(String title) {
    final section = find.ancestor(
      of: find.text(title),
      matching: find.byType(HomeSectionError),
    );
    return find.descendant(of: section, matching: find.byType(TextButton));
  }

  testWidgets('Resume section is absent when all sources are empty', (
    tester,
  ) async {
    await pumpFeed(tester);
    expect(find.byKey(HomeResumeSection.sectionKey), findsNothing);
    expect(find.text('Pick up where you left off'), findsNothing);
    await tester.fling(
      find.byType(CustomScrollView),
      const Offset(0, -800),
      2000,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(HomeHowItWorksSection.sectionKey), findsOneWidget);
  });

  testWidgets('Plan-only resume uses one full-width card', (tester) async {
    CustomerTab? tab;
    await pumpFeed(
      tester,
      plan: const [planItem],
      onNavigate: (value) => tab = value,
    );
    expect(find.byKey(HomeResumeSection.sectionKey), findsOneWidget);
    expect(find.byKey(const Key('home-resume-plan')), findsOneWidget);
    expect(find.byKey(const Key('home-resume-saved')), findsNothing);
    expect(find.text('1 item'), findsOneWidget);
    expect(find.text('Cinematic Album'), findsOneWidget);
    expect(find.byKey(HomePlanPreviewSection.sectionKey), findsOneWidget);
    expect(find.text('photo.A1'), findsNothing);
    final card = tester.getRect(find.byKey(const Key('home-resume-plan')));
    expect(card.width, greaterThan(300));
    await tester.tap(find.byKey(const Key('home-resume-plan')));
    await tester.pump();
    expect(tab, CustomerTab.plan);
  });

  testWidgets('Saved-only resume opens existing Favorites screen', (
    tester,
  ) async {
    await pumpFeed(tester, favorites: [saved('p1', DateTime(2026, 8, 1))]);
    expect(find.text('1 saved item'), findsOneWidget);
    expect(find.text('Saved p1'), findsOneWidget);
    await tester.tap(find.byKey(const Key('home-resume-saved')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byType(FavoritesScreen), findsOneWidget);
    expect(find.byType(CustomerHomeTab), findsOneWidget);
  });

  testWidgets('Enquiry-only resume selects Enquiries tab', (tester) async {
    CustomerTab? tab;
    await pumpFeed(
      tester,
      signedIn: session,
      enquiries: [
        enquiry(
          id: '1',
          status: 'submitted',
          submittedAt: '2026-07-01T00:00:00.000Z',
          eventDate: '2026-12-12',
        ),
      ],
      onNavigate: (value) => tab = value,
    );
    expect(find.text('Wedding'), findsWidgets);
    expect(find.textContaining('ENQ-1'), findsOneWidget);
    expect(find.textContaining('Submitted'), findsOneWidget);
    await tester.tap(find.byKey(const Key('home-resume-enquiry')));
    await tester.pump();
    expect(tab, CustomerTab.enquiries);
  });

  testWidgets('Three resume cards form a peeking horizontal rail', (
    tester,
  ) async {
    await pumpFeed(
      tester,
      size: const Size(390, 844),
      signedIn: session,
      plan: const [planItem, planItemTwo],
      favorites: [
        saved('a', DateTime(2026, 8, 2)),
        saved('b', DateTime(2026, 8, 1)),
      ],
      enquiries: [
        enquiry(
          id: '1',
          status: 'received',
          submittedAt: '2026-06-01T00:00:00.000Z',
        ),
      ],
    );
    expect(find.text('2 items'), findsOneWidget);
    expect(find.text('2 saved items'), findsOneWidget);
    final first = tester.getRect(find.byKey(const Key('home-resume-plan')));
    final second = tester.getRect(find.byKey(const Key('home-resume-saved')));
    expect(first.width, lessThan(300));
    expect(second.left, lessThan(390));
    expect(second.right, greaterThan(390));
    final scrollable = find.descendant(
      of: find.byKey(HomeResumeSection.sectionKey),
      matching: find.byType(Scrollable),
    );
    final start = tester.state<ScrollableState>(scrollable).position.pixels;
    await tester.fling(scrollable, const Offset(-240, 0), 1000);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(
      tester.state<ScrollableState>(scrollable).position.pixels,
      greaterThan(start),
    );
  });

  testWidgets('Closed enquiries are excluded from Home resume', (tester) async {
    await pumpFeed(
      tester,
      signedIn: session,
      enquiries: [
        enquiry(
          id: 'c',
          status: 'closed',
          submittedAt: '2026-08-01T00:00:00.000Z',
        ),
        enquiry(
          id: 'k',
          status: 'cancelled',
          submittedAt: '2026-08-02T00:00:00.000Z',
        ),
      ],
    );
    expect(find.byKey(const Key('home-resume-enquiry')), findsNothing);
  });

  testWidgets('Unknown enquiry status is not shown raw', (tester) async {
    await pumpFeed(
      tester,
      signedIn: session,
      enquiries: [
        enquiry(id: 'u', status: 'internal_queue', createdAt: '2026-07-01'),
      ],
    );
    expect(find.text('internal_queue'), findsNothing);
    expect(find.textContaining('Update available'), findsOneWidget);
  });

  testWidgets('One resume provider error keeps sibling cards', (tester) async {
    await pumpFeed(
      tester,
      signedIn: session,
      plan: const [planItem],
      enquiriesError: Exception('enquiry-down'),
    );
    expect(find.byKey(const Key('home-resume-plan')), findsOneWidget);
    expect(find.byKey(const Key('home-resume-enquiry')), findsNothing);
    expect(find.text('Some recent activity is unavailable'), findsOneWidget);
    expect(find.text('enquiry-down'), findsNothing);
  });

  testWidgets('Plan initial error keeps a successful Saved card', (
    tester,
  ) async {
    await pumpFeed(
      tester,
      favorites: [saved('p1', DateTime(2026, 8, 1))],
      planError: Exception('plan-persistence-private'),
    );

    expect(find.byKey(const Key('home-resume-plan')), findsNothing);
    expect(find.byKey(const Key('home-resume-saved')), findsOneWidget);
    expect(find.text('Some recent activity is unavailable'), findsOneWidget);
    expect(find.text('plan-persistence-private'), findsNothing);
  });

  testWidgets('Favorites initial error keeps a successful Plan card', (
    tester,
  ) async {
    await pumpFeed(
      tester,
      plan: const [planItem],
      favoritesError: Exception('favorites-persistence-private'),
    );

    expect(find.byKey(const Key('home-resume-plan')), findsOneWidget);
    expect(find.byKey(const Key('home-resume-saved')), findsNothing);
    expect(find.text('Some recent activity is unavailable'), findsOneWidget);
    expect(find.text('favorites-persistence-private'), findsNothing);
  });

  testWidgets('Multiple resume failures render one safe activity notice', (
    tester,
  ) async {
    await pumpFeed(
      tester,
      signedIn: session,
      planError: Exception('plan-private'),
      favoritesError: Exception('favorites-private'),
      enquiriesError: Exception('enquiries-private'),
    );

    expect(find.text('Some recent activity is unavailable'), findsOneWidget);
    expect(find.byType(HomeSectionError), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
    for (final unsafe in [
      'plan-private',
      'favorites-private',
      'enquiries-private',
    ]) {
      expect(find.textContaining(unsafe), findsNothing);
    }
  });

  testWidgets('Activity retry reloads only failed resume sources', (
    tester,
  ) async {
    var planLoads = 0;
    var favoritesLoads = 0;
    var enquiryLoads = 0;
    await pumpFeed(
      tester,
      signedIn: session,
      loadPlan: () async {
        planLoads += 1;
        if (planLoads == 1) throw Exception('plan-first-load');
        return const [planItem];
      },
      loadFavorites: () async {
        favoritesLoads += 1;
        return [saved('safe', DateTime(2026, 8, 1))];
      },
      loadEnquiries: () async {
        enquiryLoads += 1;
        return const <Enquiry>[];
      },
    );
    expect(planLoads, 1);
    expect(favoritesLoads, 1);
    expect(enquiryLoads, 1);
    expect(find.byKey(const Key('home-resume-saved')), findsOneWidget);
    expect(find.text('Some recent activity is unavailable'), findsOneWidget);

    await tester.tap(retryFor('Some recent activity is unavailable'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(planLoads, 2);
    expect(favoritesLoads, 1);
    expect(enquiryLoads, 1);
    expect(find.byKey(const Key('home-resume-plan')), findsOneWidget);
    expect(find.byKey(const Key('home-resume-saved')), findsOneWidget);
    expect(find.text('Some recent activity is unavailable'), findsNothing);
    expect(find.text('plan-first-load'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Cached plan remains visible while refresh hangs', (
    tester,
  ) async {
    final hang = Completer<List<EventPlanItem>>();
    var loads = 0;
    SharedPreferences.setMockInitialValues({
      eventPlanStorageKey('home-feed-user'): [jsonEncode(planItem.toJson())],
    });
    final prefs = await SharedPreferences.getInstance();
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          eventTypesProvider.overrideWith((ref) async => const [wedding]),
          catalogServicesProvider.overrideWith(
            (ref, department) async => const [photography],
          ),
          serviceCategoriesProvider.overrideWith(
            (ref) async => const <CatalogItem>[],
          ),
          eventsProvider.overrideWith(
            (ref) async => const <EventRecordSummary>[],
          ),
          enquiriesProvider.overrideWith((ref) async => const <Enquiry>[]),
          eventPlanStoreProvider.overrideWith((ref) {
            return _SecondLoadHangStore(
              prefs: prefs,
              userId: 'home-feed-user',
              first: const [planItem],
              hang: hang,
              onLoad: () => ++loads,
            );
          }),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const MediaQuery(
            data: MediaQueryData(size: Size(390, 844)),
            child: Scaffold(body: CustomerHomeTab()),
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const Key('home-resume-plan')), findsOneWidget);
    expect(loads, 1);

    await tester.fling(
      find.byType(RefreshIndicator),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const Key('home-resume-plan')), findsOneWidget);
    expect(find.text('Cinematic Album'), findsOneWidget);
    hang.complete(const [planItem]);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byKey(const Key('home-resume-plan')), findsOneWidget);
  });

  testWidgets('Failed favorites refresh still starts Event Plan refresh', (
    tester,
  ) async {
    var planLoads = 0;
    var savedLoads = 0;
    await pumpFeed(
      tester,
      plan: const [planItem],
      favorites: [saved('p1', DateTime(2026, 8, 1))],
      onPlanLoad: () => ++planLoads,
      onFavoritesLoad: () {
        savedLoads += 1;
        if (savedLoads > 1) throw Exception('favorites-refresh');
      },
    );
    expect(planLoads, 1);
    expect(savedLoads, 1);
    await tester.fling(
      find.byType(RefreshIndicator),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));
    expect(planLoads, 2);
    expect(savedLoads, greaterThan(1));
    expect(find.text('favorites-refresh'), findsNothing);
    expect(find.byKey(const Key('home-resume-plan')), findsOneWidget);
    expect(find.byKey(const Key('home-resume-saved')), findsOneWidget);
    expect(find.text('Saved p1'), findsOneWidget);
    expect(
      find.text('Some sections couldn\u2019t be refreshed. Please try again.'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('Failed Plan refresh retains its card and reports once', (
    tester,
  ) async {
    var planLoads = 0;
    await pumpFeed(
      tester,
      plan: const [planItem],
      onPlanLoad: () {
        planLoads += 1;
        if (planLoads > 1) throw Exception('plan-refresh-private');
      },
    );
    expect(planLoads, 1);
    expect(find.byKey(const Key('home-resume-plan')), findsOneWidget);

    await tester.fling(
      find.byType(RefreshIndicator),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));

    expect(planLoads, 2);
    expect(find.byKey(const Key('home-resume-plan')), findsOneWidget);
    expect(find.text('Cinematic Album'), findsOneWidget);
    expect(find.text('plan-refresh-private'), findsNothing);
    expect(
      find.text('Some sections couldn\u2019t be refreshed. Please try again.'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('Failed enquiry refresh still starts catalogue refresh', (
    tester,
  ) async {
    var typesLoads = 0;
    var enquiryLoads = 0;
    await pumpFeed(
      tester,
      signedIn: session,
      onEventTypesLoad: () => ++typesLoads,
      onEnquiriesLoad: () {
        enquiryLoads += 1;
        if (enquiryLoads > 1) throw Exception('enquiry-refresh');
      },
      enquiries: [
        enquiry(id: '1', status: 'submitted', createdAt: '2026-07-01'),
      ],
    );
    expect(typesLoads, 1);
    final container = ProviderScope.containerOf(
      tester.element(find.byType(CustomerHomeTab)),
    );
    expect(container.read(sessionProvider)?.sessionId, session.sessionId);
    expect(find.byKey(const Key('home-resume-enquiry')), findsOneWidget);
    await tester.fling(
      find.byType(RefreshIndicator),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));
    expect(typesLoads, 2);
    expect(enquiryLoads, greaterThan(1));
    expect(find.text('enquiry-refresh'), findsNothing);
    expect(find.byKey(const Key('home-resume-enquiry')), findsOneWidget);
    expect(find.textContaining('ENQ-1'), findsOneWidget);
    expect(
      find.text('Some sections couldn\u2019t be refreshed. Please try again.'),
      findsOneWidget,
    );
    expect(container.read(sessionProvider)?.sessionId, session.sessionId);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Disposing Home during pending refresh is safe', (tester) async {
    await pumpFeed(tester);
    await tester.fling(
      find.byType(RefreshIndicator),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(seconds: 1));
    expect(tester.takeException(), isNull);
  });

  testWidgets('Final panel includes live plan count', (tester) async {
    await pumpFeed(tester, plan: const [planItem, planItemTwo]);
    await tester.fling(
      find.byType(CustomScrollView),
      const Offset(0, -1200),
      2000,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Review Event Plan (2 items)'), findsOneWidget);
  });
}

class _SecondLoadHangStore extends EventPlanStore {
  _SecondLoadHangStore({
    required super.prefs,
    required super.userId,
    required this.first,
    required this.hang,
    this.onLoad,
  });

  final List<EventPlanItem> first;
  final Completer<List<EventPlanItem>> hang;
  VoidCallback? onLoad;
  var _loads = 0;

  @override
  Future<List<EventPlanItem>> load() {
    _loads += 1;
    onLoad?.call();
    if (_loads == 1) return Future.value(first);
    return hang.future;
  }
}
