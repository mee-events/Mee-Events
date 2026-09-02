import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mee_events/api/api_client.dart';
import 'package:mee_events/models/api_error.dart';

void main() {
  test('refreshes once and retries a protected request after 401', () async {
    var requestCount = 0;
    var refreshCount = 0;
    final mockClient = MockClient((request) async {
      requestCount += 1;
      final authorization = request.headers['authorization'];
      if (authorization == 'Bearer expired-access-token') {
        return http.Response(
          jsonEncode({
            'statusCode': 401,
            'code': 'ACCESS_TOKEN_INVALID',
            'message': 'Access token is invalid',
          }),
          401,
          headers: {'content-type': 'application/json'},
        );
      }
      expect(authorization, 'Bearer rotated-access-token');
      return http.Response(
        jsonEncode({'ok': true}),
        200,
        headers: {'content-type': 'application/json'},
      );
    });
    final api = ApiClient(
      baseUrl: 'https://example.test/api/v1',
      accessToken: 'expired-access-token',
      refreshAccessToken: () async {
        refreshCount += 1;
        return 'rotated-access-token';
      },
      clientFactory: () => mockClient,
    );

    final result = await api.request<Map<String, dynamic>>('/protected');

    expect(result, {'ok': true});
    expect(refreshCount, 1);
    expect(requestCount, 2);
  });

  test('does not automatically replay an unsafe mutation', () async {
    var requestCount = 0;
    var refreshCount = 0;
    final api = ApiClient(
      baseUrl: 'https://example.test/api/v1',
      accessToken: 'expired-access-token',
      refreshAccessToken: () async {
        refreshCount += 1;
        return 'rotated-access-token';
      },
      clientFactory: () => MockClient((request) async {
        requestCount += 1;
        return http.Response('{}', 401);
      }),
    );

    await expectLater(
      api.request<Map<String, dynamic>>(
        '/unsafe-action',
        method: 'POST',
        body: {'value': 1},
      ),
      throwsA(
        isA<ApiRequestException>().having(
          (error) => error.error.code,
          'code',
          'REQUEST_NOT_REPLAYED',
        ),
      ),
    );
    expect(requestCount, 1);
    expect(refreshCount, 1);
  });

  test('a rejected replay ends the session without another refresh', () async {
    var requestCount = 0;
    var refreshCount = 0;
    var rejectionCount = 0;
    final api = ApiClient(
      baseUrl: 'https://example.test/api/v1',
      accessToken: 'expired-access-token',
      refreshAccessToken: () async {
        refreshCount += 1;
        return 'rotated-access-token';
      },
      onAccessTokenRejected: () async {
        rejectionCount += 1;
      },
      clientFactory: () => MockClient((request) async {
        requestCount += 1;
        return http.Response('{}', 401);
      }),
    );

    await expectLater(
      api.request<Map<String, dynamic>>('/protected'),
      throwsA(
        isA<ApiRequestException>().having(
          (error) => error.error.code,
          'code',
          'SESSION_ENDED',
        ),
      ),
    );
    expect(requestCount, 2);
    expect(refreshCount, 1);
    expect(rejectionCount, 1);
  });

  test('invalid successful payload returns a generic safe error', () async {
    final api = ApiClient(
      baseUrl: 'https://example.test/api/v1',
      clientFactory: () =>
          MockClient((_) async => http.Response('internal parser detail', 200)),
    );

    await expectLater(
      api.request<Map<String, dynamic>>('/invalid'),
      throwsA(
        isA<ApiRequestException>()
            .having((error) => error.error.code, 'code', 'INVALID_RESPONSE')
            .having(
              (error) => error.error.message,
              'message',
              isNot(contains('internal parser detail')),
            ),
      ),
    );
  });
}
