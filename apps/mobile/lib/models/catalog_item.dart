/// Managed catalogue entry (event type or service category).
class CatalogItem {
  final String code;
  final String displayName;
  final int displayOrder;

  const CatalogItem({
    required this.code,
    required this.displayName,
    required this.displayOrder,
  });

  factory CatalogItem.fromJson(Map<String, dynamic> json) {
    return CatalogItem(
      code: json['code'] as String,
      displayName: json['displayName'] as String,
      displayOrder: json['displayOrder'] as int,
    );
  }
}
