import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/core/providers/catalog_provider.dart';
import 'package:mee_events/core/widgets/image/app_image.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/catalog/catalog_image_resolver.dart';
import 'package:mee_events/features/customer/plan/event_plan_provider.dart';
import 'package:mee_events/features/customer/plan/event_plan_store.dart';
import 'package:mee_events/features/customer/providers/explore_intent_provider.dart';
import 'package:mee_events/features/customer/screens/category_detail_screen.dart';
import 'package:mee_events/features/customer/screens/enquiry_checkout_screen.dart';
import 'package:mee_events/features/customer/screens/explore_tab.dart';
import 'package:mee_events/features/customer/screens/service_detail_screen.dart';
import 'package:mee_events/features/customer/widgets/explore/explore_cards.dart';
import 'package:mee_events/features/customer/widgets/home/discovery_skeletons.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/models/catalog_product.dart';
import 'package:mee_events/models/catalog_selection.dart';
import 'package:mee_events/models/catalog_service.dart';
import 'package:mee_events/models/catalog_subcategory.dart';
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
    displayOrder: 2,
  );
  const birthday = CatalogItem(
    code: 'birthday',
    displayName: 'Birthday Celebration With Extended Family',
    displayOrder: 2,
  );
  const serviceEntry = CatalogItem(
    code: 'internal_service',
    displayName: 'Hidden Service Entry',
    displayOrder: 0,
    kind: 'service_entry',
  );
  const engagement = CatalogItem(
    code: 'engagement',
    displayName: 'Engagement',
    displayOrder: 1,
  );

  const photography = CatalogService(
    code: 'photography_videography',
    displayName: 'Photography & Videography',
    departmentCode: 'photography_department',
    entityKind: 'service',
    displayOrder: 2,
    coverImageUrl: 'https://cdn.example/photo.jpg',
  );
  const catering = CatalogService(
    code: 'catering',
    displayName: 'Catering And Live Counters For Large Gatherings',
    departmentCode: 'food',
    entityKind: 'service',
    displayOrder: 1,
  );

  List<CatalogService> fortyOneServices() {
    return [
      for (var i = 1; i <= 41; i++)
        CatalogService(
          code: 'svc.${i.toString().padLeft(2, '0')}',
          displayName: i == 41
              ? 'Travel Desk Coordination Finale'
              : 'Service $i',
          departmentCode: 'dept',
          entityKind: 'service',
          displayOrder: i,
        ),
    ];
  }

  List<Override> exploreOverrides({
    List<CatalogItem> occasions = const [engagement, wedding, birthday],
    List<CatalogService> services = const [photography, catering],
    Object? occasionError,
    Object? serviceError,
    bool hangOccasions = false,
    bool hangServices = false,
    int intent = 0,
    int Function()? onOccasionLoad,
    int Function()? onServiceLoad,
  }) {
    return [
      exploreIntentProvider.overrideWith((ref) => intent),
      sessionUserIdProvider.overrideWithValue('explore-user'),
      eventPlanStoreProvider.overrideWithValue(
        EventPlanStore(userId: 'explore-user'),
      ),
      occasionStagesProvider.overrideWith(
        (ref, code) async => const <OccasionStage>[],
      ),
      occasionServicesProvider.overrideWith(
        (ref, code) async => const <CatalogService>[],
      ),
      eventSelectionsProvider.overrideWith(
        (ref, code) async => const <CatalogSelection>[],
      ),
      catalogServiceProvider.overrideWith((ref, code) async {
        return services.firstWhere(
          (item) => item.code == code,
          orElse: () => photography,
        );
      }),
      serviceSubcategoriesProvider.overrideWith(
        (ref, code) async => const <CatalogSubcategory>[],
      ),
      serviceProductsProvider.overrideWith(
        (ref, code) async => const <CatalogProduct>[],
      ),
      if (hangOccasions)
        eventTypesProvider.overrideWith(
          (ref) => Completer<List<CatalogItem>>().future,
        )
      else if (occasionError != null)
        eventTypesProvider.overrideWith((ref) async {
          onOccasionLoad?.call();
          throw occasionError;
        })
      else
        eventTypesProvider.overrideWith((ref) async {
          onOccasionLoad?.call();
          return [serviceEntry, ...occasions];
        }),
      if (hangServices)
        catalogServicesProvider(
          null,
        ).overrideWith((ref) => Completer<List<CatalogService>>().future)
      else if (serviceError != null)
        catalogServicesProvider(null).overrideWith((ref) async {
          onServiceLoad?.call();
          throw serviceError;
        })
      else
        catalogServicesProvider(null).overrideWith((ref) async {
          onServiceLoad?.call();
          return services;
        }),
    ];
  }

  Future<void> pumpExplore(
    WidgetTester tester, {
    Size size = const Size(390, 844),
    double textScale = 1,
    List<Override> overrides = const [],
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
            child: const ExploreTab(),
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
  }

  void expectNoFlutterException(WidgetTester tester) {
    expect(tester.takeException(), isNull);
  }

  test('visibleExploreOccasions excludes service_entry and sorts stably', () {
    expect(
      visibleExploreOccasions(const [
        birthday,
        serviceEntry,
        wedding,
        engagement,
      ]).map((e) => e.code),
      ['engagement', 'birthday', 'wedding'],
    );
  });

  test('orderedExploreServices sorts by displayOrder then code', () {
    expect(
      orderedExploreServices(const [photography, catering]).map((e) => e.code),
      ['catering', 'photography_videography'],
    );
  });

  testWidgets('Initial loading shows the selected-section skeleton', (
    tester,
  ) async {
    await pumpExplore(
      tester,
      overrides: exploreOverrides(hangOccasions: true, hangServices: true),
    );
    expect(find.text('Explore'), findsOneWidget);
    expect(find.byType(ExploreGridSkeleton), findsOneWidget);
    expect(find.text('No occasions available'), findsNothing);
    expect(find.text('Start enquiry'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Occasions come from eventTypes and exclude service_entry', (
    tester,
  ) async {
    await pumpExplore(tester, overrides: exploreOverrides());
    expect(find.text('Engagement'), findsOneWidget);
    expect(find.text('Wedding'), findsOneWidget);
    expect(find.text('Hidden Service Entry'), findsNothing);
    expect(find.text('3 occasions'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Occasion order follows displayOrder with code tie-break', (
    tester,
  ) async {
    await pumpExplore(tester, overrides: exploreOverrides());
    final titles = tester
        .widgetList<ExploreOccasionCard>(find.byType(ExploreOccasionCard))
        .map((card) => card.title)
        .toList();
    expect(titles.first, 'Engagement');
    expect(titles[1], 'Birthday Celebration With Extended Family');
    expect(titles.last, 'Wedding');
  });

  testWidgets('Occasion tap opens CategoryDetailScreen with live fields', (
    tester,
  ) async {
    await pumpExplore(tester, overrides: exploreOverrides());
    await tester.tap(find.text('Wedding'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    final detail = tester.widget<CategoryDetailScreen>(
      find.byType(CategoryDetailScreen),
    );
    expect(detail.code, 'wedding');
    expect(detail.title, 'Wedding');
    expect(detail.isOccasion, isTrue);
    expectNoFlutterException(tester);
  });

  testWidgets(
    'Services come from catalogServicesProvider and are not truncated',
    (tester) async {
      final services = fortyOneServices();
      await pumpExplore(
        tester,
        overrides: exploreOverrides(intent: 1, services: services),
      );
      expect(find.text('41 services'), findsOneWidget);
      expect(find.text('Decoration'), findsNothing);
      await tester.scrollUntilVisible(
        find.text('Travel Desk Coordination Finale'),
        120,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Travel Desk Coordination Finale'), findsOneWidget);
      expectNoFlutterException(tester);
    },
  );

  testWidgets('Service order follows displayOrder', (tester) async {
    await pumpExplore(tester, overrides: exploreOverrides(intent: 1));
    final titles = tester
        .widgetList<ExploreServiceCard>(find.byType(ExploreServiceCard))
        .map((card) => card.title)
        .toList();
    expect(titles.first, startsWith('Catering'));
    expect(titles.last, startsWith('Photography'));
  });

  testWidgets('Service tap opens ServiceDetailScreen with live fields', (
    tester,
  ) async {
    await pumpExplore(tester, overrides: exploreOverrides(intent: 1));
    await tester.tap(find.text('Photography & Videography'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    final detail = tester.widget<ServiceDetailScreen>(
      find.byType(ServiceDetailScreen),
    );
    expect(detail.code, 'photography_videography');
    expect(detail.title, 'Photography & Videography');
    expect(detail.occasionCode, isNull);
    expectNoFlutterException(tester);
  });

  testWidgets('Explore intent 0 selects Occasions and 1 selects Services', (
    tester,
  ) async {
    await pumpExplore(tester, overrides: exploreOverrides(intent: 0));
    expect(find.byType(ExploreOccasionCard), findsWidgets);
    expect(find.byType(ExploreServiceCard), findsNothing);

    await pumpExplore(tester, overrides: exploreOverrides(intent: 1));
    expect(find.byType(ExploreServiceCard), findsWidgets);
    expect(find.byType(ExploreOccasionCard), findsNothing);
  });

  testWidgets('Switching sections keeps loaded catalogue state', (
    tester,
  ) async {
    await pumpExplore(tester, overrides: exploreOverrides());
    expect(find.text('Wedding'), findsOneWidget);
    await tester.tap(find.text('Services'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Photography & Videography'), findsOneWidget);
    expect(find.byType(EnquiryCheckoutScreen), findsNothing);
    await tester.tap(find.text('Occasions'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Wedding'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Occasion failure does not prevent loaded Services', (
    tester,
  ) async {
    await pumpExplore(
      tester,
      overrides: exploreOverrides(
        intent: 1,
        occasionError: Exception('occasion-secret'),
      ),
    );
    expect(find.text('Photography & Videography'), findsOneWidget);
    expect(find.text('occasion-secret'), findsNothing);
    await tester.tap(find.text('Occasions'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Occasions unavailable'), findsOneWidget);
    expect(find.text('0 occasions'), findsNothing);
    expect(find.text('1 occasion'), findsNothing);
    expect(find.text('3 occasions'), findsNothing);
    expect(find.text('occasion-secret'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Service failure does not prevent loaded Occasions', (
    tester,
  ) async {
    await pumpExplore(
      tester,
      overrides: exploreOverrides(serviceError: Exception('service-secret')),
    );
    expect(find.text('Wedding'), findsOneWidget);
    await tester.tap(find.text('Services'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Services unavailable'), findsOneWidget);
    expect(find.text('0 services'), findsNothing);
    expect(find.text('1 service'), findsNothing);
    expect(find.text('2 services'), findsNothing);
    expect(find.text('service-secret'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Retry reloads the failed selected provider', (tester) async {
    var occasionLoads = 0;
    await pumpExplore(
      tester,
      overrides: exploreOverrides(
        occasionError: Exception('boom'),
        onOccasionLoad: () => ++occasionLoads,
      ),
    );
    expect(occasionLoads, 1);
    await tester.tap(find.text('Retry'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(occasionLoads, 2);
    expectNoFlutterException(tester);
  });

  testWidgets('Empty states are distinct', (tester) async {
    await pumpExplore(tester, overrides: exploreOverrides(occasions: const []));
    expect(find.text('No occasions available'), findsOneWidget);
    expect(find.text('0 occasions'), findsOneWidget);
    expect(find.textContaining('will appear soon'), findsNothing);

    await pumpExplore(
      tester,
      overrides: exploreOverrides(intent: 1, services: const []),
    );
    expect(find.text('No services available'), findsOneWidget);
    expect(find.text('0 services'), findsOneWidget);
    expect(find.textContaining('will appear soon'), findsNothing);
  });

  testWidgets('Real pull refresh starts both provider reloads', (tester) async {
    var occasionLoads = 0;
    var serviceLoads = 0;
    await pumpExplore(
      tester,
      overrides: exploreOverrides(
        onOccasionLoad: () => ++occasionLoads,
        onServiceLoad: () => ++serviceLoads,
      ),
    );
    expect(occasionLoads, 1);
    expect(serviceLoads, 1);
    await tester.fling(
      find.byType(CustomScrollView),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(occasionLoads, 2);
    expect(serviceLoads, 2);
    expectNoFlutterException(tester);
  });

  testWidgets('Refresh failure still starts the sibling reload', (
    tester,
  ) async {
    var occasionLoads = 0;
    var serviceLoads = 0;
    await pumpExplore(
      tester,
      overrides: [
        ...exploreOverrides(onServiceLoad: () => ++serviceLoads),
        eventTypesProvider.overrideWith((ref) async {
          occasionLoads += 1;
          if (occasionLoads == 1) {
            return const [engagement, wedding];
          }
          throw Exception('refresh-failed');
        }),
      ],
    );
    await tester.fling(
      find.byType(CustomScrollView),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(occasionLoads, 2);
    expect(serviceLoads, 2);
    expect(find.text('refresh-failed'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Disposing during pending refresh is safe', (tester) async {
    final occasionRefresh = Completer<List<CatalogItem>>();
    var occasionLoads = 0;
    await pumpExplore(
      tester,
      overrides: [
        ...exploreOverrides(),
        eventTypesProvider.overrideWith((ref) async {
          occasionLoads += 1;
          if (occasionLoads == 1) return const [engagement];
          return occasionRefresh.future;
        }),
      ],
    );
    await tester.fling(
      find.byType(CustomScrollView),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(occasionLoads, 2);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
    occasionRefresh.complete(const [engagement]);
    await tester.pump();
    expectNoFlutterException(tester);
  });

  testWidgets('Unknown image codes use branded fallback not wedding photos', (
    tester,
  ) async {
    await pumpExplore(
      tester,
      overrides: exploreOverrides(
        occasions: const [
          CatalogItem(code: 'travel', displayName: 'Travel', displayOrder: 1),
          birthday,
        ],
      ),
    );
    expect(find.byKey(HomeCatalogVisual.fallbackKey), findsWidgets);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is AppImage && widget.imageUrl.contains('wedding.jpg'),
      ),
      findsNothing,
    );
    expectNoFlutterException(tester);
  });

  testWidgets('Generic Start enquiry is absent', (tester) async {
    await pumpExplore(tester, overrides: exploreOverrides());
    expect(find.text('Start enquiry'), findsNothing);
    expect(find.byType(EnquiryCheckoutScreen), findsNothing);
  });

  testWidgets('Last service remains reachable', (tester) async {
    await pumpExplore(
      tester,
      size: const Size(320, 844),
      overrides: exploreOverrides(intent: 1),
    );
    await tester.scrollUntilVisible(
      find.textContaining('Photography'),
      80,
      scrollable: find.byType(Scrollable).first,
    );
    final lastBottom = tester
        .getRect(find.textContaining('Photography'))
        .bottom;
    expect(lastBottom, lessThanOrEqualTo(844));
    expectNoFlutterException(tester);
  });

  testWidgets('Cards expose one semantic button node', (tester) async {
    final handle = tester.ensureSemantics();
    try {
      await pumpExplore(tester, overrides: exploreOverrides());
      expect(find.bySemanticsLabel('Wedding, occasion'), findsOneWidget);
      expect(find.bySemanticsLabel('Wedding'), findsNothing);
      await tester.tap(find.text('Services'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      expect(
        find.bySemanticsLabel('Photography & Videography, service'),
        findsOneWidget,
      );
      expectNoFlutterException(tester);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('Occasion semantics tap opens CategoryDetailScreen once', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    try {
      await pumpExplore(tester, overrides: exploreOverrides());
      final finder = find.bySemanticsLabel('Wedding, occasion');
      expect(finder, findsOneWidget);
      final node = tester.getSemantics(finder);
      expect(node.flagsCollection.isButton, isTrue);
      expect(node.flagsCollection.isEnabled.toBoolOrNull(), isTrue);
      expect(node.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
      expect(find.bySemanticsLabel('Wedding'), findsNothing);

      tester.semantics.tap(find.semantics.byLabel('Wedding, occasion'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.byType(CategoryDetailScreen), findsOneWidget);
      final detail = tester.widget<CategoryDetailScreen>(
        find.byType(CategoryDetailScreen),
      );
      expect(detail.code, 'wedding');
      expect(detail.title, 'Wedding');
      expect(detail.isOccasion, isTrue);
      expectNoFlutterException(tester);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('Service semantics tap opens ServiceDetailScreen once', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    try {
      await pumpExplore(tester, overrides: exploreOverrides(intent: 1));
      final finder = find.bySemanticsLabel(
        'Photography & Videography, service',
      );
      expect(finder, findsOneWidget);
      final node = tester.getSemantics(finder);
      expect(node.flagsCollection.isButton, isTrue);
      expect(node.flagsCollection.isEnabled.toBoolOrNull(), isTrue);
      expect(node.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
      expect(find.bySemanticsLabel('Photography & Videography'), findsNothing);

      tester.semantics.tap(
        find.semantics.byLabel('Photography & Videography, service'),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.byType(ServiceDetailScreen), findsOneWidget);
      final detail = tester.widget<ServiceDetailScreen>(
        find.byType(ServiceDetailScreen),
      );
      expect(detail.code, 'photography_videography');
      expect(detail.title, 'Photography & Videography');
      expect(detail.occasionCode, isNull);
      expectNoFlutterException(tester);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('Explore segments expose selected state from intent', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    try {
      await pumpExplore(tester, overrides: exploreOverrides(intent: 0));
      expect(
        tester
            .getSemantics(find.bySemanticsLabel('Occasions'))
            .flagsCollection
            .isSelected
            .toBoolOrNull(),
        isTrue,
      );
      expect(
        tester
            .getSemantics(find.bySemanticsLabel('Services'))
            .flagsCollection
            .isSelected
            .toBoolOrNull(),
        isFalse,
      );

      await pumpExplore(tester, overrides: exploreOverrides(intent: 1));
      expect(
        tester
            .getSemantics(find.bySemanticsLabel('Services'))
            .flagsCollection
            .isSelected
            .toBoolOrNull(),
        isTrue,
      );
      expect(
        tester
            .getSemantics(find.bySemanticsLabel('Occasions'))
            .flagsCollection
            .isSelected
            .toBoolOrNull(),
        isFalse,
      );
    } finally {
      handle.dispose();
    }
  });

  testWidgets('Explore Services semantics tap selects Services results', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    try {
      await pumpExplore(tester, overrides: exploreOverrides(intent: 0));
      tester.semantics.tap(find.semantics.byLabel('Services'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 250));
      expect(find.byType(ExploreServiceCard), findsWidgets);
      expect(find.byType(ExploreOccasionCard), findsNothing);
      expect(
        tester
            .getSemantics(find.bySemanticsLabel('Services'))
            .flagsCollection
            .isSelected
            .toBoolOrNull(),
        isTrue,
      );
      expect(
        tester
            .getSemantics(find.bySemanticsLabel('Occasions'))
            .flagsCollection
            .isSelected
            .toBoolOrNull(),
        isFalse,
      );
      expectNoFlutterException(tester);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('Initial occasion error hides result count', (tester) async {
    await pumpExplore(
      tester,
      overrides: exploreOverrides(occasionError: Exception('occasion-secret')),
    );
    expect(find.text('Occasions unavailable'), findsOneWidget);
    expect(find.text('0 occasions'), findsNothing);
    expect(find.text('1 occasion'), findsNothing);
    expect(find.text('3 occasions'), findsNothing);
    expect(find.text('occasion-secret'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Initial service error hides result count', (tester) async {
    await pumpExplore(
      tester,
      overrides: exploreOverrides(
        intent: 1,
        serviceError: Exception('service-secret'),
      ),
    );
    expect(find.text('Services unavailable'), findsOneWidget);
    expect(find.text('0 services'), findsNothing);
    expect(find.text('1 service'), findsNothing);
    expect(find.text('2 services'), findsNothing);
    expect(find.text('service-secret'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Refresh keeps cached occasion count while reload hangs', (
    tester,
  ) async {
    final refresh = Completer<List<CatalogItem>>();
    var loads = 0;
    await pumpExplore(
      tester,
      overrides: [
        ...exploreOverrides(),
        eventTypesProvider.overrideWith((ref) async {
          loads += 1;
          if (loads == 1) {
            return const [engagement, wedding, birthday];
          }
          return refresh.future;
        }),
      ],
    );
    expect(find.text('3 occasions'), findsOneWidget);
    await tester.fling(
      find.byType(CustomScrollView),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(loads, 2);
    expect(find.text('3 occasions'), findsOneWidget);
    expect(find.text('Occasions unavailable'), findsNothing);
    refresh.complete(const [engagement, wedding, birthday]);
    await tester.pump();
    expectNoFlutterException(tester);
  });

  for (final fixture in const [
    (Size(390, 844), 1.0),
    (Size(320, 844), 1.0),
    (Size(390, 844), 1.3),
    (Size(320, 844), 1.3),
  ]) {
    testWidgets(
      'Explore does not overflow at ${fixture.$1.width.toInt()} text ${fixture.$2}',
      (tester) async {
        await pumpExplore(
          tester,
          size: fixture.$1,
          textScale: fixture.$2,
          overrides: exploreOverrides(),
        );
        expect(find.byType(ExploreTab), findsOneWidget);
        expectNoFlutterException(tester);
        await tester.tap(find.text('Services'));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 50));
        expectNoFlutterException(tester);
      },
    );
  }
}
