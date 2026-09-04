import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/api/api_client.dart';
import 'package:mee_events/api/mobile_api.dart';
import 'package:mee_events/features/auth/app_gateway.dart';
import 'package:mee_events/features/auth/customer_private_data_cleaner.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/auth/widgets/session_actions.dart';
import 'package:mee_events/features/customer/favorites/favorites_store.dart';
import 'package:mee_events/features/customer/plan/event_plan_store.dart';
import 'package:mee_events/features/customer/screens/customer_dashboard_screen.dart';
import 'package:mee_events/features/customer/search/recent_searches_store.dart';
import 'package:mee_events/models/api_error.dart';
import 'package:mee_events/models/auth_session.dart';
import 'package:mee_events/theme/theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _userOne = 'customer-0001';
const _userTwo = 'customer-0002';
const _refreshOne = 'refresh-token-customer-one-value-000001';
const _refreshTwo = 'refresh-token-customer-two-value-000002';
const _sessionOne = '00000000-0000-4000-8000-000000000101';
const _sessionTwo = '00000000-0000-4000-8000-000000000102';

AuthSession _session({
  String userId = _userOne,
  String refreshToken = _refreshOne,
  String? sessionId,
  DateTime? expiresAt,
}) {
  return AuthSession(
    accessToken: 'access-$userId',
    refreshToken: refreshToken,
    accessTokenExpiresInSeconds: 900,
    accessTokenExpiresAt: expiresAt ?? DateTime.utc(2099),
    sessionId: sessionId ?? (userId == _userOne ? _sessionOne : _sessionTwo),
    userId: userId,
    mobileNumber: userId == _userOne ? '+919876543210' : '+919876543211',
    lastActiveRole: 'customer',
  );
}

SessionTokens _rotated([String suffix = 'one']) {
  return SessionTokens(
    accessToken: 'rotated-access-$suffix',
    refreshToken: 'rotated-refresh-token-value-$suffix-000000000',
    accessTokenExpiresInSeconds: 900,
    sessionId: _sessionOne,
    activeRole: 'customer',
  );
}

ApiRequestException _apiFailure(String code, {int status = 401}) {
  return ApiRequestException(
    ApiError(statusCode: status, code: code, message: 'safe failure'),
  );
}

class _BlockingStore implements AuthSessionStore {
  final Completer<String?> readCompleter = Completer<String?>();
  String? value;

  @override
  Future<String?> read() => readCompleter.future;

  @override
  Future<void> write(String next) async {
    value = next;
  }

  @override
  Future<void> delete() async {
    value = null;
  }
}

class _PartialWriteStore extends MemoryAuthSessionStore {
  bool failAfterWrite = false;

  @override
  Future<void> write(String next) async {
    await super.write(next);
    if (failAfterWrite) {
      throw StateError('synthetic secure-storage write failure');
    }
  }
}

class _FailingDeleteStore extends MemoryAuthSessionStore {
  @override
  Future<void> delete() async {
    throw StateError('synthetic secure-storage delete failure');
  }
}

class _FailingPrivateDataCleaner implements CustomerPrivateDataCleaner {
  @override
  Future<void> clearForUser(String userId) async {
    throw StateError('synthetic private-cache cleanup failure');
  }
}

class _ScriptedLogoutApi extends MobileApi {
  _ScriptedLogoutApi({this.logoutError, this.logoutAllError})
    : super(apiClient: ApiClient(baseUrl: 'http://127.0.0.1.invalid'));

  final Object? logoutError;
  final Object? logoutAllError;
  int logoutCalls = 0;
  int logoutAllCalls = 0;

  @override
  Future<void> logout() async {
    logoutCalls += 1;
    if (logoutError != null) throw logoutError!;
  }

  @override
  Future<void> logoutAll() async {
    logoutAllCalls += 1;
    if (logoutAllError != null) throw logoutAllError!;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('secure restoration', () {
    test(
      'persists only the minimum session and refreshes after restart',
      () async {
        final store = MemoryAuthSessionStore();
        final first = SessionNotifier((_) async => _rotated(), store: store);
        await first.signIn(_session());

        final stored = jsonDecode(store.value!) as Map<String, dynamic>;
        expect(stored['version'], StoredAuthSession.currentVersion);
        expect(stored['refreshToken'], _refreshOne);
        expect(stored, isNot(contains('accessToken')));
        expect(stored, isNot(contains('accessTokenExpiresInSeconds')));

        var refreshCalls = 0;
        final restarted = SessionNotifier((token) async {
          refreshCalls += 1;
          expect(token, _refreshOne);
          return _rotated('restart');
        }, store: store);

        expect(await restarted.restore(), SessionRestoreOutcome.authenticated);
        expect(refreshCalls, 1);
        expect(restarted.state?.accessToken, 'rotated-access-restart');
        expect(restarted.state?.userId, _userOne);
      },
    );

    test(
      'an in-memory unexpired access token restores without refresh',
      () async {
        var refreshCalls = 0;
        final notifier = SessionNotifier((_) async {
          refreshCalls += 1;
          return _rotated();
        }, store: MemoryAuthSessionStore());
        await notifier.signIn(_session());

        expect(await notifier.restore(), SessionRestoreOutcome.authenticated);
        expect(refreshCalls, 0);
      },
    );

    test('empty secure storage returns to authentication', () async {
      final notifier = SessionNotifier(
        (_) async => _rotated(),
        store: MemoryAuthSessionStore(),
      );

      expect(await notifier.restore(), SessionRestoreOutcome.signedOut);
      expect(notifier.state, isNull);
    });

    for (final invalid in <String>[
      '{not-json',
      '{"version":2,"refreshToken":"$_refreshOne"}',
    ]) {
      test('corrupted or partial secure storage is erased: $invalid', () async {
        final store = MemoryAuthSessionStore(initialValue: invalid);
        final notifier = SessionNotifier((_) async => _rotated(), store: store);

        expect(await notifier.restore(), SessionRestoreOutcome.signedOut);
        expect(store.value, isNull);
        expect(notifier.state, isNull);
      });
    }

    test(
      'temporary startup network failure retains the stored session',
      () async {
        final raw = jsonEncode(_session().toStorageJson());
        final store = MemoryAuthSessionStore(initialValue: raw);
        final notifier = SessionNotifier(
          (_) async => throw _apiFailure('NETWORK_ERROR', status: 0),
          store: store,
        );

        expect(
          await notifier.restore(),
          SessionRestoreOutcome.temporarilyUnavailable,
        );
        expect(store.value, raw);
        expect(notifier.state, isNull);
      },
    );

    for (final code in const [
      'SESSION_REFRESH_INVALID',
      'SESSION_REFRESH_REUSED',
      'SESSION_NOT_ACTIVE',
    ]) {
      test('$code ends restoration and clears private state', () async {
        final store = MemoryAuthSessionStore(
          initialValue: jsonEncode(_session().toStorageJson()),
        );
        final cleaner = MemoryCustomerPrivateDataCleaner();
        final notifier = SessionNotifier(
          (_) async => throw _apiFailure(code),
          store: store,
          privateDataCleaner: cleaner,
        );

        expect(await notifier.restore(), SessionRestoreOutcome.signedOut);
        expect(store.value, isNull);
        expect(cleaner.clearedUserIds, [_userOne]);
      });
    }
  });

  group('serialized refresh', () {
    test('concurrent callers share one successful refresh', () async {
      final gate = Completer<SessionTokens>();
      var refreshCalls = 0;
      final notifier = SessionNotifier((_) {
        refreshCalls += 1;
        return gate.future;
      }, store: MemoryAuthSessionStore());
      await notifier.signIn(_session(expiresAt: DateTime.utc(2026, 9, 1)));

      final waiters = List.generate(8, (_) => notifier.refreshAccessToken());
      await Future<void>.delayed(Duration.zero);
      expect(refreshCalls, 1);
      gate.complete(_rotated('shared'));

      expect(
        await Future.wait(waiters),
        List.filled(8, 'rotated-access-shared'),
      );
      expect(refreshCalls, 1);
    });

    test(
      'terminal refresh failure wakes every waiter and clears once',
      () async {
        final gate = Completer<SessionTokens>();
        final cleaner = MemoryCustomerPrivateDataCleaner();
        var refreshCalls = 0;
        final store = MemoryAuthSessionStore();
        final notifier = SessionNotifier(
          (_) {
            refreshCalls += 1;
            return gate.future;
          },
          store: store,
          privateDataCleaner: cleaner,
        );
        await notifier.signIn(_session());

        final waiters = List.generate(
          6,
          (_) => notifier.refreshAccessToken().then(
            (_) => 'unexpected',
            onError: (Object error) =>
                (error as ApiRequestException).error.code,
          ),
        );
        await Future<void>.delayed(Duration.zero);
        gate.completeError(_apiFailure('SESSION_REFRESH_REUSED'));

        expect(await Future.wait(waiters), List.filled(6, 'SESSION_ENDED'));
        expect(refreshCalls, 1);
        expect(notifier.state, isNull);
        expect(store.value, isNull);
        expect(cleaner.clearedUserIds, [_userOne]);
      },
    );

    test(
      'temporary refresh failure wakes every waiter but keeps session',
      () async {
        var refreshCalls = 0;
        final store = MemoryAuthSessionStore();
        final notifier = SessionNotifier((_) async {
          refreshCalls += 1;
          throw _apiFailure('NETWORK_ERROR', status: 0);
        }, store: store);
        await notifier.signIn(_session());

        final waiters = List.generate(
          4,
          (_) => notifier.refreshAccessToken().then(
            (_) => 'unexpected',
            onError: (Object error) =>
                (error as ApiRequestException).error.code,
          ),
        );

        expect(await Future.wait(waiters), List.filled(4, 'NETWORK_ERROR'));
        expect(refreshCalls, 1);
        expect(notifier.state?.userId, _userOne);
        expect(store.value, isNotNull);
      },
    );

    test('partial secure-storage write fails closed and clears once', () async {
      final store = _PartialWriteStore();
      final cleaner = MemoryCustomerPrivateDataCleaner();
      final notifier = SessionNotifier(
        (_) async => _rotated('partial-write'),
        store: store,
        privateDataCleaner: cleaner,
      );
      await notifier.signIn(_session());
      store.failAfterWrite = true;

      await expectLater(
        notifier.refreshAccessToken(),
        throwsA(
          isA<ApiRequestException>().having(
            (error) => error.error.code,
            'code',
            'SESSION_ENDED',
          ),
        ),
      );
      expect(notifier.state, isNull);
      expect(store.value, isNull);
      expect(cleaner.clearedUserIds, [_userOne]);
    });

    test('refresh finishing after logout cannot restore the session', () async {
      final gate = Completer<SessionTokens>();
      final notifier = SessionNotifier(
        (_) => gate.future,
        store: MemoryAuthSessionStore(),
      );
      await notifier.signIn(_session());
      final refresh = notifier.refreshAccessToken();
      await Future<void>.delayed(Duration.zero);
      await notifier.signOutLocally();
      gate.complete(_rotated('after-logout'));

      expect(await refresh, isNull);
      expect(notifier.state, isNull);
    });

    test('refresh for Customer A cannot overwrite Customer B', () async {
      final gate = Completer<SessionTokens>();
      final notifier = SessionNotifier(
        (_) => gate.future,
        store: MemoryAuthSessionStore(),
      );
      await notifier.signIn(_session());
      final refresh = notifier.refreshAccessToken();
      await Future<void>.delayed(Duration.zero);
      await notifier.signIn(
        _session(userId: _userTwo, refreshToken: _refreshTwo),
      );
      gate.complete(_rotated('customer-a-late'));

      expect(await refresh, isNull);
      expect(notifier.state?.userId, _userTwo);
      expect(notifier.state?.accessToken, 'access-$_userTwo');
    });

    test(
      'a refresh response from another server session fails closed',
      () async {
        final notifier = SessionNotifier(
          (_) async => const SessionTokens(
            accessToken: 'wrong-session-access',
            refreshToken: 'wrong-session-refresh-token-value-000000000',
            accessTokenExpiresInSeconds: 900,
            sessionId: '00000000-0000-4000-8000-000000000199',
            activeRole: 'customer',
          ),
          store: MemoryAuthSessionStore(),
        );
        await notifier.signIn(_session());

        await expectLater(
          notifier.refreshAccessToken(),
          throwsA(
            isA<ApiRequestException>().having(
              (error) => error.error.code,
              'code',
              'SESSION_ENDED',
            ),
          ),
        );
        expect(notifier.state, isNull);
      },
    );

    test('old access rejection cannot terminate a replaced session', () async {
      final notifier = SessionNotifier(
        (_) async => _rotated(),
        store: MemoryAuthSessionStore(),
      );
      await notifier.signIn(_session());
      final oldSession = notifier.state!.snapshot;
      await notifier.signIn(
        _session(
          sessionId: '00000000-0000-4000-8000-000000000109',
          refreshToken: 'replacement-refresh-token-value-000000000',
        ),
      );

      await notifier.handleRejectedAccessToken(expectedSession: oldSession);

      expect(notifier.state?.sessionId, '00000000-0000-4000-8000-000000000109');
    });

    test(
      'old access rejection cannot terminate a newer token revision',
      () async {
        final notifier = SessionNotifier(
          (_) async => _rotated('newer'),
          store: MemoryAuthSessionStore(),
        );
        await notifier.signIn(_session());
        final oldToken = notifier.state!.snapshot;
        await notifier.refreshAccessToken(expectedSession: oldToken);

        await notifier.handleRejectedAccessToken(expectedSession: oldToken);

        expect(notifier.state?.accessToken, 'rotated-access-newer');
        expect(notifier.state, isNotNull);
      },
    );
  });

  group('logout and privacy isolation', () {
    test('local cleanup failures never retain authenticated memory', () async {
      final notifier = SessionNotifier(
        (_) async => _rotated(),
        store: _FailingDeleteStore(),
        privateDataCleaner: _FailingPrivateDataCleaner(),
      );
      await notifier.signIn(_session());

      await expectLater(notifier.signOutLocally(), throwsStateError);
      expect(notifier.state, isNull);
    });

    test(
      'current-device logout requires confirmed server revocation',
      () async {
        final cleaner = MemoryCustomerPrivateDataCleaner();
        final notifier = SessionNotifier(
          (_) async => _rotated(),
          store: MemoryAuthSessionStore(),
          privateDataCleaner: cleaner,
        );
        await notifier.signIn(_session());
        final api = _ScriptedLogoutApi();

        expect(
          await notifier.logoutCurrent(api),
          SessionLogoutOutcome.serverRevoked,
        );
        expect(api.logoutCalls, 1);
        expect(notifier.state, isNull);
        expect(cleaner.clearedUserIds, [_userOne]);
      },
    );

    test('server-unavailable logout keeps the local session', () async {
      final store = MemoryAuthSessionStore();
      final notifier = SessionNotifier((_) async => _rotated(), store: store);
      await notifier.signIn(_session());
      final api = _ScriptedLogoutApi(logoutError: StateError('offline'));

      expect(
        await notifier.logoutCurrent(api),
        SessionLogoutOutcome.serverUnavailable,
      );
      expect(notifier.state?.userId, _userOne);
      expect(store.value, isNotNull);
    });

    test(
      'logout-all clears the current local session after server success',
      () async {
        final notifier = SessionNotifier(
          (_) async => _rotated(),
          store: MemoryAuthSessionStore(),
        );
        await notifier.signIn(_session());
        final api = _ScriptedLogoutApi();

        expect(
          await notifier.logoutAll(api),
          SessionLogoutOutcome.serverRevoked,
        );
        expect(api.logoutAllCalls, 1);
        expect(notifier.state, isNull);
      },
    );

    test('failed logout-all leaves the local session active', () async {
      final store = MemoryAuthSessionStore();
      final notifier = SessionNotifier((_) async => _rotated(), store: store);
      await notifier.signIn(_session());
      final api = _ScriptedLogoutApi(
        logoutAllError: StateError('temporarily offline'),
      );

      expect(
        await notifier.logoutAll(api),
        SessionLogoutOutcome.serverUnavailable,
      );
      expect(api.logoutAllCalls, 1);
      expect(notifier.state?.userId, _userOne);
      expect(store.value, isNotNull);
    });

    test('a different customer never inherits the previous cache', () async {
      final cleaner = MemoryCustomerPrivateDataCleaner();
      final notifier = SessionNotifier(
        (_) async => _rotated(),
        store: MemoryAuthSessionStore(),
        privateDataCleaner: cleaner,
      );
      await notifier.signIn(_session());
      await notifier.signIn(
        _session(userId: _userTwo, refreshToken: _refreshTwo),
      );

      expect(cleaner.clearedUserIds, [_userOne]);
      expect(notifier.state?.userId, _userTwo);
    });

    test(
      'customer cache cleanup preserves another account and safe preferences',
      () async {
        SharedPreferences.setMockInitialValues({
          favoritesStorageKey(_userOne): <String>['private-one'],
          recentSearchesStorageKey(_userOne): <String>['private-one'],
          eventPlanStorageKey(_userOne): <String>['private-one'],
          favoritesStorageKey(_userTwo): <String>['private-two'],
          'mee_events.safe.theme': 'system',
        });
        final prefs = await SharedPreferences.getInstance();
        final cleaner = SharedPreferencesCustomerPrivateDataCleaner(
          preferences: prefs,
        );

        await cleaner.clearForUser(_userOne);

        expect(prefs.containsKey(favoritesStorageKey(_userOne)), isFalse);
        expect(prefs.containsKey(recentSearchesStorageKey(_userOne)), isFalse);
        expect(prefs.containsKey(eventPlanStorageKey(_userOne)), isFalse);
        expect(prefs.getStringList(favoritesStorageKey(_userTwo)), [
          'private-two',
        ]);
        expect(prefs.getString('mee_events.safe.theme'), 'system');
      },
    );
  });

  group('session UI', () {
    testWidgets('logout-all confirmation can be cancelled without a call', (
      tester,
    ) async {
      final notifier = SessionNotifier(
        (_) async => _rotated(),
        store: MemoryAuthSessionStore(),
      );
      await notifier.signIn(_session());
      final api = _ScriptedLogoutApi();
      await _pumpActions(tester, notifier, api);

      await tester.tap(find.text('Log out from all devices'));
      await tester.pumpAndSettle();
      expect(find.text('Log out from all devices?'), findsOneWidget);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      expect(api.logoutAllCalls, 0);
      expect(notifier.state?.userId, _userOne);
    });

    testWidgets('logout-all confirmation revokes and clears the device', (
      tester,
    ) async {
      final notifier = SessionNotifier(
        (_) async => _rotated(),
        store: MemoryAuthSessionStore(),
      );
      await notifier.signIn(_session());
      final api = _ScriptedLogoutApi();
      await _pumpActions(tester, notifier, api);

      await tester.tap(find.text('Log out from all devices'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Log out everywhere'));
      await tester.pumpAndSettle();

      expect(api.logoutAllCalls, 1);
      expect(notifier.state, isNull);
    });

    testWidgets('offline device logout offers an explicit local-only choice', (
      tester,
    ) async {
      final notifier = SessionNotifier(
        (_) async => _rotated(),
        store: MemoryAuthSessionStore(),
      );
      await notifier.signIn(_session());
      final api = _ScriptedLogoutApi(logoutError: StateError('offline'));
      await _pumpActions(tester, notifier, api);

      await tester.tap(find.text('Log out from this device'));
      await tester.pumpAndSettle();
      expect(find.text('Could not confirm server logout'), findsOneWidget);
      expect(notifier.state?.userId, _userOne);
      await tester.tap(find.text('Sign out on this device'));
      await tester.pumpAndSettle();

      expect(api.logoutCalls, 1);
      expect(notifier.state, isNull);
    });

    testWidgets(
      'gateway never flashes an authenticated surface while restoring',
      (tester) async {
        tester.view.physicalSize = const Size(1170, 2532);
        tester.view.devicePixelRatio = 3;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final store = _BlockingStore();
        final notifier = SessionNotifier((_) async => _rotated(), store: store);
        await tester.pumpWidget(
          ProviderScope(
            overrides: [sessionProvider.overrideWith((ref) => notifier)],
            child: MaterialApp(
              theme: AppTheme.light,
              home: const AppGateway(launchDelay: Duration.zero),
            ),
          ),
        );
        await tester.pump(const Duration(milliseconds: 1));

        expect(find.text('Mee Events'), findsOneWidget);
        expect(find.byType(CustomerDashboardScreen), findsNothing);
        await tester.pumpWidget(const SizedBox.shrink());
        store.readCompleter.complete(null);
        await tester.pump();
      },
    );

    testWidgets('session-ended surface has calm accessible sign-in wording', (
      tester,
    ) async {
      final semantics = tester.ensureSemantics();
      final notifier = SessionNotifier(
        (_) async => _rotated(),
        store: MemoryAuthSessionStore(),
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sessionProvider.overrideWith((ref) => notifier),
            sessionRestoreProvider.overrideWith(
              (ref) async => SessionRestoreOutcome.signedOut,
            ),
            sessionNoticeProvider.overrideWith((ref) => SessionNotice.ended),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const AppGateway(launchDelay: Duration.zero),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Your session has ended.'), findsOneWidget);
      expect(find.text('Please sign in again to continue.'), findsOneWidget);
      expect(find.text('Sign in'), findsOneWidget);
      expect(
        tester.getSemantics(find.text('Sign in')).label,
        contains('Sign in'),
      );
      semantics.dispose();
    });
  });
}

Future<void> _pumpActions(
  WidgetTester tester,
  SessionNotifier notifier,
  MobileApi api,
) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        sessionProvider.overrideWith((ref) => notifier),
        mobileApiProvider.overrideWithValue(api),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: Padding(padding: EdgeInsets.all(24), child: SessionActions()),
        ),
      ),
    ),
  );
  await tester.pump();
}
