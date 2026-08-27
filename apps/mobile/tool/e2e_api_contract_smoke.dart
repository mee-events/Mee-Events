import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:http/http.dart' as http;

/// Headless mobile-side API contract smoke.
///
/// This is not a Flutter widget, integration_test, or device/emulator run.
/// It uses the same local OTP + authorized GET + logout path as the API smoke
/// so CI can prove the mobile package can talk to a loopback Nest API without
/// a physical device.
Future<void> main() async {
  final status = await runSmoke();
  exit(status);
}

Future<int> runSmoke() async {
  final raw = Platform.environment['E2E_API_BASE_URL']?.trim() ?? '';
  if (raw.isEmpty) {
    stderr.writeln('E2E fail-closed: E2E_API_BASE_URL is required');
    return 1;
  }

  final apiBase = Uri.tryParse(raw);
  if (apiBase == null || !_isLoopbackHttp(apiBase)) {
    stderr.writeln(
      'E2E fail-closed: E2E_API_BASE_URL must target loopback http(s)',
    );
    return 1;
  }

  final origin = raw.replaceAll(RegExp(r'/+$'), '');
  stdout.writeln('==> Mobile API contract smoke (loopback, no device)');

  String? accessToken;
  try {
    final live = await http.get(Uri.parse('$origin/health/live'));
    if (live.statusCode != 200 || _json(live.body)['status'] != 'ok') {
      stderr.writeln('health/live failed: HTTP ${live.statusCode}');
      return 1;
    }

    final ready = await http.get(Uri.parse('$origin/health/ready'));
    final readyBody = _json(ready.body);
    if (ready.statusCode != 200 ||
        readyBody['status'] != 'ok' ||
        (readyBody['checks'] as Map<String, dynamic>)['persistence'] !=
            'postgresql') {
      stderr.writeln('health/ready is not ok against PostgreSQL');
      return 1;
    }
    stdout.writeln('    health ok');

    final mobile = _syntheticMobile();
    final deviceId = 'e2e-mobile-${DateTime.now().microsecondsSinceEpoch}';
    final challenge = await http.post(
      Uri.parse('$origin/auth/otp/request'),
      headers: const {'content-type': 'application/json'},
      body: jsonEncode({'mobileNumber': mobile, 'countryCode': 'IN'}),
    );
    if (challenge.statusCode != 202) {
      stderr.writeln('otp/request failed: HTTP ${challenge.statusCode}');
      return 1;
    }
    final challengeJson = _json(challenge.body);
    final challengeId = challengeJson['challengeId'];
    final debugCode = challengeJson['debugCode'];
    if (challengeId is! String || debugCode is! String || debugCode.isEmpty) {
      stderr.writeln(
        'otp/request had no debugCode; need APP_ENV=development and OTP_PROVIDER=local',
      );
      return 1;
    }
    stdout.writeln('    challenge accepted');

    final verify = await http.post(
      Uri.parse('$origin/auth/otp/verify'),
      headers: const {'content-type': 'application/json'},
      body: jsonEncode({
        'challengeId': challengeId,
        'code': debugCode,
        'deviceId': deviceId,
        'deviceName': 'STAB-17 mobile API smoke',
      }),
    );
    if (verify.statusCode != 200) {
      stderr.writeln('otp/verify failed: HTTP ${verify.statusCode}');
      return 1;
    }
    final session = _json(verify.body);
    final token = session['accessToken'];
    final role = (session['user'] as Map<String, dynamic>)['lastActiveRole'];
    if (token is! String || token.isEmpty || role != 'customer') {
      stderr.writeln('otp/verify did not return a customer session');
      return 1;
    }
    accessToken = token;
    stdout.writeln('    session created');

    final bootstrap = await http.get(
      Uri.parse('$origin/platform/bootstrap'),
      headers: {'authorization': 'Bearer $accessToken'},
    );
    if (bootstrap.statusCode != 200) {
      stderr.writeln('platform/bootstrap failed: HTTP ${bootstrap.statusCode}');
      return 1;
    }
    final actor = _json(bootstrap.body)['actor'] as Map<String, dynamic>;
    if (actor['activeRole'] != 'customer') {
      stderr.writeln('bootstrap role mismatch');
      return 1;
    }

    final enquiries = await http.get(
      Uri.parse('$origin/enquiries'),
      headers: {'authorization': 'Bearer $accessToken'},
    );
    if (enquiries.statusCode != 200) {
      stderr.writeln('enquiries list failed: HTTP ${enquiries.statusCode}');
      return 1;
    }
    final enquiryPayload = _json(enquiries.body)['enquiries'];
    if (enquiryPayload is! List) {
      stderr.writeln('enquiries payload missing list');
      return 1;
    }
    stdout.writeln('    authorized reads ok');

    final logout = await http.post(
      Uri.parse('$origin/auth/logout'),
      headers: {
        'authorization': 'Bearer $accessToken',
        'content-type': 'application/json',
      },
      body: '{}',
    );
    if (logout.statusCode != 200) {
      stderr.writeln('logout failed: HTTP ${logout.statusCode}');
      return 1;
    }
    final revoked = accessToken;
    accessToken = null;
    final denied = await http.get(
      Uri.parse('$origin/platform/bootstrap'),
      headers: {'authorization': 'Bearer $revoked'},
    );
    if (denied.statusCode != 401) {
      stderr.writeln(
        'expected 401 after logout, got HTTP ${denied.statusCode}',
      );
      return 1;
    }
    stdout.writeln('    session revoked');
    stdout.writeln('PASS: mobile API contract smoke (no device)');
    return 0;
  } finally {
    final token = accessToken;
    if (token != null) {
      await http.post(
        Uri.parse('$origin/auth/logout'),
        headers: {
          'authorization': 'Bearer $token',
          'content-type': 'application/json',
        },
        body: '{}',
      );
    }
  }
}

bool _isLoopbackHttp(Uri uri) {
  if (uri.scheme != 'http' && uri.scheme != 'https') {
    return false;
  }
  if (uri.userInfo.isNotEmpty) {
    return false;
  }
  final host = uri.host.toLowerCase();
  return host == 'localhost' || host == '127.0.0.1' || host == '::1';
}

Map<String, dynamic> _json(String body) {
  final decoded = jsonDecode(body);
  if (decoded is Map<String, dynamic>) {
    return decoded;
  }
  throw const FormatException('expected a JSON object');
}

String _syntheticMobile() {
  final n =
      (DateTime.now().microsecondsSinceEpoch + Random().nextInt(99999)) %
      100000000;
  return '+9197${n.toString().padLeft(8, '0')}';
}
