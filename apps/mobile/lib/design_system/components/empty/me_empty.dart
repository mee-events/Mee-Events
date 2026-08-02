import 'package:flutter/material.dart';
import 'package:mee_events/design_system/components/buttons/me_button.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_icon_size.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

enum MeEmptyKind {
  orders,
  events,
  vendors,
  workers,
  notifications,
  enquiries,
  generic,
}

class MeEmptyState extends StatelessWidget {
  const MeEmptyState({
    super.key,
    required this.kind,
    this.title,
    this.message,
    this.actionLabel,
    this.onAction,
  });

  final MeEmptyKind kind;
  final String? title;
  final String? message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final config = _configFor(kind);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(config.icon, size: AppIconSize.hero, color: AppColors.muted),
            const SizedBox(height: AppSpacing.md),
            Text(title ?? config.title, style: AppTypography.titleMd),
            const SizedBox(height: AppSpacing.xs),
            Text(
              message ?? config.message,
              style: AppTypography.bodySm.copyWith(color: AppColors.muted),
              textAlign: TextAlign.center,
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: AppSpacing.xl),
              MeButton.text(label: actionLabel!, onPressed: onAction),
            ],
          ],
        ),
      ),
    );
  }

  static ({IconData icon, String title, String message}) _configFor(MeEmptyKind kind) {
    switch (kind) {
      case MeEmptyKind.orders:
        return (
          icon: Icons.receipt_long_outlined,
          title: 'No orders yet',
          message: 'Confirmed bookings and work orders will appear here.',
        );
      case MeEmptyKind.events:
        return (
          icon: Icons.celebration_outlined,
          title: 'No events yet',
          message: 'Plan an event and track it from here.',
        );
      case MeEmptyKind.vendors:
        return (
          icon: Icons.storefront_outlined,
          title: 'No vendors',
          message: 'Approved vendors for this branch will show up here.',
        );
      case MeEmptyKind.workers:
        return (
          icon: Icons.badge_outlined,
          title: 'No workers',
          message: 'Assigned field workers will appear here.',
        );
      case MeEmptyKind.notifications:
        return (
          icon: Icons.notifications_none,
          title: 'No notifications',
          message: 'Updates about your events will land here.',
        );
      case MeEmptyKind.enquiries:
        return (
          icon: Icons.mail_outline,
          title: 'No enquiries yet',
          message: 'Plan an event and our team will contact you.',
        );
      case MeEmptyKind.generic:
        return (
          icon: Icons.inbox_outlined,
          title: 'Nothing here yet',
          message: 'Check back after you take the next step.',
        );
    }
  }
}
