class CatalogSelection {
  final String sourceOrdinal;
  final String sourceLabel;
  final String? serviceCode;
  final String? serviceDisplayName;
  final String mappingStatus;

  const CatalogSelection({
    required this.sourceOrdinal,
    required this.sourceLabel,
    this.serviceCode,
    this.serviceDisplayName,
    required this.mappingStatus,
  });

  bool get isMapped => mappingStatus == 'mapped' && serviceCode != null;

  factory CatalogSelection.fromJson(Map<String, dynamic> json) {
    return CatalogSelection(
      sourceOrdinal: json['sourceOrdinal'] as String,
      sourceLabel: json['sourceLabel'] as String,
      serviceCode: json['serviceCode'] as String?,
      serviceDisplayName: json['serviceDisplayName'] as String?,
      mappingStatus: json['mappingStatus'] as String,
    );
  }
}
