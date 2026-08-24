import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/core/providers/catalog_provider.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/favorites/favorites_provider.dart';
import 'package:mee_events/features/customer/favorites/favorites_store.dart';
import 'package:mee_events/features/customer/providers/event_record_providers.dart';
import 'package:mee_events/features/customer/screens/category_detail_screen.dart';
import 'package:mee_events/features/customer/screens/enquiry_checkout_screen.dart';
import 'package:mee_events/features/customer/screens/service_detail_screen.dart';
import 'package:mee_events/features/customer/search/customer_search_screen.dart';
import 'package:mee_events/features/customer/search/search_provider.dart';
import 'package:mee_events/features/customer/widgets/occasion_journey.dart';
import 'package:mee_events/features/customer/widgets/service_listing_card.dart';
import 'package:mee_events/features/customer/widgets/sticky_enquiry_bar.dart';
import 'package:mee_events/features/customer/workspace/event_workspace_screen.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/models/catalog_product.dart';
import 'package:mee_events/models/catalog_selection.dart';
import 'package:mee_events/models/catalog_service.dart';
import 'package:mee_events/models/catalog_subcategory.dart';
import 'package:mee_events/models/event_record.dart';
import 'package:mee_events/models/occasion_stage.dart';
import 'package:mee_events/theme/theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  const photography = CatalogService(
    code: 'photography',
    displayName: 'Photography',
    departmentCode: 'PHOTO',
    entityKind: 'service',
    displayOrder: 2,
    productCount: 4,
  );
  const catering = CatalogService(
    code: 'catering',
    displayName: 'Catering',
    departmentCode: 'FOOD',
    entityKind: 'service',
    displayOrder: 1,
    subcategoryCount: 3,
  );

  const mappedPhoto = CatalogSelection(
    sourceOrdinal: '1',
    sourceLabel: 'Wedding Photography',
    serviceCode: 'photography',
    serviceDisplayName: 'Photography',
    mappingStatus: 'mapped',
  );
  const mappedCatering = CatalogSelection(
    sourceOrdinal: '2',
    sourceLabel: 'Catering & Menu',
    serviceCode: 'catering',
    serviceDisplayName: 'Catering',
    mappingStatus: 'mapped',
  );
  const unmappedDecision = CatalogSelection(
    sourceOrdinal: '3',
    sourceLabel: 'Needs a decision',
    mappingStatus: 'requires_decision',
  );

  const photoCandid = CatalogSelection(
    sourceOrdinal: '11',
    sourceLabel: 'Candid Photography',
    serviceCode: 'photography_videography',
    serviceDisplayName: 'Photography & Videography',
    mappingStatus: 'mapped',
  );
  const photoTraditional = CatalogSelection(
    sourceOrdinal: '12',
    sourceLabel: 'Traditional Photography',
    serviceCode: 'photography_videography',
    serviceDisplayName: 'Photography & Videography',
    mappingStatus: 'mapped',
  );
  const photoDrone = CatalogSelection(
    sourceOrdinal: '13',
    sourceLabel: 'Drone Coverage',
    serviceCode: 'photography_videography',
    serviceDisplayName: 'Photography & Videography',
    mappingStatus: 'mapped',
  );
  const photoCinematic = CatalogSelection(
    sourceOrdinal: '14',
    sourceLabel: 'Cinematic Videography',
    serviceCode: 'photography_videography',
    serviceDisplayName: 'Photography & Videography',
    mappingStatus: 'mapped',
  );

  EventRecordSummary namedEvent({
    required String id,
    required String name,
    required String type,
    required DateTime date,
    String? eventDate,
    String? bookingId,
  }) {
    final year = date.year.toString().padLeft(4, '0');
    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');
    return EventRecordSummary(
      id: id,
      eventNumber: 'E-$id',
      bookingId: bookingId ?? 'booking-$id',
      quotationId: 'q-$id',
      leadId: 'l-$id',
      enquiryId: 'en-$id',
      customerId: 'c1',
      eventTypeName: type,
      eventName: name,
      budgetAmount: '0',
      advancePaid: '0',
      pendingAmount: '0',
      status: 'confirmed',
      priority: 'normal',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      eventDate: eventDate ?? '$year-$month-$day',
    );
  }

  List<Override> occasionOverrides({
    List<CatalogSelection> selections = const [],
    List<CatalogService> services = const [photography, catering],
    List<OccasionStage> stages = const [],
    List<EventRecordSummary> events = const [],
    Object? selectionsError,
    Object? servicesError,
    Object? stagesError,
    Object? eventsError,
    bool hangSelections = false,
    bool hangServices = false,
    bool hangStages = false,
    bool hangEvents = false,
    int Function()? onStagesLoad,
    int Function()? onServicesLoad,
    int Function()? onSelectionsLoad,
    int Function()? onEventsLoad,
  }) {
    return [
      sessionUserIdProvider.overrideWithValue('occasion-user'),
      if (hangStages)
        occasionStagesProvider.overrideWith(
          (ref, code) => Completer<List<OccasionStage>>().future,
        )
      else if (stagesError != null)
        occasionStagesProvider.overrideWith((ref, code) async {
          onStagesLoad?.call();
          throw stagesError;
        })
      else
        occasionStagesProvider.overrideWith((ref, code) async {
          onStagesLoad?.call();
          return stages;
        }),
      if (servicesError != null)
        occasionServicesProvider.overrideWith(
          (ref, code) async => throw servicesError,
        )
      else if (hangServices)
        occasionServicesProvider.overrideWith(
          (ref, code) => Completer<List<CatalogService>>().future,
        )
      else
        occasionServicesProvider.overrideWith((ref, code) async {
          onServicesLoad?.call();
          return services;
        }),
      if (selectionsError != null)
        eventSelectionsProvider.overrideWith(
          (ref, code) async => throw selectionsError,
        )
      else if (hangSelections)
        eventSelectionsProvider.overrideWith(
          (ref, code) => Completer<List<CatalogSelection>>().future,
        )
      else
        eventSelectionsProvider.overrideWith((ref, code) async {
          onSelectionsLoad?.call();
          return selections;
        }),
      if (hangEvents)
        eventsProvider.overrideWith(
          (ref) => Completer<List<EventRecordSummary>>().future,
        )
      else if (eventsError != null)
        eventsProvider.overrideWith((ref) async {
          onEventsLoad?.call();
          throw eventsError;
        })
      else
        eventsProvider.overrideWith((ref) async {
          onEventsLoad?.call();
          return events;
        }),
      catalogServicesProvider.overrideWith((ref, department) async {
        if (department == 'DECOR') return services;
        return const <CatalogService>[];
      }),
      eventTypesProvider.overrideWith(
        (ref) async => const [
          CatalogItem(code: 'wedding', displayName: 'Wedding', displayOrder: 1),
        ],
      ),
      serviceCategoriesProvider.overrideWith(
        (ref) async => const <CatalogItem>[],
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
      eventWorkspaceProvider.overrideWith((ref, id) async => null),
    ];
  }

  Future<void> pumpOccasion(
    WidgetTester tester, {
    Size size = const Size(390, 844),
    double textScale = 1,
    List<Override> overrides = const [],
    String code = 'wedding',
    String title = 'Wedding',
    bool isOccasion = true,
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
            ),
            child: CategoryDetailScreen(
              code: code,
              title: title,
              isOccasion: isOccasion,
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
  }

  void expectNoFlutterException(WidgetTester tester) {
    expect(
      tester.takeException(),
      isNull,
      reason: 'Occasion detail produced an unexpected Flutter exception',
    );
  }

  testWidgets('Occasion title is not visibly duplicated', (tester) async {
    await pumpOccasion(tester, overrides: occasionOverrides());
    expect(find.text('Wedding'), findsOneWidget);
    expect(find.text('Plan This Occasion'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Exactly one primary planning CTA is present', (tester) async {
    await pumpOccasion(tester, overrides: occasionOverrides());
    expect(find.text('Start planning'), findsOneWidget);
    expect(find.text('Continue planning'), findsNothing);
    expect(find.text('Start Enquiry'), findsNothing);
    expect(find.text('Request Quote'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('API mapped selections drive the single service section', (
    tester,
  ) async {
    await pumpOccasion(
      tester,
      overrides: occasionOverrides(
        selections: const [mappedPhoto, mappedCatering, unmappedDecision],
        services: const [photography, catering],
      ),
    );
    expect(find.text('Services for Wedding'), findsOneWidget);
    expect(find.text('Wedding Photography'), findsOneWidget);
    expect(find.text('Catering & Menu'), findsOneWidget);
    expect(find.text('Recommended Services'), findsNothing);
    expect(find.text('What You May Need'), findsNothing);
    expect(find.text('2 services'), findsWidgets);
    expectNoFlutterException(tester);
  });

  testWidgets('Mapped selections open the correct ServiceDetailScreen', (
    tester,
  ) async {
    await pumpOccasion(
      tester,
      overrides: occasionOverrides(selections: const [mappedPhoto]),
    );
    await tester.tap(find.text('Wedding Photography'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byType(ServiceDetailScreen), findsOneWidget);
    final detail = tester.widget<ServiceDetailScreen>(
      find.byType(ServiceDetailScreen),
    );
    expect(detail.code, 'photography');
    expect(detail.occasionCode, 'wedding');
    expectNoFlutterException(tester);
  });

  testWidgets('Unmapped selections are not rendered as tappable cards', (
    tester,
  ) async {
    await pumpOccasion(
      tester,
      overrides: occasionOverrides(selections: const [unmappedDecision]),
    );
    expect(find.text('Needs a decision'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Occasion services are used when mapped selections are empty', (
    tester,
  ) async {
    await pumpOccasion(
      tester,
      overrides: occasionOverrides(
        selections: const [],
        services: const [photography, catering],
      ),
    );
    expect(
      tester.getTopLeft(find.text('Catering')).dy,
      lessThan(tester.getTopLeft(find.text('Photography')).dy),
    );
    expect(find.text('Photography'), findsOneWidget);
    expect(find.text('4 options'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Mapped selections are not duplicated as a second service list', (
    tester,
  ) async {
    await pumpOccasion(
      tester,
      overrides: occasionOverrides(
        selections: const [mappedPhoto],
        services: const [photography, catering],
      ),
    );
    expect(find.text('Wedding Photography'), findsOneWidget);
    expect(find.text('Catering'), findsNothing);
    expect(find.byType(ServiceListingCard), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Journey uses live stage order and is not a filter', (
    tester,
  ) async {
    await pumpOccasion(
      tester,
      overrides: occasionOverrides(
        stages: const [
          OccasionStage(
            code: 'reception',
            displayName: 'Reception',
            occasionCode: 'wedding',
            displayOrder: 2,
            typicalDay: 'Day 2',
          ),
          OccasionStage(
            code: 'ceremony',
            displayName: 'Ceremony',
            occasionCode: 'wedding',
            displayOrder: 1,
          ),
        ],
        services: const [photography, catering],
      ),
    );
    expect(
      tester.getTopLeft(find.text('Ceremony')).dy,
      lessThan(tester.getTopLeft(find.text('Reception')).dy),
    );
    expect(find.text('Day 2'), findsOneWidget);
    expect(
      find.descendant(
        of: find.byKey(OccasionJourney.journeyKey),
        matching: find.byType(InkWell),
      ),
      findsNothing,
    );
    expect(find.text('Photography'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Wedding does not match a Pre-wedding booked event', (
    tester,
  ) async {
    await pumpOccasion(
      tester,
      overrides: occasionOverrides(
        events: [
          namedEvent(
            id: 'pre',
            name: 'Pre Wedding Shoot',
            type: 'Pre-wedding',
            date: DateTime.now().add(const Duration(days: 20)),
          ),
        ],
      ),
    );
    expect(find.text('Start planning'), findsOneWidget);
    expect(find.text('Continue planning'), findsNothing);
    expect(find.text('Pre Wedding Shoot'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Exact booked event match opens EventWorkspaceScreen', (
    tester,
  ) async {
    final event = namedEvent(
      id: 'w1',
      name: 'Ananya & Rohan',
      type: 'Wedding',
      date: DateTime.now().add(const Duration(days: 30)),
    );
    await pumpOccasion(tester, overrides: occasionOverrides(events: [event]));
    expect(find.text('Ananya & Rohan'), findsOneWidget);
    expect(find.text('Continue planning'), findsOneWidget);
    await tester.tap(find.text('Continue planning'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byType(EventWorkspaceScreen), findsOneWidget);
    expect(find.byType(EnquiryCheckoutScreen), findsNothing);
    final workspace = tester.widget<EventWorkspaceScreen>(
      find.byType(EventWorkspaceScreen),
    );
    expect(workspace.bookingId, 'booking-w1');
    expectNoFlutterException(tester);
  });

  testWidgets('No matching event opens Enquiry Checkout with event type only', (
    tester,
  ) async {
    await pumpOccasion(tester, overrides: occasionOverrides());
    await tester.tap(find.text('Start planning'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byType(EnquiryCheckoutScreen), findsOneWidget);
    final checkout = tester.widget<EnquiryCheckoutScreen>(
      find.byType(EnquiryCheckoutScreen),
    );
    expect(checkout.initialEventTypeCode, 'wedding');
    expect(checkout.initialServiceCategoryCodes, isEmpty);
    expectNoFlutterException(tester);
  });

  testWidgets('Search route works from occasion detail', (tester) async {
    await pumpOccasion(tester, overrides: occasionOverrides());
    await tester.tap(find.byIcon(Icons.search_rounded));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byType(CustomerSearchScreen), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Favorite remains functional', (tester) async {
    final handle = tester.ensureSemantics();
    try {
      await pumpOccasion(tester, overrides: occasionOverrides());
      expect(find.bySemanticsLabel('Save to favorites'), findsOneWidget);
      await tester.tap(find.byIcon(Icons.favorite_border_rounded));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.bySemanticsLabel('Remove from favorites'), findsOneWidget);
      final container = ProviderScope.containerOf(
        tester.element(find.byType(CategoryDetailScreen)),
      );
      expect(
        container
            .read(favoritesProvider.notifier)
            .isSaved(FavoriteKind.occasion, 'wedding'),
        isTrue,
      );
      expectNoFlutterException(tester);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('Pull-to-refresh reloads occasion providers', (tester) async {
    var stages = 0;
    var services = 0;
    var selections = 0;
    var events = 0;
    await pumpOccasion(
      tester,
      overrides: occasionOverrides(
        events: [
          namedEvent(
            id: 'w1',
            name: 'Ananya & Rohan',
            type: 'Wedding',
            date: DateTime.now().add(const Duration(days: 12)),
          ),
        ],
        onStagesLoad: () => ++stages,
        onServicesLoad: () => ++services,
        onSelectionsLoad: () => ++selections,
        onEventsLoad: () => ++events,
      ),
    );
    expect(stages, 1);
    expect(services, 1);
    expect(selections, 1);
    expect(events, 1);

    await tester.fling(
      find.byType(CustomScrollView),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));

    expect(stages, 2);
    expect(services, 2);
    expect(selections, 2);
    expect(events, 2);
    expectNoFlutterException(tester);
  });

  testWidgets('Provider error does not expose raw exception text', (
    tester,
  ) async {
    await pumpOccasion(
      tester,
      overrides: occasionOverrides(
        servicesError: Exception('secret-stack-trace'),
      ),
    );
    expect(find.text('secret-stack-trace'), findsNothing);
    expect(find.text('Services unavailable'), findsOneWidget);
    expect(find.text('Wedding'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Empty state is customer-friendly', (tester) async {
    await pumpOccasion(
      tester,
      overrides: occasionOverrides(selections: const [], services: const []),
    );
    expect(find.text('No services yet'), findsOneWidget);
    expect(
      find.textContaining('will appear here once the catalog is updated'),
      findsOneWidget,
    );
    expectNoFlutterException(tester);
  });

  testWidgets('isOccasion false keeps the compatibility path', (tester) async {
    await pumpOccasion(
      tester,
      isOccasion: false,
      code: 'DECOR',
      title: 'Decoration',
      overrides: occasionOverrides(),
    );
    expect(find.text('Request Quote'), findsWidgets);
    expect(find.text('Available Services'), findsOneWidget);
    expect(find.text('Start planning'), findsNothing);
    await tester.tap(find.text('Request Quote').last);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    final checkout = tester.widget<EnquiryCheckoutScreen>(
      find.byType(EnquiryCheckoutScreen),
    );
    expect(checkout.initialEventTypeCode, isNull);
    expect(checkout.initialServiceCategoryCodes, ['DECOR']);
    expectNoFlutterException(tester);
  });

  testWidgets('Sticky CTA does not cover the last service', (tester) async {
    await pumpOccasion(
      tester,
      size: const Size(320, 844),
      overrides: occasionOverrides(services: const [catering, photography]),
    );
    await tester.scrollUntilVisible(
      find.text('Photography'),
      80,
      scrollable: find.byType(Scrollable).first,
    );
    final lastBottom = tester.getRect(find.text('Photography')).bottom;
    final barTop = tester.getRect(find.byType(StickyEnquiryBar)).top;
    expect(lastBottom, lessThanOrEqualTo(barTop));
    expectNoFlutterException(tester);
  });

  testWidgets('CTA and cards satisfy 44px targets', (tester) async {
    await pumpOccasion(
      tester,
      overrides: occasionOverrides(services: const [photography]),
    );
    final card = tester.getSize(find.byType(ServiceListingCard).first);
    expect(card.height, greaterThanOrEqualTo(44));
    expect(card.width, greaterThanOrEqualTo(44));
    final cta = tester.getSize(
      find.descendant(
        of: find.byType(StickyEnquiryBar),
        matching: find.byType(InkWell),
      ),
    );
    expect(cta.height, greaterThanOrEqualTo(44));
    expect(cta.width, greaterThanOrEqualTo(44));
    expectNoFlutterException(tester);
  });

  test('exact canonical matching does not use contains', () {
    final wedding = namedEvent(
      id: '1',
      name: 'Main Wedding',
      type: 'Wedding',
      date: DateTime.now().add(const Duration(days: 10)),
    );
    final pre = namedEvent(
      id: '2',
      name: 'Pre Shoot',
      type: 'Pre Wedding',
      date: DateTime.now().add(const Duration(days: 5)),
    );
    expect(
      matchBookedOccasionEvent(
        occasionCode: 'wedding',
        occasionTitle: 'Wedding',
        events: [pre, wedding],
      )?.eventName,
      'Main Wedding',
    );
    expect(
      matchBookedOccasionEvent(
        occasionCode: 'wedding',
        occasionTitle: 'Wedding',
        events: [pre],
      ),
      isNull,
    );
  });

  test('past-only exact match is not an active booking', () {
    final past = namedEvent(
      id: 'past',
      name: 'Last Year Wedding',
      type: 'Wedding',
      date: DateTime.now().subtract(const Duration(days: 40)),
    );
    expect(
      matchBookedOccasionEvent(
        occasionCode: 'wedding',
        occasionTitle: 'Wedding',
        events: [past],
      ),
      isNull,
    );
  });

  test('past plus future selects the nearest upcoming booking', () {
    final past = namedEvent(
      id: 'past',
      name: 'Last Year Wedding',
      type: 'Wedding',
      date: DateTime.now().subtract(const Duration(days: 40)),
    );
    final nearer = namedEvent(
      id: 'near',
      name: 'Soon Wedding',
      type: 'Wedding',
      date: DateTime.now().add(const Duration(days: 8)),
    );
    final later = namedEvent(
      id: 'later',
      name: 'Later Wedding',
      type: 'Wedding',
      date: DateTime.now().add(const Duration(days: 90)),
    );
    final invalid = namedEvent(
      id: 'bad',
      name: 'Broken Date Wedding',
      type: 'Wedding',
      date: DateTime.now().add(const Duration(days: 1)),
      eventDate: 'not-a-date',
    );
    expect(
      matchBookedOccasionEvent(
        occasionCode: 'wedding',
        occasionTitle: 'Wedding',
        events: [past, later, invalid, nearer],
      )?.bookingId,
      'booking-near',
    );
  });

  testWidgets(
    'Same-service photography needs stay distinct and keep source order',
    (tester) async {
      await pumpOccasion(
        tester,
        overrides: occasionOverrides(
          selections: const [
            photoCandid,
            photoTraditional,
            photoDrone,
            photoCinematic,
          ],
        ),
      );
      expect(find.text('Candid Photography'), findsOneWidget);
      expect(find.text('Traditional Photography'), findsOneWidget);
      expect(find.text('4 services'), findsWidgets);
      await tester.scrollUntilVisible(
        find.text('Drone Coverage'),
        80,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Drone Coverage'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Cinematic Videography'),
        80,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Cinematic Videography'), findsOneWidget);
      expect(find.byType(ServiceListingCard), findsNWidgets(4));
      await tester.scrollUntilVisible(
        find.text('Candid Photography'),
        -80,
        scrollable: find.byType(Scrollable).first,
      );
      expect(
        tester.getTopLeft(find.text('Candid Photography')).dy,
        lessThan(tester.getTopLeft(find.text('Traditional Photography')).dy),
      );

      for (final label in const [
        'Candid Photography',
        'Traditional Photography',
        'Drone Coverage',
        'Cinematic Videography',
      ]) {
        await tester.scrollUntilVisible(
          find.text(label),
          80,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 300));
        await tester.tap(
          find.ancestor(
            of: find.text(label),
            matching: find.byType(ServiceListingCard),
          ),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 50));
        final detail = tester.widget<ServiceDetailScreen>(
          find.byType(ServiceDetailScreen),
        );
        expect(detail.code, 'photography_videography');
        Navigator.of(tester.element(find.byType(ServiceDetailScreen))).pop();
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 50));
      }
      expectNoFlutterException(tester);
    },
  );

  testWidgets('Past-only exact match shows Start planning', (tester) async {
    await pumpOccasion(
      tester,
      overrides: occasionOverrides(
        events: [
          namedEvent(
            id: 'past',
            name: 'Last Year Wedding',
            type: 'Wedding',
            date: DateTime.now().subtract(const Duration(days: 40)),
          ),
        ],
      ),
    );
    expect(find.text('Start planning'), findsOneWidget);
    expect(find.text('Continue planning'), findsNothing);
    expect(find.text('Last Year Wedding'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Past plus future Continue planning uses the future booking', (
    tester,
  ) async {
    await pumpOccasion(
      tester,
      overrides: occasionOverrides(
        events: [
          namedEvent(
            id: 'past',
            name: 'Last Year Wedding',
            type: 'Wedding',
            date: DateTime.now().subtract(const Duration(days: 40)),
          ),
          namedEvent(
            id: 'future',
            name: 'Upcoming Wedding',
            type: 'Wedding',
            date: DateTime.now().add(const Duration(days: 21)),
          ),
        ],
      ),
    );
    expect(find.text('Upcoming Wedding'), findsOneWidget);
    expect(find.text('Last Year Wedding'), findsNothing);
    expect(find.text('Continue planning'), findsOneWidget);
    await tester.tap(find.text('Continue planning'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    final workspace = tester.widget<EventWorkspaceScreen>(
      find.byType(EventWorkspaceScreen),
    );
    expect(workspace.bookingId, 'booking-future');
    expectNoFlutterException(tester);
  });

  testWidgets('Multiple future events select the nearest booking', (
    tester,
  ) async {
    await pumpOccasion(
      tester,
      overrides: occasionOverrides(
        events: [
          namedEvent(
            id: 'later',
            name: 'Later Wedding',
            type: 'Wedding',
            date: DateTime.now().add(const Duration(days: 80)),
          ),
          namedEvent(
            id: 'soon',
            name: 'Soon Wedding',
            type: 'Wedding',
            date: DateTime.now().add(const Duration(days: 6)),
          ),
        ],
      ),
    );
    expect(find.text('Soon Wedding'), findsOneWidget);
    expect(find.text('Later Wedding'), findsNothing);
    await tester.tap(find.text('Continue planning'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(
      tester
          .widget<EventWorkspaceScreen>(find.byType(EventWorkspaceScreen))
          .bookingId,
      'booking-soon',
    );
    expectNoFlutterException(tester);
  });

  testWidgets('Events loading does not expose Start planning', (tester) async {
    final handle = tester.ensureSemantics();
    try {
      await pumpOccasion(
        tester,
        overrides: occasionOverrides(hangEvents: true),
      );
      expect(find.text('Checking your events…'), findsOneWidget);
      expect(find.text('Start planning'), findsNothing);
      expect(find.text('Continue planning'), findsNothing);
      expect(find.byType(EnquiryCheckoutScreen), findsNothing);
      final inkWell = tester.widget<InkWell>(
        find.descendant(
          of: find.byType(StickyEnquiryBar),
          matching: find.byType(InkWell),
        ),
      );
      expect(inkWell.onTap, isNull);
      final semantics = tester.widget<Semantics>(
        find
            .descendant(
              of: find.byType(StickyEnquiryBar),
              matching: find.byType(Semantics),
            )
            .first,
      );
      expect(semantics.properties.enabled, isFalse);
      await tester.tap(find.text('Checking your events…'));
      await tester.pump();
      expect(find.byType(EnquiryCheckoutScreen), findsNothing);
      expectNoFlutterException(tester);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('Events error does not start an enquiry or leak exception text', (
    tester,
  ) async {
    var loads = 0;
    await pumpOccasion(
      tester,
      overrides: occasionOverrides(
        eventsError: Exception('secret-event-stack'),
        onEventsLoad: () => ++loads,
      ),
    );
    expect(find.text('Retry event status'), findsOneWidget);
    expect(find.text('Start planning'), findsNothing);
    expect(find.text('secret-event-stack'), findsNothing);
    expect(find.textContaining('Exception'), findsNothing);
    expect(loads, 1);
    await tester.tap(find.text('Retry event status'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(loads, 2);
    expect(find.byType(EnquiryCheckoutScreen), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Successful retry with no match enables Start planning', (
    tester,
  ) async {
    var failEvents = true;
    var loads = 0;
    await pumpOccasion(
      tester,
      overrides: [
        ...occasionOverrides(),
        eventsProvider.overrideWith((ref) async {
          loads += 1;
          if (failEvents) {
            throw Exception('secret-event-stack');
          }
          return const <EventRecordSummary>[];
        }),
      ],
    );
    expect(find.text('Retry event status'), findsOneWidget);
    failEvents = false;
    await tester.tap(find.text('Retry event status'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(loads, 2);
    expect(find.text('Start planning'), findsOneWidget);
    await tester.tap(find.text('Start planning'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byType(EnquiryCheckoutScreen), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Stage refresh failure still refreshes the other providers', (
    tester,
  ) async {
    var stages = 0;
    var services = 0;
    var selections = 0;
    var events = 0;
    await pumpOccasion(
      tester,
      overrides: occasionOverrides(
        stagesError: Exception('stage-refresh-failed'),
        onStagesLoad: () => ++stages,
        onServicesLoad: () => ++services,
        onSelectionsLoad: () => ++selections,
        onEventsLoad: () => ++events,
      ),
    );
    expect(stages, 1);
    expect(services, 1);
    expect(selections, 1);
    expect(events, 1);

    final indicator = tester.widget<RefreshIndicator>(
      find.byType(RefreshIndicator),
    );
    await expectLater(indicator.onRefresh(), throwsA(isA<Exception>()));

    expect(stages, 2);
    expect(services, 2);
    expect(selections, 2);
    expect(events, 2);
  });

  testWidgets('Disposing during pending refresh is safe', (tester) async {
    var stages = 0;
    var services = 0;
    var selections = 0;
    var events = 0;
    final stagesRefresh = Completer<List<OccasionStage>>();
    final servicesRefresh = Completer<List<CatalogService>>();
    final selectionsRefresh = Completer<List<CatalogSelection>>();
    final eventsRefresh = Completer<List<EventRecordSummary>>();

    await pumpOccasion(
      tester,
      overrides: [
        ...occasionOverrides(),
        occasionStagesProvider.overrideWith((ref, code) async {
          stages += 1;
          if (stages == 1) return const <OccasionStage>[];
          return stagesRefresh.future;
        }),
        occasionServicesProvider.overrideWith((ref, code) async {
          services += 1;
          if (services == 1) return const <CatalogService>[];
          return servicesRefresh.future;
        }),
        eventSelectionsProvider.overrideWith((ref, code) async {
          selections += 1;
          if (selections == 1) return const <CatalogSelection>[];
          return selectionsRefresh.future;
        }),
        eventsProvider.overrideWith((ref) async {
          events += 1;
          if (events == 1) return const <EventRecordSummary>[];
          return eventsRefresh.future;
        }),
      ],
    );

    expect(stages, 1);
    expect(services, 1);
    expect(selections, 1);
    expect(events, 1);
    expect(find.byType(CategoryDetailScreen), findsOneWidget);

    await tester.fling(
      find.byType(CustomScrollView),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(stages, 2);
    expect(services, 2);
    expect(selections, 2);
    expect(events, 2);

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
    expect(find.byType(CategoryDetailScreen), findsNothing);

    stagesRefresh.complete(const []);
    servicesRefresh.complete(const []);
    selectionsRefresh.complete(const []);
    eventsRefresh.complete(const []);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.pump(const Duration(milliseconds: 50));

    expectNoFlutterException(tester);
    expect(stages, 2);
    expect(services, 2);
    expect(selections, 2);
    expect(events, 2);
  });

  for (final fixture in const [
    (Size(390, 844), 1.0),
    (Size(320, 844), 1.0),
    (Size(390, 844), 1.3),
    (Size(320, 844), 1.3),
  ]) {
    testWidgets(
      'Occasion detail does not overflow at ${fixture.$1.width.toInt()} text ${fixture.$2}',
      (tester) async {
        await pumpOccasion(
          tester,
          size: fixture.$1,
          textScale: fixture.$2,
          overrides: occasionOverrides(
            stages: const [
              OccasionStage(
                code: 'ceremony',
                displayName: 'Ceremony',
                occasionCode: 'wedding',
                displayOrder: 1,
              ),
            ],
            selections: const [mappedPhoto, mappedCatering],
            events: [
              namedEvent(
                id: 'w1',
                name: 'Ananya & Rohan',
                type: 'Wedding',
                date: DateTime.now().add(const Duration(days: 40)),
              ),
            ],
          ),
        );
        expect(find.byType(CategoryDetailScreen), findsOneWidget);
        expectNoFlutterException(tester);
      },
    );
  }
}
