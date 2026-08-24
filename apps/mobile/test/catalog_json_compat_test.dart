import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/models/catalog_product.dart';
import 'package:mee_events/models/catalog_service.dart';
import 'package:mee_events/models/catalog_subcategory.dart';

void main() {
  test('catalogue JSON without media fields still parses', () {
    final occasion = CatalogItem.fromJson({
      'code': 'wedding',
      'displayName': 'Wedding',
      'displayOrder': 1,
    });
    expect(occasion.coverImageUrl, isNull);

    final service = CatalogService.fromJson({
      'code': 'photography',
      'displayName': 'Photography',
      'departmentCode': 'photography',
      'entityKind': 'service',
      'displayOrder': 1,
      'iconUrl': null,
      'coverImageUrl': null,
    });
    expect(service.thumbnailUrl, isNull);

    final subcategory = CatalogSubcategory.fromJson({
      'code': 'photography.A',
      'letter': 'A',
      'displayName': 'Packages',
      'productCount': 2,
      'displayOrder': 1,
    });
    expect(subcategory.coverImageUrl, isNull);

    final product = CatalogProduct.fromJson({
      'code': 'photography.A1',
      'displayName': 'Cinematic',
      'serviceCode': 'photography',
      'subcategoryCode': 'photography.A',
      'subcategoryLetter': 'A',
    });
    expect(product.coverImageUrl, isNull);
    expect(product.gallery, isEmpty);
  });

  test('catalogue JSON with optional media fields parses', () {
    final product = CatalogProduct.fromJson({
      'code': 'photography.A1',
      'displayName': 'Cinematic',
      'serviceCode': 'photography',
      'subcategoryCode': 'photography.A',
      'subcategoryLetter': 'A',
      'coverImageUrl': 'https://cdn.example/p.jpg',
      'thumbnailUrl': 'https://cdn.example/p-thumb.jpg',
      'coverAltText': 'Cinematic photography',
      'gallery': ['https://cdn.example/g1.jpg'],
      'restricted': false,
      'addToPlanAllowed': true,
      'displayOrder': 1,
    });
    expect(product.coverImageUrl, 'https://cdn.example/p.jpg');
    expect(product.gallery, ['https://cdn.example/g1.jpg']);
  });
}
