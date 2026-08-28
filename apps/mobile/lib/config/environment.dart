import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Environment configuration for the Mee Events mobile app.
///
/// Values resolve in order: a compile-time `--dart-define`, the runtime `.env`
/// file loaded by flutter_dotenv, then the local development default.
class Environment {
  Environment._();

  static const String developmentApiBaseUrl = 'http://localhost:3002/api/v1';
  static const String developmentBranchCode = 'HYD';

  static const String _apiBaseUrlDefine = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );
  static const String _branchCodeDefine = String.fromEnvironment(
    'BRANCH_CODE',
    defaultValue: '',
  );

  /// Base URL for the backend API.
  static String get apiBaseUrl => resolveApiBaseUrl(
    dartDefine: _apiBaseUrlDefine,
    dotenvValue: dotenv.isInitialized ? dotenv.env['API_BASE_URL'] : null,
    isRelease: !isDevelopmentPreview,
  );

  /// Hyderabad branch code.
  static String get branchCode => resolveBranchCode(
    dartDefine: _branchCodeDefine,
    dotenvValue: dotenv.isInitialized ? dotenv.env['BRANCH_CODE'] : null,
  );

  /// City name for display.
  static String get cityName => 'Hyderabad';

  /// Whether this is a non-release (debug/profile) build.
  static bool get isDevelopmentPreview {
    const isRelease = bool.fromEnvironment('dart.vm.product');
    return !isRelease;
  }

  static String resolveApiBaseUrl({
    required String dartDefine,
    String? dotenvValue,
    required bool isRelease,
  }) {
    final resolved =
        _firstNonEmpty(<String?>[dartDefine, dotenvValue]) ??
        developmentApiBaseUrl;
    final uri = Uri.tryParse(resolved);
    final validCommonUrl =
        uri != null &&
        uri.isAbsolute &&
        uri.host.isNotEmpty &&
        (uri.scheme == 'http' || uri.scheme == 'https') &&
        uri.userInfo.isEmpty &&
        !uri.hasFragment &&
        !uri.hasQuery;
    if (!validCommonUrl ||
        (isRelease && isForbiddenReleaseApiBaseUrl(resolved))) {
      throw StateError('API_BASE_URL is invalid for this build.');
    }
    return resolved;
  }

  static String resolveBranchCode({
    required String dartDefine,
    String? dotenvValue,
  }) {
    return _firstNonEmpty(<String?>[dartDefine, dotenvValue]) ??
        developmentBranchCode;
  }

  static bool isForbiddenReleaseApiBaseUrl(String value) {
    final uri = Uri.tryParse(value);
    if (uri == null ||
        uri.scheme != 'https' ||
        uri.host.isEmpty ||
        uri.userInfo.isNotEmpty ||
        uri.hasFragment ||
        uri.hasQuery) {
      return true;
    }
    final host = uri.host.toLowerCase().replaceFirst(RegExp(r'\.$'), '');
    return host == 'localhost' ||
        host == '127.0.0.1' ||
        host.startsWith('127.') ||
        host == '::1' ||
        host == '0.0.0.0' ||
        host == '10.0.2.2' ||
        host == '10.0.3.2';
  }

  static String? _firstNonEmpty(List<String?> values) {
    for (final value in values) {
      if (value != null && value.trim().isNotEmpty) {
        return value.trim();
      }
    }
    return null;
  }
}
