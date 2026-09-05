import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/core/providers/catalog_provider.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/core/widgets/image/app_image.dart';
import 'package:mee_events/features/customer/catalog/catalog_image_resolver.dart';
import 'package:mee_events/features/customer/navigation/customer_tab.dart';
import 'package:mee_events/features/customer/providers/event_record_providers.dart';
import 'package:mee_events/features/customer/providers/explore_intent_provider.dart';
import 'package:mee_events/features/customer/screens/category_detail_screen.dart';
import 'package:mee_events/features/customer/screens/home_tab.dart';
import 'package:mee_events/features/customer/screens/service_detail_screen.dart';
import 'package:mee_events/features/customer/search/customer_search_screen.dart';
import 'package:mee_events/features/customer/workspace/event_workspace_screen.dart';
import 'package:mee_events/features/customer/search/search_provider.dart';
import 'package:mee_events/features/customer/widgets/home/discovery_skeletons.dart';
import 'package:mee_events/features/customer/widgets/home/home_planning_guidance.dart';
import 'package:mee_events/features/customer/widgets/home/home_planning_hero.dart';
import 'package:mee_events/features/customer/widgets/home/home_search_bar.dart';
import 'package:mee_events/features/customer/widgets/home/occasion_section.dart';
import 'package:mee_events/features/customer/widgets/home/pick_up_section.dart';
import 'package:mee_events/features/customer/widgets/home/popular_services_section.dart';
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

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  const wedding = CatalogItem(
    code: 'wedding',
    displayName: 'Wedding',
    displayOrder: 1,
  );
  const birthday = CatalogItem(
    code: 'birthday',
    displayName: 'Birthday',
    displayOrder: 2,
  );
  const mehndi = CatalogItem(
    code: 'mehndi',
    displayName: 'Mehndi',
    displayOrder: 3,
  );
  const hiddenServiceEntry = CatalogItem(
    code: 'internal_service',
    displayName: 'Hidden Service Entry',
    displayOrder: 0,
    kind: 'service_entry',
  );
  const corporate = CatalogItem(
    code: 'corporate',
    displayName: 'Corporate Event',
    displayOrder: 4,
  );

  const photography = CatalogService(
    code: 'photography',
    displayName: 'Photography',
    departmentCode: 'PHOTO',
    entityKind: 'service',
    displayOrder: 1,
    productCount: 4,
  );
  const catering = CatalogService(
    code: 'catering',
    displayName: 'Catering',
    departmentCode: 'FOOD',
    entityKind: 'service',
    displayOrder: 2,
    subcategoryCount: 3,
  );

  String dateOnly(DateTime date) {
    final year = date.year.toString().padLeft(4, '0');
    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');
    return '$year-$month-$day';
  }

  EventRecordSummary namedEvent({
    required String id,
    required String name,
    DateTime? date,
    String? rawEventDate,
    String eventTypeName = 'Wedding',
    String status = 'planning',
    String? bookingId,
    String createdAt = '2026-01-01T00:00:00.000Z',
    String updatedAt = '2026-01-01T00:00:00.000Z',
  }) {
    return EventRecordSummary(
      id: id,
      eventNumber: 'E-$id',
      bookingId: bookingId ?? 'b-$id',
      quotationId: 'q-$id',
      leadId: 'l-$id',
      enquiryId: 'en-$id',
      customerId: 'c1',
      eventTypeName: eventTypeName,
      eventName: name,
      budgetAmount: '0',
      advancePaid: '0',
      pendingAmount: '0',
      status: status,
      priority: 'normal',
      createdAt: createdAt,
      updatedAt: updatedAt,
      eventDate: rawEventDate ?? (date == null ? null : dateOnly(date)),
    );
  }

  EventRecordSummary upcomingWedding() {
    return namedEvent(
      id: 'evt-1',
      name: 'Ananya & Rohan',
      date: DateTime.now().add(const Duration(days: 40)),
    );
  }

  List<Override> homeOverrides({
    List<CatalogItem> occasions = const [wedding, birthday, mehndi],
    List<CatalogItem> serviceCategories = const [],
    List<CatalogService> services = const [photography, catering],
    List<EventRecordSummary>? events = const [],
    List<CatalogService> occasionServices = const [],
    bool hangEventTypes = false,
    bool hangServices = false,
    bool hangEvents = false,
    Object? eventTypesError,
    Object? servicesError,
    int Function()? onEventTypesLoad,
    int Function()? onServicesLoad,
    int Function()? onEventsLoad,
    int Function()? onOccasionServicesLoad,
    int Function()? onEnquiriesLoad,
    Future<List<CatalogItem>> Function()? loadEventTypes,
    List<Enquiry>? enquiries = const [],
    Object? enquiriesError,
    bool hangEnquiries = false,
  }) {
    return [
      if (eventTypesError != null)
        eventTypesProvider.overrideWith((ref) async => throw eventTypesError)
      else if (hangEventTypes)
        eventTypesProvider.overrideWith(
          (ref) => Completer<List<CatalogItem>>().future,
        )
      else if (loadEventTypes != null)
        eventTypesProvider.overrideWith((ref) => loadEventTypes())
      else
        eventTypesProvider.overrideWith((ref) async {
          onEventTypesLoad?.call();
          return occasions;
        }),
      if (servicesError != null)
        catalogServicesProvider.overrideWith(
          (ref, department) async => throw servicesError,
        )
      else if (hangServices)
        catalogServicesProvider.overrideWith(
          (ref, department) => Completer<List<CatalogService>>().future,
        )
      else
        catalogServicesProvider.overrideWith((ref, department) async {
          onServicesLoad?.call();
          if (department == null) return services;
          return services
              .where((item) => item.departmentCode == department)
              .toList();
        }),
      serviceCategoriesProvider.overrideWith((ref) async => serviceCategories),
      if (hangEvents)
        eventsProvider.overrideWith(
          (ref) => Completer<List<EventRecordSummary>?>().future,
        )
      else
        eventsProvider.overrideWith((ref) async {
          onEventsLoad?.call();
          return events;
        }),
      occasionServicesProvider.overrideWith((ref, code) async {
        onOccasionServicesLoad?.call();
        if (code == 'wedding') return occasionServices;
        return const <CatalogService>[];
      }),
      occasionStagesProvider.overrideWith(
        (ref, code) async => const <OccasionStage>[],
      ),
      eventSelectionsProvider.overrideWith(
        (ref, code) async => const <CatalogSelection>[],
      ),
      catalogServiceProvider.overrideWith((ref, code) async {
        return services.firstWhere(
          (item) => item.code == code,
          orElse: () => CatalogService(
            code: code,
            displayName: code,
            departmentCode: 'GENERAL',
            entityKind: 'service',
            displayOrder: 0,
          ),
        );
      }),
      serviceSubcategoriesProvider.overrideWith(
        (ref, code) async => const <CatalogSubcategory>[],
      ),
      serviceProductsProvider.overrideWith(
        (ref, code) async => const <CatalogProduct>[],
      ),
      trendingSearchesProvider.overrideWith((ref) async => const <String>[]),
      if (enquiriesError != null)
        enquiriesProvider.overrideWith((ref) async => throw enquiriesError)
      else if (hangEnquiries)
        enquiriesProvider.overrideWith(
          (ref) => Completer<List<Enquiry>?>().future,
        )
      else
        enquiriesProvider.overrideWith((ref) async {
          onEnquiriesLoad?.call();
          return enquiries;
        }),
    ];
  }

  Future<void> pumpHome(
    WidgetTester tester, {
    Size size = const Size(390, 844),
    double textScale = 1,
    bool disableAnimations = false,
    bool accessibleNavigation = false,
    List<Override> overrides = const [],
    ValueChanged<CustomerTab>? onNavigate,
  }) async {
    tester.view.physicalSize = Size(size.width * 3, size.height * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        key: UniqueKey(),
        overrides: overrides,
        child: MaterialApp(
          theme: AppTheme.light,
          home: MediaQuery(
            data: MediaQueryData(
              size: size,
              textScaler: TextScaler.linear(textScale),
              disableAnimations: disableAnimations,
              accessibleNavigation: accessibleNavigation,
            ),
            child: Scaffold(body: CustomerHomeTab(onNavigate: onNavigate)),
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.pump(const Duration(milliseconds: 300));
  }

  Future<void> revealPlanSlide(WidgetTester tester) async {
    // Plan CTA is always visible on the single hero.
  }

  void expectNoFlutterException(WidgetTester tester) {
    expect(
      tester.takeException(),
      isNull,
      reason: 'Home produced an unexpected Flutter exception',
    );
  }

  List<CatalogItem> eightOccasions() {
    return [
      for (var i = 1; i <= 8; i++)
        CatalogItem(
          code: 'occ_$i',
          displayName: 'Occasion $i',
          displayOrder: i,
        ),
    ];
  }

  void expectOccasionGridGeometry(
    WidgetTester tester, {
    required Size screen,
    required int minFullyVisibleColumns,
    required bool requireFourthPeek,
  }) {
    final first = tester.getRect(
      find.byKey(const ValueKey<String>('home-occasion-occ_1')),
    );
    final second = tester.getRect(
      find.byKey(const ValueKey<String>('home-occasion-occ_2')),
    );
    expect(first.top, closeTo(second.top, 4));
    expect(second.left, greaterThan(first.left));
    expect(first.left, lessThan(screen.width));
    expect(first.right, lessThan(screen.width + 0.5));
    if (requireFourthPeek) {
      final third = tester.getRect(
        find.byKey(const ValueKey<String>('home-occasion-occ_3')),
      );
      expect(third.left, lessThan(screen.width));
      expect(third.right, greaterThan(screen.width));
      expect(screen.width - third.left, greaterThanOrEqualTo(24));
    }
  }

  testWidgets('API event types drive occasion tiles', (tester) async {
    await pumpHome(tester, overrides: homeOverrides());
    expect(
      find.descendant(
        of: find.byType(OccasionSection),
        matching: find.text('Wedding'),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: find.byType(OccasionSection),
        matching: find.text('Birthday'),
      ),
      findsOneWidget,
    );
    expectNoFlutterException(tester);
  });

  testWidgets('service_entry event types are hidden', (tester) async {
    await pumpHome(
      tester,
      overrides: homeOverrides(
        occasions: [hiddenServiceEntry, wedding, birthday],
      ),
    );
    expect(find.text('Hidden Service Entry'), findsNothing);
    expect(
      find.descendant(
        of: find.byType(OccasionSection),
        matching: find.text('Wedding'),
      ),
      findsOneWidget,
    );
    expectNoFlutterException(tester);
  });

  testWidgets('occasion tiles follow displayOrder', (tester) async {
    await pumpHome(
      tester,
      overrides: homeOverrides(
        occasions: [
          CatalogItem(code: 'z', displayName: 'Later', displayOrder: 9),
          CatalogItem(code: 'a', displayName: 'First', displayOrder: 1),
          CatalogItem(code: 'm', displayName: 'Middle', displayOrder: 5),
        ],
      ),
    );
    final first = tester.getTopLeft(find.text('First'));
    final middle = tester.getTopLeft(find.text('Middle'));
    final later = tester.getTopLeft(find.text('Later'));
    expect(first.dx, lessThan(middle.dx));
    expect(middle.dx, lessThan(later.dx));
    expect(first.dy, closeTo(middle.dy, 6));
    expectNoFlutterException(tester);
  });

  testWidgets('Home limits occasions and keeps View all', (tester) async {
    final occasions = [
      for (var i = 1; i <= 10; i++)
        CatalogItem(
          code: 'occ_$i',
          displayName: 'Occasion $i',
          displayOrder: i,
        ),
    ];
    await pumpHome(tester, overrides: homeOverrides(occasions: occasions));
    expect(find.text('Occasion 1'), findsOneWidget);
    expect(find.text('Occasion 8'), findsOneWidget);
    expect(find.text('Occasion 9'), findsOneWidget);
    expect(find.text('Occasion 10'), findsOneWidget);
    expect(find.bySemanticsLabel('View all occasions'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('API services drive the event services section', (tester) async {
    await pumpHome(tester, overrides: homeOverrides());
    expect(find.text('More services'), findsOneWidget);
    expect(find.text('Photography'), findsOneWidget);
    expect(find.text('Catering'), findsOneWidget);
    expect(find.text('4 options'), findsOneWidget);
    expect(find.text('3 categories'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('service cards follow displayOrder', (tester) async {
    await pumpHome(
      tester,
      overrides: homeOverrides(
        services: [
          CatalogService(
            code: 'late',
            displayName: 'Late Service',
            departmentCode: 'X',
            entityKind: 'service',
            displayOrder: 8,
          ),
          CatalogService(
            code: 'early',
            displayName: 'Early Service',
            departmentCode: 'X',
            entityKind: 'service',
            displayOrder: 1,
          ),
        ],
      ),
    );
    expect(
      tester.getTopLeft(find.text('Early Service')).dx,
      lessThan(tester.getTopLeft(find.text('Late Service')).dx),
    );
    expectNoFlutterException(tester);
  });

  testWidgets('Home limits the service subset', (tester) async {
    final services = [
      for (var i = 1; i <= 12; i++)
        CatalogService(
          code: 'svc_$i',
          displayName: 'Service $i',
          departmentCode: 'DEPT',
          entityKind: 'service',
          displayOrder: i,
        ),
    ];
    await pumpHome(tester, overrides: homeOverrides(services: services));
    expect(find.text('Service 1'), findsOneWidget);
    expect(find.text('Service 10'), findsOneWidget);
    expect(find.text('Service 11'), findsOneWidget);
    expect(find.text('Service 12'), findsOneWidget);
    expect(tester.widgetList(find.text('Service 1')).length, 1);
    expectNoFlutterException(tester);
  });

  testWidgets('Home does not show fake commercial or favourite chrome', (
    tester,
  ) async {
    await pumpHome(tester, overrides: homeOverrides());
    expect(find.textContaining('Popular'), findsNothing);
    expect(find.textContaining('Trending'), findsNothing);
    expect(find.textContaining('Enquire for details'), findsNothing);
    expect(find.textContaining('500+'), findsNothing);
    expect(find.textContaining('Verified Partners'), findsNothing);
    expect(find.textContaining('Dedicated Manager'), findsNothing);
    expect(find.textContaining('₹'), findsNothing);
    expect(find.byType(MeFavoriteButton), findsNothing);
    expect(find.byIcon(Icons.favorite_border_rounded), findsNothing);
    expect(find.byIcon(Icons.favorite_rounded), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Search opens the existing search screen', (tester) async {
    await pumpHome(tester, overrides: homeOverrides());
    await tester.tap(find.byType(HomeSearchBar));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byType(CustomerSearchScreen), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Start planning requests typed Plan tab', (tester) async {
    CustomerTab? destination;
    await pumpHome(
      tester,
      overrides: homeOverrides(),
      onNavigate: (tab) => destination = tab,
    );
    await revealPlanSlide(tester);
    await tester.tap(find.byKey(HomePlanningHero.ctaKey));
    await tester.pump();
    expect(destination, CustomerTab.plan);
    expectNoFlutterException(tester);
  });

  testWidgets('Occasion View all requests Explore Occasions', (tester) async {
    CustomerTab? destination;
    await pumpHome(
      tester,
      overrides: homeOverrides(),
      onNavigate: (tab) => destination = tab,
    );
    await tester.tap(find.bySemanticsLabel('View all occasions'));
    await tester.pump();
    expect(destination, CustomerTab.explore);
    final container = ProviderScope.containerOf(
      tester.element(find.byType(CustomerHomeTab)),
    );
    expect(container.read(exploreIntentProvider), 0);
    expectNoFlutterException(tester);
  });

  testWidgets('Service View all requests Explore Services', (tester) async {
    CustomerTab? destination;
    await pumpHome(
      tester,
      overrides: homeOverrides(),
      onNavigate: (tab) => destination = tab,
    );
    await tester.tap(find.bySemanticsLabel('View all services'));
    await tester.pump();
    expect(destination, CustomerTab.explore);
    final container = ProviderScope.containerOf(
      tester.element(find.byType(CustomerHomeTab)),
    );
    expect(container.read(exploreIntentProvider), 1);
    expectNoFlutterException(tester);
  });

  testWidgets('Occasion tile opens category detail', (tester) async {
    await pumpHome(tester, overrides: homeOverrides());
    await tester.tap(
      find.descendant(
        of: find.byType(OccasionSection),
        matching: find.text('Wedding'),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byType(CategoryDetailScreen), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Service tile opens service detail', (tester) async {
    await pumpHome(tester, overrides: homeOverrides());
    await tester.tap(find.text('Photography'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byType(ServiceDetailScreen), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Upcoming event produces a resume state', (tester) async {
    final event = upcomingWedding();
    await pumpHome(tester, overrides: homeOverrides(events: [event]));
    await revealPlanSlide(tester);
    expect(find.text('Ananya & Rohan'), findsOneWidget);
    expect(find.text('Resume plan'), findsOneWidget);
    expect(find.text('Start planning'), findsNothing);
    expect(
      find.textContaining(formatHomeEventDate(event.eventDate)!),
      findsOneWidget,
    );
    expectNoFlutterException(tester);
  });

  testWidgets('No upcoming event produces start-planning state', (
    tester,
  ) async {
    await pumpHome(tester, overrides: homeOverrides(events: const []));
    await revealPlanSlide(tester);
    expect(find.text('Start planning'), findsOneWidget);
    expect(find.text('Resume plan'), findsNothing);
    expect(find.byType(HomePlanningHero), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Nearest of multiple future events is selected', (tester) async {
    final nearer = DateTime.now().add(const Duration(days: 12));
    final farther = DateTime.now().add(const Duration(days: 90));
    await pumpHome(
      tester,
      overrides: homeOverrides(
        events: [
          namedEvent(id: 'far', name: 'Later Celebration', date: farther),
          namedEvent(id: 'near', name: 'Sooner Celebration', date: nearer),
        ],
      ),
    );
    await revealPlanSlide(tester);
    expect(find.text('Sooner Celebration'), findsOneWidget);
    expect(find.text('Later Celebration'), findsNothing);
    expect(find.text('Resume plan'), findsOneWidget);
    expect(find.text('Start planning'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Past-dated active events remain resumable', (tester) async {
    final past = DateTime.utc(2020, 1, 1);
    await pumpHome(
      tester,
      overrides: homeOverrides(
        events: [namedEvent(id: 'old', name: 'Old Garden Party', date: past)],
      ),
    );
    await revealPlanSlide(tester);
    expect(find.text('Resume plan'), findsOneWidget);
    expect(find.text('Old Garden Party'), findsWidgets);
    expect(find.text('Start planning'), findsNothing);
    expectNoFlutterException(tester);
  });

  test('completed-event selection uses authoritative lifecycle status', () {
    final now = DateTime.utc(2026, 9, 5, 12);
    final past = DateTime.utc(2026, 8, 1);
    final future = DateTime.utc(2026, 10, 1);
    final completed = namedEvent(
      id: 'completed',
      name: 'Completed Wedding',
      date: future,
      status: 'completed',
    );
    final activePast = namedEvent(
      id: 'active-past',
      name: 'Active Past Event',
      date: past,
      status: 'preparation',
    );
    final cancelled = namedEvent(
      id: 'cancelled',
      name: 'Cancelled Event',
      date: future,
      status: 'cancelled',
    );

    expect(pickHomeCompletedEvent([completed]), same(completed));
    expect(pickHomeCompletedEvent([activePast]), isNull);
    expect(pickHomeCompletedEvent([cancelled]), isNull);
    expect(pickHomeUpcomingEvent([completed, cancelled], now: now), isNull);
  });

  test('past event_running remains primary over concluded history', () {
    final now = DateTime.utc(2026, 9, 5, 12);
    final running = namedEvent(
      id: 'running',
      name: 'Event in progress',
      date: DateTime.utc(2026, 8, 1),
      status: 'event_running',
    );
    final completed = namedEvent(
      id: 'completed',
      name: 'Completed history',
      date: DateTime.utc(2026, 9, 1),
      status: 'completed',
    );

    expect(
      pickHomeUpcomingEvent([running, completed], now: now),
      same(running),
    );
    expect(
      pickHomeUpcomingEvent([completed, running], now: now),
      same(running),
    );
  });

  test('past preparation and manager assignment remain active', () {
    final now = DateTime.utc(2026, 9, 5, 12);
    final preparation = namedEvent(
      id: 'preparation',
      name: 'Preparation',
      date: DateTime.utc(2026, 7, 1),
      status: 'preparation',
    );
    final managerAssigned = namedEvent(
      id: 'manager',
      name: 'Manager assigned',
      date: DateTime.utc(2026, 8, 1),
      status: 'manager_assigned',
    );

    expect(pickHomeUpcomingEvent([preparation], now: now), same(preparation));
    expect(
      pickHomeUpcomingEvent([managerAssigned], now: now),
      same(managerAssigned),
    );
  });

  test('current or future active event outranks stale active history', () {
    final now = DateTime.utc(2026, 9, 5, 12);
    final stale = namedEvent(
      id: 'stale',
      name: 'Stale active event',
      date: DateTime.utc(2026, 7, 1),
      status: 'event_running',
    );
    final upcoming = namedEvent(
      id: 'upcoming',
      name: 'Upcoming active event',
      date: DateTime.utc(2026, 9, 10),
      status: 'planning',
    );
    final fartherFuture = namedEvent(
      id: 'farther-future',
      name: 'Farther future active event',
      date: DateTime.utc(2026, 10, 1),
      status: 'booking_confirmed',
    );

    expect(
      pickHomeUpcomingEvent([fartherFuture, stale, upcoming], now: now),
      same(upcoming),
    );
    expect(
      pickHomeUpcomingEvent([upcoming, stale, fartherFuture], now: now),
      same(upcoming),
    );
  });

  test('most recent past active event wins when all active dates are past', () {
    final now = DateTime.utc(2026, 9, 5, 12);
    final older = namedEvent(
      id: 'older-active',
      name: 'Older active event',
      date: DateTime.utc(2026, 6, 1),
      status: 'manager_assigned',
    );
    final newer = namedEvent(
      id: 'newer-active',
      name: 'Newer active event',
      date: DateTime.utc(2026, 8, 1),
      status: 'preparation',
    );

    expect(pickHomeUpcomingEvent([older, newer], now: now), same(newer));
    expect(pickHomeUpcomingEvent([newer, older], now: now), same(newer));
  });

  test('injected relevance cutoff is deterministic at both boundaries', () {
    final now = DateTime.utc(2026, 9, 5, 12);
    final cutoff = now.subtract(const Duration(days: 1));
    final exact = namedEvent(
      id: 'exact',
      name: 'Exact cutoff',
      rawEventDate: cutoff.toIso8601String(),
      status: 'ready',
    );
    final inside = namedEvent(
      id: 'inside',
      name: 'Inside cutoff',
      rawEventDate: cutoff
          .add(const Duration(milliseconds: 1))
          .toIso8601String(),
      status: 'ready',
    );
    final outside = namedEvent(
      id: 'outside',
      name: 'Outside cutoff',
      rawEventDate: cutoff
          .subtract(const Duration(milliseconds: 1))
          .toIso8601String(),
      status: 'event_running',
    );

    expect(
      pickHomeUpcomingEvent([outside, inside, exact], now: now),
      same(exact),
    );
    expect(
      pickHomeUpcomingEvent([exact, inside, outside], now: now),
      same(exact),
    );
    expect(pickHomeUpcomingEvent([outside, inside], now: now), same(inside));
    expect(pickHomeUpcomingEvent([outside], now: now), same(outside));
  });

  test('missing and invalid active dates use deterministic fallbacks', () {
    final now = DateTime.utc(2026, 9, 5, 12);
    final missing = namedEvent(
      id: 'missing-active',
      name: 'Missing active date',
      status: 'planning',
      updatedAt: '2026-08-01T00:00:00.000Z',
    );
    final invalid = namedEvent(
      id: 'invalid-active',
      name: 'Invalid active date',
      rawEventDate: 'not-a-date',
      status: 'worker_assigned',
      updatedAt: '2026-09-01T00:00:00.000Z',
    );
    final validPast = namedEvent(
      id: 'valid-past',
      name: 'Valid past active date',
      date: DateTime.utc(2026, 1, 1),
      status: 'created',
    );

    expect(pickHomeUpcomingEvent([missing, invalid], now: now), same(invalid));
    expect(pickHomeUpcomingEvent([invalid, missing], now: now), same(invalid));
    expect(
      pickHomeUpcomingEvent([missing, invalid, validPast], now: now),
      same(validPast),
    );
  });

  test('settlement pending and closed are concluded lifecycle states', () {
    final settlementPending = namedEvent(
      id: 'settlement',
      name: 'Settlement Pending Event',
      date: DateTime(2026, 8, 20),
      status: 'settlement_pending',
    );
    final closed = namedEvent(
      id: 'closed',
      name: 'Closed Event',
      date: DateTime(2026, 8, 21),
      status: 'closed',
    );

    expect(isHomeConcludedEvent(settlementPending), isTrue);
    expect(isHomeConcludedEvent(closed), isTrue);
    expect(
      pickHomeCompletedEvent([settlementPending]),
      same(settlementPending),
    );
    expect(pickHomeCompletedEvent([closed]), same(closed));
  });

  test('most recent completed event is selected deterministically', () {
    final older = namedEvent(
      id: 'older',
      name: 'Older Event',
      date: DateTime(2026, 7, 1),
      status: 'completed',
      updatedAt: '2026-09-01T00:00:00.000Z',
    );
    final newer = namedEvent(
      id: 'newer',
      name: 'Newer Event',
      date: DateTime(2026, 8, 1),
      status: 'closed',
      updatedAt: '2026-08-02T00:00:00.000Z',
    );

    expect(pickHomeCompletedEvent([newer, older]), same(newer));
    expect(pickHomeCompletedEvent([older, newer]), same(newer));
  });

  test('invalid and absent completed dates use stable safe fallbacks', () {
    final invalid = namedEvent(
      id: 'invalid',
      name: 'Invalid Date Event',
      rawEventDate: 'not-a-date',
      status: 'completed',
      updatedAt: '2026-08-01T00:00:00.000Z',
    );
    final absent = namedEvent(
      id: 'absent',
      name: 'Absent Date Event',
      status: 'closed',
      updatedAt: '2026-09-01T00:00:00.000Z',
    );
    final stableTie = namedEvent(
      id: 'z-stable',
      name: 'Stable Tie Event',
      rawEventDate: 'invalid',
      status: 'settlement_pending',
      createdAt: 'invalid',
      updatedAt: 'invalid',
    );

    expect(pickHomeCompletedEvent([invalid, absent]), same(absent));
    expect(
      pickHomeCompletedEvent([
        stableTie,
        namedEvent(
          id: 'a-stable',
          name: 'Other Stable Tie',
          status: 'completed',
          createdAt: 'invalid',
          updatedAt: 'invalid',
        ),
      ]),
      same(stableTie),
    );
  });

  testWidgets('completed status produces a truthful completed Home state', (
    tester,
  ) async {
    final completed = namedEvent(
      id: 'done',
      name: 'Ananya & Rohan',
      date: DateTime(2026, 8, 20),
      status: 'completed',
    );
    await pumpHome(tester, overrides: homeOverrides(events: [completed]));

    expect(find.text('Ananya & Rohan is complete'), findsOneWidget);
    expect(find.text('Plan another event'), findsOneWidget);
    expect(find.byKey(const Key('home-resume-completed')), findsOneWidget);
    expect(find.text('View event'), findsOneWidget);
    expect(find.text('Resume plan'), findsNothing);
    expect(find.text('Start planning'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('cancelled event is not presented as a completed celebration', (
    tester,
  ) async {
    final cancelled = namedEvent(
      id: 'cancelled',
      name: 'Cancelled Celebration',
      date: DateTime.utc(2100, 1, 1),
      status: 'cancelled',
    );
    await pumpHome(tester, overrides: homeOverrides(events: [cancelled]));

    expect(find.text('Start planning'), findsOneWidget);
    expect(find.text('Plan another event'), findsNothing);
    expect(find.byKey(const Key('home-resume-completed')), findsNothing);
    expect(find.textContaining('Cancelled Celebration'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('active upcoming event remains the primary Home context', (
    tester,
  ) async {
    final completed = namedEvent(
      id: 'done',
      name: 'Completed Celebration',
      date: DateTime.utc(2020, 1, 1),
      status: 'completed',
    );
    final active = namedEvent(
      id: 'active',
      name: 'Upcoming Celebration',
      date: DateTime.utc(2100, 1, 1),
      status: 'preparation',
    );
    await pumpHome(
      tester,
      overrides: homeOverrides(events: [completed, active]),
    );

    expect(find.text('Upcoming Celebration'), findsWidgets);
    expect(find.text('Resume plan'), findsOneWidget);
    expect(find.text('Plan another event'), findsNothing);
    expect(find.byKey(const Key('home-resume-completed')), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('past active work prevents completed Home fallback', (
    tester,
  ) async {
    final running = namedEvent(
      id: 'running',
      name: 'Celebration still running',
      date: DateTime.utc(2020, 1, 1),
      status: 'event_running',
    );
    final completed = namedEvent(
      id: 'done',
      name: 'Older completed celebration',
      date: DateTime.utc(2025, 1, 1),
      status: 'completed',
    );
    await pumpHome(
      tester,
      overrides: homeOverrides(events: [completed, running]),
    );

    expect(find.text('Celebration still running'), findsWidgets);
    expect(find.text('Resume plan'), findsOneWidget);
    expect(find.text('Plan another event'), findsNothing);
    expect(find.textContaining('is complete'), findsNothing);
    expect(find.byKey(const Key('home-resume-completed')), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('completed card opens workspace with the correct booking ID', (
    tester,
  ) async {
    final completed = namedEvent(
      id: 'done',
      name: 'Completed Celebration',
      date: DateTime(2026, 8, 20),
      status: 'closed',
      bookingId: 'booking-correct',
    );
    await pumpHome(tester, overrides: homeOverrides(events: [completed]));

    await tester.tap(find.byKey(const Key('home-resume-completed')));
    await tester.pumpAndSettle();

    final workspace = tester.widget<EventWorkspaceScreen>(
      find.byType(EventWorkspaceScreen),
    );
    expect(workspace.bookingId, 'booking-correct');
    expectNoFlutterException(tester);
  });

  testWidgets('missing booking ID hides the completed workspace action', (
    tester,
  ) async {
    final completed = namedEvent(
      id: 'done',
      name: 'Completed Celebration',
      date: DateTime(2026, 8, 20),
      status: 'closed',
      bookingId: '   ',
    );
    await pumpHome(tester, overrides: homeOverrides(events: [completed]));

    expect(find.text('Completed Celebration is complete'), findsOneWidget);
    expect(find.byKey(const Key('home-resume-completed')), findsNothing);
    expect(find.text('View event'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('completed Home makes no unimplemented follow-up promises', (
    tester,
  ) async {
    final completed = namedEvent(
      id: 'done',
      name: 'Completed Celebration',
      date: DateTime(2026, 8, 20),
      status: 'settlement_pending',
    );
    await pumpHome(tester, overrides: homeOverrides(events: [completed]));

    for (final unsupported in [
      'Documents',
      'Feedback',
      'Payment',
      'Refund',
      'Photos',
      'Memories',
    ]) {
      expect(find.textContaining(unsupported), findsNothing);
    }
    expectNoFlutterException(tester);
  });

  testWidgets('Contextual services appear only for a mapped occasion', (
    tester,
  ) async {
    const floral = CatalogService(
      code: 'floral',
      displayName: 'Floral Decor',
      departmentCode: 'DECOR',
      entityKind: 'service',
      displayOrder: 1,
    );
    await pumpHome(
      tester,
      overrides: homeOverrides(
        events: [upcomingWedding()],
        occasionServices: const [floral],
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.text('For Your Wedding'), findsOneWidget);
    expect(find.text('Floral Decor'), findsOneWidget);
    expect(find.text('More services', skipOffstage: false), findsOneWidget);
    expect(find.text('Catering', skipOffstage: false), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Unmapped upcoming event does not invent contextual services', (
    tester,
  ) async {
    const floral = CatalogService(
      code: 'floral',
      displayName: 'Floral Decor',
      departmentCode: 'DECOR',
      entityKind: 'service',
      displayOrder: 1,
    );
    await pumpHome(
      tester,
      overrides: homeOverrides(
        occasions: const [corporate],
        events: [
          namedEvent(
            id: 'evt-2',
            name: 'Office Dinner',
            date: DateTime.now().add(const Duration(days: 20)),
            eventTypeName: 'Private Dinner',
          ),
        ],
        occasionServices: const [floral],
      ),
    );
    expect(find.text('For Your Wedding'), findsNothing);
    expect(find.text('Floral Decor'), findsNothing);
    await revealPlanSlide(tester);
    expect(find.text('Resume plan'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Loading skeletons appear per section', (tester) async {
    await pumpHome(
      tester,
      overrides: homeOverrides(
        hangEventTypes: true,
        hangServices: true,
        hangEvents: true,
      ),
    );
    expect(find.byType(HomeHeroSkeleton), findsOneWidget);
    expect(find.byType(HomeOccasionRailSkeleton), findsOneWidget);
    expect(find.byType(HomeServiceRailSkeleton), findsOneWidget);
    expect(find.byType(HomeSearchBar), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('One provider error does not hide successful sections', (
    tester,
  ) async {
    await pumpHome(
      tester,
      overrides: homeOverrides(eventTypesError: Exception('catalog-down')),
    );
    expect(find.text('Occasions unavailable'), findsOneWidget);
    expect(find.text('catalog-down'), findsNothing);
    expect(find.text('More services'), findsOneWidget);
    expect(find.text('Photography'), findsOneWidget);
    await revealPlanSlide(tester);
    expect(find.text('Start planning'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Pull-to-refresh reloads Home providers', (tester) async {
    var typesLoads = 0;
    var servicesLoads = 0;
    var eventsLoads = 0;
    var occasionLoads = 0;
    var enquiryLoads = 0;
    await pumpHome(
      tester,
      overrides: homeOverrides(
        events: [upcomingWedding()],
        occasionServices: const [photography],
        onEventTypesLoad: () => ++typesLoads,
        onServicesLoad: () => ++servicesLoads,
        onEventsLoad: () => ++eventsLoads,
        onOccasionServicesLoad: () => ++occasionLoads,
        onEnquiriesLoad: () => ++enquiryLoads,
      ),
    );
    expect(typesLoads, 1);
    expect(servicesLoads, greaterThanOrEqualTo(1));
    expect(eventsLoads, 1);
    expect(occasionLoads, 1);
    expect(enquiryLoads, 0);

    await tester.fling(
      find.byType(RefreshIndicator),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));

    expect(typesLoads, 2);
    expect(eventsLoads, 2);
    expect(occasionLoads, 2);
    expect(servicesLoads, greaterThan(1));
    expect(enquiryLoads, 1);
    expectNoFlutterException(tester);
  });

  testWidgets('Refresh stops after Home is disposed', (tester) async {
    final refreshTypes = Completer<List<CatalogItem>>();
    var typesLoads = 0;
    var servicesLoads = 0;
    var eventsLoads = 0;
    var occasionLoads = 0;

    await pumpHome(
      tester,
      overrides: homeOverrides(
        events: [upcomingWedding()],
        occasionServices: const [photography],
        onServicesLoad: () => ++servicesLoads,
        onEventsLoad: () => ++eventsLoads,
        onOccasionServicesLoad: () => ++occasionLoads,
        loadEventTypes: () {
          typesLoads++;
          if (typesLoads == 1) {
            return Future.value(const [wedding, birthday, mehndi]);
          }
          return refreshTypes.future;
        },
      ),
    );
    expect(typesLoads, 1);
    final initialServices = servicesLoads;
    final initialEvents = eventsLoads;
    final initialOccasion = occasionLoads;
    expect(initialEvents, 1);
    expect(initialOccasion, 1);

    await tester.fling(
      find.byType(RefreshIndicator),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(typesLoads, 2);
    expect(servicesLoads, greaterThan(initialServices));
    expect(eventsLoads, greaterThan(initialEvents));
    expect(occasionLoads, greaterThan(initialOccasion));

    await tester.pumpWidget(const SizedBox.shrink());
    refreshTypes.complete(const [wedding, birthday, mehndi]);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(seconds: 1));

    expectNoFlutterException(tester);
  });

  testWidgets('Missing images use branded fallback not a broken icon', (
    tester,
  ) async {
    await pumpHome(tester, overrides: homeOverrides(occasions: const [mehndi]));
    expect(find.byKey(HomeCatalogVisual.fallbackKey), findsWidgets);
    expect(find.byIcon(Icons.image_not_supported_outlined), findsNothing);
    expect(find.byIcon(Icons.spa_outlined), findsWidgets);
    expect(find.text('Mehndi'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('No timer remains pending after Home disposal', (tester) async {
    await pumpHome(tester, overrides: homeOverrides());
    expectNoFlutterException(tester);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(seconds: 6));
    expectNoFlutterException(tester);
  });

  for (final fixture in const [
    (Size(390, 844), 1.0),
    (Size(320, 844), 1.0),
    (Size(390, 844), 1.3),
    (Size(320, 844), 1.3),
    (Size(390, 844), 1.5),
    (Size(320, 844), 1.5),
    (Size(390, 844), 2.0),
    (Size(320, 844), 2.0),
  ]) {
    testWidgets(
      'Home does not overflow at ${fixture.$1.width.toInt()} text ${fixture.$2}',
      (tester) async {
        await pumpHome(
          tester,
          size: fixture.$1,
          textScale: fixture.$2,
          overrides: homeOverrides(
            occasions: [
              wedding,
              birthday,
              mehndi,
              corporate,
              const CatalogItem(
                code: 'housewarming',
                displayName: 'House Warming',
                displayOrder: 5,
              ),
              const CatalogItem(
                code: 'engagement',
                displayName: 'Engagement',
                displayOrder: 6,
              ),
              const CatalogItem(
                code: 'sangeet',
                displayName: 'Sangeet',
                displayOrder: 7,
              ),
              const CatalogItem(
                code: 'reception',
                displayName: 'Reception',
                displayOrder: 8,
              ),
            ],
            events: [upcomingWedding()],
            occasionServices: const [photography],
          ),
        );
        expect(find.byType(CustomerHomeTab), findsOneWidget);
        expectNoFlutterException(tester);
      },
    );
  }

  testWidgets('Search and hero expose useful semantics and 44px targets', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    try {
      await pumpHome(tester, overrides: homeOverrides());

      expect(find.bySemanticsLabel(kHomeSearchHint), findsOneWidget);
      expect(
        find.bySemanticsLabel(
          'Planning. Plan a celebration, not a spreadsheet',
        ),
        findsOneWidget,
      );
      expect(find.bySemanticsLabel('Start planning'), findsOneWidget);
      expect(find.bySemanticsLabel('View all occasions'), findsOneWidget);
      expect(find.bySemanticsLabel('View all services'), findsOneWidget);

      final searchSize = tester.getSize(
        find.descendant(
          of: find.byType(HomeSearchBar),
          matching: find.byType(InkWell),
        ),
      );
      expect(searchSize.height, greaterThanOrEqualTo(HomeSearchBar.minHeight));
      expect(searchSize.width, greaterThanOrEqualTo(44));

      final ctaSize = tester.getSize(find.byKey(HomePlanningHero.ctaKey));
      expect(ctaSize.height, greaterThanOrEqualTo(44));
      expect(ctaSize.width, greaterThanOrEqualTo(44));

      final searchRect = tester.getRect(find.byType(HomeSearchBar));
      final heroRect = tester.getRect(find.byType(HomePlanningHero));
      expect(searchRect.top, lessThan(heroRect.top));
      expectNoFlutterException(tester);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('Occasion discovery is a single horizontal rail', (tester) async {
    await pumpHome(tester, overrides: homeOverrides());
    expect(find.byType(OccasionSection), findsOneWidget);
    expect(
      find.descendant(
        of: find.byType(OccasionSection),
        matching: find.byType(Wrap),
      ),
      findsNothing,
    );
    final scrollables = tester.widgetList<Scrollable>(
      find.descendant(
        of: find.byType(OccasionSection),
        matching: find.byWidgetPredicate(
          (widget) => widget is Scrollable && widget.axis == Axis.horizontal,
        ),
      ),
    );
    expect(scrollables.length, 1);
    expectNoFlutterException(tester);
  });

  testWidgets('Service discovery remains a horizontal rail', (tester) async {
    await pumpHome(tester, overrides: homeOverrides());
    expect(find.byType(EventServicesSection), findsOneWidget);
    final scrollables = tester.widgetList<Scrollable>(
      find.descendant(
        of: find.byType(EventServicesSection),
        matching: find.byWidgetPredicate(
          (widget) => widget is Scrollable && widget.axis == Axis.horizontal,
        ),
      ),
    );
    expect(scrollables.length, 1);
    expectNoFlutterException(tester);
  });

  testWidgets('Occasion rail scrolls by real gesture', (tester) async {
    final occasions = [
      for (var i = 1; i <= 8; i++)
        CatalogItem(
          code: 'occ_$i',
          displayName: 'Occasion $i',
          displayOrder: i,
        ),
    ];
    await pumpHome(
      tester,
      size: const Size(320, 844),
      overrides: homeOverrides(occasions: occasions),
    );
    final scrollable = find.descendant(
      of: find.byType(OccasionSection),
      matching: find.byType(Scrollable),
    );
    expect(scrollable, findsOneWidget);
    final position = tester.state<ScrollableState>(scrollable).position;
    final initialOffset = position.pixels;
    final eighthStart = tester.getTopLeft(find.text('Occasion 8'));
    await tester.fling(scrollable, const Offset(-280, 0), 1000);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(position.pixels, greaterThan(initialOffset));
    expect(position.pixels, greaterThan(0));
    expect(
      tester.getTopLeft(find.text('Occasion 8')).dx,
      lessThan(eighthStart.dx),
    );
    expectNoFlutterException(tester);
  });

  testWidgets('Branded fallback uses a pictogram, not letter initials', (
    tester,
  ) async {
    await pumpHome(
      tester,
      overrides: homeOverrides(
        occasions: const [mehndi],
        services: const [photography],
      ),
    );
    expect(
      find.descendant(
        of: find.byType(OccasionSection),
        matching: find.byIcon(Icons.spa_outlined),
      ),
      findsWidgets,
    );
    expect(
      find.descendant(
        of: find.byType(EventServicesSection),
        matching: find.byIcon(Icons.photo_camera_outlined),
      ),
      findsWidgets,
    );
    expect(find.text('M'), findsNothing);
    expect(find.text('P'), findsNothing);
    expect(find.text('Mehndi'), findsOneWidget);
    expect(find.text('Photography'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Long occasion and service names remain accessible', (
    tester,
  ) async {
    const longOccasion = CatalogItem(
      code: 'long_occ',
      displayName: 'Grand Destination Wedding Celebration Evening',
      displayOrder: 1,
    );
    const longService = CatalogService(
      code: 'long_svc',
      displayName: 'Premium Multi Camera Cinematic Photography Coverage',
      departmentCode: 'PHOTO',
      entityKind: 'service',
      displayOrder: 1,
    );
    final handle = tester.ensureSemantics();
    try {
      await pumpHome(
        tester,
        overrides: homeOverrides(
          occasions: const [longOccasion],
          services: const [longService],
        ),
      );
      expect(
        find.bySemanticsLabel('Grand Destination Wedding Celebration Evening'),
        findsOneWidget,
      );
      expect(
        find.bySemanticsLabel(
          'Premium Multi Camera Cinematic Photography Coverage',
        ),
        findsOneWidget,
      );
      expectNoFlutterException(tester);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('Home hero is a single non-autoplay surface', (tester) async {
    await pumpHome(tester, overrides: homeOverrides());
    expect(find.byType(HomePlanningHero), findsOneWidget);
    expect(find.byType(PageView), findsNothing);
    expect(find.byKey(const Key('home-hero-dot-0')), findsNothing);
    expect(find.text('Start planning'), findsOneWidget);
    expect(find.byKey(HomePlanningHero.fallbackKey), findsOneWidget);
    expect(find.text('assets/images/hero/birthday.jpg'), findsNothing);
    expect(find.text('assets/images/hero/wedding.jpg'), findsNothing);
    expect(find.text('assets/images/hero/sangeet.jpg'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Hero does not auto-advance or expose browse CTAs', (
    tester,
  ) async {
    await pumpHome(tester, overrides: homeOverrides());
    await tester.pump(const Duration(seconds: 6));
    await tester.pump();
    expect(find.byType(PageView), findsNothing);
    expect(find.byKey(HomePlanningHero.ctaKey), findsOneWidget);
    expect(find.byKey(const Key('home-hero-cta-occasions')), findsNothing);
    expect(find.byKey(const Key('home-hero-cta-services')), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Matched upcoming event uses backend occasion cover URL', (
    tester,
  ) async {
    await pumpHome(
      tester,
      overrides: homeOverrides(
        occasions: const [
          CatalogItem(
            code: 'wedding',
            displayName: 'Wedding',
            displayOrder: 1,
            thumbnailUrl: 'https://cdn.example/wedding-thumb.jpg',
            coverImageUrl: 'https://cdn.example/wedding-cover.jpg',
          ),
        ],
        events: [upcomingWedding()],
      ),
    );
    final image = tester.widget<AppImage>(
      find.descendant(
        of: find.byType(HomePlanningHero),
        matching: find.byType(AppImage),
      ),
    );
    expect(image.imageUrl, 'https://cdn.example/wedding-cover.jpg');
    expect(image.fit, BoxFit.cover);
    expect(find.text('Ananya & Rohan'), findsOneWidget);
    expect(find.text('Resume plan'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Hero prefers cover when thumbnail also exists', (tester) async {
    await pumpHome(
      tester,
      overrides: homeOverrides(
        occasions: const [
          CatalogItem(
            code: 'wedding',
            displayName: 'Wedding',
            displayOrder: 1,
            thumbnailUrl: 'https://cdn.example/wedding-thumb.jpg',
            coverImageUrl: 'https://cdn.example/wedding-cover.jpg',
          ),
        ],
        services: const [
          CatalogService(
            code: 'photography',
            displayName: 'Photography',
            departmentCode: 'PHOTO',
            entityKind: 'service',
            displayOrder: 1,
            productCount: 4,
            thumbnailUrl: 'https://cdn.example/photo-thumb.jpg',
            coverImageUrl: 'https://cdn.example/photo-cover.jpg',
          ),
        ],
        events: [upcomingWedding()],
      ),
    );

    final heroImage = tester.widget<AppImage>(
      find.descendant(
        of: find.byType(HomePlanningHero),
        matching: find.byType(AppImage),
      ),
    );
    expect(heroImage.imageUrl, 'https://cdn.example/wedding-cover.jpg');
    expect(heroImage.imageUrl, isNot('https://cdn.example/wedding-thumb.jpg'));

    final occasionImages = tester
        .widgetList<AppImage>(
          find.descendant(
            of: find.byType(OccasionSection),
            matching: find.byType(AppImage),
          ),
        )
        .toList();
    expect(occasionImages, isNotEmpty);
    expect(
      occasionImages.map((image) => image.imageUrl),
      contains('https://cdn.example/wedding-thumb.jpg'),
    );
    expect(
      occasionImages.map((image) => image.imageUrl),
      isNot(contains('https://cdn.example/wedding-cover.jpg')),
    );

    final serviceImages = tester
        .widgetList<AppImage>(
          find.descendant(
            of: find.byType(EventServicesSection),
            matching: find.byType(AppImage),
          ),
        )
        .toList();
    expect(serviceImages, isNotEmpty);
    expect(
      serviceImages.map((image) => image.imageUrl),
      contains('https://cdn.example/photo-thumb.jpg'),
    );
    expect(
      serviceImages.map((image) => image.imageUrl),
      isNot(contains('https://cdn.example/photo-cover.jpg')),
    );
    expectNoFlutterException(tester);
  });

  testWidgets('Hero does not upscale a thumbnail-only occasion', (
    tester,
  ) async {
    await pumpHome(
      tester,
      overrides: homeOverrides(
        occasions: const [
          CatalogItem(
            code: 'wedding',
            displayName: 'Wedding',
            displayOrder: 1,
            thumbnailUrl: 'https://cdn.example/wedding-thumb.jpg',
          ),
        ],
        events: [upcomingWedding()],
      ),
    );
    expect(
      find.descendant(
        of: find.byType(HomePlanningHero),
        matching: find.byType(AppImage),
      ),
      findsNothing,
    );
    expect(find.byKey(HomePlanningHero.fallbackKey), findsOneWidget);
    final occasionImages = tester.widgetList<AppImage>(
      find.descendant(
        of: find.byType(OccasionSection),
        matching: find.byType(AppImage),
      ),
    );
    expect(
      occasionImages.map((image) => image.imageUrl),
      contains('https://cdn.example/wedding-thumb.jpg'),
    );
    expectNoFlutterException(tester);
  });

  testWidgets('Failed cover loading still shows branded hero fallback', (
    tester,
  ) async {
    await pumpHome(
      tester,
      overrides: homeOverrides(
        occasions: const [
          CatalogItem(
            code: 'wedding',
            displayName: 'Wedding',
            displayOrder: 1,
            coverImageUrl: 'https://127.0.0.1:1/missing-cover.jpg',
          ),
        ],
        events: [upcomingWedding()],
      ),
    );
    final image = tester.widget<AppImage>(
      find.descendant(
        of: find.byType(HomePlanningHero),
        matching: find.byType(AppImage),
      ),
    );
    expect(image.imageUrl, 'https://127.0.0.1:1/missing-cover.jpg');
    expect(image.fit, BoxFit.cover);
    expect(image.fallbackWidget, isNotNull);
    expect(find.text('Resume plan'), findsOneWidget);
    expectNoFlutterException(tester);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(body: image.fallbackWidget),
      ),
    );
    expect(find.byKey(HomePlanningHero.fallbackKey), findsOneWidget);
  });

  for (final fixture in const [
    (Size(390, 844), 1.0),
    (Size(320, 844), 1.0),
    (Size(390, 844), 1.3),
    (Size(320, 844), 1.3),
    (Size(390, 844), 1.5),
    (Size(320, 844), 1.5),
    (Size(390, 844), 2.0),
    (Size(320, 844), 2.0),
  ]) {
    testWidgets(
      'Hero grows with content at ${fixture.$1.width.toInt()} text ${fixture.$2}',
      (tester) async {
        await pumpHome(
          tester,
          size: fixture.$1,
          textScale: fixture.$2,
          overrides: homeOverrides(events: [upcomingWedding()]),
        );
        expect(tester.takeException(), isNull);
        expect(find.byType(HomePlanningHero), findsOneWidget);
        expect(find.text('Ananya & Rohan'), findsOneWidget);
        expect(find.text('Resume plan'), findsOneWidget);
        expect(
          find.descendant(
            of: find.byType(HomePlanningHero),
            matching: find.byType(SingleChildScrollView),
          ),
          findsNothing,
        );
        final surface = tester.getSize(find.byKey(HomePlanningHero.surfaceKey));
        expect(surface.height, greaterThanOrEqualTo(kHomeHeroHeight));
        if (fixture.$2 == 1.0) {
          expect(surface.height, closeTo(kHomeHeroHeight, 0.5));
        }
        if (fixture.$2 >= 1.5) {
          expect(surface.height, greaterThan(kHomeHeroHeight));
        }
        final ctaSize = tester.getSize(find.byKey(HomePlanningHero.ctaKey));
        expect(ctaSize.height, greaterThanOrEqualTo(44));
        expect(ctaSize.width, greaterThanOrEqualTo(44));
        expectNoFlutterException(tester);
      },
    );
  }

  testWidgets('Missing occasion media uses branded hero fallback', (
    tester,
  ) async {
    await pumpHome(
      tester,
      overrides: homeOverrides(events: [upcomingWedding()]),
    );
    expect(
      find.descendant(
        of: find.byType(HomePlanningHero),
        matching: find.byType(AppImage),
      ),
      findsNothing,
    );
    expect(find.byKey(HomePlanningHero.fallbackKey), findsOneWidget);
    expect(find.text('Resume plan'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Reduced motion still shows the single planning hero', (
    tester,
  ) async {
    await pumpHome(tester, overrides: homeOverrides(), disableAnimations: true);
    await tester.pump(const Duration(seconds: 6));
    expect(find.byType(PageView), findsNothing);
    expect(find.byKey(HomePlanningHero.ctaKey), findsOneWidget);
    expect(find.text('Start planning'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Accessible navigation still shows the single planning hero', (
    tester,
  ) async {
    await pumpHome(
      tester,
      overrides: homeOverrides(),
      accessibleNavigation: true,
    );
    await tester.pump(const Duration(seconds: 6));
    expect(find.byType(PageView), findsNothing);
    expect(find.byKey(HomePlanningHero.ctaKey), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Pre-wedding does not use the bedroom photograph', (
    tester,
  ) async {
    expect(CatalogImageResolver.resolvedHomeImage(code: 'pre_wedding'), isNull);
    await pumpHome(
      tester,
      overrides: homeOverrides(
        occasions: const [
          CatalogItem(
            code: 'pre_wedding',
            displayName: 'Pre-wedding',
            displayOrder: 1,
          ),
        ],
      ),
    );
    expect(find.byIcon(Icons.favorite_border), findsWidgets);
    expectNoFlutterException(tester);
  });

  testWidgets('Missing occasion types use distinct fallback icons', (
    tester,
  ) async {
    await pumpHome(
      tester,
      overrides: homeOverrides(
        occasions: const [
          mehndi,
          CatalogItem(
            code: 'reception',
            displayName: 'Reception',
            displayOrder: 2,
          ),
          CatalogItem(
            code: 'festival_night',
            displayName: 'Festival',
            displayOrder: 3,
          ),
        ],
        services: const [],
      ),
    );
    expect(find.byIcon(Icons.spa_outlined), findsWidgets);
    expect(find.byIcon(Icons.nightlife_outlined), findsWidgets);
    expect(find.byIcon(Icons.auto_awesome_outlined), findsWidgets);
    expectNoFlutterException(tester);
  });

  testWidgets('Missing service images use distinct fallback icons', (
    tester,
  ) async {
    await pumpHome(
      tester,
      overrides: homeOverrides(
        occasions: const [wedding],
        services: const [photography, catering],
      ),
    );
    expect(find.byIcon(Icons.photo_camera_outlined), findsWidgets);
    expect(find.byIcon(Icons.restaurant_outlined), findsWidgets);
    expect(find.byIcon(Icons.design_services_outlined), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Home cards expose unique semantics without nested buttons', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    try {
      await pumpHome(tester, overrides: homeOverrides());
      expect(find.bySemanticsLabel('Wedding'), findsOneWidget);
      expect(find.bySemanticsLabel('Photography'), findsOneWidget);
      expect(find.bySemanticsLabel('Start planning'), findsOneWidget);
      expectNoFlutterException(tester);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('Occasion grid shows four columns at 390', (tester) async {
    await pumpHome(
      tester,
      size: const Size(390, 844),
      overrides: homeOverrides(occasions: eightOccasions()),
    );
    expectOccasionGridGeometry(
      tester,
      screen: const Size(390, 844),
      minFullyVisibleColumns: 3,
      requireFourthPeek: false,
    );
    expectNoFlutterException(tester);
  });

  testWidgets('Occasion grid peeks the next column at 320', (tester) async {
    await pumpHome(
      tester,
      size: const Size(320, 844),
      overrides: homeOverrides(occasions: eightOccasions()),
    );
    expectOccasionGridGeometry(
      tester,
      screen: const Size(320, 844),
      minFullyVisibleColumns: 3,
      requireFourthPeek: true,
    );
    expectNoFlutterException(tester);
  });

  testWidgets('How Mee Events works and final panel are truthful', (
    tester,
  ) async {
    CustomerTab? destination;
    await pumpHome(
      tester,
      overrides: homeOverrides(),
      onNavigate: (tab) => destination = tab,
    );
    await tester.fling(
      find.byType(CustomScrollView),
      const Offset(0, -1200),
      2000,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('How Mee Events works'), findsOneWidget);
    expect(find.text('Discover occasions and services'), findsOneWidget);
    expect(find.text('Add options to your Event Plan'), findsOneWidget);
    expect(
      find.text('Send one enquiry and follow its updates'),
      findsOneWidget,
    );
    expect(find.text('500+ Events Delivered'), findsNothing);
    expect(find.textContaining('₹'), findsNothing);
    expect(find.textContaining('trending'), findsNothing);
    expect(find.textContaining('Trending'), findsNothing);
    expect(find.textContaining('rating'), findsNothing);

    await tester.tap(find.byKey(HomeHowItWorksSection.actionKey));
    await tester.pump();
    expect(destination, CustomerTab.plan);

    destination = null;
    await tester.ensureVisible(find.byKey(HomeFinalPlanPanel.exploreKey));
    await tester.tap(find.byKey(HomeFinalPlanPanel.exploreKey));
    await tester.pump();
    expect(destination, CustomerTab.explore);
    final container = ProviderScope.containerOf(
      tester.element(find.byType(CustomerHomeTab)),
    );
    expect(container.read(exploreIntentProvider), 0);

    destination = null;
    await tester.tap(find.byKey(HomeFinalPlanPanel.planKey));
    await tester.pump();
    expect(destination, CustomerTab.plan);
    expectNoFlutterException(tester);
  });

  testWidgets('Home feed scrolls vertically to the final action panel', (
    tester,
  ) async {
    await pumpHome(
      tester,
      size: const Size(390, 844),
      overrides: homeOverrides(occasions: eightOccasions()),
    );
    final scrollable = find.descendant(
      of: find.byType(CustomScrollView),
      matching: find.byWidgetPredicate(
        (widget) => widget is Scrollable && widget.axis == Axis.vertical,
      ),
    );
    final position = tester.state<ScrollableState>(scrollable).position;
    expect(position.pixels, 0);
    expect(find.byKey(HomeHowItWorksSection.sectionKey), findsNothing);

    await tester.fling(scrollable, const Offset(0, -700), 2000);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(position.pixels, greaterThan(80));
    expect(find.byKey(HomeHowItWorksSection.sectionKey), findsOneWidget);
    final panel = tester.getRect(find.byKey(HomeFinalPlanPanel.panelKey));
    expect(panel.bottom, lessThanOrEqualTo(844));
    expect(panel.top, greaterThan(0));
    final lastAction = tester.getRect(find.byKey(HomeFinalPlanPanel.planKey));
    expect(lastAction.bottom, lessThanOrEqualTo(844));
    expectNoFlutterException(tester);
  });

  test('Department rails use provider names and More services fallback', () {
    const photoDept = CatalogItem(
      code: 'PHOTO',
      displayName: 'Photography services',
      displayOrder: 1,
    );
    const foodDept = CatalogItem(
      code: 'FOOD',
      displayName: 'Food & catering',
      displayOrder: 2,
    );
    const photo = CatalogService(
      code: 'photography',
      displayName: 'Photography',
      departmentCode: 'PHOTO',
      entityKind: 'service',
      displayOrder: 2,
    );
    const extraPhoto = CatalogService(
      code: 'photography',
      displayName: 'Duplicate Photography',
      departmentCode: 'PHOTO',
      entityKind: 'service',
      displayOrder: 1,
    );
    const catering = CatalogService(
      code: 'catering',
      displayName: 'Catering',
      departmentCode: 'FOOD',
      entityKind: 'service',
      displayOrder: 1,
    );
    const lighting = CatalogService(
      code: 'lighting',
      displayName: 'Lighting',
      departmentCode: 'UNKNOWN',
      entityKind: 'service',
      displayOrder: 1,
    );
    final rails = groupHomeDepartmentRails(
      services: [catering, lighting, extraPhoto, photo],
      departments: [foodDept, photoDept],
      excludeCodes: {'catering'},
    );
    expect(rails.map((rail) => rail.title).toList(), [
      'Photography services',
      'More services',
    ]);
    expect(rails.first.services.single.code, 'photography');
    expect(rails.last.services.single.code, 'lighting');
    expect(rails.any((rail) => rail.title == 'PHOTO'), isFalse);
    expect(
      rails
          .expand((rail) => rail.services.map((item) => item.code))
          .toSet()
          .length,
      rails.expand((rail) => rail.services).length,
    );
  });

  testWidgets('Upcoming event adds a compact journey action', (tester) async {
    await pumpHome(
      tester,
      overrides: homeOverrides(events: [upcomingWedding()]),
    );
    expect(find.byKey(HomeResumeSection.sectionKey), findsOneWidget);
    expect(find.byKey(const Key('home-resume-upcoming')), findsOneWidget);
    expect(find.text('Ananya & Rohan'), findsWidgets);
    expect(find.text('Continue'), findsOneWidget);
    expectNoFlutterException(tester);
  });
}
