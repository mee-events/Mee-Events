import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mee_events/api/api_client.dart';
import 'package:mee_events/api/mobile_api.dart';
import 'package:mee_events/config/environment.dart';
import 'package:mee_events/features/auth/customer_private_data_cleaner.dart';
import 'package:mee_events/models/api_error.dart';
import 'package:mee_events/models/auth_session.dart';

const _sessionStorageKey = 'mee_events.auth_session.v3';
const _versionTwoSessionStorageKey = 'mee_events.auth_session.v2';
const _legacySessionStorageKey = 'mee_events.auth_session.v1';

abstract class AuthSessionStore {
  Future<String?> read();
  Future<void> write(String value);
  Future<void> delete();
}

class SecureAuthSessionStore implements AuthSessionStore {
  SecureAuthSessionStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  @override
  Future<String?> read() async {
    return await _storage.read(key: _sessionStorageKey) ??
        await _storage.read(key: _versionTwoSessionStorageKey) ??
        _storage.read(key: _legacySessionStorageKey);
  }

  @override
  Future<void> write(String value) async {
    await _storage.write(key: _sessionStorageKey, value: value);
    await _storage.delete(key: _versionTwoSessionStorageKey);
    await _storage.delete(key: _legacySessionStorageKey);
  }

  @override
  Future<void> delete() async {
    await _storage.delete(key: _sessionStorageKey);
    await _storage.delete(key: _versionTwoSessionStorageKey);
    await _storage.delete(key: _legacySessionStorageKey);
  }
}

class MemoryAuthSessionStore implements AuthSessionStore {
  MemoryAuthSessionStore({String? initialValue}) : value = initialValue;

  String? value;

  @override
  Future<String?> read() async => value;

  @override
  Future<void> write(String next) async {
    value = next;
  }

  @override
  Future<void> delete() async {
    value = null;
  }
}

enum SessionRestoreOutcome { authenticated, signedOut, temporarilyUnavailable }

enum SessionLogoutOutcome {
  serverRevoked,
  serverUnavailable,
  localCleanupFailed,
}

enum SessionNotice { ended }

final sessionNoticeProvider = StateProvider<SessionNotice?>((ref) => null);

final customerPrivateDataCleanerProvider = Provider<CustomerPrivateDataCleaner>(
  (ref) => SharedPreferencesCustomerPrivateDataCleaner(),
);

/// The active in-memory device session, or null when signed out/restoring.
/// Only the refresh token and minimum account metadata are persisted securely.
final sessionProvider = StateNotifierProvider<SessionNotifier, AuthSession?>((
  ref,
) {
  return SessionNotifier(
    (refreshToken) {
      return MobileApi(
        apiClient: ApiClient(baseUrl: Environment.apiBaseUrl),
      ).refreshSession(refreshToken);
    },
    privateDataCleaner: ref.read(customerPrivateDataCleanerProvider),
    onSessionEnded: () {
      ref.read(sessionNoticeProvider.notifier).state = SessionNotice.ended;
    },
    onSessionActive: () {
      ref.read(sessionNoticeProvider.notifier).state = null;
    },
  );
});

/// Performs startup restoration before AppGateway may render a private surface.
final sessionRestoreProvider = FutureProvider<SessionRestoreOutcome>((ref) {
  return ref.read(sessionProvider.notifier).restore();
});

/// Account id used for local customer caches. Token refresh does not change it.
final sessionUserIdProvider = Provider<String?>((ref) {
  return ref.watch(sessionProvider.select((session) => session?.userId));
});

typedef SessionRefresher = Future<SessionTokens> Function(String refreshToken);
typedef SessionClock = DateTime Function();

class SessionNotifier extends StateNotifier<AuthSession?> {
  SessionNotifier(
    this._refreshSession, {
    AuthSessionStore? store,
    CustomerPrivateDataCleaner? privateDataCleaner,
    SessionClock? clock,
    this.onSessionEnded,
    this.onSessionActive,
  }) : _store = store ?? SecureAuthSessionStore(),
       _privateDataCleaner =
           privateDataCleaner ?? MemoryCustomerPrivateDataCleaner(),
       _clock = clock ?? DateTime.now,
       super(null);

  final SessionRefresher _refreshSession;
  final AuthSessionStore _store;
  final CustomerPrivateDataCleaner _privateDataCleaner;
  final SessionClock _clock;
  final void Function()? onSessionEnded;
  final void Function()? onSessionActive;
  Future<String?>? _refreshInFlight;
  AuthSessionSnapshot? _refreshInFlightSnapshot;
  Future<SessionRestoreOutcome>? _restoreInFlight;
  Future<void> _mutationQueue = Future<void>.value();
  int _lifecycleRevision = 0;
  int _sessionGeneration = 0;

  Future<SessionRestoreOutcome> restore() {
    final active = _restoreInFlight;
    if (active != null) return active;

    final restore = _restore();
    _restoreInFlight = restore;
    return restore.whenComplete(() {
      if (identical(_restoreInFlight, restore)) {
        _restoreInFlight = null;
      }
    });
  }

  Future<SessionRestoreOutcome> _restore() async {
    final current = state;
    if (current != null && current.hasUsableAccessToken(_clock())) {
      onSessionActive?.call();
      return SessionRestoreOutcome.authenticated;
    }

    if (current != null) {
      try {
        await refreshAccessToken(expectedSession: current.snapshot);
        return state == null
            ? SessionRestoreOutcome.signedOut
            : SessionRestoreOutcome.authenticated;
      } on ApiRequestException catch (error) {
        return _isTerminalRefreshError(error)
            ? SessionRestoreOutcome.signedOut
            : SessionRestoreOutcome.temporarilyUnavailable;
      } catch (_) {
        return SessionRestoreOutcome.temporarilyUnavailable;
      }
    }

    final requestedLifecycleRevision = _lifecycleRevision;
    String? raw;
    try {
      raw = await _store.read();
    } catch (_) {
      return SessionRestoreOutcome.temporarilyUnavailable;
    }
    if (raw == null) return SessionRestoreOutcome.signedOut;
    if (raw.trim().isEmpty) {
      await _deleteStoredSessionBestEffort();
      return SessionRestoreOutcome.signedOut;
    }

    StoredAuthSession stored;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) {
        throw const FormatException('Stored session must be an object');
      }
      stored = StoredAuthSession.fromJson(decoded);
    } catch (_) {
      final candidateUserId = _candidateUserId(raw);
      await _deleteStoredSessionBestEffort();
      if (candidateUserId != null) {
        await _clearPrivateDataBestEffort(candidateUserId);
      }
      return SessionRestoreOutcome.signedOut;
    }

    try {
      final tokens = await _refreshSession(stored.refreshToken);
      final restored = stored.withTokens(tokens, _clock());
      return _serialize(() async {
        if (_lifecycleRevision != requestedLifecycleRevision || state != null) {
          return state == null
              ? SessionRestoreOutcome.signedOut
              : SessionRestoreOutcome.authenticated;
        }
        final next = restored.withSessionGeneration(++_sessionGeneration);
        try {
          await _store.write(jsonEncode(next.toStorageJson()));
        } catch (_) {
          await _terminateSessionUnlocked(stored.userId);
          return SessionRestoreOutcome.signedOut;
        }
        if (mounted) state = next;
        onSessionActive?.call();
        return SessionRestoreOutcome.authenticated;
      });
    } on ApiRequestException catch (error) {
      if (_isTerminalRefreshError(error)) {
        return _serialize(() async {
          if (_lifecycleRevision == requestedLifecycleRevision &&
              state == null) {
            await _terminateSessionUnlocked(stored.userId);
            return SessionRestoreOutcome.signedOut;
          }
          return state == null
              ? SessionRestoreOutcome.signedOut
              : SessionRestoreOutcome.authenticated;
        });
      }
      return SessionRestoreOutcome.temporarilyUnavailable;
    } catch (_) {
      return SessionRestoreOutcome.temporarilyUnavailable;
    }
  }

  Future<void> signIn(AuthSession session) {
    return _serialize(() async {
      final previousUserId = state?.userId;
      final next = session.withSessionGeneration(++_sessionGeneration);
      _lifecycleRevision += 1;
      await _store.write(jsonEncode(next.toStorageJson()));
      if (previousUserId != null && previousUserId != next.userId) {
        try {
          await _privateDataCleaner.clearForUser(previousUserId);
        } catch (_) {
          await _deleteStoredSessionBestEffort();
          if (mounted) state = null;
          rethrow;
        }
      }
      if (mounted) state = next;
      onSessionActive?.call();
    });
  }

  Future<bool> applySwitchedRole(
    SwitchRoleResult result, {
    AuthSessionSnapshot? expectedSession,
  }) {
    final requested = expectedSession ?? state?.snapshot;
    if (requested == null) return Future<bool>.value(false);
    return _serialize(() async {
      final current = state;
      if (!requested.hasSameSession(current)) return false;
      if (result.sessionId != requested.sessionId) {
        await _terminateSessionUnlocked(current!.userId);
        throw _sessionEndedException();
      }
      if (!requested.hasSameRole(current)) {
        if (current!.lastActiveRole == result.activeRole) return true;
        await _terminateSessionUnlocked(current.userId);
        return false;
      }

      final switched = current!.withSwitchedRole(result, now: _clock());
      try {
        await _store.write(jsonEncode(switched.toStorageJson()));
      } catch (_) {
        // The server already changed this session's role. Keep memory aligned;
        // a restart will use the still-valid refresh token to reconcile again.
        if (mounted) state = switched;
        onSessionActive?.call();
        rethrow;
      }
      if (mounted) state = switched;
      onSessionActive?.call();
      return true;
    });
  }

  Future<void> signOut() => _clearLocalSession();

  Future<void> signOutLocally() => _clearLocalSession();

  Future<SessionLogoutOutcome> logoutCurrent(MobileApi api) async {
    final requested = state?.snapshot;
    if (requested == null) return SessionLogoutOutcome.serverRevoked;
    try {
      await api.logout();
    } catch (_) {
      return SessionLogoutOutcome.serverUnavailable;
    }
    try {
      await _serialize(() async {
        if (requested.hasSameSession(state)) {
          await _clearLocalSessionUnlocked();
        }
      });
      return SessionLogoutOutcome.serverRevoked;
    } catch (_) {
      return SessionLogoutOutcome.localCleanupFailed;
    }
  }

  Future<SessionLogoutOutcome> logoutAll(MobileApi api) async {
    final requested = state?.snapshot;
    if (requested == null) return SessionLogoutOutcome.serverRevoked;
    try {
      await api.logoutAll();
    } catch (_) {
      return SessionLogoutOutcome.serverUnavailable;
    }
    try {
      await _serialize(() async {
        if (requested.hasSameSession(state)) {
          await _clearLocalSessionUnlocked();
        }
      });
      return SessionLogoutOutcome.serverRevoked;
    } catch (_) {
      return SessionLogoutOutcome.localCleanupFailed;
    }
  }

  /// Rotates once even when several protected requests fail together.
  Future<String?> refreshAccessToken({AuthSessionSnapshot? expectedSession}) {
    final current = state;
    if (current == null) return Future<String?>.value(null);
    if (expectedSession != null) {
      if (!expectedSession.hasSameRole(current)) {
        return Future<String?>.value(null);
      }
      if (current.tokenRevision > expectedSession.tokenRevision) {
        return Future<String?>.value(current.accessToken);
      }
    }
    final requested = current.snapshot;
    final activeRefresh = _refreshInFlight;
    if (activeRefresh != null) {
      final activeSnapshot = _refreshInFlightSnapshot;
      if (activeSnapshot != null &&
          activeSnapshot.sessionId == requested.sessionId &&
          activeSnapshot.sessionGeneration == requested.sessionGeneration &&
          activeSnapshot.roleRevision == requested.roleRevision) {
        return activeRefresh;
      }
      return _afterUnrelatedRefresh(
        activeRefresh,
        expectedSession ?? requested,
      );
    }

    final refresh = _refreshAccessToken(requested, current.refreshToken);
    _refreshInFlight = refresh;
    _refreshInFlightSnapshot = requested;
    return refresh.whenComplete(() {
      if (identical(_refreshInFlight, refresh)) {
        _refreshInFlight = null;
        _refreshInFlightSnapshot = null;
      }
    });
  }

  Future<String?> _refreshAccessToken(
    AuthSessionSnapshot requested,
    String refreshToken,
  ) async {
    try {
      final tokens = await _refreshSession(refreshToken);
      return _serialize(() async {
        final current = state;
        if (!requested.hasSameSession(current)) return null;
        if (tokens.sessionId != requested.sessionId) {
          await _terminateSessionUnlocked(current!.userId);
          throw _sessionEndedException();
        }

        final AuthSession refreshed;
        if (requested.hasSameRole(current) ||
            tokens.activeRole == current!.lastActiveRole) {
          refreshed = current!.withRefreshedTokens(tokens, now: _clock());
        } else {
          // A role switch won locally after this refresh began. Preserve its
          // role-bound access token while retaining the rotated refresh token.
          refreshed = current.withRotatedRefreshToken(tokens.refreshToken);
        }
        try {
          await _store.write(jsonEncode(refreshed.toStorageJson()));
        } catch (_) {
          await _terminateSessionUnlocked(current.userId);
          throw _sessionEndedException();
        }
        if (mounted) state = refreshed;
        onSessionActive?.call();
        return refreshed.accessToken;
      });
    } on ApiRequestException catch (error) {
      if (error.error.code == 'SESSION_ENDED') rethrow;
      if (_isTerminalRefreshError(error)) {
        await _serialize(() async {
          final current = state;
          if (requested.hasSameSession(current)) {
            await _terminateSessionUnlocked(current!.userId);
          }
        });
        throw _sessionEndedException();
      }
      rethrow;
    }
  }

  Future<void> handleRejectedAccessToken({
    AuthSessionSnapshot? expectedSession,
  }) {
    final requested = expectedSession ?? state?.snapshot;
    if (requested == null) return Future<void>.value();
    return _serialize(() async {
      final current = state;
      if (requested.hasSameRole(current) &&
          requested.tokenRevision == current!.tokenRevision) {
        await _terminateSessionUnlocked(current.userId);
      }
    });
  }

  Future<String?> _afterUnrelatedRefresh(
    Future<String?> active,
    AuthSessionSnapshot? expectedSession,
  ) async {
    try {
      await active;
    } catch (_) {
      // The unrelated session decides its own outcome. Re-check this caller's
      // stable snapshot after it settles.
    }
    return refreshAccessToken(expectedSession: expectedSession);
  }

  Future<void> _clearLocalSession() {
    return _serialize(_clearLocalSessionUnlocked);
  }

  Future<void> _clearLocalSessionUnlocked() async {
    _lifecycleRevision += 1;
    final userId = state?.userId;
    if (mounted) state = null;
    onSessionActive?.call();
    Object? firstError;
    try {
      await _store.delete();
    } catch (error) {
      firstError = error;
    }
    if (userId != null) {
      try {
        await _privateDataCleaner.clearForUser(userId);
      } catch (error) {
        firstError ??= error;
      }
    }
    if (firstError != null) throw firstError;
  }

  Future<void> _terminateSessionUnlocked(String userId) async {
    _lifecycleRevision += 1;
    if (mounted) state = null;
    onSessionEnded?.call();
    await _deleteStoredSessionBestEffort();
    await _clearPrivateDataBestEffort(userId);
  }

  Future<void> _deleteStoredSessionBestEffort() async {
    try {
      await _store.delete();
    } catch (_) {
      // A later restore revalidates any residual refresh token before a
      // private surface can render.
    }
  }

  Future<void> _clearPrivateDataBestEffort(String userId) async {
    try {
      await _privateDataCleaner.clearForUser(userId);
    } catch (_) {
      // Provider state still drops with the session. Persistent data remains
      // account-scoped and explicit sign-out can retry cleanup.
    }
  }

  Future<T> _serialize<T>(Future<T> Function() mutation) {
    final completer = Completer<T>();
    _mutationQueue = _mutationQueue.then((_) async {
      try {
        completer.complete(await mutation());
      } catch (error, stackTrace) {
        completer.completeError(error, stackTrace);
      }
    });
    return completer.future;
  }
}

bool _isTerminalRefreshError(ApiRequestException error) {
  return error.error.statusCode == 401 ||
      const {
        'SESSION_REFRESH_INVALID',
        'SESSION_REFRESH_REUSED',
        'SESSION_NOT_ACTIVE',
      }.contains(error.error.code);
}

ApiRequestException _sessionEndedException() {
  return const ApiRequestException(
    ApiError(
      statusCode: 401,
      code: 'SESSION_ENDED',
      message: 'Your session has ended. Please sign in again to continue.',
    ),
  );
}

String? _candidateUserId(String raw) {
  try {
    final decoded = jsonDecode(raw);
    if (decoded is! Map<String, dynamic>) return null;
    final value = decoded['userId'];
    if (value is! String || value.trim().isEmpty || value.length > 512) {
      return null;
    }
    return value;
  } catch (_) {
    return null;
  }
}

/// API bound to the current session token (or anonymous when signed out).
final mobileApiProvider = Provider<MobileApi>((ref) {
  final session = ref.watch(sessionProvider);
  final notifier = ref.read(sessionProvider.notifier);
  final requested = session?.snapshot;
  return MobileApi(
    apiClient: ApiClient(
      baseUrl: Environment.apiBaseUrl,
      accessToken: session?.accessToken,
      refreshAccessToken: requested == null
          ? null
          : () => notifier.refreshAccessToken(expectedSession: requested),
      onAccessTokenRejected: requested == null
          ? null
          : () =>
                notifier.handleRejectedAccessToken(expectedSession: requested),
    ),
  );
});

/// The customer's live enquiries; refreshed after each submission.
final enquiriesProvider = FutureProvider.autoDispose((ref) async {
  final session = ref.watch(sessionProvider);
  if (session == null) return null;
  return ref.watch(mobileApiProvider).listEnquiries();
});

/// Live quotations visible to the signed-in customer.
final quotationsProvider = FutureProvider.autoDispose((ref) async {
  final session = ref.watch(sessionProvider);
  if (session == null) return null;
  return ref.watch(mobileApiProvider).listQuotations();
});

/// Live bookings for the signed-in customer.
final bookingsProvider = FutureProvider.autoDispose((ref) async {
  final session = ref.watch(sessionProvider);
  if (session == null) return null;
  return ref.watch(mobileApiProvider).listBookings();
});
