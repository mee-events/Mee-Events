import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/models/bootstrap_response.dart';
import 'package:mee_events/models/client_surface.dart';
import 'package:mee_events/navigation/resolve_bootstrap.dart';

const _branchId = '00000000-0000-4000-8000-000000000001';
const _userId = '00000000-0000-4000-8000-000000000101';
const _sessionId = '00000000-0000-4000-8000-000000000201';
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
    'minimumClientBootstrapVersion': 1,
    'policyVersion': 'hyd-v1',
    'generatedAt': '2026-08-28T10:00:00.000Z',
    'requestId': 'request-sec-06',
    'actor': {'userId': _userId, 'sessionId': _sessionId, 'activeRole': role},
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
            'scopeType': 'branch',
            'scopeId': _branchId,
          },
      ],
      'modules':
          modules ??
          (role == 'customer'
              ? [
                  for (final id in _customerModules)
                    {'id': id, 'label': id, 'area': 'self_service'},
                ]
              : [
                  {
                    'id': resolvedLanding,
                    'label': 'Home',
                    'area': resolvedSurface == 'employee_web'
                        ? 'governance'
                        : 'self_service',
                  },
                ]),
      'capabilities':
          capabilities ??
          (role == 'customer'
              ? _customerCapabilities
              : [_capabilityForRole(role)]),
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

    test(
      'multiple legitimate vendor grants are preserved and role-deduped',
      () {
        final json = validBootstrap(role: 'vendor_owner');
        (json['access'] as Map<String, dynamic>)['assignedActiveRoles'] = [
          {
            'role': 'vendor_owner',
            'surface': 'vendor_mobile',
            'scopeType': 'vendor',
            'scopeId': '00000000-0000-4000-8000-000000000301',
          },
          {
            'role': 'vendor_owner',
            'surface': 'vendor_mobile',
            'scopeType': 'vendor',
            'scopeId': '00000000-0000-4000-8000-000000000302',
          },
        ];

        final response = PlatformBootstrapResponse.fromJson(json);
        expect(response.assignedRoles, ['vendor_owner']);
        expect(resolveBootstrapEntry(response).route, '/vendor');
      },
    );

    test('administrator global is supported without changing Hyderabad', () {
      final json = validBootstrap(role: 'administrator');
      (json['access'] as Map<String, dynamic>)['assignedActiveRoles'] = [
        {
          'role': 'administrator',
          'surface': 'employee_web',
          'scopeType': 'global',
        },
      ];

      final response = PlatformBootstrapResponse.fromJson(json);
      expect(response.branchId, _branchId);
      expect(resolveBootstrapEntry(response).route, '/employee-web');
    });
  });

  group('fail-closed bootstrap parsing', () {
    test('incompatible structural and minimum-client versions are denied', () {
      expectRejected((json) => json['schemaVersion'] = 'future-schema');
      expectRejected((json) => json['minimumClientBootstrapVersion'] = 2);
      expectRejected((json) => json.remove('minimumClientBootstrapVersion'));
    });

    test('required and safely additive policy revisions are accepted', () {
      expect(
        PlatformBootstrapResponse.fromJson(validBootstrap()).policyVersion,
        'hyd-v1',
      );
      final additive = _copy(validBootstrap());
      additive['policyVersion'] = 'hyd-v1.1';
      final access = additive['access'] as Map<String, dynamic>;
      (access['modules'] as List<dynamic>).add({
        'id': 'customer_itinerary',
        'label': 'Itinerary',
        'area': 'self_service',
      });
      (access['capabilities'] as List<dynamic>).add('itinerary.read_own');
      final parsed = PlatformBootstrapResponse.fromJson(additive);
      expect(parsed.modules, contains('customer_itinerary'));
      expect(parsed.capabilities, contains('itinerary.read_own'));
    });

    test('malformed policy revisions are denied', () {
      expectRejected((json) => json['policyVersion'] = 'Future Policy!');
      expectRejected((json) => json['policyVersion'] = '');
    });

    test('timestamps require UTC syntax but do not trust the device clock', () {
      expectRejected((json) => json['generatedAt'] = 'not-a-timestamp');
      expectRejected((json) => json['generatedAt'] = '2026-09-02T10:00:00');
      for (final timestamp in const [
        '2000-01-01T00:00:00.000Z',
        '2099-01-01T00:00:00.000Z',
      ]) {
        final json = validBootstrap()..['generatedAt'] = timestamp;
        expect(PlatformBootstrapResponse.fromJson(json).generatedAt, timestamp);
      }
    });

    test(
      'response actor must agree with the current local account and role',
      () {
        final response = PlatformBootstrapResponse.fromJson(validBootstrap());
        expect(
          response.agreesWithSession(
            userId: _userId,
            sessionId: _sessionId,
            activeRole: 'customer',
          ),
          isTrue,
        );
        expect(
          response.agreesWithSession(
            userId: 'different-user',
            sessionId: _sessionId,
            activeRole: 'customer',
          ),
          isFalse,
        );
        expect(
          response.agreesWithSession(
            userId: _userId,
            sessionId: '00000000-0000-4000-8000-000000000299',
            activeRole: 'customer',
          ),
          isFalse,
        );
        expect(
          response.agreesWithSession(
            userId: _userId,
            sessionId: _sessionId,
            activeRole: 'worker',
          ),
          isFalse,
        );
      },
    );

    test('missing actor identity or session is denied', () {
      expectRejected((json) {
        (json['actor'] as Map<String, dynamic>).remove('userId');
      });
      expectRejected((json) {
        (json['actor'] as Map<String, dynamic>).remove('sessionId');
      });
    });

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
          {
            'role': 'worker',
            'surface': 'worker_mobile',
            'scopeType': 'branch',
            'scopeId': _branchId,
          },
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

    test('duplicate or explicitly inactive assignments are denied', () {
      expectRejected((json) {
        (json['access'] as Map<String, dynamic>)['assignedActiveRoles'] = [
          {
            'role': 'customer',
            'surface': 'customer_mobile',
            'scopeType': 'branch',
            'scopeId': _branchId,
          },
          {
            'role': 'customer',
            'surface': 'customer_mobile',
            'scopeType': 'branch',
            'scopeId': _branchId,
          },
        ];
      });
      expectRejected((json) {
        ((json['access'] as Map<String, dynamic>)['assignedActiveRoles']
                    as List<dynamic>)
                .first['active'] =
            false;
      });
    });

    test('every returned assignment must agree with the active branch', () {
      expectRejected((json) {
        ((json['access'] as Map<String, dynamic>)['assignedActiveRoles']
                    as List<dynamic>)
                .first['scopeId'] =
            '00000000-0000-4000-8000-000000000099';
      });
      expectRejected((json) {
        final assignment =
            ((json['access'] as Map<String, dynamic>)['assignedActiveRoles']
                        as List<dynamic>)
                    .first
                as Map<String, dynamic>;
        assignment
          ..['scopeType'] = 'global'
          ..remove('scopeId');
      });
    });

    for (final field in const ['modules', 'capabilities']) {
      test('malformed $field is denied', () {
        expectRejected((json) {
          (json['access'] as Map<String, dynamic>)[field] = 'not-a-list';
        });
      });
    }

    test('malformed additive module and capability values are denied', () {
      expectRejected((json) {
        (json['access'] as Map<String, dynamic>)['capabilities'] = [
          'malformed permission',
        ];
      });
      expectRejected((json) {
        (json['access'] as Map<String, dynamic>)['modules'] = [
          {'id': 'Unknown Home', 'label': 'Unknown', 'area': 'self_service'},
        ];
      });
    });

    test('duplicate modules and capabilities are denied', () {
      expectRejected((json) {
        final access = json['access'] as Map<String, dynamic>;
        (access['capabilities'] as List<dynamic>).add('enquiry.read_own');
      });
      expectRejected((json) {
        final modules =
            (json['access'] as Map<String, dynamic>)['modules']
                as List<dynamic>;
        modules.add(_copy(modules.first as Map<String, dynamic>));
      });
    });

    test('Customer privileged or incomplete module policy is denied', () {
      expectRejected((json) {
        ((json['access'] as Map<String, dynamic>)['modules'] as List<dynamic>)
            .add({'id': 'erp_events', 'label': 'Events', 'area': 'erp'});
      });
      expectRejected((json) {
        ((json['access'] as Map<String, dynamic>)['modules'] as List<dynamic>)
            .removeLast();
      });
    });

    test('Customer privileged or incomplete capability policy is denied', () {
      expectRejected((json) {
        ((json['access'] as Map<String, dynamic>)['capabilities']
                as List<dynamic>)
            .add('erp_event.read');
      });
      expectRejected((json) {
        ((json['access'] as Map<String, dynamic>)['capabilities']
                as List<dynamic>)
            .removeLast();
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
      for (final field in const [
        'id',
        'name',
        'city',
        'state',
        'countryCode',
        'timezone',
        'currencyCode',
      ]) {
        expectRejected((json) {
          (json['branch'] as Map<String, dynamic>)[field] = 'contradictory';
        });
      }
    });

    test('inactive branch is denied', () {
      expectRejected((json) {
        (json['branch'] as Map<String, dynamic>)['status'] = 'inactive';
      });
    });

    test('unsupported branch is rejected before route resolution', () {
      expect(
        () => PlatformBootstrapResponse.fromJson(
          validBootstrap(branchCode: 'BLR'),
        ),
        throwsA(isA<BootstrapValidationException>()),
      );
    });

    test('missing and blank landing module are denied', () {
      expectRejected((json) {
        (json['client'] as Map<String, dynamic>).remove('landingModule');
      });
      expectRejected((json) {
        (json['client'] as Map<String, dynamic>)['landingModule'] = ' ';
      });
    });

    test('landing module and active role mismatch is denied', () {
      expectRejected((json) {
        (json['client'] as Map<String, dynamic>)['landingModule'] =
            'worker_home';
      });
    });

    test('unknown security control values are denied', () {
      for (final field in const [
        'roleVisibility',
        'dataScope',
        'mutationAudit',
        'serverAuthorization',
      ]) {
        expectRejected((json) {
          (json['controls'] as Map<String, dynamic>)[field] = 'optional';
        });
      }
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
        expectRejected((json) => json.remove(structure));
      });
    }

    test('invalid direct response does not fall back to Customer', () {
      const invalid = PlatformBootstrapResponse(
        schemaVersion: platformBootstrapSchemaVersion,
        minimumClientBootstrapVersion: platformBootstrapClientVersion,
        policyVersion: platformBootstrapPolicyVersion,
        generatedAt: '2026-09-02T10:00:00.000Z',
        requestId: 'request-invalid',
        actorUserId: 'user-invalid',
        actorSessionId: 'session-invalid',
        surface: ClientSurface.customerMobile,
        activeRole: 'manager',
        landingModule: 'customer_home',
        branchId: hyderabadBranchId,
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
