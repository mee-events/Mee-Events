import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/api/api_client.dart';
import 'package:mee_events/api/mobile_api.dart';
import 'package:mee_events/core/providers/catalog_provider.dart';
import 'package:mee_events/features/auth/app_gateway.dart';
import 'package:mee_events/features/auth/role_switcher/mobile_roles.dart';
import 'package:mee_events/features/auth/role_switcher/role_switch_chip.dart';
import 'package:mee_events/features/auth/role_switcher/role_switcher_sheet.dart';
import 'package:mee_events/features/auth/role_switcher/show_role_switcher.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/favorites/favorites_store.dart';
import 'package:mee_events/features/customer/plan/event_plan_store.dart';
import 'package:mee_events/features/customer/screens/customer_dashboard_screen.dart';
import 'package:mee_events/features/vendor/screens/vendor_ops_dashboard_screen.dart';
import 'package:mee_events/features/worker/screens/worker_ops_dashboard_screen.dart';
import 'package:mee_events/models/api_error.dart';
import 'package:mee_events/models/auth_session.dart';
import 'package:mee_events/models/bootstrap_response.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/models/catalog_service.dart';
import 'package:mee_events/models/client_surface.dart';
import 'package:mee_events/theme/theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _testUserId = 'user-1';
const _testSessionId = '00000000-0000-4000-8000-000000000201';

AuthSession testSession({
  String role = 'customer',
  String accessToken = 'access-1',
  String refreshToken = 'refresh-token-value-32chars-long',
  String userId = _testUserId,
  String mobileNumber = '+919876543210',
}) {
  return AuthSession(
    accessToken: accessToken,
    refreshToken: refreshToken,
    accessTokenExpiresInSeconds: 900,
    accessTokenExpiresAt: DateTime.utc(2099),
    sessionId: _testSessionId,
    userId: userId,
    mobileNumber: mobileNumber,
    lastActiveRole: role,
  );
}

PlatformBootstrapResponse testBootstrap({
  required String activeRole,
  required List<String> assignedRoles,
  String branchCode = 'HYD',
}) {
  final surface = switch (activeRole) {
    'vendor_owner' || 'vendor_member' => ClientSurface.vendorMobile,
    'worker' => ClientSurface.workerMobile,
    'customer' => ClientSurface.customerMobile,
    _ => ClientSurface.employeeWeb,
  };
  final landingModule = switch (activeRole) {
    'vendor_owner' || 'vendor_member' => 'vendor_home',
    'worker' => 'worker_home',
    'customer' => 'customer_home',
    _ => 'employee_dashboard',
  };
  final modules = activeRole == 'customer'
      ? const [
          'customer_home',
          'customer_enquiries',
          'customer_quotations',
          'customer_bookings',
          'customer_payments',
          'customer_event_tracking',
          'customer_changes',
          'customer_support',
        ]
      : [landingModule];
  final capabilities = activeRole == 'customer'
      ? const [
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
        ]
      : const <String>[];
  return PlatformBootstrapResponse(
    schemaVersion: platformBootstrapSchemaVersion,
    minimumClientBootstrapVersion: platformBootstrapClientVersion,
    policyVersion: platformBootstrapPolicyVersion,
    generatedAt: '2026-09-02T10:00:00.000Z',
    requestId: 'request-role-switcher',
    actorUserId: _testUserId,
    actorSessionId: _testSessionId,
    surface: surface,
    activeRole: activeRole,
    landingModule: landingModule,
    branchId: hyderabadBranchId,
    branchCode: branchCode,
    branchName: 'Hyderabad',
    assignedRoles: assignedRoles,
    modules: modules,
    capabilities: capabilities,
  );
}

SessionNotifier sessionNotifier([AuthSession? session]) {
  return SessionNotifier(
    (refreshToken) async => SessionTokens(
      accessToken: 'refreshed-access',
      refreshToken: refreshToken,
      accessTokenExpiresInSeconds: 900,
      sessionId: _testSessionId,
      activeRole: 'worker',
    ),
    store: MemoryAuthSessionStore(),
  );
}

Finder workerRoleFinder() => find.text('View assignments and duties');

class ThrowingAuthSessionStore implements AuthSessionStore {
  String? value;
  var writes = 0;
  var throwOnWrite = false;

  @override
  Future<String?> read() async => value;

  @override
  Future<void> write(String next) async {
    writes += 1;
    if (throwOnWrite) {
      throw StateError('secure storage unavailable');
    }
    value = next;
  }

  @override
  Future<void> delete() async {
    value = null;
  }
}

class ScriptedMobileApi extends MobileApi {
  ScriptedMobileApi(this._onSwitch)
    : super(apiClient: ApiClient(baseUrl: 'http://localhost'));

  var switchCalls = 0;
  final Future<SwitchRoleResult> Function(String role) _onSwitch;

  @override
  Future<SwitchRoleResult> switchRole(String role) {
    switchCalls += 1;
    return _onSwitch(role);
  }
}

class _LogoutMobileApi extends MobileApi {
  _LogoutMobileApi()
    : super(apiClient: ApiClient(baseUrl: 'http://127.0.0.1.invalid'));

  int logoutCalls = 0;

  @override
  Future<void> logout() async {
    logoutCalls += 1;
  }
}

List<Override> catalogOverrides() => [
  eventTypesProvider.overrideWith(
    (ref) async => const [
      CatalogItem(code: 'wedding', displayName: 'Wedding', displayOrder: 1),
    ],
  ),
  serviceCategoriesProvider.overrideWith((ref) async => const <CatalogItem>[]),
  catalogServicesProvider(
    null,
  ).overrideWith((ref) async => const <CatalogService>[]),
];

Future<void> pumpSheet(
  WidgetTester tester, {
  required PlatformBootstrapResponse bootstrap,
  Future<SwitchRoleResult> Function(String role)? onSwitch,
  Future<void> Function(SwitchRoleResult result)? onApplied,
  Size size = const Size(390, 844),
  double textScale = 1,
}) async {
  tester.view.physicalSize = Size(size.width * 3, size.height * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.light,
      home: MediaQuery(
        data: MediaQueryData(
          size: size,
          textScaler: TextScaler.linear(textScale),
        ),
        child: Scaffold(
          body: RoleSwitcherSheet(
            bootstrap: bootstrap,
            onSwitch:
                onSwitch ??
                (role) async => SwitchRoleResult(
                  accessToken: 'next-$role',
                  accessTokenExpiresInSeconds: 900,
                  sessionId: _testSessionId,
                  activeRole: role,
                ),
            onApplied: onApplied,
          ),
        ),
      ),
    ),
  );
  await tester.pump();
}

Future<void> pumpGateway(
  WidgetTester tester, {
  required SessionNotifier notifier,
  List<String> assignedRoles = const ['customer', 'vendor_owner', 'worker'],
  Future<PlatformBootstrapResponse?> Function()? loadBootstrap,
  GlobalKey<NavigatorState>? navigatorKey,
  MobileApi? mobileApi,
}) async {
  SharedPreferences.setMockInitialValues({});
  tester.view.physicalSize = const Size(1170, 2532);
  tester.view.devicePixelRatio = 3;
  tester.platformDispatcher.textScaleFactorTestValue = 0.75;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        sessionProvider.overrideWith((ref) => notifier),
        sessionUserIdProvider.overrideWithValue('user-1'),
        if (mobileApi != null) mobileApiProvider.overrideWithValue(mobileApi),
        ...catalogOverrides(),
        platformBootstrapProvider.overrideWith((ref) async {
          if (loadBootstrap != null) return loadBootstrap();
          final role = ref.watch(sessionProvider)?.lastActiveRole ?? 'customer';
          return testBootstrap(activeRole: role, assignedRoles: assignedRoles);
        }),
      ],
      child: MaterialApp(
        theme: AppTheme.light,
        navigatorKey: navigatorKey,
        home: const AppGateway(launchDelay: Duration.zero),
      ),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 1));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 80));
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('mobile role visibility', () {
    test('customer-only bootstrap yields one Customer option', () {
      final options = visibleMobileRoles(
        activeRole: 'customer',
        assignedActiveRoles: const ['customer'],
      );
      expect(options, hasLength(1));
      expect(options.single.label, 'Customer');
      expect(options.single.selected, isTrue);
      expect(showsApprovalFooter(options), isTrue);
    });

    test('approved Customer + Vendor + Worker shows three choices', () {
      final options = visibleMobileRoles(
        activeRole: 'customer',
        assignedActiveRoles: const [
          'customer',
          'vendor_owner',
          'worker',
          'employee',
          'manager',
        ],
      );
      expect(options.map((option) => option.label).toList(), [
        'Customer',
        'Vendor',
        'Worker',
      ]);
    });

    test('employee roles never appear', () {
      final options = visibleMobileRoles(
        activeRole: 'customer',
        assignedActiveRoles: const [
          'customer',
          'employee',
          'support',
          'finance',
          'administrator',
          'auditor',
        ],
      );
      expect(options.map((option) => option.label), ['Customer']);
    });

    test('vendor grouping prefers owner when entering from Customer', () {
      expect(
        preferredVendorRole(
          activeRole: 'customer',
          assignedActiveRoles: const ['vendor_owner', 'vendor_member'],
        ),
        'vendor_owner',
      );
    });

    test('vendor grouping preserves vendor_member when already active', () {
      expect(
        preferredVendorRole(
          activeRole: 'vendor_member',
          assignedActiveRoles: const ['vendor_owner', 'vendor_member'],
        ),
        'vendor_member',
      );
    });
  });

  testWidgets(
    'customer-only sheet shows selected Customer and approval footer',
    (tester) async {
      await pumpSheet(
        tester,
        bootstrap: testBootstrap(
          activeRole: 'customer',
          assignedRoles: const ['customer'],
        ),
      );
      expect(find.text('Switch role'), findsOneWidget);
      expect(find.text('Customer'), findsWidgets);
      expect(find.text('Vendor'), findsNothing);
      expect(find.text('Worker'), findsNothing);
      expect(
        find.text('Vendor and Worker roles appear here after approval.'),
        findsOneWidget,
      );
    },
  );

  testWidgets('approved roles render three user-facing choices', (
    tester,
  ) async {
    await pumpSheet(
      tester,
      bootstrap: testBootstrap(
        activeRole: 'customer',
        assignedRoles: const [
          'customer',
          'vendor_member',
          'worker',
          'employee',
        ],
      ),
    );
    expect(find.text('Vendor'), findsOneWidget);
    expect(find.text('Worker'), findsOneWidget);
    expect(find.text('employee'), findsNothing);
  });

  testWidgets('current role is selected and not resubmitted', (tester) async {
    var calls = 0;
    await pumpSheet(
      tester,
      bootstrap: testBootstrap(
        activeRole: 'customer',
        assignedRoles: const ['customer', 'worker'],
      ),
      onSwitch: (role) async {
        calls += 1;
        return SwitchRoleResult(
          accessToken: 'token',
          accessTokenExpiresInSeconds: 900,
          sessionId: _testSessionId,
          activeRole: role,
        );
      },
    );
    await tester.tap(find.text('Plan and track your events'));
    await tester.pump();
    expect(calls, 0);
  });

  testWidgets(
    'selecting another role calls the API once and ignores double taps',
    (tester) async {
      var calls = 0;
      final started = Completer<void>();
      final finish = Completer<SwitchRoleResult>();
      await pumpSheet(
        tester,
        bootstrap: testBootstrap(
          activeRole: 'customer',
          assignedRoles: const ['customer', 'worker'],
        ),
        onSwitch: (role) {
          calls += 1;
          if (!started.isCompleted) started.complete();
          return finish.future;
        },
      );
      await tester.tap(workerRoleFinder());
      await tester.pump();
      await started.future;
      expect(calls, 1);
      expect(
        find.byType(CircularProgressIndicator, skipOffstage: false),
        findsWidgets,
      );
      await tester.tap(find.text('Plan and track your events'));
      await tester.pump();
      expect(calls, 1);
      await tester.tap(workerRoleFinder());
      await tester.pump();
      expect(calls, 1);
      finish.complete(
        const SwitchRoleResult(
          accessToken: 'worker-token',
          accessTokenExpiresInSeconds: 900,
          sessionId: _testSessionId,
          activeRole: 'worker',
        ),
      );
      await tester.pump();
      await tester.pump();
    },
  );

  testWidgets('API error stays in the sheet with retry', (tester) async {
    var calls = 0;
    await pumpSheet(
      tester,
      bootstrap: testBootstrap(
        activeRole: 'customer',
        assignedRoles: const ['customer', 'worker'],
      ),
      onSwitch: (role) async {
        calls += 1;
        throw Exception('Network unavailable');
      },
    );
    await tester.tap(workerRoleFinder());
    await tester.pump();
    expect(find.text('Switch role'), findsOneWidget);
    expect(find.text(roleSwitchUnavailableMessage), findsOneWidget);
    expect(find.textContaining('Network unavailable'), findsNothing);
    await tester.tap(find.text('Retry'));
    await tester.pump();
    expect(calls, 2);
  });

  testWidgets('contradictory switch response fails safely', (tester) async {
    var applied = false;
    await pumpSheet(
      tester,
      bootstrap: testBootstrap(
        activeRole: 'customer',
        assignedRoles: const ['customer', 'worker'],
      ),
      onSwitch: (_) async => const SwitchRoleResult(
        accessToken: 'contradictory-token',
        accessTokenExpiresInSeconds: 900,
        sessionId: _testSessionId,
        activeRole: 'vendor_owner',
      ),
      onApplied: (_) async {
        applied = true;
      },
    );

    await tester.tap(workerRoleFinder());
    await tester.pump();

    expect(find.text(roleSwitchUnavailableMessage), findsOneWidget);
    expect(find.text('Switch role'), findsOneWidget);
    expect(applied, isFalse);
  });

  testWidgets('success updates access token, role, and secure storage', (
    tester,
  ) async {
    final store = MemoryAuthSessionStore();
    final notifier = SessionNotifier(
      (refreshToken) async => SessionTokens(
        accessToken: 'refreshed',
        refreshToken: refreshToken,
        accessTokenExpiresInSeconds: 900,
        sessionId: _testSessionId,
        activeRole: 'worker',
      ),
      store: store,
    );
    await notifier.signIn(testSession());
    await pumpSheet(
      tester,
      bootstrap: testBootstrap(
        activeRole: 'customer',
        assignedRoles: const ['customer', 'worker'],
      ),
      onSwitch: (role) async => SwitchRoleResult(
        accessToken: 'switched-access',
        accessTokenExpiresInSeconds: 900,
        sessionId: _testSessionId,
        activeRole: role,
      ),
      onApplied: (result) async {
        await notifier.applySwitchedRole(result);
      },
    );
    await tester.tap(find.text('View assignments and duties'));
    await tester.pump();
    await tester.pump();
    expect(notifier.state?.accessToken, 'switched-access');
    expect(notifier.state?.lastActiveRole, 'worker');
    expect(notifier.state?.userId, 'user-1');
    expect(notifier.state?.mobileNumber, '+919876543210');
    expect(notifier.state?.refreshToken, 'refresh-token-value-32chars-long');
    final stored = StoredAuthSession.fromJson(
      jsonDecode(store.value!) as Map<String, dynamic>,
    );
    expect(
      jsonDecode(store.value!) as Map<String, dynamic>,
      isNot(contains('accessToken')),
    );
    expect(stored.lastActiveRole, 'worker');
    expect(stored.refreshToken, 'refresh-token-value-32chars-long');
  });

  test('refresh updates local active role from the server', () async {
    final notifier = SessionNotifier(
      (refreshToken) async => SessionTokens(
        accessToken: 'new-access',
        refreshToken: 'rotated-refresh-token-value-32ch',
        accessTokenExpiresInSeconds: 900,
        sessionId: _testSessionId,
        activeRole: 'vendor_owner',
      ),
      store: MemoryAuthSessionStore(),
    );
    await notifier.signIn(testSession());
    await notifier.refreshAccessToken();
    expect(notifier.state?.lastActiveRole, 'vendor_owner');
    expect(notifier.state?.accessToken, 'new-access');
    expect(notifier.state?.userId, 'user-1');
    expect(notifier.state?.mobileNumber, '+919876543210');
  });

  test(
    'refresh rotation cannot overwrite a concurrent local role switch',
    () async {
      final refreshGate = Completer<SessionTokens>();
      final notifier = SessionNotifier(
        (_) => refreshGate.future,
        store: MemoryAuthSessionStore(),
      );
      await notifier.signIn(testSession());
      final customerSnapshot = notifier.state!.snapshot;
      final refresh = notifier.refreshAccessToken(
        expectedSession: customerSnapshot,
      );
      await Future<void>.delayed(Duration.zero);

      expect(
        await notifier.applySwitchedRole(
          const SwitchRoleResult(
            accessToken: 'worker-switch-access',
            accessTokenExpiresInSeconds: 900,
            sessionId: _testSessionId,
            activeRole: 'worker',
          ),
          expectedSession: customerSnapshot,
        ),
        isTrue,
      );
      refreshGate.complete(
        const SessionTokens(
          accessToken: 'stale-customer-refresh-access',
          refreshToken: 'rotated-concurrent-refresh-token-value-000000',
          accessTokenExpiresInSeconds: 900,
          sessionId: _testSessionId,
          activeRole: 'customer',
        ),
      );

      expect(await refresh, 'worker-switch-access');
      expect(notifier.state?.lastActiveRole, 'worker');
      expect(notifier.state?.accessToken, 'worker-switch-access');
      expect(
        notifier.state?.refreshToken,
        'rotated-concurrent-refresh-token-value-000000',
      );
    },
  );

  test(
    'role switch reconciles when refresh observes the server role first',
    () async {
      final refreshGate = Completer<SessionTokens>();
      final notifier = SessionNotifier(
        (_) => refreshGate.future,
        store: MemoryAuthSessionStore(),
      );
      await notifier.signIn(testSession());
      final customerSnapshot = notifier.state!.snapshot;
      final refresh = notifier.refreshAccessToken(
        expectedSession: customerSnapshot,
      );
      refreshGate.complete(
        const SessionTokens(
          accessToken: 'server-worker-access',
          refreshToken: 'server-worker-refresh-token-value-000000000',
          accessTokenExpiresInSeconds: 900,
          sessionId: _testSessionId,
          activeRole: 'worker',
        ),
      );
      await refresh;

      final applied = await notifier.applySwitchedRole(
        const SwitchRoleResult(
          accessToken: 'switch-response-worker-access',
          accessTokenExpiresInSeconds: 900,
          sessionId: _testSessionId,
          activeRole: 'worker',
        ),
        expectedSession: customerSnapshot,
      );

      expect(applied, isTrue);
      expect(notifier.state?.lastActiveRole, 'worker');
      expect(notifier.state?.accessToken, 'server-worker-access');
    },
  );

  test(
    'role switch response from another server session fails closed',
    () async {
      final notifier = sessionNotifier();
      await notifier.signIn(testSession());
      final expected = notifier.state!.snapshot;

      await expectLater(
        notifier.applySwitchedRole(
          const SwitchRoleResult(
            accessToken: 'wrong-session-worker-access',
            accessTokenExpiresInSeconds: 900,
            sessionId: '00000000-0000-4000-8000-000000000299',
            activeRole: 'worker',
          ),
          expectedSession: expected,
        ),
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

  test('missing or null refresh activeRole fails parsing', () {
    expect(
      () => SessionTokens.fromJson({
        'accessToken': 'a',
        'refreshToken': 'r',
        'accessTokenExpiresInSeconds': 900,
      }),
      throwsA(isA<FormatException>()),
    );
    expect(
      () => SessionTokens.fromJson({
        'accessToken': 'a',
        'refreshToken': 'r',
        'accessTokenExpiresInSeconds': 900,
        'activeRole': null,
      }),
      throwsA(isA<FormatException>()),
    );
    final previous = testSession(role: 'customer');
    expect(
      () => previous.withRefreshedTokens(
        SessionTokens.fromJson({
          'accessToken': 'a',
          'refreshToken': 'r',
          'accessTokenExpiresInSeconds': 900,
        }),
      ),
      throwsA(isA<FormatException>()),
    );
  });

  test(
    'secure-storage failure keeps memory aligned with the server role',
    () async {
      final store = ThrowingAuthSessionStore();
      final notifier = SessionNotifier(
        (refreshToken) async => SessionTokens(
          accessToken: 'ignored',
          refreshToken: refreshToken,
          accessTokenExpiresInSeconds: 900,
          sessionId: _testSessionId,
          activeRole: 'customer',
        ),
        store: store,
      );
      await notifier.signIn(testSession());
      expect(store.writes, 1);
      store.throwOnWrite = true;
      await expectLater(
        notifier.applySwitchedRole(
          const SwitchRoleResult(
            accessToken: 'switched-access',
            accessTokenExpiresInSeconds: 900,
            sessionId: _testSessionId,
            activeRole: 'worker',
          ),
        ),
        throwsA(isA<StateError>()),
      );
      expect(store.writes, 2);
      expect(notifier.state?.accessToken, 'switched-access');
      expect(notifier.state?.refreshToken, 'refresh-token-value-32chars-long');
      expect(notifier.state?.lastActiveRole, 'worker');
      final stored = StoredAuthSession.fromJson(
        jsonDecode(store.value!) as Map<String, dynamic>,
      );
      expect(
        jsonDecode(store.value!) as Map<String, dynamic>,
        isNot(contains('accessToken')),
      );
      expect(stored.lastActiveRole, 'customer');
    },
  );

  test('stale role result cannot restore a signed-out session', () async {
    final notifier = sessionNotifier();
    final customer = testSession();
    await notifier.signIn(customer);
    final customerSnapshot = notifier.state!.snapshot;
    await notifier.signOutLocally();

    final applied = await notifier.applySwitchedRole(
      const SwitchRoleResult(
        accessToken: 'late-worker-token',
        accessTokenExpiresInSeconds: 900,
        sessionId: _testSessionId,
        activeRole: 'worker',
      ),
      expectedSession: customerSnapshot,
    );

    expect(applied, isFalse);
    expect(notifier.state, isNull);
  });

  test('conflicting role results fail closed', () async {
    final notifier = sessionNotifier();
    final customer = testSession();
    await notifier.signIn(customer);
    final customerSnapshot = notifier.state!.snapshot;
    await notifier.applySwitchedRole(
      const SwitchRoleResult(
        accessToken: 'current-worker-token',
        accessTokenExpiresInSeconds: 900,
        sessionId: _testSessionId,
        activeRole: 'worker',
      ),
      expectedSession: customerSnapshot,
    );

    final applied = await notifier.applySwitchedRole(
      const SwitchRoleResult(
        accessToken: 'late-vendor-token',
        accessTokenExpiresInSeconds: 900,
        sessionId: _testSessionId,
        activeRole: 'vendor_owner',
      ),
      expectedSession: customerSnapshot,
    );

    expect(applied, isFalse);
    expect(notifier.state, isNull);
  });

  test('Customer A role result cannot affect Customer B', () async {
    final notifier = sessionNotifier();
    final customerA = testSession(userId: 'customer-a');
    await notifier.signIn(customerA);
    final customerASnapshot = notifier.state!.snapshot;
    await notifier.signOutLocally();
    await notifier.signIn(
      testSession(
        userId: 'customer-b',
        accessToken: 'customer-b-access',
        refreshToken: 'customer-b-refresh-token-value-32chars',
        mobileNumber: '+919876543211',
      ),
    );

    final applied = await notifier.applySwitchedRole(
      const SwitchRoleResult(
        accessToken: 'late-customer-a-worker-token',
        accessTokenExpiresInSeconds: 900,
        sessionId: _testSessionId,
        activeRole: 'worker',
      ),
      expectedSession: customerASnapshot,
    );

    expect(applied, isFalse);
    expect(notifier.state?.userId, 'customer-b');
    expect(notifier.state?.lastActiveRole, 'customer');
    expect(notifier.state?.accessToken, 'customer-b-access');
  });

  testWidgets('storage failure after API success keeps server role in memory', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    final store = ThrowingAuthSessionStore();
    final api = ScriptedMobileApi(
      (role) async => SwitchRoleResult(
        accessToken: 'switched-access',
        accessTokenExpiresInSeconds: 900,
        sessionId: _testSessionId,
        activeRole: role,
      ),
    );
    var bootstrapLoads = 0;
    final notifier = SessionNotifier(
      (refreshToken) async => SessionTokens(
        accessToken: 'ignored',
        refreshToken: refreshToken,
        accessTokenExpiresInSeconds: 900,
        sessionId: _testSessionId,
        activeRole: 'customer',
      ),
      store: store,
    );
    await notifier.signIn(testSession());
    await notifier.restore();
    store.throwOnWrite = true;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sessionProvider.overrideWith((ref) => notifier),
          mobileApiProvider.overrideWith((ref) => api),
          platformBootstrapProvider.overrideWith((ref) async {
            bootstrapLoads += 1;
            return testBootstrap(
              activeRole: 'customer',
              assignedRoles: const ['customer', 'worker'],
            );
          }),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: Consumer(
            builder: (context, ref, _) {
              final bootstrap = ref.watch(platformBootstrapProvider);
              return Scaffold(
                body: bootstrap.when(
                  data: (_) => TextButton(
                    onPressed: () =>
                        showRoleSwitcher(context: context, ref: ref),
                    child: const Text('Open switcher'),
                  ),
                  loading: () => const SizedBox.shrink(),
                  error: (error, _) => Text('$error'),
                ),
              );
            },
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();
    expect(bootstrapLoads, 1);
    await tester.tap(find.text('Open switcher'));
    await tester.pumpAndSettle();
    await tester.tap(workerRoleFinder());
    await tester.pump();
    await tester.pump();
    expect(api.switchCalls, 1);
    expect(find.text(switchedSessionSaveFailedMessage), findsOneWidget);
    expect(notifier.state?.accessToken, 'switched-access');
    expect(notifier.state?.lastActiveRole, 'worker');
    expect(bootstrapLoads, 1);
  });

  testWidgets('AppGateway routes Customer, Vendor, and Worker surfaces', (
    tester,
  ) async {
    final notifier = SessionNotifier(
      (refreshToken) async => SessionTokens(
        accessToken: 'ignored',
        refreshToken: refreshToken,
        accessTokenExpiresInSeconds: 900,
        sessionId: _testSessionId,
        activeRole: 'customer',
      ),
      store: MemoryAuthSessionStore(),
    );
    await notifier.signIn(testSession());
    await notifier.restore();

    await pumpGateway(tester, notifier: notifier);
    expect(find.byType(CustomerDashboardScreen), findsOneWidget);

    await notifier.applySwitchedRole(
      const SwitchRoleResult(
        accessToken: 'vendor-access',
        accessTokenExpiresInSeconds: 900,
        sessionId: _testSessionId,
        activeRole: 'vendor_owner',
      ),
    );
    await tester.pump();
    await tester.pump();
    expect(find.byType(VendorOpsDashboardScreen), findsOneWidget);

    await notifier.applySwitchedRole(
      const SwitchRoleResult(
        accessToken: 'worker-access',
        accessTokenExpiresInSeconds: 900,
        sessionId: _testSessionId,
        activeRole: 'worker',
      ),
    );
    await tester.pump();
    await tester.pump();
    expect(find.byType(WorkerOpsDashboardScreen), findsOneWidget);
  });

  testWidgets('employee and manager roles stay on the ERP-only surface', (
    tester,
  ) async {
    for (final role in const ['employee', 'manager']) {
      final notifier = sessionNotifier();
      await notifier.signIn(testSession(role: role));
      await notifier.restore();

      await pumpGateway(tester, notifier: notifier, assignedRoles: [role]);
      expect(find.text('Use Mee Events ERP'), findsOneWidget);
      expect(find.byType(CustomerDashboardScreen), findsNothing);
      expect(find.byType(VendorOpsDashboardScreen), findsNothing);
      expect(find.byType(WorkerOpsDashboardScreen), findsNothing);
    }
  });

  testWidgets('unsupported branch does not open a product dashboard', (
    tester,
  ) async {
    final notifier = sessionNotifier();
    await notifier.signIn(testSession());
    await notifier.restore();

    await pumpGateway(
      tester,
      notifier: notifier,
      loadBootstrap: () async => testBootstrap(
        activeRole: 'customer',
        assignedRoles: const ['customer'],
        branchCode: 'BLR',
      ),
    );
    expect(find.text('Workspace unavailable'), findsOneWidget);
    expect(find.byType(CustomerDashboardScreen), findsNothing);
    expect(find.byType(VendorOpsDashboardScreen), findsNothing);
    expect(find.byType(WorkerOpsDashboardScreen), findsNothing);
  });

  testWidgets('bootstrap failure is generic and retry recovers', (
    tester,
  ) async {
    final notifier = sessionNotifier();
    await notifier.signIn(testSession(role: 'worker'));
    await notifier.restore();
    var loads = 0;
    const rawError =
        'parser failed for https://secret.invalid token=do-not-render';

    await pumpGateway(
      tester,
      notifier: notifier,
      loadBootstrap: () async {
        loads += 1;
        if (loads == 1) throw StateError(rawError);
        return testBootstrap(
          activeRole: 'worker',
          assignedRoles: const ['worker'],
        );
      },
    );

    expect(
      find.text('We couldn’t open your Mee Events account.'),
      findsOneWidget,
    );
    expect(find.text('Please try again or sign out safely.'), findsOneWidget);
    expect(find.textContaining(rawError), findsNothing);
    expect(find.text('Retry'), findsOneWidget);
    expect(find.text('Log out from this device'), findsOneWidget);

    await tester.tap(find.text('Retry'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 80));
    expect(loads, 2);
    expect(find.byType(WorkerOpsDashboardScreen), findsOneWidget);
  });

  testWidgets('bootstrap failure retains sign-out recovery', (tester) async {
    final notifier = sessionNotifier();
    await notifier.signIn(testSession());
    await notifier.restore();
    final api = _LogoutMobileApi();

    await pumpGateway(
      tester,
      notifier: notifier,
      mobileApi: api,
      loadBootstrap: () async => throw const BootstrapValidationException(),
    );
    expect(find.text('Log out from this device'), findsOneWidget);

    await tester.tap(find.text('Log out from this device'));
    await tester.pump();
    expect(api.logoutCalls, 1);
    expect(notifier.state, isNull);
    expect(find.byType(CustomerDashboardScreen), findsNothing);
  });

  testWidgets('navigation stack is cleared when the active role changes', (
    tester,
  ) async {
    final notifier = SessionNotifier(
      (refreshToken) async => SessionTokens(
        accessToken: 'ignored',
        refreshToken: refreshToken,
        accessTokenExpiresInSeconds: 900,
        sessionId: _testSessionId,
        activeRole: 'customer',
      ),
      store: MemoryAuthSessionStore(),
    );
    await notifier.signIn(testSession());
    await notifier.restore();
    final navigatorKey = GlobalKey<NavigatorState>();

    await pumpGateway(
      tester,
      notifier: notifier,
      assignedRoles: const ['customer', 'worker'],
      navigatorKey: navigatorKey,
    );
    navigatorKey.currentState!.push(
      MaterialPageRoute<void>(
        builder: (_) => const Scaffold(body: Text('Pushed route')),
      ),
    );
    await tester.pump();
    await tester.pump();
    expect(find.text('Pushed route'), findsOneWidget);
    await notifier.applySwitchedRole(
      const SwitchRoleResult(
        accessToken: 'worker-access',
        accessTokenExpiresInSeconds: 900,
        sessionId: _testSessionId,
        activeRole: 'worker',
      ),
    );
    await tester.pump();
    await tester.pump();
    expect(find.text('Pushed route'), findsNothing);
  });

  testWidgets('Vendor and Worker dashboards expose a switch-back chip', (
    tester,
  ) async {
    final vendorNotifier = sessionNotifier();
    await vendorNotifier.signIn(testSession(role: 'vendor_owner'));
    await tester.pumpWidget(
      ProviderScope(
        overrides: [sessionProvider.overrideWith((ref) => vendorNotifier)],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const VendorOpsDashboardScreen(),
        ),
      ),
    );
    await tester.pump();
    expect(find.byType(RoleSwitchChip), findsOneWidget);

    final workerNotifier = sessionNotifier();
    await workerNotifier.signIn(testSession(role: 'worker'));
    await tester.pumpWidget(
      ProviderScope(
        overrides: [sessionProvider.overrideWith((ref) => workerNotifier)],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const WorkerOpsDashboardScreen(),
        ),
      ),
    );
    await tester.pump();
    expect(find.byType(RoleSwitchChip), findsOneWidget);
  });

  test('role switching does not delete Event Plan or Favorites', () async {
    SharedPreferences.setMockInitialValues({
      eventPlanStorageKey('user-1'): ['kept-plan'],
      favoritesStorageKey('user-1'): ['kept-fav'],
    });
    final notifier = SessionNotifier(
      (refreshToken) async => SessionTokens(
        accessToken: 'ignored',
        refreshToken: refreshToken,
        accessTokenExpiresInSeconds: 900,
        sessionId: _testSessionId,
        activeRole: 'customer',
      ),
      store: MemoryAuthSessionStore(),
    );
    await notifier.signIn(testSession());
    await notifier.applySwitchedRole(
      const SwitchRoleResult(
        accessToken: 'worker-access',
        accessTokenExpiresInSeconds: 900,
        sessionId: _testSessionId,
        activeRole: 'worker',
      ),
    );
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getStringList(eventPlanStorageKey('user-1')), ['kept-plan']);
    expect(prefs.getStringList(favoritesStorageKey('user-1')), ['kept-fav']);
  });

  testWidgets('sheet has no overflow at 390, 320, and text scale 1.3', (
    tester,
  ) async {
    final bootstrap = testBootstrap(
      activeRole: 'customer',
      assignedRoles: const ['customer', 'vendor_owner', 'worker'],
    );
    await pumpSheet(tester, bootstrap: bootstrap, size: const Size(390, 844));
    await pumpSheet(tester, bootstrap: bootstrap, size: const Size(320, 844));
    await pumpSheet(
      tester,
      bootstrap: bootstrap,
      size: const Size(390, 844),
      textScale: 1.3,
    );
  });

  testWidgets('role chip and rows have semantics and 44-pixel targets', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            appBar: AppBar(
              actions: [
                RoleSwitchChip(roleLabel: 'Customer', onPressed: () {}),
              ],
            ),
            body: RoleSwitcherSheet(
              bootstrap: testBootstrap(
                activeRole: 'customer',
                assignedRoles: const ['customer', 'worker'],
              ),
              onSwitch: (role) async => SwitchRoleResult(
                accessToken: 'x',
                accessTokenExpiresInSeconds: 900,
                sessionId: _testSessionId,
                activeRole: role,
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      expect(
        find.bySemanticsLabel('Current role Customer. Switch role'),
        findsOneWidget,
      );
      expect(
        tester.getSize(find.byType(RoleSwitchChip)).height,
        greaterThanOrEqualTo(44),
      );
      expect(workerRoleFinder(), findsOneWidget);
      final workerRow = find.ancestor(
        of: find.text('View assignments and duties'),
        matching: find.byType(InkWell),
      );
      expect(tester.getSize(workerRow).height, greaterThanOrEqualTo(44));
    } finally {
      semantics.dispose();
    }
  });
}
