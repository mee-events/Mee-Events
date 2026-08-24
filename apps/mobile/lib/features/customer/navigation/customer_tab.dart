import 'package:flutter/material.dart';

/// Single source of truth for customer shell destinations.
///
/// Declaration order is the IndexedStack index and the bottom-navigation order.
/// Do not reorder without updating tests.
enum CustomerTab {
  home,
  explore,
  plan,
  enquiries,
  account;

  int get tabIndex => index;

  static CustomerTab fromIndex(int index) {
    if (index < 0 || index >= CustomerTab.values.length) {
      return CustomerTab.home;
    }
    return CustomerTab.values[index];
  }

  String get navLabel => switch (this) {
    CustomerTab.home => 'Home',
    CustomerTab.explore => 'Explore',
    CustomerTab.plan => 'Plan',
    CustomerTab.enquiries => 'Enquiries',
    CustomerTab.account => 'Account',
  };

  IconData get outlinedIcon => switch (this) {
    CustomerTab.home => Icons.home_outlined,
    CustomerTab.explore => Icons.grid_view_outlined,
    CustomerTab.plan => Icons.event_note_outlined,
    CustomerTab.enquiries => Icons.receipt_long_outlined,
    CustomerTab.account => Icons.person_outline_rounded,
  };

  IconData get selectedIcon => switch (this) {
    CustomerTab.home => Icons.home_rounded,
    CustomerTab.explore => Icons.grid_view_rounded,
    CustomerTab.plan => Icons.event_note_rounded,
    CustomerTab.enquiries => Icons.receipt_long_rounded,
    CustomerTab.account => Icons.person_rounded,
  };
}

/// Event Plan badge copy. Null means the badge must not be shown.
String? customerPlanBadgeLabel(int? count) {
  if (count == null || count <= 0) return null;
  if (count > 99) return '99+';
  return '$count';
}

String customerPlanSemanticLabel(int? count) {
  if (count == null || count <= 0) return 'Plan';
  if (count == 1) return 'Plan, 1 item';
  if (count > 99) return 'Plan, 99+ items';
  return 'Plan, $count items';
}
