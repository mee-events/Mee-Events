import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/core/providers/catalog_provider.dart';
import 'package:mee_events/core/widgets/image/app_image.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/catalog/catalog_image_resolver.dart';
import 'package:mee_events/features/customer/favorites/favorites_provider.dart';
import 'package:mee_events/features/customer/favorites/favorites_store.dart';
import 'package:mee_events/features/customer/plan/event_plan_provider.dart';
import 'package:mee_events/features/customer/plan/event_plan_store.dart';
import 'package:mee_events/features/customer/screens/enquiry_checkout_screen.dart';
import 'package:mee_events/features/customer/screens/product_detail_screen.dart';
import 'package:mee_events/features/customer/search/customer_search_screen.dart';
import 'package:mee_events/features/customer/search/search_provider.dart';
import 'package:mee_events/features/customer/widgets/product_detail/product_gallery.dart';
import 'package:mee_events/features/customer/widgets/sticky_enquiry_bar.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/models/catalog_product.dart';
import 'package:mee_events/models/catalog_service.dart';
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
  );

  const liveProduct = CatalogProduct(
    code: 'photo.A1',
    displayName: 'Candid Album',
    serviceCode: 'photography_videography',
    subcategoryCode: 'candid',
    subcategoryLetter: 'A',
    coverImageUrl: 'https://cdn.example/cover.jpg',
    restricted: false,
    addToPlanAllowed: true,
    displayOrder: 1,
    sourceName: 'INTERNAL_VENDOR_X',
    description: 'Natural moments through the ceremony.',
    gallery: [
      'https://cdn.example/cover.jpg',
      '',
      'https://cdn.example/g2.jpg',
    ],
  );

  const restrictedProduct = CatalogProduct(
    code: 'photo.R1',
    displayName: 'Pyrotechnic Effects',
    serviceCode: 'photography_videography',
    subcategoryCode: 'candid',
    subcategoryLetter: 'A',
    restricted: true,
    addToPlanAllowed: false,
    displayOrder: 2,
    description: 'Special effects for the send-off.',
  );

  const noMediaProduct = CatalogProduct(
    code: 'photo.A1',
    displayName: 'Candid Album',
    serviceCode: 'photography_videography',
    subcategoryCode: 'candid',
    subcategoryLetter: 'A',
    restricted: false,
    addToPlanAllowed: true,
    displayOrder: 1,
  );

  const noDescriptionProduct = CatalogProduct(
    code: 'photo.A1',
    displayName: 'Candid Album',
    serviceCode: 'photography_videography',
    subcategoryCode: 'candid',
    subcategoryLetter: 'A',
    coverImageUrl: 'https://cdn.example/cover.jpg',
    restricted: false,
    addToPlanAllowed: true,
    displayOrder: 1,
  );

  List<Override> productOverrides({
    CatalogProduct product = liveProduct,
    CatalogService service = liveService,
    Object? productError,
    Object? serviceError,
    bool hangProduct = false,
    bool hangService = false,
    bool hangPlan = false,
    Object? planError,
    Object? addError,
    List<EventPlanItem> planItems = const [],
    int Function()? onProductLoad,
    int Function()? onServiceLoad,
    CatalogProduct Function(int load)? productForLoad,
  }) {
    return [
      sessionUserIdProvider.overrideWithValue('product-user'),
      eventPlanStoreProvider.overrideWithValue(
        _ScriptedPlanStore(
          gate: hangPlan ? Completer<void>() : null,
          error: planError,
          addError: addError,
          items: planItems,
        ),
      ),
      trendingSearchesProvider.overrideWith((ref) async => const <String>[]),
      eventTypesProvider.overrideWith(
        (ref) async => const [
          CatalogItem(code: 'wedding', displayName: 'Wedding', displayOrder: 1),
        ],
      ),
      if (hangProduct)
        catalogProductProvider.overrideWith(
          (ref, code) => Completer<CatalogProduct>().future,
        )
      else if (productError != null)
        catalogProductProvider.overrideWith((ref, code) async {
          onProductLoad?.call();
          throw productError;
        })
      else
        catalogProductProvider.overrideWith((ref, code) async {
          final load = onProductLoad?.call() ?? 1;
          if (productForLoad != null) return productForLoad(load);
          return product;
        }),
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
    ];
  }

  Future<void> pumpProduct(
    WidgetTester tester, {
    Size size = const Size(390, 844),
    double textScale = 1,
    List<Override> overrides = const [],
    String title = 'Stale Route Title',
    String? serviceCode = 'stale_service',
    String? imageUrl = 'assets/images/categories/wedding.jpg',
    String? occasionCode,
    String? occasionTitle,
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
            child: ProductDetailScreen(
              code: 'photo.A1',
              title: title,
              serviceCode: serviceCode,
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
      reason: 'Product detail produced an unexpected Flutter exception',
    );
  }

  test('productGalleryUrls orders cover first and drops empty duplicates', () {
    expect(productGalleryUrls(liveProduct), [
      'https://cdn.example/cover.jpg',
      'https://cdn.example/g2.jpg',
    ]);
    expect(productGalleryUrls(noMediaProduct), isEmpty);
  });

  testWidgets('Live product overrides stale route title and image hints', (
    tester,
  ) async {
    await pumpProduct(tester, overrides: productOverrides());
    expect(find.text('Candid Album'), findsOneWidget);
    expect(find.text('Stale Route Title'), findsNothing);
    expect(find.text('INTERNAL_VENDOR_X'), findsNothing);
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is AppImage && widget.imageUrl.contains('wedding.jpg'),
      ),
      findsNothing,
    );
    expectNoFlutterException(tester);
  });

  testWidgets('Unverified product cannot favorite add quote or checkout', (
    tester,
  ) async {
    await pumpProduct(tester, overrides: productOverrides(hangProduct: true));
    expect(find.text('Stale Route Title'), findsNothing);
    expect(find.text('Add to Event Plan'), findsNothing);
    expect(find.text('Request Quote'), findsNothing);
    expect(find.text('Continue with Event Plan'), findsNothing);
    expect(find.byTooltip('Save to favorites'), findsNothing);
    expect(find.byType(StickyEnquiryBar), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Product error shows retry without raw exception text', (
    tester,
  ) async {
    var loads = 0;
    await pumpProduct(
      tester,
      overrides: productOverrides(
        productError: Exception('product-secret-trace'),
        onProductLoad: () => ++loads,
      ),
    );
    expect(find.text('Unable to load this offering'), findsOneWidget);
    expect(find.text('product-secret-trace'), findsNothing);
    expect(find.text('Add to Event Plan'), findsNothing);
    await tester.tap(find.text('Retry'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(loads, 2);
    expectNoFlutterException(tester);
  });

  testWidgets('Exactly one visible product title', (tester) async {
    await pumpProduct(tester, overrides: productOverrides());
    expect(find.text('Candid Album'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Multiple gallery images swipe with bounded pumps', (
    tester,
  ) async {
    await pumpProduct(tester, overrides: productOverrides());
    expect(find.bySemanticsLabel('Image 1 of 2'), findsOneWidget);
    await tester.fling(find.byType(PageView), const Offset(-300, 0), 1000);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.bySemanticsLabel('Image 2 of 2'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Gallery index remains valid after refresh shrinks media', (
    tester,
  ) async {
    var productLoads = 0;
    await pumpProduct(
      tester,
      overrides: productOverrides(
        onProductLoad: () => ++productLoads,
        productForLoad: (load) {
          if (load == 1) return liveProduct;
          return liveProduct.copyWith(gallery: const []);
        },
      ),
    );
    await tester.fling(find.byType(PageView), const Offset(-300, 0), 1000);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    await tester.fling(
      find.byType(CustomScrollView),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(productLoads, 2);
    expect(find.byType(PageView), findsNothing);
    expect(find.bySemanticsLabel('Image 1 of 1'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Missing media uses branded product fallback', (tester) async {
    await pumpProduct(
      tester,
      overrides: productOverrides(product: noMediaProduct),
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

  testWidgets('Parent service name and department are live', (tester) async {
    await pumpProduct(tester, overrides: productOverrides());
    expect(find.text('Photography & Videography'), findsOneWidget);
    expect(find.text('Photography'), findsOneWidget);
    expect(find.text('photography_department'), findsNothing);
    expect(find.text('photography_videography'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Parent service error does not hide verified product', (
    tester,
  ) async {
    await pumpProduct(
      tester,
      overrides: productOverrides(
        serviceError: Exception('service-secret-trace'),
      ),
    );
    expect(find.text('Candid Album'), findsOneWidget);
    expect(find.text('Service details unavailable'), findsOneWidget);
    expect(find.text('service-secret-trace'), findsNothing);
    expect(find.text('Add to Event Plan'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Approved description appears and sourceName does not', (
    tester,
  ) async {
    await pumpProduct(tester, overrides: productOverrides());
    expect(find.text('Natural moments through the ceremony.'), findsOneWidget);
    expect(find.text('INTERNAL_VENDOR_X'), findsNothing);
    expect(find.text('Fulfilled by Mee Events'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Missing description uses neutral copy', (tester) async {
    await pumpProduct(
      tester,
      overrides: productOverrides(product: noDescriptionProduct),
    );
    expect(
      find.text('Details will be confirmed for your event requirements.'),
      findsOneWidget,
    );
    expectNoFlutterException(tester);
  });

  testWidgets('Restricted product shows eligibility and cannot be added', (
    tester,
  ) async {
    await pumpProduct(
      tester,
      overrides: productOverrides(product: restrictedProduct),
    );
    expect(find.bySemanticsLabel('Eligibility review'), findsWidgets);
    expect(find.textContaining('ELIGIBILITY'), findsWidgets);
    expect(find.text('Add to Event Plan'), findsNothing);
    expect(find.text('Request Quote'), findsOneWidget);
    expect(find.textContaining('Approval is not guaranteed'), findsOneWidget);
    await tester.tap(find.text('Request Quote'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byType(EnquiryCheckoutScreen), findsOneWidget);
    final container = ProviderScope.containerOf(
      tester.element(find.byType(EnquiryCheckoutScreen)),
    );
    expect(container.read(eventPlanProvider).valueOrNull, isEmpty);
    expectNoFlutterException(tester);
  });

  testWidgets('Plan loading disables Add Continue and Quote', (tester) async {
    await pumpProduct(tester, overrides: productOverrides(hangPlan: true));
    expect(find.text('Checking Event Plan…'), findsOneWidget);
    final bar = tester.widget<StickyEnquiryBar>(find.byType(StickyEnquiryBar));
    expect(bar.onPressed, isNull);
    expect(find.text('Add to Event Plan'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Plan error shows Retry without raw exception text', (
    tester,
  ) async {
    await pumpProduct(
      tester,
      overrides: productOverrides(planError: Exception('plan-secret-trace')),
    );
    expect(find.text('Retry Event Plan'), findsOneWidget);
    expect(find.text('plan-secret-trace'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Eligible product adds live fields and Continue opens checkout', (
    tester,
  ) async {
    await pumpProduct(
      tester,
      occasionCode: 'wedding',
      occasionTitle: 'Wedding',
      overrides: productOverrides(),
    );
    expect(find.text('Relevant for Wedding'), findsOneWidget);
    await tester.tap(find.text('Add to Event Plan'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Continue with Event Plan'), findsOneWidget);
    final container = ProviderScope.containerOf(
      tester.element(find.byType(ProductDetailScreen)),
    );
    final items = container.read(eventPlanProvider).valueOrNull!;
    expect(items.single.productCode, 'photo.A1');
    expect(items.single.displayName, 'Candid Album');
    expect(items.single.serviceCode, 'photography_videography');
    expect(items.single.coverImageUrl, 'https://cdn.example/cover.jpg');
    await tester.tap(find.text('Continue with Event Plan'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    final checkout = tester.widget<EnquiryCheckoutScreen>(
      find.byType(EnquiryCheckoutScreen),
    );
    expect(checkout.initialEventTypeCode, 'wedding');
    expect(checkout.initialServiceCategoryCodes, ['photography_department']);
    expect(checkout.contextNotes, contains('Candid Album'));
    expect(checkout.contextNotes, contains('Photography & Videography'));
    expect(checkout.contextNotes, contains('for Wedding'));
  });

  testWidgets(
    'Parent service error still forwards live product and occasion to checkout',
    (tester) async {
      await pumpProduct(
        tester,
        occasionCode: 'wedding',
        occasionTitle: 'Wedding',
        overrides: productOverrides(
          serviceError: Exception('service-secret-trace'),
        ),
      );
      expect(find.text('Candid Album'), findsOneWidget);
      expect(find.text('Relevant for Wedding'), findsOneWidget);
      await tester.tap(find.text('Add to Event Plan'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      await tester.tap(find.text('Continue with Event Plan'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      final checkout = tester.widget<EnquiryCheckoutScreen>(
        find.byType(EnquiryCheckoutScreen),
      );
      expect(checkout.initialEventTypeCode, 'wedding');
      expect(checkout.initialServiceCategoryCodes, isEmpty);
      expect(checkout.contextNotes, 'Interested in Candid Album for Wedding');
      expect(
        checkout.contextNotes,
        isNot(contains('Photography & Videography')),
      );
    },
  );

  testWidgets('Search and Favorites entry do not invent occasion context', (
    tester,
  ) async {
    await pumpProduct(tester, overrides: productOverrides());
    expect(find.text('Relevant for Wedding'), findsNothing);
    expect(find.textContaining('Relevant for'), findsNothing);
    await tester.tap(find.text('Add to Event Plan'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.tap(find.text('Continue with Event Plan'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    final checkout = tester.widget<EnquiryCheckoutScreen>(
      find.byType(EnquiryCheckoutScreen),
    );
    expect(checkout.initialEventTypeCode, isNull);
    expect(
      checkout.contextNotes,
      'Interested in Candid Album from Photography & Videography',
    );
    expect(checkout.contextNotes, isNot(contains('Wedding')));
    expect(checkout.contextNotes, isNot(contains('Engagement')));
  });

  testWidgets('Blank occasion titles do not render a context label', (
    tester,
  ) async {
    for (final title in [null, '', '   ']) {
      await pumpProduct(
        tester,
        occasionCode: title == null ? null : 'wedding',
        occasionTitle: title,
        overrides: productOverrides(),
      );
      expect(find.textContaining('Relevant for'), findsNothing);
      expectNoFlutterException(tester);
    }
  });

  testWidgets('Remove removes only the current product', (tester) async {
    await pumpProduct(
      tester,
      overrides: productOverrides(
        planItems: const [
          EventPlanItem(
            productCode: 'photo.A1',
            displayName: 'Candid Album',
            serviceCode: 'photography_videography',
          ),
          EventPlanItem(
            productCode: 'food.A1',
            displayName: 'Buffet',
            serviceCode: 'catering',
          ),
        ],
      ),
    );
    expect(find.text('Continue with Event Plan'), findsOneWidget);
    await tester.tap(find.text('Remove from Event Plan'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    final container = ProviderScope.containerOf(
      tester.element(find.byType(ProductDetailScreen)),
    );
    expect(
      container.read(eventPlanProvider).valueOrNull?.map((e) => e.productCode),
      ['food.A1'],
    );
    expect(find.text('Add to Event Plan'), findsOneWidget);
    expect(find.byType(EnquiryCheckoutScreen), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Failed add does not remain Continue', (tester) async {
    await pumpProduct(
      tester,
      overrides: productOverrides(addError: Exception('add-failed')),
    );
    await tester.tap(find.text('Add to Event Plan'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Continue with Event Plan'), findsNothing);
    expect(find.text('Add to Event Plan'), findsOneWidget);
    expect(find.text('add-failed'), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Favorite toggles only the verified live product', (
    tester,
  ) async {
    await pumpProduct(tester, overrides: productOverrides());
    await tester.tap(find.bySemanticsLabel('Save to favorites'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    final container = ProviderScope.containerOf(
      tester.element(find.byType(ProductDetailScreen)),
    );
    final saved = container.read(favoritesProvider).valueOrNull!.single;
    expect(saved.kind, FavoriteKind.product);
    expect(saved.code, 'photo.A1');
    expect(saved.title, 'Candid Album');
    expect(saved.departmentCode, 'photography_videography');
    expect(find.bySemanticsLabel('Remove from favorites'), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Search opens the existing search screen', (tester) async {
    await pumpProduct(tester, overrides: productOverrides());
    await tester.tap(find.byTooltip('Search'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byType(CustomerSearchScreen), findsOneWidget);
    expectNoFlutterException(tester);
  });

  testWidgets('Real pull refresh failure is not an unhandled exception', (
    tester,
  ) async {
    var productLoads = 0;
    var serviceLoads = 0;
    await pumpProduct(
      tester,
      overrides: [
        ...productOverrides(onServiceLoad: () => ++serviceLoads),
        catalogProductProvider.overrideWith((ref, code) async {
          productLoads += 1;
          if (productLoads == 1) return liveProduct;
          throw Exception('product-refresh-failed');
        }),
      ],
    );
    expect(productLoads, 1);
    expect(serviceLoads, 1);
    await tester.fling(
      find.byType(CustomScrollView),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(productLoads, 2);
    expect(serviceLoads, 2);
    expectNoFlutterException(tester);
    expect(find.text('product-refresh-failed'), findsNothing);
    expect(find.text('Candid Album'), findsOneWidget);
  });

  testWidgets('Disposing during pending refresh is safe', (tester) async {
    final productRefresh = Completer<CatalogProduct>();
    var productLoads = 0;
    await pumpProduct(
      tester,
      overrides: [
        catalogProductProvider.overrideWith((ref, code) async {
          productLoads += 1;
          if (productLoads == 1) return liveProduct;
          return productRefresh.future;
        }),
        catalogServiceProvider.overrideWith((ref, code) async => liveService),
        sessionUserIdProvider.overrideWithValue('product-user'),
        eventPlanStoreProvider.overrideWithValue(_ScriptedPlanStore()),
        trendingSearchesProvider.overrideWith((ref) async => const <String>[]),
      ],
    );
    await tester.fling(
      find.byType(CustomScrollView),
      const Offset(0, 420),
      1000,
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(productLoads, 2);

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
    productRefresh.complete(liveProduct);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byType(ProductDetailScreen), findsNothing);
    expectNoFlutterException(tester);
  });

  testWidgets('Sticky CTA does not cover final content', (tester) async {
    await pumpProduct(
      tester,
      size: const Size(320, 844),
      overrides: productOverrides(
        planItems: const [
          EventPlanItem(
            productCode: 'photo.A1',
            displayName: 'Candid Album',
            serviceCode: 'photography_videography',
          ),
        ],
      ),
    );
    await tester.scrollUntilVisible(
      find.text('Remove from Event Plan'),
      80,
      scrollable: find.byType(Scrollable).first,
    );
    final lastBottom = tester
        .getRect(find.text('Remove from Event Plan'))
        .bottom;
    final barTop = tester.getRect(find.byType(StickyEnquiryBar)).top;
    expect(lastBottom, lessThanOrEqualTo(barTop));
    expectNoFlutterException(tester);
  });

  testWidgets('Controls meet 44px targets', (tester) async {
    await pumpProduct(
      tester,
      overrides: productOverrides(
        planItems: const [
          EventPlanItem(
            productCode: 'photo.A1',
            displayName: 'Candid Album',
            serviceCode: 'photography_videography',
          ),
        ],
      ),
    );
    expect(
      tester.getSize(find.byType(MeFavoriteButton)).width,
      greaterThanOrEqualTo(44),
    );
    expect(
      tester.getSize(find.byType(MeFavoriteButton)).height,
      greaterThanOrEqualTo(44),
    );
    expect(
      tester
          .getSize(find.bySemanticsLabel('Remove Candid Album from Event Plan'))
          .height,
      greaterThanOrEqualTo(44),
    );
    final cta = tester.getSize(
      find.descendant(
        of: find.byType(StickyEnquiryBar),
        matching: find.byType(InkWell),
      ),
    );
    expect(cta.height, greaterThanOrEqualTo(44));
    expectNoFlutterException(tester);
  });

  testWidgets(
    'Semantics are not duplicated for title favorite CTA eligibility',
    (tester) async {
      final handle = tester.ensureSemantics();
      try {
        await pumpProduct(
          tester,
          overrides: productOverrides(product: restrictedProduct),
        );
        expect(find.bySemanticsLabel('Candid Album'), findsNothing);
        expect(find.bySemanticsLabel('Pyrotechnic Effects'), findsOneWidget);
        expect(find.bySemanticsLabel('Eligibility review'), findsOneWidget);
        expect(find.bySemanticsLabel('Request Quote'), findsOneWidget);
        expect(find.bySemanticsLabel('Save to favorites'), findsOneWidget);
        expectNoFlutterException(tester);
      } finally {
        handle.dispose();
      }
    },
  );

  for (final fixture in const [
    (Size(390, 844), 1.0),
    (Size(320, 844), 1.0),
    (Size(390, 844), 1.3),
    (Size(320, 844), 1.3),
  ]) {
    testWidgets(
      'Product detail does not overflow at ${fixture.$1.width.toInt()} text ${fixture.$2}',
      (tester) async {
        await pumpProduct(
          tester,
          size: fixture.$1,
          textScale: fixture.$2,
          occasionCode: 'wedding',
          occasionTitle: 'Wedding',
          overrides: productOverrides(),
        );
        expect(find.text('Relevant for Wedding'), findsOneWidget);
        expect(find.byType(StickyEnquiryBar), findsOneWidget);
        expect(find.byType(ProductDetailScreen), findsOneWidget);
        expectNoFlutterException(tester);
      },
    );
  }
}

extension on CatalogProduct {
  CatalogProduct copyWith({List<String>? gallery}) {
    return CatalogProduct(
      code: code,
      displayName: displayName,
      serviceCode: serviceCode,
      subcategoryCode: subcategoryCode,
      subcategoryLetter: subcategoryLetter,
      coverImageUrl: coverImageUrl,
      restricted: restricted,
      addToPlanAllowed: addToPlanAllowed,
      displayOrder: displayOrder,
      sourceName: sourceName,
      description: description,
      gallery: gallery ?? this.gallery,
    );
  }
}

class _ScriptedPlanStore extends EventPlanStore {
  _ScriptedPlanStore({
    this.gate,
    this.error,
    this.addError,
    this.items = const [],
  }) : super(userId: 'product-user') {
    persisted.addAll(items);
  }

  final Completer<void>? gate;
  final Object? error;
  final Object? addError;
  final List<EventPlanItem> items;
  final List<EventPlanItem> persisted = [];

  @override
  Future<List<EventPlanItem>> load() async {
    final pending = gate;
    if (pending != null) await pending.future;
    if (error != null) throw error!;
    return [...persisted];
  }

  @override
  Future<List<EventPlanItem>> add(EventPlanItem item) async {
    if (addError != null) throw addError!;
    persisted.removeWhere((e) => e.productCode == item.productCode);
    persisted.insert(0, item);
    return [...persisted];
  }

  @override
  Future<List<EventPlanItem>> remove(String productCode) async {
    persisted.removeWhere((e) => e.productCode == productCode);
    return [...persisted];
  }

  @override
  Future<List<EventPlanItem>> clear() async {
    persisted.clear();
    return const [];
  }
}
