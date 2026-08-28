import 'package:mee_events/models/client_surface.dart';

class BootstrapValidationException implements Exception {
  const BootstrapValidationException();

  @override
  String toString() => 'BootstrapValidationException';
}

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

const _platformAreas = <String>{'self_service', 'crm', 'erp', 'governance'};

ClientSurface? surfaceForPlatformRole(String role) => _roleSurfaces[role];

String? landingModuleForPlatformRole(String role) => _roleLandingModules[role];

class PlatformBootstrapResponse {
  final ClientSurface surface;
  final String activeRole;
  final String landingModule;
  final String branchCode;
  final String branchName;
  final List<String> assignedRoles;
  final List<String> modules;
  final List<String> capabilities;

  const PlatformBootstrapResponse({
    required this.surface,
    required this.activeRole,
    required this.landingModule,
    required this.branchCode,
    required this.branchName,
    required this.assignedRoles,
    required this.modules,
    required this.capabilities,
  });

  factory PlatformBootstrapResponse.fromJson(Map<String, dynamic> json) {
    _requiredText(json, 'schemaVersion');
    _requiredText(json, 'policyVersion');
    final generatedAt = _requiredText(json, 'generatedAt');
    if (DateTime.tryParse(generatedAt) == null) _invalid();
    _requiredText(json, 'requestId');

    final actor = _requiredMap(json, 'actor');
    _requiredText(actor, 'userId');
    _requiredText(actor, 'sessionId');
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
    if (branchCode == 'HYD' &&
        (branchId != '00000000-0000-4000-8000-000000000001' ||
            branchName != 'Hyderabad' ||
            branchCity != 'Hyderabad' ||
            branchState != 'Telangana' ||
            branchCountryCode != 'IN' ||
            branchTimezone != 'Asia/Kolkata' ||
            branchCurrencyCode != 'INR')) {
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
    final capabilities = _knownStringList(
      access['capabilities'],
      _capabilityIds,
    );
    final modules = _modules(access['modules']);
    if (!modules.contains(landingModule)) _invalid();

    final controls = _requiredMap(json, 'controls');
    _requireExact(controls, 'roleVisibility', 'assigned-active-only');
    _requireExact(controls, 'dataScope', 'hyderabad-branch-and-assignment');
    _requireExact(controls, 'mutationAudit', 'required');
    _requireExact(controls, 'serverAuthorization', 'required');

    return PlatformBootstrapResponse(
      surface: surface,
      activeRole: activeRole,
      landingModule: landingModule,
      branchCode: branchCode,
      branchName: branchName,
      assignedRoles: assignments,
      modules: modules,
      capabilities: capabilities,
    );
  }

  bool get hasValidRoutingAgreement {
    return branchCode.trim().isNotEmpty &&
        branchName.trim().isNotEmpty &&
        surfaceForPlatformRole(activeRole) == surface &&
        landingModuleForPlatformRole(activeRole) == landingModule &&
        assignedRoles.contains(activeRole) &&
        modules.contains(landingModule);
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
  if (value is! String || value.trim().isEmpty) _invalid();
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
    final scopeId = _requiredText(assignment, 'scopeId');
    if (!roles.contains(role)) roles.add(role);
    if (role == activeRole) {
      if (surface != activeSurface || scopeId != branchId) _invalid();
      hasActiveAssignment = true;
    }
  }
  if (!hasActiveAssignment) _invalid();
  return List.unmodifiable(roles);
}

List<String> _knownStringList(Object? value, Set<String> allowed) {
  if (value is! List) _invalid();
  final result = <String>[];
  for (final item in value) {
    if (item is! String || item.trim().isEmpty) _invalid();
    final normalized = item.trim();
    if (!allowed.contains(normalized) || result.contains(normalized)) {
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
    final id = _requiredKnownText(module, 'id', _platformModuleIds);
    _requiredText(module, 'label');
    _requiredKnownText(module, 'area', _platformAreas);
    if (result.contains(id)) _invalid();
    result.add(id);
  }
  return List.unmodifiable(result);
}

Never _invalid() => throw const BootstrapValidationException();
