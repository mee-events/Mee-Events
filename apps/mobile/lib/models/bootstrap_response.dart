import 'package:mee_events/models/client_surface.dart';

class BootstrapValidationException implements Exception {
  const BootstrapValidationException();

  @override
  String toString() => 'BootstrapValidationException';
}

const platformBootstrapSchemaVersion = '2026-07-29';
const platformBootstrapClientVersion = 1;
const platformBootstrapPolicyVersion = 'hyd-v1';
const hyderabadBranchId = '00000000-0000-4000-8000-000000000001';

const platformRoles = <String>{
  'customer',
  'vendor_owner',
  'vendor_member',
  'worker',
  'employee',
  'support',
  'finance',
  'manager',
  'administrator',
  'auditor',
};

const _roleSurfaces = <String, ClientSurface>{
  'customer': ClientSurface.customerMobile,
  'vendor_owner': ClientSurface.vendorMobile,
  'vendor_member': ClientSurface.vendorMobile,
  'worker': ClientSurface.workerMobile,
  'employee': ClientSurface.employeeWeb,
  'support': ClientSurface.employeeWeb,
  'finance': ClientSurface.employeeWeb,
  'manager': ClientSurface.employeeWeb,
  'administrator': ClientSurface.employeeWeb,
  'auditor': ClientSurface.employeeWeb,
};

const _roleLandingModules = <String, String>{
  'customer': 'customer_home',
  'vendor_owner': 'vendor_home',
  'vendor_member': 'vendor_home',
  'worker': 'worker_home',
  'employee': 'employee_dashboard',
  'support': 'employee_dashboard',
  'finance': 'employee_dashboard',
  'manager': 'employee_dashboard',
  'administrator': 'employee_dashboard',
  'auditor': 'employee_dashboard',
};

const _platformModuleIds = <String>{
  'customer_home',
  'customer_enquiries',
  'customer_quotations',
  'customer_bookings',
  'customer_payments',
  'customer_event_tracking',
  'customer_changes',
  'customer_support',
  'vendor_home',
  'vendor_opportunities',
  'vendor_proposals',
  'vendor_work_orders',
  'vendor_availability',
  'vendor_documents',
  'vendor_payments',
  'worker_home',
  'worker_assignments',
  'worker_attendance',
  'worker_duties',
  'worker_payments',
  'employee_dashboard',
  'crm_leads',
  'crm_customers',
  'crm_quotations',
  'erp_events',
  'erp_manager_ops',
  'erp_vendors',
  'erp_workers',
  'erp_warehouse',
  'erp_finance',
  'erp_operations',
  'erp_approvals',
  'erp_reports',
  'platform_administration',
  'audit_log',
};

const _capabilityIds = <String>{
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
  'vendor_profile.manage_own',
  'vendor_availability.manage_own',
  'vendor_proposal.submit_own',
  'vendor_work_order.read_assigned',
  'vendor_work_order.update_assigned',
  'vendor_evidence.submit_assigned',
  'vendor_invoice.submit_own',
  'vendor_payment.read_own',
  'vendor_own.read',
  'vendor_own.update',
  'worker_assignment.read_own',
  'worker_assignment.respond_own',
  'worker_attendance.check_in_own',
  'worker_duty.update_own',
  'worker_payment.read_own',
  'worker_own.read',
  'worker_own.update',
  'crm_lead.read',
  'crm_lead.update',
  'crm_lead.assign',
  'crm_customer.read',
  'crm_quotation.read',
  'crm_quotation.manage',
  'crm_booking.read',
  'crm_booking.manage',
  'crm_payment.read',
  'crm_payment.approve',
  'crm_vendor.read',
  'crm_vendor.manage',
  'crm_worker.read',
  'crm_worker.manage',
  'crm_operations.read',
  'crm_operations.manage',
  'erp_event.read',
  'erp_event.manage',
  'manager_event.read',
  'manager_event.manage',
  'manager_task.read',
  'manager_task.manage',
  'manager_progress.manage',
  'manager_dashboard.read',
  'erp_vendor.read',
  'erp_vendor.manage',
  'erp_vendor_price.approve',
  'erp_worker.read',
  'erp_worker.manage',
  'inventory.read',
  'inventory.manage',
  'inventory.allocate',
  'warehouse.read',
  'warehouse.manage',
  'erp_warehouse.read',
  'erp_warehouse.manage',
  'finance.read',
  'finance.manage',
  'finance.settlement',
  'finance.dashboard',
  'erp_finance.read',
  'erp_finance.manage',
  'operations_assigned.read',
  'operations_assigned.update',
  'operations.dashboard',
  'operations.task.read',
  'operations.task.manage',
  'operations.attendance.manage',
  'operations.issue.manage',
  'operations.photo.upload',
  'operations.complete',
  'erp_operations.read',
  'erp_operations.manage',
  'erp_payment.approve',
  'erp_refund.approve',
  'erp_approval.read',
  'erp_approval.decide',
  'report.operational.read',
  'report.financial.read',
  'platform_user.manage',
  'platform_policy.manage',
  'audit.read',
  'catalog_review.read',
  'catalog_review.update',
};

const _customerModules = <String>{
  'customer_home',
  'customer_enquiries',
  'customer_quotations',
  'customer_bookings',
  'customer_payments',
  'customer_event_tracking',
  'customer_changes',
  'customer_support',
};

const _customerCapabilities = <String>{
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
};

ClientSurface? surfaceForPlatformRole(String role) => _roleSurfaces[role];

String? landingModuleForPlatformRole(String role) => _roleLandingModules[role];

class PlatformBootstrapResponse {
  final String schemaVersion;
  final int minimumClientBootstrapVersion;
  final String policyVersion;
  final String generatedAt;
  final String requestId;
  final String actorUserId;
  final String actorSessionId;
  final ClientSurface surface;
  final String activeRole;
  final String landingModule;
  final String branchId;
  final String branchCode;
  final String branchName;
  final List<String> assignedRoles;
  final List<String> modules;
  final List<String> capabilities;

  const PlatformBootstrapResponse({
    required this.schemaVersion,
    required this.minimumClientBootstrapVersion,
    required this.policyVersion,
    required this.generatedAt,
    required this.requestId,
    required this.actorUserId,
    required this.actorSessionId,
    required this.surface,
    required this.activeRole,
    required this.landingModule,
    required this.branchId,
    required this.branchCode,
    required this.branchName,
    required this.assignedRoles,
    required this.modules,
    required this.capabilities,
  });

  factory PlatformBootstrapResponse.fromJson(Map<String, dynamic> json) {
    final schemaVersion = _requiredText(json, 'schemaVersion');
    final policyVersion = _requiredText(json, 'policyVersion');
    final minimumClientVersion = json['minimumClientBootstrapVersion'];
    if (schemaVersion != platformBootstrapSchemaVersion ||
        minimumClientVersion is! int ||
        minimumClientVersion < 1 ||
        minimumClientVersion > platformBootstrapClientVersion ||
        !_policyVersionPattern.hasMatch(policyVersion)) {
      _invalid();
    }
    final generatedAt = _requiredText(json, 'generatedAt');
    final generated = DateTime.tryParse(generatedAt);
    if (generated == null || !generated.isUtc) _invalid();
    final requestId = _requiredText(json, 'requestId');

    final actor = _requiredMap(json, 'actor');
    final actorUserId = _requiredText(actor, 'userId');
    final actorSessionId = _requiredText(actor, 'sessionId');
    if (!_uuidPattern.hasMatch(actorUserId) ||
        !_uuidPattern.hasMatch(actorSessionId)) {
      _invalid();
    }
    final activeRole = _requiredKnownText(actor, 'activeRole', platformRoles);

    final branch = _requiredMap(json, 'branch');
    final branchId = _requiredText(branch, 'id');
    final branchCode = _requiredText(branch, 'code');
    final branchName = _requiredText(branch, 'name');
    final branchCity = _requiredText(branch, 'city');
    final branchState = _requiredText(branch, 'state');
    final branchCountryCode = _requiredText(branch, 'countryCode');
    final branchTimezone = _requiredText(branch, 'timezone');
    final branchCurrencyCode = _requiredText(branch, 'currencyCode');
    if (_requiredText(branch, 'status') != 'active') _invalid();
    if (branchId != hyderabadBranchId ||
        branchCode != 'HYD' ||
        branchName != 'Hyderabad' ||
        branchCity != 'Hyderabad' ||
        branchState != 'Telangana' ||
        branchCountryCode != 'IN' ||
        branchTimezone != 'Asia/Kolkata' ||
        branchCurrencyCode != 'INR') {
      _invalid();
    }

    final client = _requiredMap(json, 'client');
    final surface = ClientSurface.tryParse(client['surface']);
    if (surface == null || surface != surfaceForPlatformRole(activeRole)) {
      _invalid();
    }
    final landingModule = _requiredKnownText(
      client,
      'landingModule',
      _platformModuleIds,
    );
    if (landingModule != landingModuleForPlatformRole(activeRole)) _invalid();

    final access = _requiredMap(json, 'access');
    final assignments = _assignedRoles(
      access['assignedActiveRoles'],
      activeRole: activeRole,
      activeSurface: surface,
      branchId: branchId,
    );
    final capabilities = _capabilities(access['capabilities']);
    final modules = _modules(access['modules']);
    if (!modules.contains(landingModule)) _invalid();
    if (activeRole == 'customer' &&
        (!_containsRequiredValues(modules, _customerModules) ||
            !_containsRequiredValues(capabilities, _customerCapabilities) ||
            modules.any(
              (module) =>
                  _platformModuleIds.contains(module) &&
                  !_customerModules.contains(module),
            ) ||
            capabilities.any(
              (capability) =>
                  _capabilityIds.contains(capability) &&
                  !_customerCapabilities.contains(capability),
            ))) {
      _invalid();
    }

    final controls = _requiredMap(json, 'controls');
    _requireExact(controls, 'roleVisibility', 'assigned-active-only');
    _requireExact(controls, 'dataScope', 'hyderabad-branch-and-assignment');
    _requireExact(controls, 'mutationAudit', 'required');
    _requireExact(controls, 'serverAuthorization', 'required');

    return PlatformBootstrapResponse(
      schemaVersion: schemaVersion,
      minimumClientBootstrapVersion: minimumClientVersion,
      policyVersion: policyVersion,
      generatedAt: generatedAt,
      requestId: requestId,
      actorUserId: actorUserId,
      actorSessionId: actorSessionId,
      surface: surface,
      activeRole: activeRole,
      landingModule: landingModule,
      branchId: branchId,
      branchCode: branchCode,
      branchName: branchName,
      assignedRoles: assignments,
      modules: modules,
      capabilities: capabilities,
    );
  }

  bool get hasValidRoutingAgreement {
    return schemaVersion == platformBootstrapSchemaVersion &&
        minimumClientBootstrapVersion >= 1 &&
        minimumClientBootstrapVersion <= platformBootstrapClientVersion &&
        _policyVersionPattern.hasMatch(policyVersion) &&
        actorUserId.trim().isNotEmpty &&
        actorSessionId.trim().isNotEmpty &&
        branchId == hyderabadBranchId &&
        branchCode == 'HYD' &&
        branchName == 'Hyderabad' &&
        surfaceForPlatformRole(activeRole) == surface &&
        landingModuleForPlatformRole(activeRole) == landingModule &&
        assignedRoles.contains(activeRole) &&
        modules.contains(landingModule) &&
        (activeRole != 'customer' ||
            (_containsRequiredValues(modules, _customerModules) &&
                _containsRequiredValues(capabilities, _customerCapabilities) &&
                modules.every(
                  (module) =>
                      !_platformModuleIds.contains(module) ||
                      _customerModules.contains(module),
                ) &&
                capabilities.every(
                  (capability) =>
                      !_capabilityIds.contains(capability) ||
                      _customerCapabilities.contains(capability),
                )));
  }

  bool agreesWithSession({
    required String userId,
    required String sessionId,
    required String activeRole,
  }) {
    return actorUserId == userId &&
        actorSessionId == sessionId &&
        this.activeRole == activeRole;
  }
}

Map<String, dynamic> _requiredMap(Map<String, dynamic> parent, String key) {
  final value = parent[key];
  if (value is! Map) _invalid();
  final result = <String, dynamic>{};
  for (final entry in value.entries) {
    if (entry.key is! String) _invalid();
    result[entry.key as String] = entry.value;
  }
  return result;
}

String _requiredText(Map<String, dynamic> parent, String key) {
  final value = parent[key];
  if (value is! String ||
      value.trim().isEmpty ||
      value.length > 512 ||
      value.contains(RegExp(r'[\u0000-\u001f]'))) {
    _invalid();
  }
  return value.trim();
}

String _requiredKnownText(
  Map<String, dynamic> parent,
  String key,
  Set<String> allowed,
) {
  final value = _requiredText(parent, key);
  if (!allowed.contains(value)) _invalid();
  return value;
}

void _requireExact(Map<String, dynamic> parent, String key, String expected) {
  if (_requiredText(parent, key) != expected) _invalid();
}

List<String> _assignedRoles(
  Object? value, {
  required String activeRole,
  required ClientSurface activeSurface,
  required String branchId,
}) {
  if (value is! List) _invalid();
  final roles = <String>[];
  final assignmentKeys = <String>{};
  var hasActiveAssignment = false;
  for (final item in value) {
    if (item is! Map) _invalid();
    final assignment = <String, dynamic>{};
    for (final entry in item.entries) {
      if (entry.key is! String) _invalid();
      assignment[entry.key as String] = entry.value;
    }
    final role = _requiredKnownText(assignment, 'role', platformRoles);
    final surface = ClientSurface.tryParse(assignment['surface']);
    if (surface == null || surface != surfaceForPlatformRole(role)) _invalid();
    final scopeType = _requiredKnownText(assignment, 'scopeType', const {
      'global',
      'branch',
      'vendor',
    });
    final scopeId = _optionalText(assignment, 'scopeId');
    final active = assignment['active'];
    if (active != null && active != true) _invalid();
    switch (scopeType) {
      case 'global':
        if (role != 'administrator' || scopeId != null) _invalid();
        break;
      case 'branch':
        if (scopeId != branchId) _invalid();
        break;
      case 'vendor':
        if (!const {'vendor_owner', 'vendor_member'}.contains(role) ||
            scopeId == null ||
            !_uuidPattern.hasMatch(scopeId)) {
          _invalid();
        }
        break;
    }
    final assignmentKey = '$role|$scopeType|${scopeId ?? ''}';
    if (!assignmentKeys.add(assignmentKey)) _invalid();
    if (!roles.contains(role)) roles.add(role);
    if (role == activeRole) {
      if (surface != activeSurface) _invalid();
      hasActiveAssignment = true;
    }
  }
  if (!hasActiveAssignment) _invalid();
  return List.unmodifiable(roles);
}

String? _optionalText(Map<String, dynamic> parent, String key) {
  if (!parent.containsKey(key) || parent[key] == null) return null;
  return _requiredText(parent, key);
}

bool _containsRequiredValues(Iterable<String> actual, Set<String> expected) {
  return expected.every(actual.contains);
}

List<String> _capabilities(Object? value) {
  if (value is! List) _invalid();
  final result = <String>[];
  for (final item in value) {
    if (item is! String || item.trim().isEmpty) _invalid();
    final normalized = item.trim();
    if (!_capabilityPattern.hasMatch(normalized) ||
        result.contains(normalized)) {
      _invalid();
    }
    result.add(normalized);
  }
  return List.unmodifiable(result);
}

List<String> _modules(Object? value) {
  if (value is! List) _invalid();
  final result = <String>[];
  for (final item in value) {
    if (item is! Map) _invalid();
    final module = <String, dynamic>{};
    for (final entry in item.entries) {
      if (entry.key is! String) _invalid();
      module[entry.key as String] = entry.value;
    }
    final id = _requiredText(module, 'id');
    final area = _requiredText(module, 'area');
    if (!_catalogTokenPattern.hasMatch(id) ||
        !_catalogTokenPattern.hasMatch(area)) {
      _invalid();
    }
    _requiredText(module, 'label');
    if (result.contains(id)) _invalid();
    result.add(id);
  }
  return List.unmodifiable(result);
}

Never _invalid() => throw const BootstrapValidationException();

final _policyVersionPattern = RegExp(r'^[a-z0-9][a-z0-9._-]{0,63}$');
final _catalogTokenPattern = RegExp(r'^[a-z][a-z0-9_]{0,63}$');
final _capabilityPattern = RegExp(
  r'^[a-z][a-z0-9_]{0,63}\.[a-z][a-z0-9_]{0,63}$',
);
final _uuidPattern = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
  caseSensitive: false,
);
