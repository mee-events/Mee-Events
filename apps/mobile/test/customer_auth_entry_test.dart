import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mee_events/api/api_client.dart';
import 'package:mee_events/api/mobile_api.dart';
import 'package:mee_events/features/auth/indian_mobile_number.dart';
import 'package:mee_events/features/auth/screens/login_screen.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/models/api_error.dart';
import 'package:mee_events/models/auth_session.dart';

class ScriptedOtpApi extends MobileApi {
  ScriptedOtpApi(this.handler)
    : super(apiClient: ApiClient(baseUrl: 'http://127.0.0.1.invalid'));

  final Future<OtpChallenge> Function(String mobileNumber) handler;
  final List<String> requests = [];

  @override
  Future<OtpChallenge> requestOtp(String mobileNumber) {
    requests.add(mobileNumber);
    return handler(mobileNumber);
  }
}

const _challenge = OtpChallenge(
  challengeId: '00000000-0000-4000-8000-000000000001',
  expiresInSeconds: 300,
  resendAfterSeconds: 60,
);

Widget _testApp(ScriptedOtpApi api, {double textScale = 1}) {
  return ProviderScope(
    overrides: [mobileApiProvider.overrideWithValue(api)],
    child: MaterialApp(
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(
          context,
        ).copyWith(textScaler: TextScaler.linear(textScale)),
        child: child!,
      ),
      home: const LoginScreen(),
    ),
  );
}

Finder get _mobileField => find.byKey(const ValueKey('customer-mobile-field'));
Finder get _continueButton =>
    find.byKey(const ValueKey('customer-auth-continue'));

Future<void> _submit(WidgetTester tester, String input) async {
  await tester.enterText(_mobileField, input);
  await tester.tap(_continueButton);
  await tester.pump();
}

void main() {
  group('India mobile normalization', () {
    test('rejects empty, too-short, and too-long input', () {
      expect(normalizeIndianMobileNumber(''), isNull);
      expect(normalizeIndianMobileNumber('987654321'), isNull);
      expect(normalizeIndianMobileNumber('98765432100'), isNull);
    });

    test('rejects invalid characters and invalid mobile ranges', () {
      expect(normalizeIndianMobileNumber('98765abc10'), isNull);
      expect(normalizeIndianMobileNumber('++919876543210'), isNull);
      expect(normalizeIndianMobileNumber('1234567890'), isNull);
    });

    test('accepts supported India input and returns canonical E.164', () {
      expect(normalizeIndianMobileNumber('98765 43210'), '+919876543210');
      expect(normalizeIndianMobileNumber('09876543210'), '+919876543210');
      expect(normalizeIndianMobileNumber('+91 98765 43210'), '+919876543210');
    });
  });

  test('MobileApi sends the canonical auth request contract', () async {
    late http.Request captured;
    final api = MobileApi(
      apiClient: ApiClient(
        baseUrl: 'https://api.invalid/api/v1',
        clientFactory: () => MockClient((request) async {
          captured = request;
          return http.Response(
            jsonEncode({
              'challengeId': _challenge.challengeId,
              'expiresInSeconds': _challenge.expiresInSeconds,
              'resendAfterSeconds': _challenge.resendAfterSeconds,
            }),
            202,
          );
        }),
      ),
    );

    await api.requestOtp('+919876543210');

    expect(captured.method, 'POST');
    expect(captured.url.path, '/api/v1/auth/otp/request');
    expect(jsonDecode(captured.body), {
      'mobileNumber': '+919876543210',
      'countryCode': 'IN',
    });
  });

  testWidgets('empty mobile number shows accessible guidance', (tester) async {
    final semantics = tester.ensureSemantics();
    final api = ScriptedOtpApi((_) async => _challenge);
    await tester.pumpWidget(_testApp(api));

    await tester.tap(_continueButton);
    await tester.pump();

    const message = 'Enter a valid 10-digit Indian mobile number.';
    expect(find.text(message), findsOneWidget);
    expect(api.requests, isEmpty);
    final errorNode = tester.getSemantics(
      find.byKey(const ValueKey('customer-auth-error')),
    );
    expect(errorNode.label, message);
    expect(errorNode.flagsCollection.isLiveRegion, isTrue);
    semantics.dispose();
  });

  testWidgets('short, long, and invalid input never calls the API', (
    tester,
  ) async {
    final api = ScriptedOtpApi((_) async => _challenge);
    await tester.pumpWidget(_testApp(api));

    for (final value in ['98765', '98765432100', '+91 +']) {
      await _submit(tester, value);
      expect(
        find.text('Enter a valid 10-digit Indian mobile number.'),
        findsOneWidget,
      );
    }
    expect(api.requests, isEmpty);
  });

  testWidgets('submits the canonical request value and opens OTP entry', (
    tester,
  ) async {
    final api = ScriptedOtpApi((_) async => _challenge);
    await tester.pumpWidget(_testApp(api));

    await _submit(tester, '+91 98765 43210');
    await tester.pumpAndSettle();

    expect(api.requests, ['+919876543210']);
    expect(find.text('One-time code'), findsOneWidget);
    expect(find.text('Verify and continue'), findsOneWidget);
    expect(find.text('Continue'), findsNothing);
  });

  testWidgets('shows pending state and blocks repeated rapid taps', (
    tester,
  ) async {
    final pending = Completer<OtpChallenge>();
    final api = ScriptedOtpApi((_) => pending.future);
    await tester.pumpWidget(_testApp(api));
    await tester.enterText(_mobileField, '9876543210');

    await tester.tap(_continueButton);
    await tester.tap(_continueButton);
    await tester.pump();

    expect(api.requests, hasLength(1));
    expect(find.text('Requesting your secure code…'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    final primary = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
    expect(primary.onPressed, isNull);

    pending.complete(_challenge);
    await tester.pumpAndSettle();
    expect(find.text('One-time code'), findsOneWidget);
  });

  testWidgets('maps offline failure to customer-safe copy', (tester) async {
    final api = ScriptedOtpApi(
      (_) async => throw const ApiRequestException(
        ApiError(
          statusCode: 0,
          code: 'NETWORK_ERROR',
          message: 'SocketException at private-host.invalid',
        ),
      ),
    );
    await tester.pumpWidget(_testApp(api));

    await _submit(tester, '9876543210');

    expect(
      find.text(
        'You appear to be offline. Check your connection and try again.',
      ),
      findsOneWidget,
    );
    expect(find.textContaining('SocketException'), findsNothing);
    expect(find.textContaining('private-host'), findsNothing);
  });

  testWidgets('maps rate limits without exposing server details', (
    tester,
  ) async {
    final api = ScriptedOtpApi(
      (_) async => throw const ApiRequestException(
        ApiError(
          statusCode: 429,
          code: 'OTP_RESEND_COOLDOWN',
          message: 'Wait 47 seconds for challenge private-id',
        ),
      ),
    );
    await tester.pumpWidget(_testApp(api));

    await _submit(tester, '9876543210');

    expect(
      find.text('Too many attempts. Please wait a moment before trying again.'),
      findsOneWidget,
    );
    expect(find.textContaining('47'), findsNothing);
    expect(find.textContaining('private-id'), findsNothing);
  });

  testWidgets('maps backend and unexpected failures to generic safe copy', (
    tester,
  ) async {
    final errors = <Object>[
      const ApiRequestException(
        ApiError(
          statusCode: 503,
          code: 'OTP_PROVIDER_UNCONFIGURED',
          message: 'Provider key missing at internal endpoint',
        ),
      ),
      StateError('raw stack token=private-value'),
    ];

    for (final error in errors) {
      final api = ScriptedOtpApi((_) async => throw error);
      await tester.pumpWidget(_testApp(api));
      await _submit(tester, '9876543210');

      expect(
        find.text('We couldn’t send a code right now. Please try again later.'),
        findsOneWidget,
      );
      expect(find.textContaining('Provider'), findsNothing);
      expect(find.textContaining('internal'), findsNothing);
      expect(find.textContaining('token='), findsNothing);
      expect(find.textContaining('StateError'), findsNothing);
    }
  });

  testWidgets('field, consent, autofill, labels, and targets are accessible', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    final api = ScriptedOtpApi((_) async => _challenge);
    await tester.pumpWidget(_testApp(api));

    expect(find.text('Mee Events'), findsOneWidget);
    expect(find.text('Welcome to Mee Events'), findsOneWidget);
    expect(find.textContaining('one-time sign-in code'), findsOneWidget);
    expect(
      find.bySemanticsLabel(
        '10-digit mobile number, India country code plus 91',
      ),
      findsOneWidget,
    );

    final field = tester.widget<TextField>(find.byType(TextField));
    expect(field.decoration?.prefixText, '+91 ');
    expect(field.keyboardType, TextInputType.phone);
    expect(
      field.autofillHints,
      contains(AutofillHints.telephoneNumberNational),
    );
    expect(field.textInputAction, TextInputAction.done);
    expect(
      tester.getSize(find.byType(TextField)).height,
      greaterThanOrEqualTo(44),
    );
    semantics.dispose();
    expect(
      tester.getSize(find.byType(ElevatedButton)).height,
      greaterThanOrEqualTo(44),
    );
  });

  testWidgets('large text keeps critical entry controls available', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 568);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final api = ScriptedOtpApi((_) async => _challenge);

    await tester.pumpWidget(_testApp(api, textScale: 2));
    await tester.ensureVisible(_continueButton);
    await tester.pump();

    expect(_mobileField, findsOneWidget);
    expect(_continueButton, findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
