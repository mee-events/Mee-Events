import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/core/providers/catalog_provider.dart';
import 'package:mee_events/core/widgets/image/app_image.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/catalog/catalog_image_resolver.dart';
import 'package:mee_events/features/customer/favorites/favorites_provider.dart';
import 'package:mee_events/features/customer/favorites/favorites_store.dart';
import 'package:mee_events/features/customer/plan/event_plan_provider.dart';
import 'package:mee_events/features/customer/plan/event_plan_store.dart';
import 'package:mee_events/features/customer/screens/enquiry_checkout_screen.dart';
import 'package:mee_events/features/customer/screens/product_detail_screen.dart';
import 'package:mee_events/features/customer/screens/service_detail_screen.dart';
import 'package:mee_events/features/customer/search/customer_search_screen.dart';
import 'package:mee_events/features/customer/search/search_provider.dart';
import 'package:mee_events/features/customer/widgets/service_detail/service_product_card.dart';
import 'package:mee_events/features/customer/widgets/service_detail/service_subcategory_chips.dart';
import 'package:mee_events/features/customer/widgets/sticky_enquiry_bar.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/models/catalog_product.dart';
import 'package:mee_events/models/catalog_service.dart';
import 'package:mee_events/models/catalog_subcategory.dart';
import 'package:mee_events/theme/theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  const liveService = CatalogService(
    code: 'photography_videography',
    displayName: 'Photography & Videography',
    departmentCode: 'photography_department',
    entityKind: 'service',
    displayOrder: 1,
    coverImageUrl: 'https://cdn.example/photo-service.jpg',
    subcategoryCount: 2,
    productCount: 3,
  );

  const candid = CatalogSubcategory(
    code: 'candid',
    letter: 'A',
    displayName: 'Candid Photography',
    productCount: 2,
    displayOrder: 1,
  );
  const traditional = CatalogSubcategory(
    code: 'traditional',
    letter: 'B',
    displayName: 'Traditional Coverage With Very Long Indian Name',
    productCount: 1,
    displayOrder: 2,
  );
  const emptySection = CatalogSubcategory(
    code: 'empty',
    letter: 'C',
    displayName: 'Unused',
    productCount: 0,
    displayOrder: 3,
  );

  const productA = CatalogProduct(
    code: 'photo.A1',
    displayName: 'Candid Album',
    serviceCode: 'photography_videography',
    subcategoryCode: 'candid',
    subcategoryLetter: 'A',
    coverImageUrl: 'https://cdn.example/a1.jpg',
    restricted: false,
    addToPlanAllowed: true,
    displayOrder: 1,
    description: 'Natural moments through the ceremony.',
  );
  const productB = CatalogProduct(
    code: 'photo.A2',
    displayName: 'Drone Highlights',
    serviceCode: 'photography_videography',
    subcategoryCode: 'candid',
    subcategoryLetter: 'A',
    restricted: false,
    addToPlanAllowed: true,
    displayOrder: 2,
  );
  const productC = CatalogProduct(
    code: 'photo.B1',
    displayName: 'Traditional Portrait Session With Extended Family',
    serviceCode: 'photography_videography',
    subcategoryCode: 'traditional',
    subcategoryLetter: 'B',
    restricted: false,
    addToPlanAllowed: true,
    displayOrder: 3,
  );
  const restrictedProduct = CatalogProduct(
    code: 'photo.R1',
    displayName: 'Pyrotechnic Effects',
    serviceCode: 'photography_videography',
    subcategoryCode: 'candid',
    subcategoryLetter: 'A',
    restricted: true,
    addToPlanAllowed: false,
    displayOrder: 4,
  );

  List<Override> serviceOverrides({
    CatalogService service = liveService,
    List<CatalogSubcategory> subcategories = const [
      candid,
      traditional,
      emptySection,
    ],
    List<CatalogProduct> products = const [productA, productB, productC],
    Object? serviceError,
    Object? productsError,
    Object? subcategoriesError,
    bool hangService = false,
    bool hangProducts = false,
    bool hangSubcategories = false,
    bool hangPlan = false,
    Object? planError,
    List<EventPlanItem> planItems = const [],
    int Function()? onServiceLoad,
    int Function()? onProductsLoad,
    int Function()? onSubcategoriesLoad,
  }) {
    return [
      sessionUserIdProvider.overrideWithValue('service-user'),
      eventPlanStoreProvider.overrideWithValue(
        _ScriptedPlanStore(
          gate: hangPlan ? Completer<void>() : null,
          error: planError,
          items: planItems,
        ),
      ),
      if (hangService)
        catalogServiceProvider.overrideWith(
          (ref, code) => Completer<CatalogService>().future,
        )
      else if (serviceError != null)
        catalogServiceProvider.overrideWith((ref, code) async {
          onServiceLoad?.call();
          throw serviceError;
        })
      else
        catalogServiceProvider.overrideWith((ref, code) async {
          onServiceLoad?.call();
          return service;
        }),
      if (hangSubcategories)
        serviceSubcategoriesProvider.overrideWith(
          (ref, code) => Completer<List<CatalogSubcategory>>().future,
        )
      else if (subcategoriesError != null)
        serviceSubcategoriesProvider.overrideWith((ref, code) async {
          onSubcategoriesLoad?.call();
          throw subcategoriesError;
        })
      else
        serviceSubcategoriesProvider.overrideWith((ref, code) async {
          onSubcategoriesLoad?.call();
          return subcategories;
        }),
      if (hangProducts)
        serviceProductsProvider.overrideWith(
          (ref, code) => Completer<List<CatalogProduct>>().future,
        )
      else if (productsError != null)
        serviceProductsProvider.overrideWith((ref, code) async {
          onProductsLoad?.call();
          throw productsError;
        })
      else
        serviceProductsProvider.overrideWith((ref, code) async {
          onProductsLoad?.call();
          return products;
        }),
      catalogProductProvider.overrideWith((ref, code) async {
        return products.firstWhere(
          (item) => item.code == code,
          orElse: () => productA,
        );
      }),
      eventTypesProvider.overrideWith(
        (ref) async => const [
          CatalogItem(code: 'wedding', displayName: 'Wedding', displayOrder: 1),
        ],
      ),
      serviceCategoriesProvider.overrideWith(
        (ref) async => const [
          CatalogItem(
            code: 'photography_department',
            displayName: 'Photography',
            displayOrder: 1,
          ),
        ],
      ),
      trendingSearchesProvider.overrideWith((ref) async => const <String>[]),
    ];
  }

  Future<void> pumpService(
    WidgetTester tester, {
    Size size = const Size(390, 844),
    double textScale = 1,
    List<Override> overrides = const [],
    String title = 'Stale Route Title',
    String? imageUrl = 'assets/images/categories/wedding.jpg',
    String? occasionCode = 'wedding',
    String? occasionTitle = 'Wedding',
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
            child: ServiceDetailScreen(
              code: 'photography_videography',
              title: title,
              departmentCode: 'stale_dept',
              imageUrl: imageUrl,
              occasionCode: occasionCode,
              occasionTitle: occasionTitle,
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
      reason: 'Service detail produced an unexpected Flutter exception',
    );
  }

  testWidgets('Live service data overrides stale route title', (tester) async {
    await pumpService(tester, overrides: serviceOverrides());
    expect(find.text('Photography & Videography'), findsOneWidget);
    expect(find.text('Stale Route Title'), findsNothing);
    expect(find.text('Photography'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Unverified service cannot be favorited or submitted', (
    tester,
  ) async {
    await pumpService(
      tester,
      overrides: serviceOverrides(
        serviceError: Exception('secret-service-trace'),
      ),
    );
    expect(find.text('Unable to load this service'), findsOneWidget);
    expect(find.text('secret-service-trace'), findsNothing);
    expect(find.text('Stale Route Title'), findsNothing);
    expect(find.text('Request service quote'), findsNothing);
    expect(find.byType(EnquiryCheckoutScreen), findsNothing);
    await tester.tap(find.byIcon(Icons.favorite_border_rounded));
    await tester.pump();
    final container = ProviderScope.containerOf(
      tester.element(find.byType(ServiceDetailScreen)),
    );
    expect(
      container
          .read(favoritesProvider.notifier)
          .isSaved(FavoriteKind.service, 'photography_videography'),
      isFalse,
    );
    expectNoFlutterException(tester);
  });

  testWidgets('Service title is not visibly duplicated', (tester) async {
    await pumpService(tester, overrides: serviceOverrides());
    expect(find.text('Photography & Videography'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Truthful remote service image takes precedence', (tester) async {
    await pumpService(tester, overrides: serviceOverrides());
    expect(
      CatalogImageResolver.resolvedServiceImage(
        coverImageUrl: liveService.coverImageUrl,
      ),
      'https://cdn.example/photo-service.jpg',
    );
    expect(
      tester
          .widgetList<AppImage>(find.byType(AppImage))
          .any(
            (image) =>
                image.imageUrl == 'https://cdn.example/photo-service.jpg',
          ),
      isTrue,
    );
    expectNoFlutterException(tester);
  });

  testWidgets('Missing image uses branded fallback not an occasion photo', (
    tester,
  ) async {
    await pumpService(
      tester,
      overrides: serviceOverrides(
        service: const CatalogService(
          code: 'photography_videography',
          displayName: 'Photography & Videography',
          departmentCode: 'photography_department',
          entityKind: 'service',
          displayOrder: 1,
        ),
      ),
    );
    expect(find.byKey(HomeCatalogVisual.fallbackKey), findsWidgets);
    expect(
      find.image(const AssetImage('assets/images/categories/wedding.jpg')),
      findsNothing,
    );
    expectNoFlutterException(tester);
  });

  testWidgets('API subcategories render in API order with All', (tester) async {
    await pumpService(tester, overrides: serviceOverrides());
    expect(find.text('All'), findsOneWidget);
    expect(find.byKey(const ValueKey('candid')), findsOneWidget);
    expect(find.byKey(const ValueKey('traditional')), findsOneWidget);
    expect(
      tester.getTopLeft(find.byKey(const ValueKey('candid'))).dx,
      lessThan(tester.getTopLeft(find.byKey(const ValueKey('traditional'))).dx),
    );
    expect(find.text('Unused'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Subcategory selection filters products and keeps order', (
    tester,
  ) async {
    await pumpService(tester, overrides: serviceOverrides());
    expect(
      tester.getTopLeft(find.text('Candid Album')).dy,
      lessThan(tester.getTopLeft(find.text('Drone Highlights')).dy),
    );
    await tester.ensureVisible(find.byKey(const ValueKey('traditional')));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('traditional')));
    await tester.pump();
    expect(
      find.text('Traditional Portrait Session With Extended Family'),
      findsOneWidget,
    );
    expect(find.text('Candid Album'), findsNothing);
    expect(find.text('Drone Highlights'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Product card opens the correct ProductDetailScreen', (
    tester,
  ) async {
    await pumpService(tester, overrides: serviceOverrides());
    await tester.tap(find.text('Candid Album'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    final detail = tester.widget<ProductDetailScreen>(
      find.byType(ProductDetailScreen),
    );
    expect(detail.code, 'photo.A1');
    expect(detail.occasionCode, 'wedding');
    expect(detail.occasionTitle, 'Wedding');
    expect(
      find.descendant(
        of: find.byType(ProductDetailScreen),
        matching: find.text('Relevant for Wedding'),
      ),
      findsOneWidget,
    );
    expectNoFlutterException(tester);
  });

  testWidgets('Add and Added follow Event Plan and can remove', (tester) async {
    await pumpService(tester, overrides: serviceOverrides());
    expect(find.text('Add'), findsWidgets);
    await tester.tap(find.bySemanticsLabel('Add Candid Album to Event Plan'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Added'), findsOneWidget);
    expect(find.text('Continue with Event Plan · 1 item'), findsOneWidget);
    final container = ProviderScope.containerOf(
      tester.element(find.byType(ServiceDetailScreen)),
    );
    expect(
      container
          .read(eventPlanProvider)
          .valueOrNull
          ?.map((item) => item.productCode),
      ['photo.A1'],
    );
    await tester.tap(
      find.bySemanticsLabel('Remove Candid Album from Event Plan'),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(container.read(eventPlanProvider).valueOrNull, isEmpty);
    expect(find.text('Request service quote'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Restricted product has no enabled Add and stays openable', (
    tester,
  ) async {
    await pumpService(
      tester,
      overrides: serviceOverrides(products: const [restrictedProduct]),
    );
    expect(find.text('Eligibility review'), findsOneWidget);
    expect(
      find.bySemanticsLabel('Add Pyrotechnic Effects to Event Plan'),
      findsNothing,
    );
    expect(find.text('Add'), findsNothing);
    await tester.tap(find.text('Pyrotechnic Effects'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byType(ProductDetailScreen), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Add control does not open Product Detail', (tester) async {
    await pumpService(tester, overrides: serviceOverrides());
    await tester.tap(find.bySemanticsLabel('Add Candid Album to Event Plan'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byType(ProductDetailScreen), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Favorite toggles the verified live service', (tester) async {
    final handle = tester.ensureSemantics();
    try {
      await pumpService(tester, overrides: serviceOverrides());
      expect(find.bySemanticsLabel('Save to favorites'), findsOneWidget);
      await tester.tap(find.byIcon(Icons.favorite_border_rounded));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.bySemanticsLabel('Remove from favorites'), findsOneWidget);
      final container = ProviderScope.containerOf(
        tester.element(find.byType(ServiceDetailScreen)),
      );
      expect(
        container
            .read(favoritesProvider.notifier)
            .isSaved(FavoriteKind.service, 'photography_videography'),
        isTrue,
      );
      expectNoFlutterException(tester);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('Search opens the existing search screen', (tester) async {
    await pumpService(tester, overrides: serviceOverrides());
    await tester.tap(find.byIcon(Icons.search_rounded));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byType(CustomerSearchScreen), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Empty products show a customer-friendly service state', (
    tester,
  ) async {
    await pumpService(tester, overrides: serviceOverrides(products: const []));
    expect(find.text('No options listed yet'), findsOneWidget);
    expect(find.text('Photography & Videography'), findsOneWidget);
    expect(find.text('Request service quote'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Product error keeps the service header and supports Retry', (
    tester,
  ) async {
    var products = 0;
    await pumpService(
      tester,
      overrides: serviceOverrides(
        productsError: Exception('secret-product-trace'),
        onProductsLoad: () => ++products,
      ),
    );
    expect(find.text('Photography & Videography'), findsOneWidget);
    expect(find.text('Options unavailable'), findsOneWidget);
    expect(find.text('secret-product-trace'), findsNothing);
    expect(products, 1);
    await tester.tap(find.text('Retry'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(products, 2);
    expectNoFlutterException(tester);
  });

  testWidgets('Sticky CTA opens checkout with occasion and department', (
    tester,
  ) async {
    await pumpService(tester, overrides: serviceOverrides());
    await tester.tap(find.text('Request service quote'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    final checkout = tester.widget<EnquiryCheckoutScreen>(
      find.byType(EnquiryCheckoutScreen),
    );
    expect(checkout.initialEventTypeCode, 'wedding');
    expect(checkout.initialServiceCategoryCodes, ['photography_department']);
    expect(checkout.contextNotes, contains('Photography & Videography'));
    expect(
      checkout.initialServiceCategoryCodes,
      isNot(contains('photography_videography')),
    );
    expectNoFlutterException(tester);
  });

  testWidgets('Last product is not covered by the sticky CTA', (tester) async {
    await pumpService(
      tester,
      size: const Size(320, 844),
      overrides: serviceOverrides(),
    );
    await tester.scrollUntilVisible(
      find.text('Traditional Portrait Session With Extended Family'),
      80,
      scrollable: find.byType(Scrollable).first,
    );
    final lastBottom = tester
        .getRect(find.text('Traditional Portrait Session With Extended Family'))
        .bottom;
    final barTop = tester.getRect(find.byType(StickyEnquiryBar)).top;
    expect(lastBottom, lessThanOrEqualTo(barTop));
    expectNoFlutterException(tester);
  });

  testWidgets('CTA and cards satisfy 44px targets', (tester) async {
    await pumpService(tester, overrides: serviceOverrides());
    final card = tester.getSize(find.byType(ServiceProductCard).first);
    expect(card.height, greaterThanOrEqualTo(44));
    expect(card.width, greaterThanOrEqualTo(44));
    final add = tester.getSize(
      find.bySemanticsLabel('Add Candid Album to Event Plan'),
    );
    expect(add.height, greaterThanOrEqualTo(44));
    expect(add.width, greaterThanOrEqualTo(44));
    final cta = tester.getSize(
      find.descendant(
        of: find.byType(StickyEnquiryBar),
        matching: find.byType(InkWell),
      ),
    );
    expect(cta.height, greaterThanOrEqualTo(44));
    expectNoFlutterException(tester);
  });

  testWidgets('Refresh starts service, subcategory, and product reloads', (
    tester,
  ) async {
    var serviceLoads = 0;
    var productLoads = 0;
    var subcategoryLoads = 0;
    await pumpService(
      tester,
      overrides: serviceOverrides(
        onServiceLoad: () => ++serviceLoads,
        onProductsLoad: () => ++productLoads,
        onSubcategoriesLoad: () => ++subcategoryLoads,
      ),
    );
    expect(serviceLoads, 1);
    expect(productLoads, 1);
    expect(subcategoryLoads, 1);

    await tester.fling(
      find.byType(CustomScrollView),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(serviceLoads, 2);
    expect(productLoads, 2);
    expect(subcategoryLoads, 2);
    expectNoFlutterException(tester);
  });

  testWidgets('Service refresh failure still starts sibling reloads', (
    tester,
  ) async {
    var serviceLoads = 0;
    var productLoads = 0;
    var subcategoryLoads = 0;
    await pumpService(
      tester,
      overrides: [
        ...serviceOverrides(
          onProductsLoad: () => ++productLoads,
          onSubcategoriesLoad: () => ++subcategoryLoads,
        ),
        catalogServiceProvider.overrideWith((ref, code) async {
          serviceLoads += 1;
          if (serviceLoads == 1) return liveService;
          throw Exception('service-refresh-failed');
        }),
      ],
    );
    expect(serviceLoads, 1);
    expect(productLoads, 1);
    expect(subcategoryLoads, 1);

    await tester.fling(
      find.byType(CustomScrollView),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(serviceLoads, 2);
    expect(productLoads, 2);
    expect(subcategoryLoads, 2);
    expectNoFlutterException(tester);
    expect(find.text('service-refresh-failed'), findsNothing);
    expect(find.text('Photography & Videography'), findsOneWidget);
  });

  testWidgets('Disposing during pending refresh is safe', (tester) async {
    var serviceLoads = 0;
    var productLoads = 0;
    var subcategoryLoads = 0;
    final serviceRefresh = Completer<CatalogService>();
    final productsRefresh = Completer<List<CatalogProduct>>();
    final subcategoriesRefresh = Completer<List<CatalogSubcategory>>();

    await pumpService(
      tester,
      overrides: [
        ...serviceOverrides(),
        catalogServiceProvider.overrideWith((ref, code) async {
          serviceLoads += 1;
          if (serviceLoads == 1) return liveService;
          return serviceRefresh.future;
        }),
        serviceProductsProvider.overrideWith((ref, code) async {
          productLoads += 1;
          if (productLoads == 1) {
            return const [productA, productB, productC];
          }
          return productsRefresh.future;
        }),
        serviceSubcategoriesProvider.overrideWith((ref, code) async {
          subcategoryLoads += 1;
          if (subcategoryLoads == 1) {
            return const [candid, traditional, emptySection];
          }
          return subcategoriesRefresh.future;
        }),
      ],
    );
    expect(serviceLoads, 1);
    expect(productLoads, 1);
    expect(subcategoryLoads, 1);

    await tester.fling(
      find.byType(CustomScrollView),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(serviceLoads, 2);
    expect(productLoads, 2);
    expect(subcategoryLoads, 2);

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
    expect(find.byType(ServiceDetailScreen), findsNothing);

    serviceRefresh.complete(liveService);
    productsRefresh.complete(const [productA]);
    subcategoriesRefresh.complete(const [candid]);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.pump(const Duration(milliseconds: 50));
    expectNoFlutterException(tester);
    expect(serviceLoads, 2);
    expect(productLoads, 2);
    expect(subcategoryLoads, 2);
  });

  test('filterServiceProducts preserves API order', () {
    expect(
      filterServiceProducts(const [
        productA,
        productB,
        productC,
      ], null).map((item) => item.code),
      ['photo.A1', 'photo.A2', 'photo.B1'],
    );
    expect(
      filterServiceProducts(const [
        productA,
        productB,
        productC,
      ], 'candid').map((item) => item.code),
      ['photo.A1', 'photo.A2'],
    );
  });

  testWidgets('Removed subcategory does not silently return after restore', (
    tester,
  ) async {
    var subcategoryLoads = 0;
    await pumpService(
      tester,
      overrides: [
        ...serviceOverrides(),
        serviceSubcategoriesProvider.overrideWith((ref, code) async {
          subcategoryLoads += 1;
          if (subcategoryLoads == 2) {
            return const [candid, emptySection];
          }
          return const [candid, traditional, emptySection];
        }),
      ],
    );
    await tester.ensureVisible(find.byKey(const ValueKey('traditional')));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('traditional')));
    await tester.pump();
    expect(find.text('Candid Album'), findsNothing);

    await tester.fling(
      find.byType(CustomScrollView),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const ValueKey('traditional')), findsNothing);
    expect(find.text('Candid Album'), findsOneWidget);

    await tester.fling(
      find.byType(CustomScrollView),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const ValueKey('traditional')), findsOneWidget);
    expect(find.text('Candid Album'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Subcategory error still shows all products', (tester) async {
    await pumpService(
      tester,
      overrides: serviceOverrides(
        subcategoriesError: Exception('secret-subcategory-trace'),
      ),
    );
    expect(find.text('Candid Album'), findsOneWidget);
    expect(find.text('Drone Highlights'), findsOneWidget);
    expect(find.text('secret-subcategory-trace'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Event Plan loading disables checkout and Add', (tester) async {
    final handle = tester.ensureSemantics();
    try {
      await pumpService(tester, overrides: serviceOverrides(hangPlan: true));
      expect(find.text('Checking Event Plan…'), findsOneWidget);
      expect(find.text('Request service quote'), findsNothing);
      final inkWell = tester.widget<InkWell>(
        find.descendant(
          of: find.byType(StickyEnquiryBar),
          matching: find.byType(InkWell),
        ),
      );
      expect(inkWell.onTap, isNull);
      await tester.tap(find.text('Checking Event Plan…'));
      await tester.pump();
      expect(find.byType(EnquiryCheckoutScreen), findsNothing);
      expectNoFlutterException(tester);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('Event Plan error retries without leaking exception text', (
    tester,
  ) async {
    await pumpService(
      tester,
      overrides: serviceOverrides(planError: Exception('secret-plan-trace')),
    );
    expect(find.text('Retry Event Plan'), findsOneWidget);
    expect(find.text('secret-plan-trace'), findsNothing);
    expect(find.text('Request service quote'), findsNothing);
    await tester.tap(find.text('Retry Event Plan'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byType(EnquiryCheckoutScreen), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('CTA caps at 99+ and uses plural copy', (tester) async {
    await pumpService(
      tester,
      overrides: serviceOverrides(
        planItems: List.generate(
          100,
          (index) => EventPlanItem(
            productCode: 'p.$index',
            displayName: 'Item $index',
            serviceCode: 'photography_videography',
          ),
        ),
      ),
    );
    expect(find.text('Continue with Event Plan · 99+ items'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Loading Event Plan CTA does not overflow at 320 text 1.3', (
    tester,
  ) async {
    await pumpService(
      tester,
      size: const Size(320, 844),
      textScale: 1.3,
      overrides: serviceOverrides(hangPlan: true),
    );
    expect(find.text('Checking Event Plan…'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Product and chip semantics are not duplicated', (tester) async {
    final handle = tester.ensureSemantics();
    try {
      await pumpService(
        tester,
        overrides: serviceOverrides(
          products: const [productA, restrictedProduct],
        ),
      );
      final cardLabel = serviceProductCardLabel(
        product: productA,
        subcategoryLabel: 'Candid Photography',
      );
      expect(find.bySemanticsLabel(cardLabel), findsOneWidget);
      expect(find.bySemanticsLabel('Candid Album'), findsNothing);
      expect(
        find.bySemanticsLabel(
          serviceProductCardLabel(
            product: restrictedProduct,
            subcategoryLabel: 'Candid Photography',
          ),
        ),
        findsOneWidget,
      );
      expect(
        tester.getSemantics(find.bySemanticsLabel(cardLabel)).label,
        contains('Candid Album'),
      );
      expect(
        find.bySemanticsLabel('Add Candid Album to Event Plan'),
        findsOneWidget,
      );
      expect(find.bySemanticsLabel('All'), findsOneWidget);
      expect(find.bySemanticsLabel('Candid Photography · 2'), findsOneWidget);
      final allSemantics = tester
          .widgetList<Semantics>(
            find.descendant(
              of: find.byKey(const ValueKey(ServiceSubcategoryChips.allCode)),
              matching: find.byType(Semantics),
            ),
          )
          .first;
      expect(allSemantics.properties.selected, isTrue);
      expect(
        find.bySemanticsLabel('Continue with Event Plan · 1 item'),
        findsNothing,
      );
      expect(find.bySemanticsLabel('Request service quote'), findsOneWidget);
      expectNoFlutterException(tester);
    } finally {
      handle.dispose();
    }
  });

  for (final fixture in const [
    (Size(390, 844), 1.0),
    (Size(320, 844), 1.0),
    (Size(390, 844), 1.3),
    (Size(320, 844), 1.3),
  ]) {
    testWidgets(
      'Service detail does not overflow at ${fixture.$1.width.toInt()} text ${fixture.$2}',
      (tester) async {
        await pumpService(
          tester,
          size: fixture.$1,
          textScale: fixture.$2,
          overrides: serviceOverrides(
            products: const [productA, productC, restrictedProduct],
          ),
        );
        expect(find.byType(ServiceDetailScreen), findsOneWidget);
        expectNoFlutterException(tester);
      },
    );
  }
}

class _ScriptedPlanStore extends EventPlanStore {
  _ScriptedPlanStore({this.gate, this.error, this.items = const []})
    : super(userId: 'service-user');

  final Completer<void>? gate;
  final Object? error;
  final List<EventPlanItem> items;

  @override
  Future<List<EventPlanItem>> load() async {
    final pending = gate;
    if (pending != null) {
      await pending.future;
    }
    if (error != null) {
      throw error!;
    }
    return [...items];
  }
}
