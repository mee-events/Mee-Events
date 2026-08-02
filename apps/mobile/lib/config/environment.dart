import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Environment configuration for the Mee Events mobile app.
///
/// Values resolve in order: the runtime `.env` file loaded by flutter_dotenv,
/// then a compile-time `--dart-define`, then the local development default.
class Environment {
  Environment._();

  static const String _apiBaseUrlDefine =
      String.fromEnvironment('API_BASE_URL', defaultValue: '');
  static const String _branchCodeDefine =
      String.fromEnvironment('BRANCH_CODE', defaultValue: '');

  /// Base URL for the backend API.
  static String get apiBaseUrl => _resolve(
        'API_BASE_URL',
        _apiBaseUrlDefine,
        'http://localhost:3002/api/v1',
      );

  /// Hyderabad branch code.
  static String get branchCode =>
      _resolve('BRANCH_CODE', _branchCodeDefine, 'HYD');

  /// City name for display.
  static String get cityName => 'Hyderabad';

  /// Whether we're running in development/preview mode.
  static bool get isDevelopmentPreview {
    const isRelease = bool.fromEnvironment('dart.vm.product');
    return !isRelease;
  }

  static String _resolve(String key, String define, String fallback) {
    if (dotenv.isInitialized) {
      final value = dotenv.env[key];
      if (value != null && value.isNotEmpty) {
        return value;
      }
    }
    return define.isNotEmpty ? define : fallback;
  }
}
