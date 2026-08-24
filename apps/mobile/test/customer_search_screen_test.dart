import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/core/providers/catalog_provider.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/navigation/customer_tab.dart';
import 'package:mee_events/features/customer/plan/event_plan_provider.dart';
import 'package:mee_events/features/customer/plan/event_plan_store.dart';
import 'package:mee_events/features/customer/providers/event_record_providers.dart';
import 'package:mee_events/features/customer/providers/explore_intent_provider.dart';
import 'package:mee_events/features/customer/screens/category_detail_screen.dart';
import 'package:mee_events/features/customer/screens/product_detail_screen.dart';
import 'package:mee_events/features/customer/screens/service_detail_screen.dart';
import 'package:mee_events/features/customer/search/customer_search_screen.dart';
import 'package:mee_events/features/customer/search/recent_searches_store.dart';
import 'package:mee_events/features/customer/search/search_models.dart';
import 'package:mee_events/features/customer/search/search_provider.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/models/catalog_product.dart';
import 'package:mee_events/models/catalog_selection.dart';
import 'package:mee_events/models/catalog_service.dart';
import 'package:mee_events/models/catalog_subcategory.dart';
import 'package:mee_events/models/occasion_stage.dart';
import 'package:mee_events/theme/theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'search_query_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeMobileApi api;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    api = FakeMobileApi();
  });

  SearchHit hit({
    required String type,
    required String code,
    required String name,
    String? parentCode,
    String? parentName,
  }) {
    return SearchHit(
      id: '$type-$code',
      code: code,
      type: type,
      name: name,
      score: 1,
      parentOccasionCode: parentCode,
      parentOccasionName: parentName,
    );
  }

  List<Override> overrides({
    List<String> trending = const ['Mehndi'],
    Object? trendingError,
  }) {
    return [
      sessionUserIdProvider.overrideWithValue('search-user'),
      mobileApiProvider.overrideWithValue(api),
      recentSearchesStoreProvider.overrideWith(
        (ref) => RecentSearchesStore(userId: 'search-user'),
      ),
      eventPlanStoreProvider.overrideWithValue(
        EventPlanStore(userId: 'search-user'),
      ),
      if (trendingError != null)
        trendingSearchesProvider.overrideWith((ref) async {
          throw trendingError;
        })
      else
        trendingSearchesProvider.overrideWith((ref) async => trending),
      occasionStagesProvider.overrideWith(
        (ref, code) async => const <OccasionStage>[],
      ),
      occasionServicesProvider.overrideWith(
        (ref, code) async => const <CatalogService>[],
      ),
      eventSelectionsProvider.overrideWith(
        (ref, code) async => const <CatalogSelection>[],
      ),
      eventTypesProvider.overrideWith(
        (ref) async => const [
          CatalogItem(code: 'wedding', displayName: 'Wedding', displayOrder: 1),
        ],
      ),
      catalogServiceProvider.overrideWith(
        (ref, code) async => CatalogService(
          code: code,
          displayName: code,
          departmentCode: 'dept',
          entityKind: 'service',
          displayOrder: 1,
        ),
      ),
      serviceSubcategoriesProvider.overrideWith(
        (ref, code) async => const <CatalogSubcategory>[],
      ),
      serviceProductsProvider.overrideWith(
        (ref, code) async => const <CatalogProduct>[],
      ),
      catalogProductProvider.overrideWith(
        (ref, code) async => CatalogProduct(
          code: code,
          displayName: code,
          serviceCode: 'photography',
          subcategoryCode: 'a',
          subcategoryLetter: 'A',
          restricted: false,
          addToPlanAllowed: true,
          displayOrder: 1,
        ),
      ),
      eventsProvider.overrideWith((ref) async => const []),
      catalogServicesProvider.overrideWith(
        (ref, code) async => const <CatalogService>[],
      ),
    ];
  }

  Future<void> pumpSearch(
    WidgetTester tester, {
    Size size = const Size(390, 844),
    double textScale = 1,
    List<Override> extra = const [],
    ValueChanged<CustomerTab>? onNavigate,
  }) async {
    tester.view.physicalSize = Size(size.width * 3, size.height * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [...overrides(), ...extra],
        child: MaterialApp(
          theme: AppTheme.light,
          home: MediaQuery(
            data: MediaQueryData(
              size: size,
              textScaler: TextScaler.linear(textScale),
            ),
            child: CustomerSearchScreen(onNavigateTab: onNavigate),
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pump();
  }

  testWidgets('Empty query renders idle state', (tester) async {
    await pumpSearch(tester);
    expect(find.text('Trending searches'), findsOneWidget);
    expect(find.text('Browse Occasions'), findsOneWidget);
    expect(find.text('Browse Services'), findsOneWidget);
    expect(find.text('No results found'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Recent terms newest first and remove/clear work', (
    tester,
  ) async {
    final prefs = await SharedPreferences.getInstance();
    final store = RecentSearchesStore(prefs: prefs, userId: 'search-user');
    await store.add('Birthday');
    await store.add('Wedding');
    await pumpSearch(
      tester,
      extra: [recentSearchesStoreProvider.overrideWithValue(store)],
    );
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Wedding'), findsOneWidget);
    expect(find.text('Birthday'), findsOneWidget);
    await tester.tap(find.byTooltip('Remove Birthday'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Birthday'), findsNothing);
    await tester.tap(find.text('Clear all'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Wedding'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Trending error does not claim there are no terms', (
    tester,
  ) async {
    await pumpSearch(
      tester,
      extra: overrides(trendingError: Exception('trend-secret')),
    );
    expect(find.text('trend-secret'), findsNothing);
    expect(find.text('No trending terms yet'), findsNothing);
    expect(find.text('Retry'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Search loading does not show false empty', (tester) async {
    final delayed = Completer<SearchResponse>();
    api.onSearch = (q, cursor) => delayed.future;
    await pumpSearch(tester);
    await tester.enterText(find.byType(TextField), 'wedding');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.textContaining('No results'), findsNothing);
    expect(find.byType(MeSkeleton), findsWidgets);
    delayed.complete(
      const SearchResponse(query: 'wedding', results: [], nextCursor: null),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('No results for “wedding”'), findsOneWidget);
    expect(find.text('Popular Services'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Initial error hides exception and Retry works', (tester) async {
    var fail = true;
    api.onSearch = (q, cursor) async {
      if (fail) throw Exception('raw-secret');
      return SearchResponse(
        query: q,
        results: [hit(type: 'occasion', code: 'wedding', name: 'Wedding')],
      );
    };
    await pumpSearch(tester);
    await tester.enterText(find.byType(TextField), 'wedding');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Search unavailable'), findsOneWidget);
    expect(find.text('raw-secret'), findsNothing);
    fail = false;
    await tester.tap(find.text('Retry'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Wedding'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Empty results browse actions set Explore intents', (
    tester,
  ) async {
    api.onSearch = (q, cursor) async =>
        SearchResponse(query: q, results: const [], nextCursor: null);
    CustomerTab? tab;
    final container = ProviderContainer(overrides: overrides());
    addTearDown(container.dispose);
    tester.view.physicalSize = const Size(1170, 2532);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          home: CustomerSearchScreen(onNavigateTab: (value) => tab = value),
        ),
      ),
    );
    await tester.pump();
    FocusManager.instance.primaryFocus?.unfocus();
    await tester.pump();
    await tester.enterText(find.byType(TextField), 'zzzz');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.tap(find.text('Browse Services'));
    await tester.pump();
    expect(tab, CustomerTab.explore);
    expect(container.read(exploreIntentProvider), 1);
  });

  testWidgets('Result groups hide internal copy', (tester) async {
    api.onSearch = (q, cursor) async => SearchResponse(
      query: q,
      results: [
        hit(type: 'occasion', code: 'wedding', name: 'Wedding'),
        hit(
          type: 'stage',
          code: 'mehndi',
          name: 'Mehndi',
          parentCode: 'wedding',
          parentName: 'Wedding',
        ),
        hit(type: 'service', code: 'photography', name: 'Photography'),
        hit(type: 'other', code: 'chairs', name: 'Chair Rentals'),
        hit(type: 'product', code: 'photo.A1', name: 'Album'),
        hit(type: 'category', code: 'decor', name: 'Decor'),
        hit(type: 'vendor', code: 'secret-vendor', name: 'Hidden Vendor'),
      ],
    );
    await pumpSearch(tester);
    await tester.enterText(find.byType(TextField), 'wedding');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Occasions'), findsWidgets);
    expect(find.text('Functions & ceremonies'), findsOneWidget);
    expect(find.text('Services'), findsWidgets);
    expect(find.text('Offerings'), findsOneWidget);
    expect(find.text('Venues & rentals'), findsOneWidget);
    expect(find.text('Service areas'), findsOneWidget);
    expect(find.textContaining('Stage ·'), findsNothing);
    expect(find.text('Hidden Vendor'), findsNothing);
    expect(find.textContaining('score'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Stage route uses structured parent occasion', (tester) async {
    api.onSearch = (q, cursor) async => SearchResponse(
      query: q,
      results: [
        hit(
          type: 'stage',
          code: 'mehndi',
          name: 'Mehndi',
          parentCode: 'wedding',
          parentName: 'Wedding',
        ),
      ],
    );
    await pumpSearch(tester);
    await tester.enterText(find.byType(TextField), 'mehndi');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.tap(find.text('Mehndi'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    final stageRoute = tester.widget<CategoryDetailScreen>(
      find.byType(CategoryDetailScreen),
    );
    expect(stageRoute.code, 'wedding');
    expect(stageRoute.title, 'Wedding');
    expect(stageRoute.isOccasion, isTrue);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Service route opens Service Detail', (tester) async {
    api.onSearch = (q, cursor) async => SearchResponse(
      query: q,
      results: [hit(type: 'service', code: 'photography', name: 'Photography')],
    );
    await pumpSearch(tester);
    await tester.enterText(find.byType(TextField), 'photo');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.tap(find.text('Photography'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(
      tester.widget<ServiceDetailScreen>(find.byType(ServiceDetailScreen)).code,
      'photography',
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('Service and inventory other route to Service Detail', (
    tester,
  ) async {
    api.onSearch = (q, cursor) async => SearchResponse(
      query: q,
      results: [hit(type: 'other', code: 'chairs', name: 'Chair Rentals')],
    );
    await pumpSearch(tester);
    await tester.enterText(find.byType(TextField), 'chairs');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.tap(find.text('Chair Rentals'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(
      tester.widget<ServiceDetailScreen>(find.byType(ServiceDetailScreen)).code,
      'chairs',
    );
    expect(find.byType(CategoryDetailScreen), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Product and category routes are correct', (tester) async {
    api.onSearch = (q, cursor) async => SearchResponse(
      query: q,
      results: [hit(type: 'product', code: 'photo.A1', name: 'Album')],
    );
    await pumpSearch(tester);
    await tester.enterText(find.byType(TextField), 'album');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.tap(find.text('Album'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(
      tester.widget<ProductDetailScreen>(find.byType(ProductDetailScreen)).code,
      'photo.A1',
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('Category compatibility route is not an occasion', (
    tester,
  ) async {
    api.onSearch = (q, cursor) async => SearchResponse(
      query: q,
      results: [hit(type: 'category', code: 'decor', name: 'Decor')],
    );
    await pumpSearch(tester);
    await tester.enterText(find.byType(TextField), 'decor');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.tap(find.text('Decor'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    final category = tester.widget<CategoryDetailScreen>(
      find.byType(CategoryDetailScreen),
    );
    expect(category.code, 'decor');
    expect(category.isOccasion, isFalse);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Semantic result action opens one destination', (tester) async {
    final handle = tester.ensureSemantics();
    try {
      api.onSearch = (q, cursor) async => SearchResponse(
        query: q,
        results: [hit(type: 'occasion', code: 'wedding', name: 'Wedding')],
      );
      await pumpSearch(tester);
      await tester.enterText(find.byType(TextField), 'wedding');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      final finder = find.semantics.byLabel('Wedding, occasion');
      expect(finder, findsOneWidget);
      final node = tester.getSemantics(
        find.bySemanticsLabel('Wedding, occasion'),
      );
      expect(node.flagsCollection.isButton, isTrue);
      expect(node.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
      tester.semantics.tap(finder);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.byType(CategoryDetailScreen), findsOneWidget);
      expect(tester.takeException(), isNull);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('Load more retains results and shows retry on failure', (
    tester,
  ) async {
    var page = 0;
    api.onSearch = (q, cursor) async {
      page += 1;
      if (page == 1) {
        return SearchResponse(
          query: q,
          results: [hit(type: 'service', code: 'photo', name: 'Photography')],
          nextCursor: 'more',
        );
      }
      throw Exception('more-secret');
    };
    await pumpSearch(tester);
    await tester.enterText(find.byType(TextField), 'photo');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Load more results'), findsOneWidget);
    await tester.tap(find.text('Load more results'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Photography'), findsOneWidget);
    expect(find.text('Could not load more results'), findsOneWidget);
    expect(find.text('more-secret'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Opening a result does not add recent again', (tester) async {
    final previousFatal = WidgetController.hitTestWarningShouldBeFatal;
    WidgetController.hitTestWarningShouldBeFatal = true;
    try {
      api.onSearch = (q, cursor) async => SearchResponse(
        query: q,
        results: [hit(type: 'occasion', code: 'wedding', name: 'Wedding')],
      );
      await pumpSearch(tester);
      await tester.enterText(find.byType(TextField), 'wedding');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      await tester.tap(find.text('Wedding').last);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.byType(CategoryDetailScreen), findsOneWidget);
      Navigator.of(tester.element(find.byType(CategoryDetailScreen))).pop();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.byType(CategoryDetailScreen), findsNothing);
      final clear = find.byIcon(Icons.close);
      expect(clear, findsOneWidget);
      await tester.tap(clear);
      await tester.pump();
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller?.text,
        '',
      );
      expect(find.text('Trending searches'), findsOneWidget);
      expect(find.text('Wedding'), findsNothing);
      expect(find.text('wedding'), findsOneWidget);
      expect(tester.takeException(), isNull);
    } finally {
      WidgetController.hitTestWarningShouldBeFatal = previousFatal;
    }
  });

  testWidgets('Unsupported-only first page keeps Load more reachable', (
    tester,
  ) async {
    var page = 0;
    api.onSearch = (q, cursor) async {
      page += 1;
      if (cursor == null) {
        return SearchResponse(
          query: q,
          results: [hit(type: 'blog', code: 'post-1', name: 'Planning Tips')],
          nextCursor: 'p2',
        );
      }
      return SearchResponse(
        query: q,
        results: [hit(type: 'service', code: 'photo', name: 'Photography')],
        nextCursor: null,
      );
    };
    await pumpSearch(tester);
    await tester.enterText(find.byType(TextField), 'tips');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('No results for “tips”'), findsNothing);
    expect(find.text('Planning Tips'), findsNothing);
    expect(find.text('More matches are available'), findsOneWidget);
    expect(find.text('Load more results'), findsOneWidget);
    await tester.tap(find.text('Load more results'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(page, 2);
    expect(find.text('Photography'), findsOneWidget);
    expect(tester.takeException(), isNull);

    api.onSearch = (q, cursor) async => SearchResponse(
      query: q,
      results: [hit(type: 'blog', code: 'post-2', name: 'Hidden Essay')],
      nextCursor: null,
    );
    await tester.enterText(find.byType(TextField), 'essay');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('No results for “essay”'), findsOneWidget);
    expect(find.text('Load more results'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Clear search exposes one tappable semantics node', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    try {
      api.onSearch = (q, cursor) async => SearchResponse(
        query: q,
        results: [hit(type: 'occasion', code: 'wedding', name: 'Wedding')],
      );
      await pumpSearch(tester);
      await tester.enterText(find.byType(TextField), 'wedding');
      await tester.testTextInput.receiveAction(TextInputAction.search);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      final finder = find.bySemanticsLabel('Clear search');
      expect(finder, findsOneWidget);
      final node = tester.getSemantics(finder);
      expect(node.flagsCollection.isButton, isTrue);
      expect(node.flagsCollection.isEnabled.toBoolOrNull(), isTrue);
      expect(node.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
      tester.semantics.tap(find.semantics.byLabel('Clear search'));
      await tester.pump();
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller?.text,
        '',
      );
      expect(find.text('Trending searches'), findsOneWidget);
      expect(find.text('Wedding'), findsNothing);
      expect(tester.takeException(), isNull);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('Unsupported types do not guess a route', (tester) async {
    api.onSearch = (q, cursor) async => SearchResponse(
      query: q,
      results: [hit(type: 'blog', code: 'post-1', name: 'Planning Tips')],
    );
    await pumpSearch(tester);
    await tester.enterText(find.byType(TextField), 'tips');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Planning Tips'), findsNothing);
    expect(find.byType(CategoryDetailScreen), findsNothing);
    expect(tester.takeException(), isNull);
  });

  for (final fixture in const [
    (Size(390, 844), 1.0),
    (Size(320, 844), 1.0),
    (Size(390, 844), 1.3),
    (Size(320, 844), 1.3),
  ]) {
    testWidgets(
      'Search does not overflow at ${fixture.$1.width.toInt()} text ${fixture.$2}',
      (tester) async {
        api.onSearch = (q, cursor) async => SearchResponse(
          query: q,
          results: [
            hit(
              type: 'occasion',
              code: 'wedding',
              name: 'South Indian Wedding Celebration With Extended Family',
            ),
          ],
        );
        await pumpSearch(tester, size: fixture.$1, textScale: fixture.$2);
        expect(tester.takeException(), isNull);
        await tester.enterText(find.byType(TextField), 'wedding');
        await tester.testTextInput.receiveAction(TextInputAction.search);
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 50));
        expect(tester.takeException(), isNull);
      },
    );
  }
}
