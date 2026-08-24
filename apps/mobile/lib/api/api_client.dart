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
  final Future<String?> Function()? refreshAccessToken;
  final http.Client Function() _clientFactory;

  static const Duration _timeout = Duration(seconds: 15);

  ApiClient({
    required this.baseUrl,
    this.accessToken,
    this.refreshAccessToken,
    http.Client Function()? clientFactory,
  }) : _clientFactory = clientFactory ?? http.Client.new {
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
    final client = _clientFactory();

    try {
      final encodedBody = body == null ? null : jsonEncode(body);

      var response = await _send(client, uri, method, encodedBody, accessToken);
      if (response.statusCode == 401 && refreshAccessToken != null) {
        final refreshedToken = await refreshAccessToken!();
        if (refreshedToken != null) {
          response = await _send(
            client,
            uri,
            method,
            encodedBody,
            refreshedToken,
          );
        }
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

  Future<http.Response> _send(
    http.Client client,
    Uri uri,
    String method,
    String? encodedBody,
    String? token,
  ) {
    final headers = <String, String>{
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
      if (encodedBody != null) 'Content-Type': 'application/json',
    };

    final request = switch (method) {
      'GET' => client.get(uri, headers: headers),
      'POST' => client.post(uri, headers: headers, body: encodedBody),
      'PUT' => client.put(uri, headers: headers, body: encodedBody),
      'PATCH' => client.patch(uri, headers: headers, body: encodedBody),
      'DELETE' => client.delete(uri, headers: headers, body: encodedBody),
      _ => throw ApiRequestException(
        ApiError(
          statusCode: 0,
          code: 'UNSUPPORTED_METHOD',
          message: 'Unsupported method $method',
        ),
      ),
    };
    return request.timeout(_timeout);
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
