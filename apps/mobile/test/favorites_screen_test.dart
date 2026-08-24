import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/core/providers/catalog_provider.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/favorites/favorites_provider.dart';
import 'package:mee_events/features/customer/favorites/favorites_store.dart';
import 'package:mee_events/features/customer/navigation/customer_tab.dart';
import 'package:mee_events/features/customer/plan/event_plan_provider.dart';
import 'package:mee_events/features/customer/plan/event_plan_store.dart';
import 'package:mee_events/features/customer/providers/event_record_providers.dart';
import 'package:mee_events/features/customer/providers/explore_intent_provider.dart';
import 'package:mee_events/features/customer/screens/category_detail_screen.dart';
import 'package:mee_events/features/customer/screens/favorites_screen.dart';
import 'package:mee_events/features/customer/screens/product_detail_screen.dart';
import 'package:mee_events/features/customer/screens/service_detail_screen.dart';
import 'package:mee_events/features/customer/widgets/favorites/favorites_skeleton_list.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/models/catalog_product.dart';
import 'package:mee_events/models/catalog_selection.dart';
import 'package:mee_events/models/catalog_service.dart';
import 'package:mee_events/models/catalog_subcategory.dart';
import 'package:mee_events/models/occasion_stage.dart';
import 'package:mee_events/theme/theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'support/favorites_test_fakes.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  FavoriteItem item({
    required FavoriteKind kind,
    required String code,
    required String title,
    String? imageUrl,
    String? departmentCode,
    DateTime? savedAt,
  }) {
    return FavoriteItem(
      kind: kind,
      code: code,
      title: title,
      imageUrl: imageUrl,
      departmentCode: departmentCode,
      savedAt: savedAt,
    );
  }

  List<Override> catalogOverrides() {
    return [
      eventPlanStoreProvider.overrideWithValue(
        EventPlanStore(userId: 'fav-user'),
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
      eventTypesProvider.overrideWith(
        (ref) async => const [
          CatalogItem(code: 'wedding', displayName: 'Wedding', displayOrder: 1),
        ],
      ),
      catalogServiceProvider.overrideWith(
        (ref, code) async => CatalogService(
          code: code,
          displayName: code,
          departmentCode: 'PHOTO',
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

  Future<void> seed(List<FavoriteItem> items) async {
    final prefs = await SharedPreferences.getInstance();
    final store = FavoritesStore(prefs: prefs, userId: 'fav-user');
    for (final entry in items) {
      await store.toggle(entry);
    }
  }

  Future<ProviderContainer> pumpSaved(
    WidgetTester tester, {
    Size size = const Size(390, 844),
    double textScale = 1,
    List<Override> extra = const [],
    ValueChanged<CustomerTab>? onNavigate,
    ProviderContainer? container,
  }) async {
    tester.view.physicalSize = Size(size.width * 3, size.height * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final scope =
        container ??
        ProviderContainer(
          overrides: [
            sessionUserIdProvider.overrideWithValue('fav-user'),
            favoritesStoreProvider.overrideWith(
              (ref) => FavoritesStore(userId: 'fav-user'),
            ),
            ...catalogOverrides(),
            ...extra,
          ],
        );
    if (container == null) {
      addTearDown(scope.dispose);
    }

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: scope,
        child: MaterialApp(
          theme: AppTheme.light,
          home: MediaQuery(
            data: MediaQueryData(
              size: size,
              textScaler: TextScaler.linear(textScale),
            ),
            child: FavoritesScreen(onNavigateTab: onNavigate),
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    return scope;
  }

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('Skeleton loading state is shown', (tester) async {
    final delayed = Completer<List<FavoriteItem>>();
    await pumpSaved(
      tester,
      extra: [
        favoritesStoreProvider.overrideWith(
          (ref) => ScriptedFavoritesStore(loadFn: () => delayed.future),
        ),
      ],
    );
    expect(find.byType(FavoritesSkeletonList), findsOneWidget);
    expect(find.byType(MeCircularLoader), findsNothing);
    expect(tester.takeException(), isNull);
    delayed.complete(const []);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
  });

  testWidgets('Safe initial error and real Retry', (tester) async {
    var fail = true;
    var loads = 0;
    await pumpSaved(
      tester,
      extra: [
        favoritesStoreProvider.overrideWith(
          (ref) => ScriptedFavoritesStore(
            loadFn: () async {
              loads += 1;
              if (fail) throw Exception('secret-fav-load');
              return const [];
            },
          ),
        ),
      ],
    );
    expect(find.text('Saved unavailable'), findsOneWidget);
    expect(find.text('secret-fav-load'), findsNothing);
    fail = false;
    await tester.tap(find.text('Retry'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(loads, 2);
    expect(find.text('Nothing saved yet'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Global empty state', (tester) async {
    await pumpSaved(tester);
    expect(find.text('Nothing saved yet'), findsOneWidget);
    expect(find.text('Browse occasions'), findsOneWidget);
    expect(find.text('Browse services'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Browse occasions uses typed Explore intent', (tester) async {
    CustomerTab? tab;
    final scope = await pumpSaved(tester, onNavigate: (value) => tab = value);
    await tester.tap(find.text('Browse occasions'));
    await tester.pump();
    expect(tab, CustomerTab.explore);
    expect(scope.read(exploreIntentProvider), 0);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Browse services uses typed Explore intent', (tester) async {
    CustomerTab? tab;
    final scope = await pumpSaved(tester, onNavigate: (value) => tab = value);
    await tester.tap(find.text('Browse services'));
    await tester.pump();
    expect(tab, CustomerTab.explore);
    expect(scope.read(exploreIntentProvider), 1);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Populated list is newest first', (tester) async {
    await seed([
      item(kind: FavoriteKind.occasion, code: 'wedding', title: 'Wedding'),
      item(kind: FavoriteKind.product, code: 'cake', title: 'Wedding Cake'),
    ]);
    await pumpSaved(tester);
    expect(find.text('Your saved ideas'), findsOneWidget);
    expect(find.text('2 saved'), findsOneWidget);
    final titles = tester
        .widgetList<Text>(find.byType(Text))
        .map((t) => t.data)
        .whereType<String>()
        .toList();
    expect(titles.indexOf('Wedding Cake') < titles.indexOf('Wedding'), isTrue);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Filters map all four kinds', (tester) async {
    await seed([
      item(kind: FavoriteKind.occasion, code: 'wedding', title: 'Wedding'),
      item(kind: FavoriteKind.category, code: 'decor', title: 'Decor'),
      item(
        kind: FavoriteKind.service,
        code: 'photo',
        title: 'Photography',
        departmentCode: 'PHOTO',
      ),
      item(
        kind: FavoriteKind.product,
        code: 'cake',
        title: 'Wedding Cake',
        departmentCode: 'photo',
      ),
    ]);
    await pumpSaved(tester);
    expect(find.text('4 saved'), findsOneWidget);
    await tester.tap(find.text('Occasions'));
    await tester.pump();
    expect(find.text('Wedding'), findsOneWidget);
    expect(find.text('Decor'), findsNothing);
    await tester.tap(find.text('Services'));
    await tester.pump();
    expect(find.text('Decor'), findsOneWidget);
    expect(find.text('Photography'), findsOneWidget);
    expect(find.text('Wedding Cake'), findsNothing);
    await tester.tap(find.text('Options'));
    await tester.pump();
    expect(find.text('Wedding Cake'), findsOneWidget);
    expect(find.text('Photography'), findsNothing);
    await tester.tap(find.text('All'));
    await tester.pump();
    expect(find.text('Wedding'), findsOneWidget);
    expect(find.text('Wedding Cake'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Filtered empty is distinct from global empty', (tester) async {
    await seed([
      item(kind: FavoriteKind.occasion, code: 'wedding', title: 'Wedding'),
    ]);
    await pumpSaved(tester);
    await tester.tap(find.text('Options'));
    await tester.pump();
    expect(find.text('Nothing saved yet'), findsNothing);
    expect(find.text('No saved options'), findsOneWidget);
    expect(find.text('Show all'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Show all has one tappable semantics node', (tester) async {
    final handle = tester.ensureSemantics();
    try {
      await seed([
        item(kind: FavoriteKind.occasion, code: 'wedding', title: 'Wedding'),
      ]);
      await pumpSaved(tester);
      await tester.tap(find.text('Options'));
      await tester.pump();
      expect(find.bySemanticsLabel('Show all'), findsOneWidget);
      final node = tester.getSemantics(find.bySemanticsLabel('Show all'));
      expect(node.flagsCollection.isButton, isTrue);
      expect(node.flagsCollection.isEnabled.toBoolOrNull(), isTrue);
      expect(node.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
      tester.semantics.tap(find.semantics.byLabel('Show all'));
      await tester.pump();
      expect(
        tester
            .getSemantics(find.bySemanticsLabel('All'))
            .flagsCollection
            .isSelected
            .toBoolOrNull(),
        isTrue,
      );
      expect(
        tester
            .getSemantics(find.bySemanticsLabel('Options'))
            .flagsCollection
            .isSelected
            .toBoolOrNull(),
        isNot(true),
      );
      expect(find.text('Wedding'), findsOneWidget);
      expect(tester.takeException(), isNull);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('Canonical routing for every FavoriteKind', (tester) async {
    await seed([
      item(kind: FavoriteKind.occasion, code: 'wedding', title: 'Wedding'),
      item(kind: FavoriteKind.category, code: 'decor', title: 'Decor'),
      item(
        kind: FavoriteKind.service,
        code: 'photo',
        title: 'Photography',
        departmentCode: 'PHOTO',
      ),
      item(
        kind: FavoriteKind.product,
        code: 'cake',
        title: 'Wedding Cake',
        departmentCode: 'photography',
      ),
    ]);
    await pumpSaved(tester);

    await tester.tap(find.text('Wedding').first);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    final occasion = tester.widget<CategoryDetailScreen>(
      find.byType(CategoryDetailScreen),
    );
    expect(occasion.code, 'wedding');
    expect(occasion.isOccasion, isTrue);
    Navigator.of(tester.element(find.byType(CategoryDetailScreen))).pop();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    await tester.tap(find.text('Decor'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    final category = tester.widget<CategoryDetailScreen>(
      find.byType(CategoryDetailScreen),
    );
    expect(category.code, 'decor');
    expect(category.isOccasion, isFalse);
    Navigator.of(tester.element(find.byType(CategoryDetailScreen))).pop();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    await tester.tap(find.text('Photography'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    final service = tester.widget<ServiceDetailScreen>(
      find.byType(ServiceDetailScreen),
    );
    expect(service.code, 'photo');
    expect(service.departmentCode, 'PHOTO');
    expect(service.occasionCode, isNull);
    Navigator.of(tester.element(find.byType(ServiceDetailScreen))).pop();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    await tester.tap(find.text('Wedding Cake'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    final product = tester.widget<ProductDetailScreen>(
      find.byType(ProductDetailScreen),
    );
    expect(product.code, 'cake');
    expect(product.serviceCode, 'photography');
    expect(product.occasionCode, isNull);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Pointer removal and Undo restore', (tester) async {
    await seed([
      item(kind: FavoriteKind.occasion, code: 'wedding', title: 'Wedding'),
    ]);
    await pumpSaved(tester);
    await tester.tap(find.bySemanticsLabel('Remove Wedding from saved'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Wedding'), findsNothing);
    expect(find.text('Removed Wedding'), findsOneWidget);
    final handle = tester.ensureSemantics();
    try {
      tester.semantics.tap(find.semantics.byLabel('Undo'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.text('Wedding'), findsOneWidget);
      expect(tester.takeException(), isNull);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('Semantics removal removes the card', (tester) async {
    final handle = tester.ensureSemantics();
    try {
      await seed([
        item(kind: FavoriteKind.occasion, code: 'wedding', title: 'Wedding'),
      ]);
      await pumpSaved(tester);
      tester.semantics.tap(find.semantics.byLabel('Remove Wedding from saved'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.text('Wedding'), findsNothing);
      expect(tester.takeException(), isNull);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('Storage failure rolls back with a safe message', (tester) async {
    final wedding = item(
      kind: FavoriteKind.occasion,
      code: 'wedding',
      title: 'Wedding',
    );
    await pumpSaved(
      tester,
      extra: [
        favoritesStoreProvider.overrideWith(
          (ref) => ScriptedFavoritesStore(
            loadFn: () async => [wedding],
            removeFn: (_) async => throw Exception('secret-fav-remove'),
          ),
        ),
      ],
    );
    await tester.tap(find.bySemanticsLabel('Remove Wedding from saved'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('Wedding'), findsOneWidget);
    expect(find.text('Couldn’t update Saved. Try again.'), findsOneWidget);
    expect(find.text('secret-fav-remove'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Filter and card semantics are unique and tappable', (
    tester,
  ) async {
    final handle = tester.ensureSemantics();
    try {
      await seed([
        item(kind: FavoriteKind.occasion, code: 'wedding', title: 'Wedding'),
      ]);
      await pumpSaved(tester);
      expect(find.bySemanticsLabel('All'), findsOneWidget);
      final all = tester.getSemantics(find.bySemanticsLabel('All'));
      expect(all.flagsCollection.isButton, isTrue);
      expect(all.flagsCollection.isSelected.toBoolOrNull(), isTrue);
      expect(all.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
      final occasions = tester.getSemantics(find.bySemanticsLabel('Occasions'));
      expect(occasions.flagsCollection.isSelected.toBoolOrNull(), isNot(true));
      tester.semantics.tap(find.semantics.byLabel('Occasions'));
      await tester.pump();
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
            .getSemantics(find.bySemanticsLabel('All'))
            .flagsCollection
            .isSelected
            .toBoolOrNull(),
        isNot(true),
      );
      expect(find.bySemanticsLabel('Wedding, Occasion'), findsOneWidget);
      expect(
        find.bySemanticsLabel('Remove Wedding from saved'),
        findsOneWidget,
      );
      tester.semantics.tap(find.semantics.byLabel('Wedding, Occasion'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.byType(CategoryDetailScreen), findsOneWidget);
      expect(tester.takeException(), isNull);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('Missing image uses a kind fallback', (tester) async {
    await seed([
      item(
        kind: FavoriteKind.product,
        code: 'cake',
        title: 'Wedding Cake',
        imageUrl: 'not-a-url',
      ),
    ]);
    await pumpSaved(tester);
    expect(find.byIcon(Icons.inventory_2_outlined), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Long titles remain accessible', (tester) async {
    const longTitle =
        'South Indian Wedding Celebration With Extended Family And Full Catering';
    await seed([
      item(kind: FavoriteKind.occasion, code: 'wedding', title: longTitle),
    ]);
    await pumpSaved(tester, size: const Size(320, 844), textScale: 1.3);
    expect(find.bySemanticsLabel('$longTitle, Occasion'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  for (final fixture in const [
    (Size(390, 844), 1.0),
    (Size(320, 844), 1.0),
    (Size(390, 844), 1.3),
    (Size(320, 844), 1.3),
  ]) {
    testWidgets(
      'Saved does not overflow at ${fixture.$1.width.toInt()} text ${fixture.$2}',
      (tester) async {
        await seed([
          item(
            kind: FavoriteKind.occasion,
            code: 'wedding',
            title:
                'South Indian Wedding Celebration With Extended Family Planning',
          ),
          item(
            kind: FavoriteKind.category,
            code: 'decor',
            title: 'Floral Stage Decoration And Mandap Styling Collection',
          ),
          item(
            kind: FavoriteKind.service,
            code: 'photo',
            title: 'Cinematic Wedding Photography And Same Day Edit Service',
            departmentCode: 'PHOTO',
          ),
          item(
            kind: FavoriteKind.product,
            code: 'cake',
            title: 'Five Tier Gold Leaf Wedding Cake With Fresh Flowers',
            imageUrl: 'not-a-url',
          ),
          item(
            kind: FavoriteKind.service,
            code: 'makeup',
            title: 'Bridal Makeup',
          ),
          item(
            kind: FavoriteKind.product,
            code: 'lights',
            title: 'Garden Fairy Lights',
          ),
        ]);
        await pumpSaved(tester, size: fixture.$1, textScale: fixture.$2);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
