/// Managed catalogue entry (event type or service department).
class CatalogItem {
  final String code;
  final String displayName;
  final int displayOrder;
  final String? kind;
  final int? selectionCount;
  final String? coverImageUrl;
  final String? thumbnailUrl;

  const CatalogItem({
    required this.code,
    required this.displayName,
    required this.displayOrder,
    this.kind,
    this.selectionCount,
    this.coverImageUrl,
    this.thumbnailUrl,
  });

  bool get isServiceEntry => kind == 'service_entry';

  factory CatalogItem.fromJson(Map<String, dynamic> json) {
    return CatalogItem(
      code: json['code'] as String,
      displayName: json['displayName'] as String,
      displayOrder: json['displayOrder'] as int,
      kind: json['kind'] as String?,
      selectionCount: json['selectionCount'] as int?,
      coverImageUrl: json['coverImageUrl'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
    );
  }
}
