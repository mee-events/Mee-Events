/// Shared customer-facing catalogue copy. Do not duplicate this formatter.
String customerFacingDepartmentLabel(String code) {
  var cleaned = code.trim();
  if (cleaned.isEmpty) return '';
  cleaned = cleaned.replaceAll(RegExp(r'_+'), ' ');
  cleaned = cleaned.replaceAll(RegExp(r'\s+'), ' ').trim();
  cleaned = cleaned.replaceFirst(
    RegExp(r'\s*department$', caseSensitive: false),
    '',
  );
  cleaned = cleaned.trim();
  if (cleaned.isEmpty) return '';
  return cleaned
      .split(' ')
      .map(
        (word) => word.isEmpty
            ? ''
            : '${word[0].toUpperCase()}${word.substring(1).toLowerCase()}',
      )
      .join(' ');
}

String? customerFacingOccasionTitle(String? title) {
  final value = title?.trim();
  if (value == null || value.isEmpty) return null;
  return value;
}

String relevantForOccasionLabel(String occasionTitle) =>
    'Relevant for $occasionTitle';

String productEnquiryContextNotes({
  required String productName,
  String? serviceName,
  String? occasionTitle,
}) {
  final occasion = customerFacingOccasionTitle(occasionTitle);
  final service = serviceName?.trim();
  final buffer = StringBuffer('Interested in $productName');
  if (service != null && service.isNotEmpty) {
    buffer.write(' from $service');
  }
  if (occasion != null) {
    buffer.write(' for $occasion');
  }
  return buffer.toString();
}
