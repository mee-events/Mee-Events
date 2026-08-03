import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/api/api_client.dart';
import 'package:mee_events/api/mobile_api.dart';
import 'package:mee_events/config/environment.dart';
import 'package:mee_events/models/auth_session.dart';

/// The active device session, or null when signed out.
/// Held in memory for this slice; secure storage lands with a later slice.
final sessionProvider =
    StateNotifierProvider<SessionNotifier, AuthSession?>((ref) {
  return SessionNotifier();
});

class SessionNotifier extends StateNotifier<AuthSession?> {
  SessionNotifier() : super(null);

  void signIn(AuthSession session) => state = session;

  void signOut() => state = null;
}

/// API bound to the current session token (or anonymous when signed out).
final mobileApiProvider = Provider<MobileApi>((ref) {
  final session = ref.watch(sessionProvider);
  return MobileApi(
    apiClient: ApiClient(
      baseUrl: Environment.apiBaseUrl,
      accessToken: session?.accessToken,
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
