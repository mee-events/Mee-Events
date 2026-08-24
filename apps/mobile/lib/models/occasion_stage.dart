class OccasionStage {
  final String code;
  final String displayName;
  final String occasionCode;
  final String? typicalDay;
  final int displayOrder;

  const OccasionStage({
    required this.code,
    required this.displayName,
    required this.occasionCode,
    this.typicalDay,
    required this.displayOrder,
  });

  factory OccasionStage.fromJson(Map<String, dynamic> json) {
    return OccasionStage(
      code: json['code'] as String,
      displayName: json['displayName'] as String,
      occasionCode: json['occasionCode'] as String,
      typicalDay: json['typicalDay'] as String?,
      displayOrder: json['displayOrder'] as int,
    );
  }
}
