import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/api/api_client.dart';
import 'package:mee_events/api/mobile_api.dart';
import 'package:mee_events/features/auth/app_gateway.dart';
import 'package:mee_events/features/auth/customer_private_data_cleaner.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/models/auth_session.dart';
import 'package:mee_events/models/bootstrap_response.dart';
import 'package:mee_events/models/client_surface.dart';
import 'package:mee_events/navigation/resolve_bootstrap.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _customerModules = [
  'customer_home',
  'customer_enquiries',
  'customer_quotations',
  'customer_bookings',
  'customer_payments',
  'customer_event_tracking',
  'customer_changes',
  'customer_support',
];

const _customerCapabilities = [
  'enquiry.create_own',
  'enquiry.read_own',
  'quotation.read_own',
  'quotation.approve_own',
  'quotation.reject_own',
  'quotation.request_revision_own',
  'booking.read_own',
  'payment.submit_own',
  'payment.read_own',
  'event.track_own',
  'change_request.create_own',
  'support.contact_assigned_manager',
];

const _sessionId = '00000000-0000-4000-8000-000000000201';

AuthSession _session({
  required String userId,
  String role = 'customer',
  String accessToken = 'customer-access',
}) {
  return AuthSession(
    accessToken: accessToken,
    refreshToken: '$userId-refresh-token-value-at-least-32-characters',
    accessTokenExpiresInSeconds: 900,
    accessTokenExpiresAt: DateTime.utc(2099),
    sessionId: _sessionId,
    userId: userId,
    mobileNumber: '+919876543210',
    lastActiveRole: role,
  );
}

PlatformBootstrapResponse _bootstrap({
  required String userId,
  String role = 'customer',
  String? actorUserId,
  String? actorSessionId,
}) {
  final isCustomer = role == 'customer';
  final surface = isCustomer
      ? ClientSurface.customerMobile
      : ClientSurface.workerMobile;
  final landing = isCustomer ? 'customer_home' : 'worker_home';
  return PlatformBootstrapResponse(
    schemaVersion: platformBootstrapSchemaVersion,
    minimumClientBootstrapVersion: platformBootstrapClientVersion,
    policyVersion: platformBootstrapPolicyVersion,
    generatedAt: '2026-09-02T10:00:00.000Z',
    requestId: 'request-$userId-$role',
    actorUserId: actorUserId ?? userId,
    actorSessionId: actorSessionId ?? _sessionId,
    surface: surface,
    activeRole: role,
    landingModule: landing,
    branchId: hyderabadBranchId,
    branchCode: 'HYD',
    branchName: 'Hyderabad',
    assignedRoles: [role],
    modules: isCustomer ? _customerModules : [landing],
    capabilities: isCustomer ? _customerCapabilities : const [],
  );
}

SessionNotifier _notifier() {
  return SessionNotifier(
    (refreshToken) async => SessionTokens(
      accessToken: 'refreshed-access',
      refreshToken: refreshToken,
      accessTokenExpiresInSeconds: 900,
      sessionId: _sessionId,
      activeRole: 'customer',
    ),
    store: MemoryAuthSessionStore(),
  );
}

class _QueuedBootstrapApi extends MobileApi {
  _QueuedBootstrapApi()
    : super(apiClient: ApiClient(baseUrl: 'http://127.0.0.1.invalid'));

  final requests = <Completer<PlatformBootstrapResponse>>[];

  @override
  Future<PlatformBootstrapResponse> getPlatformBootstrap() {
    final request = Completer<PlatformBootstrapResponse>();
    requests.add(request);
    return request.future;
  }
}

class _BlockingSessionStore extends MemoryAuthSessionStore {
  final deleteStarted = Completer<void>();
  final releaseDelete = Completer<void>();

  @override
  Future<void> delete() async {
    deleteStarted.complete();
    await releaseDelete.future;
    await super.delete();
  }
}

class _BlockingPrivateDataCleaner implements CustomerPrivateDataCleaner {
  final clearStarted = Completer<void>();
  final releaseClear = Completer<void>();

  @override
  Future<void> clearForUser(String userId) async {
    clearStarted.complete();
    await releaseClear.future;
  }
}

class _BootstrapRouteProbe extends ConsumerWidget {
  const _BootstrapRouteProbe();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bootstrap = ref.watch(platformBootstrapProvider);
    return MaterialApp(
      home: Scaffold(
        body: Text(
          bootstrap.when(
            data: (response) => response == null
                ? 'signed-out'
                : resolveBootstrapEntry(response).route,
            error: (_, _) => 'bootstrap-error',
            loading: () => 'bootstrap-loading',
          ),
        ),
      ),
    );
  }
}

Future<void> _pumpProbe(
  WidgetTester tester, {
  required SessionNotifier notifier,
  required MobileApi api,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        sessionProvider.overrideWith((ref) => notifier),
        // Mirror the production provider's session dependency. A token refresh
        // rebuilds this provider, but must not restart an in-flight bootstrap.
        mobileApiProvider.overrideWith((ref) {
          ref.watch(sessionProvider);
          return api;
        }),
      ],
      child: const _BootstrapRouteProbe(),
    ),
  );
  await tester.pump();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('bootstrap loads once and shows no private surface first', (
    tester,
  ) async {
    final notifier = _notifier();
    final api = _QueuedBootstrapApi();
    await notifier.signIn(_session(userId: 'customer-a'));

    await _pumpProbe(tester, notifier: notifier, api: api);

    expect(api.requests, hasLength(1));
    expect(find.text('bootstrap-loading'), findsOneWidget);
    expect(find.text('/customer'), findsNothing);

    api.requests.single.complete(_bootstrap(userId: 'customer-a'));
    await tester.pump();
    await tester.pump();

    expect(api.requests, hasLength(1));
    expect(find.text('/customer'), findsOneWidget);
  });

  testWidgets('bootstrap actor mismatch fails closed', (tester) async {
    final notifier = _notifier();
    final api = _QueuedBootstrapApi();
    await notifier.signIn(_session(userId: 'customer-a'));
    await _pumpProbe(tester, notifier: notifier, api: api);

    api.requests.single.complete(
      _bootstrap(userId: 'customer-a', actorUserId: 'customer-b'),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('bootstrap-error'), findsOneWidget);
    expect(find.text('/customer'), findsNothing);
  });

  testWidgets('bootstrap from a different device session fails closed', (
    tester,
  ) async {
    final notifier = _notifier();
    final api = _QueuedBootstrapApi();
    await notifier.signIn(_session(userId: 'customer-a'));
    await _pumpProbe(tester, notifier: notifier, api: api);

    api.requests.single.complete(
      _bootstrap(
        userId: 'customer-a',
        actorSessionId: '00000000-0000-4000-8000-000000000299',
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('bootstrap-error'), findsOneWidget);
    expect(find.text('/customer'), findsNothing);
  });

  testWidgets('token refresh does not invalidate an in-flight bootstrap', (
    tester,
  ) async {
    final refreshGate = Completer<SessionTokens>();
    final notifier = SessionNotifier(
      (_) => refreshGate.future,
      store: MemoryAuthSessionStore(),
    );
    final api = _QueuedBootstrapApi();
    await notifier.signIn(_session(userId: 'customer-a'));
    await _pumpProbe(tester, notifier: notifier, api: api);
    final requestedSession = notifier.state!.snapshot;

    final refresh = notifier.refreshAccessToken(
      expectedSession: requestedSession,
    );
    refreshGate.complete(
      const SessionTokens(
        accessToken: 'refreshed-customer-access',
        refreshToken: 'rotated-refresh-token-value-at-least-32-characters',
        accessTokenExpiresInSeconds: 900,
        sessionId: _sessionId,
        activeRole: 'customer',
      ),
    );
    expect(await refresh, 'refreshed-customer-access');
    await tester.pump();
    expect(api.requests, hasLength(1));

    api.requests.single.complete(_bootstrap(userId: 'customer-a'));
    await tester.pump();
    await tester.pump();
    expect(find.text('/customer'), findsOneWidget);
  });

  testWidgets('logout while bootstrap is in flight stays signed out', (
    tester,
  ) async {
    final notifier = _notifier();
    final api = _QueuedBootstrapApi();
    await notifier.signIn(_session(userId: 'customer-a'));
    await _pumpProbe(tester, notifier: notifier, api: api);

    await notifier.signOutLocally();
    await tester.pump();
    api.requests.first.complete(_bootstrap(userId: 'customer-a'));
    await tester.pump();
    await tester.pump();

    expect(find.text('signed-out'), findsOneWidget);
    expect(find.text('/customer'), findsNothing);
  });

  testWidgets(
    'logout hides private surfaces before delayed storage and cache cleanup',
    (tester) async {
      final store = _BlockingSessionStore();
      final cleaner = _BlockingPrivateDataCleaner();
      final notifier = SessionNotifier(
        (refreshToken) async => SessionTokens(
          accessToken: 'refreshed-access',
          refreshToken: refreshToken,
          accessTokenExpiresInSeconds: 900,
          sessionId: _sessionId,
          activeRole: 'customer',
        ),
        store: store,
        privateDataCleaner: cleaner,
      );
      final api = _QueuedBootstrapApi();
      await notifier.signIn(_session(userId: 'customer-a'));
      await _pumpProbe(tester, notifier: notifier, api: api);

      final logout = notifier.signOutLocally();
      await store.deleteStarted.future;
      await tester.pump();
      expect(notifier.state, isNull);
      expect(find.text('/customer'), findsNothing);
      expect(find.text('/vendor'), findsNothing);
      expect(find.text('/worker'), findsNothing);

      api.requests.single.complete(_bootstrap(userId: 'customer-a'));
      await tester.pump();
      await tester.pump();
      expect(find.text('signed-out'), findsOneWidget);
      expect(find.text('/customer'), findsNothing);
      expect(find.text('/vendor'), findsNothing);
      expect(find.text('/worker'), findsNothing);

      store.releaseDelete.complete();
      await cleaner.clearStarted.future;
      await tester.pump();
      expect(notifier.state, isNull);
      expect(find.text('signed-out'), findsOneWidget);

      cleaner.releaseClear.complete();
      await logout;
      await tester.pump();
      expect(notifier.state, isNull);
      expect(find.text('signed-out'), findsOneWidget);
    },
  );

  testWidgets('old Customer bootstrap cannot win after a Worker switch', (
    tester,
  ) async {
    final notifier = _notifier();
    final api = _QueuedBootstrapApi();
    final customer = _session(userId: 'customer-a');
    await notifier.signIn(customer);
    final customerSnapshot = notifier.state!.snapshot;
    await _pumpProbe(tester, notifier: notifier, api: api);

    await notifier.applySwitchedRole(
      const SwitchRoleResult(
        accessToken: 'worker-access',
        accessTokenExpiresInSeconds: 900,
        sessionId: _sessionId,
        activeRole: 'worker',
      ),
      expectedSession: customerSnapshot,
    );
    await tester.pump();
    expect(api.requests, hasLength(2));
    expect(find.text('bootstrap-loading'), findsOneWidget);

    api.requests.first.complete(_bootstrap(userId: 'customer-a'));
    await tester.pump();
    await tester.pump();
    expect(find.text('/customer'), findsNothing);

    api.requests.last.complete(
      _bootstrap(userId: 'customer-a', role: 'worker'),
    );
    await tester.pump();
    await tester.pump();
    expect(find.text('/worker'), findsOneWidget);
    expect(find.text('/customer'), findsNothing);
  });

  testWidgets('Customer A response cannot open for Customer B', (tester) async {
    final notifier = _notifier();
    final api = _QueuedBootstrapApi();
    await notifier.signIn(_session(userId: 'customer-a'));
    await _pumpProbe(tester, notifier: notifier, api: api);

    await notifier.signOutLocally();
    await notifier.signIn(
      _session(userId: 'customer-b', accessToken: 'customer-b-access'),
    );
    await tester.pump();
    expect(api.requests, hasLength(2));

    api.requests.first.complete(_bootstrap(userId: 'customer-a'));
    await tester.pump();
    await tester.pump();
    expect(find.text('/customer'), findsNothing);

    api.requests.last.complete(_bootstrap(userId: 'customer-b'));
    await tester.pump();
    await tester.pump();
    expect(find.text('/customer'), findsOneWidget);
  });
}
