import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/api/api_client.dart';
import 'package:mee_events/api/mobile_api.dart';
import 'package:mee_events/features/auth/installation_id.dart';
import 'package:mee_events/features/auth/otp_time_source.dart';
import 'package:mee_events/features/auth/screens/login_screen.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/models/api_error.dart';
import 'package:mee_events/models/auth_session.dart';

const _firstChallenge = OtpChallenge(
  challengeId: '00000000-0000-4000-8000-000000000101',
  expiresInSeconds: 300,
  resendAfterSeconds: 60,
);

final _session = AuthSession(
  accessToken: 'synthetic-access-token',
  refreshToken: 'synthetic-refresh-token-value-32-chars',
  accessTokenExpiresInSeconds: 900,
  accessTokenExpiresAt: DateTime.utc(2099),
  userId: '00000000-0000-4000-8000-000000000201',
  mobileNumber: '+919876543210',
  lastActiveRole: 'customer',
);

typedef RequestHandler = Future<OtpChallenge> Function(String mobileNumber);
typedef VerifyHandler =
    Future<AuthSession> Function(
      String challengeId,
      String code,
      String deviceId,
    );

class _ScriptedOtpApi extends MobileApi {
  _ScriptedOtpApi({
    required this.requestHandler,
    this.verifyHandler = _successfulVerification,
  }) : super(apiClient: ApiClient(baseUrl: 'http://127.0.0.1.invalid'));

  final RequestHandler requestHandler;
  final VerifyHandler verifyHandler;
  final List<String> requests = [];
  final List<({String challengeId, String code, String deviceId})> verifies =
      [];

  @override
  Future<OtpChallenge> requestOtp(String mobileNumber) {
    requests.add(mobileNumber);
    return requestHandler(mobileNumber);
  }

  @override
  Future<AuthSession> verifyOtp({
    required String challengeId,
    required String code,
    required String deviceId,
  }) {
    verifies.add((challengeId: challengeId, code: code, deviceId: deviceId));
    return verifyHandler(challengeId, code, deviceId);
  }
}

Future<AuthSession> _successfulVerification(
  String challengeId,
  String code,
  String deviceId,
) async => _session;

class _FakeTimeSource implements OtpTimeSource {
  _FakeTimeSource(this.current);

  DateTime current;
  final List<_FakeTicker> tickers = [];

  @override
  DateTime now() => current;

  @override
  OtpTicker startPeriodic(Duration interval, void Function() onTick) {
    final ticker = _FakeTicker(onTick);
    tickers.add(ticker);
    return ticker;
  }

  void advance(Duration duration, {bool tick = true}) {
    current = current.add(duration);
    if (tick) {
      for (final ticker in [...tickers]) {
        ticker.tick();
      }
    }
  }
}

class _FakeTicker implements OtpTicker {
  _FakeTicker(this.onTick);

  final VoidCallback onTick;
  bool cancelled = false;

  void tick() {
    if (!cancelled) onTick();
  }

  @override
  void cancel() => cancelled = true;
}

class _FixedInstallationIdStore implements InstallationIdStore {
  @override
  Future<String> readOrCreate() async => 'mobile-synthetic-installation';
}

Finder get _mobileField => find.byKey(const ValueKey('customer-mobile-field'));
Finder get _otpField => find.byKey(const ValueKey('customer-otp-field'));
Finder get _otpTextField =>
    find.descendant(of: _otpField, matching: find.byType(TextField));
Finder get _primary => find.byKey(const ValueKey('customer-auth-continue'));
Finder get _resend => find.byKey(const ValueKey('customer-otp-resend'));
Finder get _changeNumber =>
    find.byKey(const ValueKey('customer-otp-change-number'));

Future<SessionNotifier> _pumpLogin(
  WidgetTester tester, {
  required _ScriptedOtpApi api,
  required _FakeTimeSource time,
  double textScale = 1,
  Size size = const Size(390, 844),
}) async {
  final notifier = SessionNotifier(
    (_) async => throw StateError('refresh not used'),
    store: MemoryAuthSessionStore(),
  );
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        mobileApiProvider.overrideWithValue(api),
        sessionProvider.overrideWith((ref) => notifier),
        installationIdStoreProvider.overrideWithValue(
          _FixedInstallationIdStore(),
        ),
      ],
      child: MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(textScale)),
          child: child!,
        ),
        home: LoginScreen(timeSource: time),
      ),
    ),
  );
  return notifier;
}

Future<void> _openOtp(WidgetTester tester) async {
  await tester.enterText(_mobileField, '9876543210');
  await tester.testTextInput.receiveAction(TextInputAction.done);
  await tester.pumpAndSettle();
}

ApiRequestException _apiError(int status, String code, String rawMessage) {
  return ApiRequestException(
    ApiError(statusCode: status, code: code, message: rawMessage),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('shows only a masked OTP destination and server countdowns', (
    tester,
  ) async {
    final time = _FakeTimeSource(DateTime.utc(2026, 8, 30, 12));
    final api = _ScriptedOtpApi(
      requestHandler: (_) async => const OtpChallenge(
        challengeId: '00000000-0000-4000-8000-000000000102',
        expiresInSeconds: 125,
        resendAfterSeconds: 35,
      ),
    );
    await _pumpLogin(tester, api: api, time: time);
    await _openOtp(tester);

    expect(find.text('Verify your mobile number'), findsOneWidget);
    expect(find.textContaining('+91 ******3210'), findsOneWidget);
    expect(find.textContaining('+919876543210'), findsNothing);
    expect(find.text('Code expires in 02:05'), findsOneWidget);
    expect(find.text('Resend code in 00:35'), findsOneWidget);
    expect(tester.widget<TextField>(_otpTextField).focusNode!.hasFocus, isTrue);
  });

  testWidgets('OTP field is six-digit, numeric, autofill and paste safe', (
    tester,
  ) async {
    final time = _FakeTimeSource(DateTime.utc(2026));
    final api = _ScriptedOtpApi(requestHandler: (_) async => _firstChallenge);
    await _pumpLogin(tester, api: api, time: time);
    await _openOtp(tester);

    final field = tester.widget<TextField>(_otpTextField);
    expect(field.maxLength, 6);
    expect(field.keyboardType, TextInputType.number);
    expect(field.autofillHints, contains(AutofillHints.oneTimeCode));
    expect(field.inputFormatters, hasLength(2));
    expect(field.inputFormatters!.first, isA<FilteringTextInputFormatter>());
    expect(
      field.inputFormatters!.last,
      isA<LengthLimitingTextInputFormatter>(),
    );

    await tester.enterText(_otpField, '12a34 567890');
    expect(tester.widget<TextField>(_otpTextField).controller!.text, '123456');
  });

  testWidgets('empty and short OTP input stay local with clear guidance', (
    tester,
  ) async {
    final time = _FakeTimeSource(DateTime.utc(2026));
    final api = _ScriptedOtpApi(requestHandler: (_) async => _firstChallenge);
    await _pumpLogin(tester, api: api, time: time);
    await _openOtp(tester);

    await tester.tap(_primary);
    await tester.pump();
    expect(find.text('Enter the complete 6-digit code.'), findsOneWidget);
    expect(api.verifies, isEmpty);

    await tester.enterText(_otpField, '12345');
    await tester.tap(_primary);
    await tester.pump();
    expect(find.text('Enter the complete 6-digit code.'), findsOneWidget);
    expect(api.verifies, isEmpty);
  });

  testWidgets('a long OTP value is rejected before verification', (
    tester,
  ) async {
    final time = _FakeTimeSource(DateTime.utc(2026));
    final api = _ScriptedOtpApi(
      requestHandler: (_) async => const OtpChallenge(
        challengeId: '00000000-0000-4000-8000-000000000103',
        expiresInSeconds: 300,
        resendAfterSeconds: 60,
        debugCode: '1234567',
      ),
    );
    await _pumpLogin(tester, api: api, time: time);
    await _openOtp(tester);

    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();

    expect(find.text('Enter the complete 6-digit code.'), findsOneWidget);
    expect(api.verifies, isEmpty);
  });

  testWidgets('verify shows loading and ignores rapid repeated taps', (
    tester,
  ) async {
    final pending = Completer<AuthSession>();
    final time = _FakeTimeSource(DateTime.utc(2026));
    final api = _ScriptedOtpApi(
      requestHandler: (_) async => _firstChallenge,
      verifyHandler: (_, _, _) => pending.future,
    );
    await _pumpLogin(tester, api: api, time: time);
    await _openOtp(tester);
    await tester.enterText(_otpField, '123456');

    await tester.tap(_primary);
    await tester.tap(_primary);
    await tester.pump();

    expect(api.verifies, hasLength(1));
    expect(find.text('Checking your secure code…'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(
      tester.widget<ElevatedButton>(find.byType(ElevatedButton)).onPressed,
      isNull,
    );

    pending.complete(_session);
    await tester.pumpAndSettle();
  });

  testWidgets('successful verification uses challenge and installation id', (
    tester,
  ) async {
    final time = _FakeTimeSource(DateTime.utc(2026));
    final api = _ScriptedOtpApi(requestHandler: (_) async => _firstChallenge);
    final notifier = await _pumpLogin(tester, api: api, time: time);
    await _openOtp(tester);
    await tester.enterText(_otpField, '123456');
    await tester.tap(_primary);
    await tester.pumpAndSettle();

    expect(api.verifies, [
      (
        challengeId: _firstChallenge.challengeId,
        code: '123456',
        deviceId: 'mobile-synthetic-installation',
      ),
    ]);
    expect(notifier.state, same(_session));
  });

  for (final scenario in <({String code, String expected, bool terminal})>[
    (
      code: 'OTP_INCORRECT',
      expected: 'That code isn’t correct. Check it and try again.',
      terminal: false,
    ),
    (
      code: 'OTP_EXPIRED',
      expected: 'This code has expired. Request a new code to continue.',
      terminal: true,
    ),
    (
      code: 'OTP_ATTEMPTS_EXHAUSTED',
      expected: 'Too many incorrect attempts. Request a new code to continue.',
      terminal: true,
    ),
    (
      code: 'OTP_CHALLENGE_INVALID',
      expected:
          'This code can no longer be used. Request a new code to continue.',
      terminal: true,
    ),
  ]) {
    testWidgets('maps ${scenario.code} to safe recovery copy', (tester) async {
      final time = _FakeTimeSource(DateTime.utc(2026));
      final api = _ScriptedOtpApi(
        requestHandler: (_) async => _firstChallenge,
        verifyHandler: (_, _, _) async => throw _apiError(
          401,
          scenario.code,
          'raw internal challenge and provider detail',
        ),
      );
      await _pumpLogin(tester, api: api, time: time);
      await _openOtp(tester);
      await tester.enterText(_otpField, '123456');
      await tester.tap(_primary);
      await tester.pump();

      expect(find.text(scenario.expected), findsOneWidget);
      expect(find.textContaining('raw internal'), findsNothing);
      expect(
        find.text(
          scenario.terminal ? 'Request new code' : 'Verify and continue',
        ),
        findsOneWidget,
      );
    });
  }

  testWidgets('maps offline and unknown verification failures safely', (
    tester,
  ) async {
    var offline = true;
    final time = _FakeTimeSource(DateTime.utc(2026));
    final api = _ScriptedOtpApi(
      requestHandler: (_) async => _firstChallenge,
      verifyHandler: (_, _, _) async => throw offline
          ? _apiError(0, 'NETWORK_ERROR', 'SocketException private host')
          : _apiError(500, 'INTERNAL_ERROR', 'stack trace and secret'),
    );
    await _pumpLogin(tester, api: api, time: time);
    await _openOtp(tester);
    await tester.enterText(_otpField, '123456');

    await tester.tap(_primary);
    await tester.pump();
    expect(
      find.text(
        'You appear to be offline. Check your connection and try again.',
      ),
      findsOneWidget,
    );
    expect(find.textContaining('SocketException'), findsNothing);

    offline = false;
    await tester.tap(_primary);
    await tester.pump();
    expect(
      find.text('We couldn’t verify the code right now. Please try again.'),
      findsOneWidget,
    );
    expect(find.textContaining('stack trace'), findsNothing);
  });

  testWidgets('resend follows server deadline and replaces local challenge', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    final time = _FakeTimeSource(DateTime.utc(2026));
    var requestIndex = 0;
    final api = _ScriptedOtpApi(
      requestHandler: (_) async {
        requestIndex += 1;
        return OtpChallenge(
          challengeId: '00000000-0000-4000-8000-00000000010$requestIndex',
          expiresInSeconds: 300,
          resendAfterSeconds: requestIndex == 1 ? 2 : 60,
        );
      },
      verifyHandler: (_, _, _) async =>
          throw _apiError(401, 'OTP_INCORRECT', 'raw detail'),
    );
    await _pumpLogin(tester, api: api, time: time);
    await _openOtp(tester);
    expect(
      tester.widget<TextButton>(find.byType(TextButton).first).onPressed,
      isNull,
    );

    await tester.enterText(_otpField, '123456');
    await tester.tap(_primary);
    await tester.pump();
    expect(find.textContaining('isn’t correct'), findsOneWidget);

    time.advance(const Duration(seconds: 2));
    await tester.pump();
    expect(find.text('Resend code'), findsOneWidget);
    final resendAvailable = tester.getSemantics(
      find.byKey(const ValueKey('customer-otp-resend-available')),
    );
    expect(resendAvailable.flagsCollection.isLiveRegion, isTrue);
    await tester.tap(_resend);
    await tester.pumpAndSettle();

    expect(api.requests, hasLength(2));
    expect(tester.widget<TextField>(_otpTextField).controller!.text, isEmpty);
    expect(tester.widget<TextField>(_otpTextField).focusNode!.hasFocus, isTrue);
    expect(find.textContaining('isn’t correct'), findsNothing);
    await tester.enterText(_otpField, '654321');
    await tester.tap(_primary);
    await tester.pump();
    expect(api.verifies.last.challengeId, endsWith('102'));
    semantics.dispose();
  });

  testWidgets('resend loading blocks duplicate taps', (tester) async {
    final pending = Completer<OtpChallenge>();
    final time = _FakeTimeSource(DateTime.utc(2026));
    var first = true;
    final api = _ScriptedOtpApi(
      requestHandler: (_) {
        if (first) {
          first = false;
          return Future.value(
            const OtpChallenge(
              challengeId: '00000000-0000-4000-8000-000000000111',
              expiresInSeconds: 300,
              resendAfterSeconds: 0,
            ),
          );
        }
        return pending.future;
      },
    );
    await _pumpLogin(tester, api: api, time: time);
    await _openOtp(tester);

    await tester.tap(_resend);
    await tester.tap(_resend);
    await tester.pump();
    expect(api.requests, hasLength(2));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    pending.complete(_firstChallenge);
    await tester.pumpAndSettle();
  });

  testWidgets('rate-limited resend preserves the current code path', (
    tester,
  ) async {
    final time = _FakeTimeSource(DateTime.utc(2026));
    var first = true;
    final api = _ScriptedOtpApi(
      requestHandler: (_) async {
        if (first) {
          first = false;
          return const OtpChallenge(
            challengeId: '00000000-0000-4000-8000-000000000112',
            expiresInSeconds: 300,
            resendAfterSeconds: 0,
          );
        }
        throw _apiError(429, 'OTP_RESEND_COOLDOWN', 'private retry detail');
      },
    );
    await _pumpLogin(tester, api: api, time: time);
    await _openOtp(tester);
    await tester.tap(_resend);
    await tester.pump();

    expect(
      find.text('Please wait before requesting another code.'),
      findsOneWidget,
    );
    expect(find.text('Verify and continue'), findsOneWidget);
    expect(find.textContaining('private retry'), findsNothing);
  });

  testWidgets('ambiguous resend failure requires a fresh-code recovery', (
    tester,
  ) async {
    final time = _FakeTimeSource(DateTime.utc(2026));
    var first = true;
    final api = _ScriptedOtpApi(
      requestHandler: (_) async {
        if (first) {
          first = false;
          return const OtpChallenge(
            challengeId: '00000000-0000-4000-8000-000000000113',
            expiresInSeconds: 300,
            resendAfterSeconds: 0,
          );
        }
        throw _apiError(0, 'NETWORK_ERROR', 'raw socket detail');
      },
    );
    await _pumpLogin(tester, api: api, time: time);
    await _openOtp(tester);
    await tester.tap(_resend);
    await tester.pump();

    expect(find.text('Request new code'), findsOneWidget);
    expect(tester.widget<TextField>(_otpTextField).enabled, isFalse);
    expect(find.textContaining('raw socket'), findsNothing);
  });

  testWidgets('local expiry disables verify and offers new-code recovery', (
    tester,
  ) async {
    final time = _FakeTimeSource(DateTime.utc(2026));
    final api = _ScriptedOtpApi(
      requestHandler: (_) async => const OtpChallenge(
        challengeId: '00000000-0000-4000-8000-000000000114',
        expiresInSeconds: 2,
        resendAfterSeconds: 1,
      ),
    );
    await _pumpLogin(tester, api: api, time: time);
    await _openOtp(tester);
    time.advance(const Duration(seconds: 2));
    await tester.pump();

    expect(
      find.text('This code has expired. Request a new code to continue.'),
      findsOneWidget,
    );
    expect(find.text('Request new code'), findsOneWidget);
    expect(tester.widget<TextField>(_otpTextField).enabled, isFalse);
    expect(api.verifies, isEmpty);
  });

  testWidgets('resume recalculates deadlines after background time', (
    tester,
  ) async {
    final time = _FakeTimeSource(DateTime.utc(2026));
    final api = _ScriptedOtpApi(
      requestHandler: (_) async => const OtpChallenge(
        challengeId: '00000000-0000-4000-8000-000000000115',
        expiresInSeconds: 5,
        resendAfterSeconds: 3,
      ),
    );
    await _pumpLogin(tester, api: api, time: time);
    await _openOtp(tester);
    time.advance(const Duration(seconds: 6), tick: false);

    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pump();

    expect(find.text('Request new code'), findsOneWidget);
    expect(find.textContaining('expired'), findsOneWidget);
  });

  testWidgets('use different number clears challenge and cancels ticker', (
    tester,
  ) async {
    final time = _FakeTimeSource(DateTime.utc(2026));
    final api = _ScriptedOtpApi(requestHandler: (_) async => _firstChallenge);
    await _pumpLogin(tester, api: api, time: time);
    await _openOtp(tester);
    final activeTicker = time.tickers.last;
    await tester.enterText(_otpField, '123456');

    await tester.tap(_changeNumber);
    await tester.pump();

    expect(_mobileField, findsOneWidget);
    expect(_otpField, findsNothing);
    expect(activeTicker.cancelled, isTrue);
  });

  testWidgets('timer is cancelled when the authentication screen disposes', (
    tester,
  ) async {
    final time = _FakeTimeSource(DateTime.utc(2026));
    final api = _ScriptedOtpApi(requestHandler: (_) async => _firstChallenge);
    await _pumpLogin(tester, api: api, time: time);
    await _openOtp(tester);
    final activeTicker = time.tickers.last;

    await tester.pumpWidget(const SizedBox.shrink());

    expect(activeTicker.cancelled, isTrue);
  });

  testWidgets('OTP controls are accessible and survive large text', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    final time = _FakeTimeSource(DateTime.utc(2026));
    final api = _ScriptedOtpApi(requestHandler: (_) async => _firstChallenge);
    await _pumpLogin(
      tester,
      api: api,
      time: time,
      textScale: 2,
      size: const Size(320, 568),
    );
    await _openOtp(tester);

    expect(tester.takeException(), isNull);
    await tester.ensureVisible(_primary);
    await tester.pump();
    expect(_primary, findsOneWidget);
    expect(tester.getSize(_primary).height, greaterThanOrEqualTo(44));
    await tester.ensureVisible(_changeNumber);
    await tester.pump();
    expect(tester.getSize(_changeNumber).height, greaterThanOrEqualTo(44));
    final errorSemantics = find.byKey(const ValueKey('customer-auth-error'));
    await tester.enterText(_otpField, '123');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();
    expect(
      tester.getSemantics(errorSemantics).flagsCollection.isLiveRegion,
      isTrue,
    );
    semantics.dispose();
  });
}
