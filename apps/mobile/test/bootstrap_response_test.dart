import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/models/bootstrap_response.dart';
import 'package:mee_events/models/client_surface.dart';
import 'package:mee_events/navigation/resolve_bootstrap.dart';

const _branchId = '00000000-0000-4000-8000-000000000001';

Map<String, dynamic> validBootstrap({
  String role = 'customer',
  String? surface,
  String? landingModule,
  String branchCode = 'HYD',
  List<String>? assignedRoles,
  List<Map<String, dynamic>>? modules,
  List<Object?>? capabilities,
}) {
  final resolvedSurface = surface ?? _surfaceForRole(role);
  final resolvedLanding = landingModule ?? _landingForRole(role);
  final roles = assignedRoles ?? [role];
  return {
    'schemaVersion': '2026-07-29',
    'policyVersion': 'hyd-v1',
    'generatedAt': '2026-08-28T10:00:00.000Z',
    'requestId': 'request-sec-06',
    'actor': {
      'userId': 'user-sec-06',
      'sessionId': 'session-sec-06',
      'activeRole': role,
    },
    'branch': {
      'id': _branchId,
      'code': branchCode,
      'name': branchCode == 'HYD' ? 'Hyderabad' : 'Unsupported city',
      'city': branchCode == 'HYD' ? 'Hyderabad' : 'Unsupported city',
      'state': 'Telangana',
      'countryCode': 'IN',
      'timezone': 'Asia/Kolkata',
      'currencyCode': 'INR',
      'status': 'active',
    },
    'client': {'surface': resolvedSurface, 'landingModule': resolvedLanding},
    'access': {
      'assignedActiveRoles': [
        for (final assignedRole in roles)
          {
            'role': assignedRole,
            'surface': _surfaceForRole(assignedRole),
            'scopeId': _branchId,
          },
      ],
      'modules':
          modules ??
          [
            {
              'id': resolvedLanding,
              'label': 'Home',
              'area': resolvedSurface == 'employee_web'
                  ? 'governance'
                  : 'self_service',
            },
          ],
      'capabilities': capabilities ?? [_capabilityForRole(role)],
    },
    'controls': {
      'roleVisibility': 'assigned-active-only',
      'dataScope': 'hyderabad-branch-and-assignment',
      'mutationAudit': 'required',
      'serverAuthorization': 'required',
    },
  };
}

String _surfaceForRole(String role) => switch (role) {
  'customer' => 'customer_mobile',
  'vendor_owner' || 'vendor_member' => 'vendor_mobile',
  'worker' => 'worker_mobile',
  _ => 'employee_web',
};

String _landingForRole(String role) => switch (role) {
  'customer' => 'customer_home',
  'vendor_owner' || 'vendor_member' => 'vendor_home',
  'worker' => 'worker_home',
  _ => 'employee_dashboard',
};

String _capabilityForRole(String role) => switch (role) {
  'customer' => 'enquiry.read_own',
  'vendor_owner' || 'vendor_member' => 'vendor_own.read',
  'worker' => 'worker_own.read',
  _ => 'manager_dashboard.read',
};

Map<String, dynamic> _copy(Map<String, dynamic> value) {
  return jsonDecode(jsonEncode(value)) as Map<String, dynamic>;
}

void expectRejected(void Function(Map<String, dynamic>) mutate) {
  final json = _copy(validBootstrap());
  mutate(json);
  expect(
    () => PlatformBootstrapResponse.fromJson(json),
    throwsA(isA<BootstrapValidationException>()),
  );
}

void main() {
  group('valid bootstrap routing', () {
    for (final testCase in const [
      ('customer', ClientSurface.customerMobile, '/customer'),
      ('vendor_owner', ClientSurface.vendorMobile, '/vendor'),
      ('vendor_member', ClientSurface.vendorMobile, '/vendor'),
      ('worker', ClientSurface.workerMobile, '/worker'),
    ]) {
      test('${testCase.$1} routes to ${testCase.$3}', () {
        final response = PlatformBootstrapResponse.fromJson(
          validBootstrap(role: testCase.$1),
        );
        expect(response.surface, testCase.$2);
        expect(resolveBootstrapEntry(response).route, testCase.$3);
      });
    }

    test('employee-class role remains on the ERP-only entry', () {
      final response = PlatformBootstrapResponse.fromJson(
        validBootstrap(role: 'manager'),
      );
      expect(response.surface, ClientSurface.employeeWeb);
      expect(resolveBootstrapEntry(response).route, '/employee-web');
    });

    test('valid assigned-role, module, and capability lists parse', () {
      final response = PlatformBootstrapResponse.fromJson(
        validBootstrap(
          role: 'vendor_owner',
          assignedRoles: const ['customer', 'vendor_owner', 'worker'],
          modules: const [
            {'id': 'vendor_home', 'label': 'Home', 'area': 'self_service'},
            {
              'id': 'vendor_work_orders',
              'label': 'Work orders',
              'area': 'self_service',
            },
          ],
          capabilities: const [
            'vendor_own.read',
            'vendor_work_order.read_assigned',
          ],
        ),
      );

      expect(response.assignedRoles, ['customer', 'vendor_owner', 'worker']);
      expect(response.modules, ['vendor_home', 'vendor_work_orders']);
      expect(response.capabilities, [
        'vendor_own.read',
        'vendor_work_order.read_assigned',
      ]);
    });

    test('supported Hyderabad branch routes normally', () {
      final response = PlatformBootstrapResponse.fromJson(validBootstrap());
      expect(response.branchCode, 'HYD');
      expect(resolveBootstrapEntry(response).route, '/customer');
    });
  });

  group('fail-closed bootstrap parsing', () {
    test('unknown surface is denied', () {
      expectRejected((json) {
        (json['client'] as Map<String, dynamic>)['surface'] = 'unknown';
      });
    });

    test('missing surface is denied', () {
      expectRejected((json) {
        (json['client'] as Map<String, dynamic>).remove('surface');
      });
    });

    test('non-string surface is denied', () {
      expectRejected((json) {
        (json['client'] as Map<String, dynamic>)['surface'] = 1;
      });
    });

    test('unknown active role is denied', () {
      expectRejected((json) {
        (json['actor'] as Map<String, dynamic>)['activeRole'] = 'superuser';
      });
    });

    test('missing active role is denied', () {
      expectRejected((json) {
        (json['actor'] as Map<String, dynamic>).remove('activeRole');
      });
    });

    test('non-string active role is denied', () {
      expectRejected((json) {
        (json['actor'] as Map<String, dynamic>)['activeRole'] = true;
      });
    });

    test('surface and role mismatch is denied', () {
      expectRejected((json) {
        (json['client'] as Map<String, dynamic>)['surface'] = 'worker_mobile';
      });
    });

    test('active role absent from assignments is denied', () {
      expectRejected((json) {
        (json['access'] as Map<String, dynamic>)['assignedActiveRoles'] = [
          {'role': 'worker', 'surface': 'worker_mobile', 'scopeId': _branchId},
        ];
      });
    });

    test('malformed assigned-role entry is denied', () {
      expectRejected((json) {
        (json['access'] as Map<String, dynamic>)['assignedActiveRoles'] = [
          {'role': 'customer'},
        ];
      });
    });

    for (final field in const ['modules', 'capabilities']) {
      test('malformed $field is denied', () {
        expectRejected((json) {
          (json['access'] as Map<String, dynamic>)[field] = 'not-a-list';
        });
      });
    }

    test('unknown module and capability values are denied', () {
      expectRejected((json) {
        (json['access'] as Map<String, dynamic>)['capabilities'] = [
          'arbitrary.permission',
        ];
      });
      expectRejected((json) {
        (json['access'] as Map<String, dynamic>)['modules'] = [
          {'id': 'unknown_home', 'label': 'Unknown', 'area': 'self_service'},
        ];
      });
    });

    test('missing and blank branch codes are denied', () {
      expectRejected((json) {
        (json['branch'] as Map<String, dynamic>).remove('code');
      });
      expectRejected((json) {
        (json['branch'] as Map<String, dynamic>)['code'] = '   ';
      });
    });

    test('Hyderabad branch metadata mismatch is denied', () {
      expectRejected((json) {
        (json['branch'] as Map<String, dynamic>)['timezone'] = 'UTC';
      });
    });

    test('unsupported branch cannot open a product surface', () {
      final response = PlatformBootstrapResponse.fromJson(
        validBootstrap(branchCode: 'BLR'),
      );
      expect(resolveBootstrapEntry(response).route, '/unsupported');
      expect(resolveBootstrapEntry(response).route, isNot('/customer'));
    });

    test('missing and blank landing module are denied', () {
      expectRejected((json) {
        (json['client'] as Map<String, dynamic>).remove('landingModule');
      });
      expectRejected((json) {
        (json['client'] as Map<String, dynamic>)['landingModule'] = ' ';
      });
    });

    for (final structure in const [
      'actor',
      'branch',
      'client',
      'access',
      'controls',
    ]) {
      test('malformed $structure structure is denied', () {
        expectRejected((json) => json[structure] = 'malformed');
      });
    }

    test('invalid direct response does not fall back to Customer', () {
      const invalid = PlatformBootstrapResponse(
        surface: ClientSurface.customerMobile,
        activeRole: 'manager',
        landingModule: 'customer_home',
        branchCode: 'HYD',
        branchName: 'Hyderabad',
        assignedRoles: ['manager'],
        modules: ['customer_home'],
        capabilities: [],
      );
      expect(resolveBootstrapEntry(invalid).route, '/unsupported');
    });
  });
}
