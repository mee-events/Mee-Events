import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';
import 'package:mee_events/shared/connectivity_banner.dart';

class DashboardScaffold extends StatelessWidget {
  final String title;
  final String roleBadge;
  final Color accentColor;
  final Widget body;
  final Widget? footer;
  final VoidCallback? onExitPreview;
  final bool isOffline;

  const DashboardScaffold({
    super.key,
    required this.title,
    required this.roleBadge,
    required this.accentColor,
    required this.body,
    this.footer,
    this.onExitPreview,
    this.isOffline = false,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        child: Column(
          children: [
            if (isOffline) const ConnectivityBanner(),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md,
                      vertical: AppSpacing.xs,
                    ),
                    decoration: BoxDecoration(
                      color: accentColor,
                      borderRadius: AppRadius.pillAll,
                    ),
                    child: Text(
                      roleBadge,
                      style: AppTypography.caption.copyWith(color: AppColors.canvas),
                    ),
                  ),
                  const Spacer(),
                  if (onExitPreview != null)
                    TextButton(
                      onPressed: onExitPreview,
                      child: const Text('Exit preview'),
                    ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                child: body,
              ),
            ),
            if (footer != null) footer!,
          ],
        ),
      ),
    );
  }
}
