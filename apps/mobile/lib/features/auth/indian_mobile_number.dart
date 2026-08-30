/// Normalizes supported India mobile-number input to the backend's E.164 form.
///
/// Flutter performs this narrow check for immediate guidance. The NestJS
/// identity service remains authoritative and validates the value again with
/// libphonenumber before creating an OTP challenge.
String? normalizeIndianMobileNumber(String raw) {
  final input = raw.trim();
  if (input.isEmpty || !RegExp(r'^\+?[\d\s]+$').hasMatch(input)) {
    return null;
  }

  final compact = input.replaceAll(RegExp(r'\s'), '');
  final nationalNumber = switch (compact) {
    final value when RegExp(r'^\d{10}$').hasMatch(value) => value,
    final value when RegExp(r'^0\d{10}$').hasMatch(value) => value.substring(1),
    final value when RegExp(r'^91\d{10}$').hasMatch(value) => value.substring(
      2,
    ),
    final value when RegExp(r'^\+91\d{10}$').hasMatch(value) => value.substring(
      3,
    ),
    _ => null,
  };

  if (nationalNumber == null ||
      !RegExp(r'^[6-9]\d{9}$').hasMatch(nationalNumber)) {
    return null;
  }
  return '+91$nationalNumber';
}
