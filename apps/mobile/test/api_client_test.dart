import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mee_events/api/api_client.dart';

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
}
