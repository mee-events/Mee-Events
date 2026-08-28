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

  test('accepts a synthetic non-loopback HTTPS URL in release builds', () {
    expect(
      Environment.resolveApiBaseUrl(
        dartDefine: 'https://mee-events-sec06.invalid/api/v1',
        dotenvValue: null,
        isRelease: true,
      ),
      'https://mee-events-sec06.invalid/api/v1',
    );
  });

  test('debug and profile configuration may use loopback HTTP', () {
    for (final url in const [
      'http://localhost:3002/api/v1',
      'http://127.0.0.1:3002/api/v1',
      'http://10.0.2.2:3002/api/v1',
    ]) {
      expect(
        Environment.resolveApiBaseUrl(
          dartDefine: url,
          dotenvValue: null,
          isRelease: false,
        ),
        url,
      );
    }
  });

  test('release rejects non-loopback plain HTTP', () {
    expect(
      () => Environment.resolveApiBaseUrl(
        dartDefine: 'http://mee-events-sec06.invalid/api/v1',
        dotenvValue: null,
        isRelease: true,
      ),
      throwsA(isA<StateError>()),
    );
  });

  test('release rejects loopback and emulator hosts even over HTTPS', () {
    for (final url in const [
      'https://localhost:3002/api/v1',
      'https://127.1.2.3:3002/api/v1',
      'https://10.0.2.2:3002/api/v1',
      'https://10.0.3.2:3002/api/v1',
    ]) {
      expect(
        () => Environment.resolveApiBaseUrl(
          dartDefine: url,
          dotenvValue: null,
          isRelease: true,
        ),
        throwsA(isA<StateError>()),
      );
    }
  });

  test('malformed URLs fail closed in every build mode', () {
    for (final isRelease in const [false, true]) {
      expect(
        () => Environment.resolveApiBaseUrl(
          dartDefine: 'not a url',
          dotenvValue: null,
          isRelease: isRelease,
        ),
        throwsA(isA<StateError>()),
      );
    }
  });

  test('credential-bearing and fragment-bearing URLs fail closed', () {
    for (final url in const [
      'https://user:password@mee-events-sec06.invalid/api/v1',
      'https://mee-events-sec06.invalid/api/v1#fragment',
    ]) {
      expect(
        () => Environment.resolveApiBaseUrl(
          dartDefine: url,
          dotenvValue: null,
          isRelease: true,
        ),
        throwsA(isA<StateError>()),
      );
    }
  });

  test('defaults the Hyderabad branch code', () {
    expect(
      Environment.resolveBranchCode(dartDefine: '', dotenvValue: null),
      Environment.developmentBranchCode,
    );
  });
}
