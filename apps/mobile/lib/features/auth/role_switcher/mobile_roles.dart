import 'package:flutter/material.dart';

const mobileSwitchableRoles = {
  'customer',
  'vendor_owner',
  'vendor_member',
  'worker',
};

const employeeRoles = {
  'employee',
  'support',
  'finance',
  'manager',
  'administrator',
  'auditor',
};

class MobileRoleOption {
  final String backendRole;
  final String label;
  final String description;
  final IconData icon;
  final bool selected;

  const MobileRoleOption({
    required this.backendRole,
    required this.label,
    required this.description,
    required this.icon,
    required this.selected,
  });
}

/// Prefers `vendor_owner` when entering Vendor. Keeps the current Vendor role
/// when Vendor is already active so owner/member are not shown as two rows.
String? preferredVendorRole({
  required String activeRole,
  required Iterable<String> assignedActiveRoles,
}) {
  final assigned = assignedActiveRoles.toSet();
  if ((activeRole == 'vendor_owner' || activeRole == 'vendor_member') &&
      assigned.contains(activeRole)) {
    return activeRole;
  }
  if (assigned.contains('vendor_owner')) {
    return 'vendor_owner';
  }
  if (assigned.contains('vendor_member')) {
    return 'vendor_member';
  }
  return null;
}

String mobileRoleLabel(String backendRole) {
  switch (backendRole) {
    case 'vendor_owner':
    case 'vendor_member':
      return 'Vendor';
    case 'worker':
      return 'Worker';
    default:
      return 'Customer';
  }
}

String mobileRoleDescription(String backendRole) {
  switch (backendRole) {
    case 'vendor_owner':
    case 'vendor_member':
      return 'Manage approved event work';
    case 'worker':
      return 'View assignments and duties';
    default:
      return 'Plan and track your events';
  }
}

IconData mobileRoleIcon(String backendRole) {
  switch (backendRole) {
    case 'vendor_owner':
    case 'vendor_member':
      return Icons.storefront_outlined;
    case 'worker':
      return Icons.badge_outlined;
    default:
      return Icons.celebration_outlined;
  }
}

List<MobileRoleOption> visibleMobileRoles({
  required String activeRole,
  required Iterable<String> assignedActiveRoles,
}) {
  final assigned = assignedActiveRoles
      .where(mobileSwitchableRoles.contains)
      .toSet();
  final options = <MobileRoleOption>[];

  if (assigned.contains('customer')) {
    options.add(
      _option(backendRole: 'customer', selected: activeRole == 'customer'),
    );
  }

  final vendorRole = preferredVendorRole(
    activeRole: activeRole,
    assignedActiveRoles: assigned,
  );
  if (vendorRole != null) {
    options.add(
      _option(backendRole: vendorRole, selected: activeRole == vendorRole),
    );
  }

  if (assigned.contains('worker')) {
    options.add(
      _option(backendRole: 'worker', selected: activeRole == 'worker'),
    );
  }

  return options;
}

bool showsApprovalFooter(Iterable<MobileRoleOption> options) {
  return options.length == 1 && options.first.backendRole == 'customer';
}

MobileRoleOption _option({
  required String backendRole,
  required bool selected,
}) {
  return MobileRoleOption(
    backendRole: backendRole,
    label: mobileRoleLabel(backendRole),
    description: mobileRoleDescription(backendRole),
    icon: mobileRoleIcon(backendRole),
    selected: selected,
  );
}
