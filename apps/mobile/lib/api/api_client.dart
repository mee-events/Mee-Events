import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:mee_events/models/api_error.dart';

/// HTTP client for the Mee Events backend API.
///
/// Uses `package:http` so the same client works on mobile, desktop and web.
/// `dart:io` is deliberately avoided: `HttpClient` is unsupported on Flutter
/// Web and throws before a request is ever sent.
class ApiClient {
  final String baseUrl;
  final String? accessToken;

  static const Duration _timeout = Duration(seconds: 15);

  ApiClient({
    required this.baseUrl,
    this.accessToken,
  }) {
    if (baseUrl.isEmpty) {
      throw const ApiConfigurationException('baseUrl cannot be empty');
    }
  }

  Future<T> request<T>(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? body,
    T Function(Map<String, dynamic>)? fromJson,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final client = http.Client();

    try {
      final headers = <String, String>{
        'Accept': 'application/json',
        if (accessToken != null) 'Authorization': 'Bearer $accessToken',
        if (body != null) 'Content-Type': 'application/json',
      };
      final encodedBody = body == null ? null : jsonEncode(body);

      final http.Response response;
      switch (method) {
        case 'GET':
          response = await client.get(uri, headers: headers).timeout(_timeout);
        case 'POST':
          response = await client
              .post(uri, headers: headers, body: encodedBody)
              .timeout(_timeout);
        case 'PUT':
          response = await client
              .put(uri, headers: headers, body: encodedBody)
              .timeout(_timeout);
        case 'DELETE':
          response = await client
              .delete(uri, headers: headers, body: encodedBody)
              .timeout(_timeout);
        default:
          throw ApiRequestException(
            ApiError(
              statusCode: 0,
              code: 'UNSUPPORTED_METHOD',
              message: 'Unsupported method $method',
            ),
          );
      }

      final responseBody = utf8.decode(response.bodyBytes);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        if (responseBody.isEmpty) {
          if (fromJson != null) {
            throw ApiRequestException(
              ApiError(
                statusCode: response.statusCode,
                code: 'EMPTY_RESPONSE',
                message: 'The server returned an empty response',
              ),
            );
          }
          return <String, dynamic>{} as T;
        }
        final decoded = jsonDecode(responseBody) as Map<String, dynamic>;
        if (fromJson != null) {
          return fromJson(decoded);
        }
        return decoded as T;
      }

      Map<String, dynamic> errorBody = <String, dynamic>{};
      try {
        final decoded = jsonDecode(responseBody);
        if (decoded is Map<String, dynamic>) {
          errorBody = decoded;
        }
      } catch (_) {
        // Non-JSON error payload; fall back to the status code below.
      }

      errorBody['statusCode'] ??= response.statusCode;
      throw ApiRequestException(ApiError.fromJson(errorBody));
    } on ApiRequestException {
      rethrow;
    } catch (error) {
      throw ApiRequestException(
        ApiError(
          statusCode: 0,
          code: 'NETWORK_ERROR',
          message: _networkMessage(error),
        ),
      );
    } finally {
      client.close();
    }
  }

  /// Network failures surface as low-level socket/XHR errors that mean nothing
  /// to a customer, so the most common cause is named explicitly.
  String _networkMessage(Object error) {
    if (error is http.ClientException || error is FormatException) {
      return 'Could not reach Mee Events at $baseUrl. '
          'Check your connection and try again.';
    }
    return error.toString();
  }
}
