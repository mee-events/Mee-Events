class ApiError {
  final int statusCode;
  final String code;
  final String message;

  const ApiError({
    required this.statusCode,
    required this.code,
    required this.message,
  });

  factory ApiError.fromJson(Map<String, dynamic> json) {
    // Backend GlobalExceptionFilter emits `status`; some proxies use statusCode.
    final status = json['statusCode'] ?? json['status'];
    return ApiError(
      statusCode: status is int ? status : 500,
      code: json['code'] as String? ?? 'UNKNOWN_ERROR',
      message: json['message'] as String? ?? 'An unknown error occurred',
    );
  }
}

class ApiRequestException implements Exception {
  final ApiError error;

  const ApiRequestException(this.error);

  @override
  String toString() => 'ApiRequestException: ${error.message} (Code: ${error.code})';
}

class ApiConfigurationException implements Exception {
  final String message;

  const ApiConfigurationException(this.message);

  @override
  String toString() => 'ApiConfigurationException: $message';
}
