import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/features/customer/catalog/catalog_image_resolver.dart';
import 'package:mee_events/theme/theme.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('backend remote URLs retain precedence', () {
    expect(
      CatalogImageResolver.forOccasion(
        code: 'wedding',
        remoteUrl: 'https://cdn.example/w.jpg',
      ),
      'https://cdn.example/w.jpg',
    );
    expect(
      CatalogImageResolver.resolvedHomeImage(
        code: 'wedding',
        remoteUrl: 'https://cdn.example/home-w.jpg',
      ),
      'https://cdn.example/home-w.jpg',
    );
    expect(
      CatalogImageResolver.forService(
        code: 'x',
        coverImageUrl: 'https://cdn.example/c.jpg',
        iconUrl: 'https://cdn.example/i.jpg',
      ),
      'https://cdn.example/c.jpg',
    );
    expect(
      CatalogImageResolver.resolvedServiceImage(
        coverImageUrl: 'https://cdn.example/svc.jpg',
        iconUrl: 'https://cdn.example/i.jpg',
      ),
      'https://cdn.example/svc.jpg',
    );
    expect(
      CatalogImageResolver.resolvedServiceImage(coverImageUrl: ''),
      isNull,
    );
  });

  test('local assets and occasion codes are not a second taxonomy', () {
    expect(CatalogImageResolver.resolvedHomeImage(code: 'wedding'), isNull);
    expect(CatalogImageResolver.resolvedHomeImage(code: 'sangeet'), isNull);
    expect(CatalogImageResolver.resolvedHomeImage(code: 'engagement'), isNull);
    expect(CatalogImageResolver.resolvedHomeImage(code: 'birthday'), isNull);
    expect(CatalogImageResolver.resolvedHomeImage(code: 'corporate'), isNull);
    expect(CatalogImageResolver.forOccasion(code: 'wedding'), isNull);
    expect(CatalogImageResolver.forOccasion(code: 'MEHNDI'), isNull);
    expect(CatalogImageResolver.forOccasion(code: 'pre_wedding'), isNull);
    expect(
      CatalogImageResolver.forService(
        code: 'photography',
        departmentCode: 'wedding',
      ),
      isNull,
    );
  });

  test('product gallery follows cover then gallery then parents', () {
    expect(
      CatalogImageResolver.resolvedProductImage(
        coverImageUrl: 'https://cdn.example/p.jpg',
        gallery: ['https://cdn.example/g.jpg'],
        subcategoryCoverUrl: 'https://cdn.example/sub.jpg',
        serviceCoverUrl: 'https://cdn.example/svc.jpg',
      ),
      'https://cdn.example/p.jpg',
    );
    expect(
      CatalogImageResolver.resolvedProductImage(
        gallery: ['https://cdn.example/g.jpg'],
        subcategoryCoverUrl: 'https://cdn.example/sub.jpg',
      ),
      'https://cdn.example/g.jpg',
    );
    expect(
      CatalogImageResolver.resolvedProductImage(
        subcategoryCoverUrl: 'https://cdn.example/sub.jpg',
        serviceCoverUrl: 'https://cdn.example/svc.jpg',
      ),
      'https://cdn.example/sub.jpg',
    );
    expect(
      CatalogImageResolver.resolvedProductImage(
        serviceCoverUrl: 'https://cdn.example/svc.jpg',
      ),
      'https://cdn.example/svc.jpg',
    );
    expect(CatalogImageResolver.resolvedProductImage(), isNull);
  });

  test('javascript and empty URLs are not usable', () {
    expect(
      CatalogImageResolver.resolvedServiceImage(
        coverImageUrl: 'javascript:alert(1)',
      ),
      isNull,
    );
    expect(
      CatalogImageResolver.forOccasion(code: 'wedding', remoteUrl: '  '),
      isNull,
    );
  });

  test('Home does not resolve bundled unprovenanced hero photographs', () {
    expect(CatalogImageResolver.resolvedHomeImage(code: 'wedding'), isNull);
    expect(CatalogImageResolver.resolvedHomeImage(code: 'sangeet'), isNull);
    expect(CatalogImageResolver.resolvedHomeImage(code: 'birthday'), isNull);
    expect(CatalogImageResolver.resolvedHomeImage(code: 'corporate'), isNull);
    expect(
      CatalogImageResolver.resolvedHomeImage(
        code: 'wedding',
        remoteUrl: 'assets/images/hero/wedding.jpg',
      ),
      isNull,
    );
  });

  test('Home fallback icons stay distinct by occasion and service', () {
    expect(homeOccasionFallbackIcon('mehndi'), Icons.spa_outlined);
    expect(homeOccasionFallbackIcon('reception'), Icons.nightlife_outlined);
    expect(homeOccasionFallbackIcon('birthday'), Icons.cake_outlined);
    expect(homeOccasionFallbackIcon('corporate'), Icons.apartment_outlined);
    expect(homeOccasionFallbackIcon('half_saree'), Icons.temple_hindu_outlined);
    expect(homeOccasionFallbackIcon('festival'), Icons.auto_awesome_outlined);
    expect(homeServiceFallbackIcon('photography'), Icons.photo_camera_outlined);
    expect(homeServiceFallbackIcon('catering'), Icons.restaurant_outlined);
    expect(homeServiceFallbackIcon('decoration'), Icons.local_florist_outlined);
    expect(homeServiceFallbackIcon('makeup'), Icons.brush_outlined);
    expect(homeServiceFallbackIcon('gifts'), Icons.card_giftcard_outlined);
    expect(homeServiceFallbackIcon('transport'), Icons.directions_car_outlined);
    expect(homeServiceFallbackIcon('venue'), Icons.location_city_outlined);
    expect(homeServiceFallbackIcon('lighting'), Icons.lightbulb_outline);
    final occasionIcons = {
      homeOccasionFallbackIcon('mehndi'),
      homeOccasionFallbackIcon('reception'),
      homeOccasionFallbackIcon('birthday'),
      homeOccasionFallbackIcon('corporate'),
      homeOccasionFallbackIcon('half_saree'),
      homeOccasionFallbackIcon('entertainment'),
      homeOccasionFallbackIcon('festival'),
    };
    expect(occasionIcons.length, 7);
    final serviceIcons = {
      homeServiceFallbackIcon('photography'),
      homeServiceFallbackIcon('catering'),
      homeServiceFallbackIcon('decoration'),
      homeServiceFallbackIcon('entertainment'),
      homeServiceFallbackIcon('makeup'),
      homeServiceFallbackIcon('gifts'),
      homeServiceFallbackIcon('transport'),
      homeServiceFallbackIcon('venue'),
      homeServiceFallbackIcon('lighting'),
    };
    expect(serviceIcons.length, 9);
    expect(serviceIcons.contains(Icons.design_services_outlined), isFalse);
  });

  test('HTML 404 stub cannot pass local image validation', () {
    final html = Uint8List.fromList('<html><body>404</body></html>'.codeUnits);
    expect(isDecodableJpegBytes(html), isFalse);
  });

  testWidgets('default HomeCatalogVisual fallback uses the label initial', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: SizedBox(
            width: 80,
            height: 80,
            child: HomeCatalogVisual(label: 'Camera Kit'),
          ),
        ),
      ),
    );
    expect(find.text('C'), findsOneWidget);
    expect(find.byIcon(Icons.celebration_outlined), findsNothing);
    expect(find.byIcon(Icons.design_services_outlined), findsNothing);
    expect(find.byKey(HomeCatalogVisual.fallbackKey), findsOneWidget);
  });

  testWidgets('Home occasion pictogram has no initial', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: SizedBox(
            width: 80,
            height: 80,
            child: HomeCatalogVisual(
              label: 'Mehndi',
              fallbackIcon: Icons.celebration_outlined,
            ),
          ),
        ),
      ),
    );
    expect(find.byIcon(Icons.celebration_outlined), findsOneWidget);
    expect(find.text('M'), findsNothing);
  });

  testWidgets('Home service pictogram has no initial', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: SizedBox(
            width: 80,
            height: 80,
            child: HomeCatalogVisual(
              label: 'Photography',
              fallbackIcon: Icons.design_services_outlined,
            ),
          ),
        ),
      ),
    );
    expect(find.byIcon(Icons.design_services_outlined), findsOneWidget);
    expect(find.text('P'), findsNothing);
  });

  testWidgets('pictogram fallback is excluded from semantics', (tester) async {
    final handle = tester.ensureSemantics();
    try {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: const Scaffold(
            body: SizedBox(
              width: 80,
              height: 80,
              child: HomeCatalogVisual(
                label: 'Mehndi',
                fallbackIcon: Icons.celebration_outlined,
              ),
            ),
          ),
        ),
      );
      expect(find.bySemanticsLabel('Mehndi'), findsNothing);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('failed image load uses the requested pictogram fallback', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: SizedBox(
            width: 80,
            height: 80,
            child: HomeCatalogVisual(
              imageUrl: 'broken://missing',
              label: 'Generator',
              fallbackIcon: Icons.design_services_outlined,
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byIcon(Icons.design_services_outlined), findsOneWidget);
    expect(find.text('G'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('empty and valid labels construct fallback without assertions', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: Column(
            children: [
              SizedBox(
                width: 80,
                height: 80,
                child: HomeCatalogVisual(label: ''),
              ),
              SizedBox(
                width: 80,
                height: 80,
                child: HomeCatalogVisual(label: 'Venue'),
              ),
            ],
          ),
        ),
      ),
    );
    expect(find.text('M'), findsOneWidget);
    expect(find.text('V'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

bool isDecodableJpegBytes(Uint8List bytes) {
  if (bytes.length < 3) return false;
  if (bytes[0] != 0xFF || bytes[1] != 0xD8 || bytes[2] != 0xFF) {
    return false;
  }
  final head = String.fromCharCodes(bytes.take(64));
  return !head.toLowerCase().contains('<html');
}
