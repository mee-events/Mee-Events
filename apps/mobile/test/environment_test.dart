import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/config/environment.dart';

void main() {
  test('uses the local development API fallback outside release builds', () {
    expect(
      Environment.resolveApiBaseUrl(
        dartDefine: '',
        dotenvValue: null,
        isRelease: false,
      ),
      Environment.developmentApiBaseUrl,
    );
  });

  test('prefers dart-define over dotenv', () {
    expect(
      Environment.resolveApiBaseUrl(
        dartDefine: 'https://api.internal.test/api/v1',
        dotenvValue: 'http://localhost:3002/api/v1',
        isRelease: true,
      ),
      'https://api.internal.test/api/v1',
    );
  });

  test('forbids loopback API fallbacks in release builds', () {
    expect(
      () => Environment.resolveApiBaseUrl(
        dartDefine: '',
        dotenvValue: null,
        isRelease: true,
      ),
      throwsA(isA<StateError>()),
    );
  });

  test('forbids Android emulator host aliases in release builds', () {
    expect(
      () => Environment.resolveApiBaseUrl(
        dartDefine: 'http://10.0.2.2:3002/api/v1',
        dotenvValue: null,
        isRelease: true,
      ),
      throwsA(isA<StateError>()),
    );
  });

  test('accepts a production API URL in release builds', () {
    expect(
      Environment.resolveApiBaseUrl(
        dartDefine: 'https://api.internal.test/api/v1',
        dotenvValue: null,
        isRelease: true,
      ),
      'https://api.internal.test/api/v1',
    );
  });

  test('defaults the Hyderabad branch code', () {
    expect(
      Environment.resolveBranchCode(dartDefine: '', dotenvValue: null),
      Environment.developmentBranchCode,
    );
  });
}
