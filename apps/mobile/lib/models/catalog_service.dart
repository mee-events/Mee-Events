class CatalogService {
  final String code;
  final String displayName;
  final String departmentCode;
  final String entityKind;
  final int displayOrder;
  final String? iconUrl;
  final String? coverImageUrl;
  final String? thumbnailUrl;
  final int subcategoryCount;
  final int productCount;

  const CatalogService({
    required this.code,
    required this.displayName,
    required this.departmentCode,
    required this.entityKind,
    required this.displayOrder,
    this.iconUrl,
    this.coverImageUrl,
    this.thumbnailUrl,
    this.subcategoryCount = 0,
    this.productCount = 0,
  });

  factory CatalogService.fromJson(Map<String, dynamic> json) {
    return CatalogService(
      code: json['code'] as String,
      displayName: json['displayName'] as String,
      departmentCode: json['departmentCode'] as String,
      entityKind: json['entityKind'] as String,
      displayOrder: json['displayOrder'] as int,
      iconUrl: json['iconUrl'] as String?,
      coverImageUrl: json['coverImageUrl'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      subcategoryCount: json['subcategoryCount'] as int? ?? 0,
      productCount: json['productCount'] as int? ?? 0,
    );
  }
}
