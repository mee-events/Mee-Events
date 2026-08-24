class CatalogSubcategory {
  final String code;
  final String letter;
  final String displayName;
  final int productCount;
  final int displayOrder;
  final String? coverImageUrl;
  final String? thumbnailUrl;

  const CatalogSubcategory({
    required this.code,
    required this.letter,
    required this.displayName,
    required this.productCount,
    required this.displayOrder,
    this.coverImageUrl,
    this.thumbnailUrl,
  });

  factory CatalogSubcategory.fromJson(Map<String, dynamic> json) {
    return CatalogSubcategory(
      code: json['code'] as String,
      letter: json['letter'] as String,
      displayName: json['displayName'] as String,
      productCount: json['productCount'] as int,
      displayOrder: json['displayOrder'] as int,
      coverImageUrl: json['coverImageUrl'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
    );
  }
}
