import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mee_events/api/api_client.dart';
import 'package:mee_events/api/mobile_api.dart';
import 'package:mee_events/config/environment.dart';
import 'package:mee_events/models/auth_session.dart';

const _sessionStorageKey = 'mee_events.auth_session.v1';

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
  Future<String?> read() => _storage.read(key: _sessionStorageKey);

  @override
  Future<void> write(String value) {
    return _storage.write(key: _sessionStorageKey, value: value);
  }

  @override
  Future<void> delete() => _storage.delete(key: _sessionStorageKey);
}

class MemoryAuthSessionStore implements AuthSessionStore {
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

/// The active device session, or null when signed out.
/// Persisted via secure storage so restarts keep the customer logged in.
final sessionProvider = StateNotifierProvider<SessionNotifier, AuthSession?>((
  ref,
) {
  final notifier = SessionNotifier((refreshToken) {
    return MobileApi(
      apiClient: ApiClient(baseUrl: Environment.apiBaseUrl),
    ).refreshSession(refreshToken);
  });
  unawaited(notifier.restore());
  return notifier;
});

/// Account id used for local customer caches. Token refresh does not change it.
final sessionUserIdProvider = Provider<String?>((ref) {
  return ref.watch(sessionProvider.select((session) => session?.userId));
});

typedef SessionRefresher = Future<SessionTokens> Function(String refreshToken);

class SessionNotifier extends StateNotifier<AuthSession?> {
  SessionNotifier(this._refreshSession, {AuthSessionStore? store})
    : _store = store ?? SecureAuthSessionStore(),
      super(null);

  final SessionRefresher _refreshSession;
  final AuthSessionStore _store;
  final Completer<void> _restoreCompleter = Completer<void>();
  Future<String?>? _refreshInFlight;
  bool _restored = false;

  bool get isRestored => _restored;
  Future<void> get restored => _restoreCompleter.future;

  Future<void> restore() async {
    try {
      final raw = await _store.read();
      if (raw != null && raw.isNotEmpty) {
        final decoded = jsonDecode(raw);
        if (decoded is Map<String, dynamic>) {
          state = AuthSession.fromJson(decoded);
        }
      }
    } catch (_) {
      await _store.delete();
      state = null;
    } finally {
      _restored = true;
      if (!_restoreCompleter.isCompleted) {
        _restoreCompleter.complete();
      }
    }
  }

  Future<void> signIn(AuthSession session) async {
    await _store.write(jsonEncode(session.toStorageJson()));
    state = session;
  }

  Future<void> applySwitchedRole(SwitchRoleResult result) async {
    final current = state;
    if (current == null) {
      return;
    }
    await signIn(current.withSwitchedRole(result));
  }

  Future<void> signOut() async {
    state = null;
    await _store.delete();
  }

  /// Rotates the refresh token once even when several requests fail together.
  Future<String?> refreshAccessToken() {
    final activeRefresh = _refreshInFlight;
    if (activeRefresh != null) {
      return activeRefresh;
    }

    final refresh = _refreshAccessToken();
    _refreshInFlight = refresh;
    return refresh.whenComplete(() {
      if (identical(_refreshInFlight, refresh)) {
        _refreshInFlight = null;
      }
    });
  }

  Future<String?> _refreshAccessToken() async {
    final current = state;
    if (current == null) {
      return null;
    }

    try {
      final tokens = await _refreshSession(current.refreshToken);
      final refreshed = current.withRefreshedTokens(tokens);
      await signIn(refreshed);
      return refreshed.accessToken;
    } catch (_) {
      try {
        await signOut();
      } catch (_) {
        state = null;
      }
      return null;
    }
  }
}

/// API bound to the current session token (or anonymous when signed out).
final mobileApiProvider = Provider<MobileApi>((ref) {
  final session = ref.watch(sessionProvider);
  return MobileApi(
    apiClient: ApiClient(
      baseUrl: Environment.apiBaseUrl,
      accessToken: session?.accessToken,
      refreshAccessToken: session == null
          ? null
          : ref.read(sessionProvider.notifier).refreshAccessToken,
    ),
  );
});

/// The customer's live enquiries; refreshed after each submission.
final enquiriesProvider = FutureProvider.autoDispose((ref) async {
  final session = ref.watch(sessionProvider);
  if (session == null) {
    return null;
  }
  final api = ref.watch(mobileApiProvider);
  return api.listEnquiries();
});

/// Live quotations visible to the signed-in customer.
final quotationsProvider = FutureProvider.autoDispose((ref) async {
  final session = ref.watch(sessionProvider);
  if (session == null) {
    return null;
  }
  final api = ref.watch(mobileApiProvider);
  return api.listQuotations();
});

/// Live bookings for the signed-in customer.
final bookingsProvider = FutureProvider.autoDispose((ref) async {
  final session = ref.watch(sessionProvider);
  if (session == null) {
    return null;
  }
  final api = ref.watch(mobileApiProvider);
  return api.listBookings();
});
