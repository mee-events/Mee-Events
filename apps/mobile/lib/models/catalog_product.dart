class CatalogProduct {
  final String code;
  final String displayName;
  final String serviceCode;
  final String subcategoryCode;
  final String subcategoryLetter;
  final String? coverImageUrl;
  final String? thumbnailUrl;
  final String? coverAltText;
  final bool restricted;
  final bool addToPlanAllowed;
  final int displayOrder;
  final String? sourceName;
  final String? description;
  final List<String> gallery;

  const CatalogProduct({
    required this.code,
    required this.displayName,
    required this.serviceCode,
    required this.subcategoryCode,
    required this.subcategoryLetter,
    this.coverImageUrl,
    this.thumbnailUrl,
    this.coverAltText,
    required this.restricted,
    required this.addToPlanAllowed,
    required this.displayOrder,
    this.sourceName,
    this.description,
    this.gallery = const [],
  });

  factory CatalogProduct.fromJson(Map<String, dynamic> json) {
    final galleryRaw = json['gallery'] as List<dynamic>? ?? const [];
    return CatalogProduct(
      code: json['code'] as String,
      displayName: json['displayName'] as String,
      serviceCode: json['serviceCode'] as String,
      subcategoryCode: json['subcategoryCode'] as String,
      subcategoryLetter: json['subcategoryLetter'] as String,
      coverImageUrl: json['coverImageUrl'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      coverAltText: json['coverAltText'] as String?,
      restricted: json['restricted'] as bool? ?? false,
      addToPlanAllowed: json['addToPlanAllowed'] as bool? ?? false,
      displayOrder: json['displayOrder'] as int? ?? 0,
      sourceName: json['sourceName'] as String?,
      description: json['description'] as String?,
      gallery: galleryRaw.map((item) => item.toString()).toList(),
    );
  }
}
