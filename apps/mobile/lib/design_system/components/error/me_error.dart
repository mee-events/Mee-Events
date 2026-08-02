import 'package:flutter/material.dart';
import 'package:mee_events/design_system/components/buttons/me_button.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_icon_size.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

enum MeErrorKind { network, server, generic }

class MeErrorState extends StatelessWidget {
  const MeErrorState({
    super.key,
    this.kind = MeErrorKind.generic,
    this.title,
    this.message,
    this.onRetry,
  });

  final MeErrorKind kind;
  final String? title;
  final String? message;
  final VoidCallback? onRetry;

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
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: AppSpacing.xl),
              MeRetry(onRetry: onRetry!),
            ],
          ],
        ),
      ),
    );
  }

  static ({IconData icon, String title, String message}) _configFor(MeErrorKind kind) {
    switch (kind) {
      case MeErrorKind.network:
        return (
          icon: Icons.wifi_off_outlined,
          title: 'Connection problem',
          message: 'Check your network and try again.',
        );
      case MeErrorKind.server:
        return (
          icon: Icons.cloud_off_outlined,
          title: 'Something went wrong',
          message: 'Our servers had a problem. Please try again shortly.',
        );
      case MeErrorKind.generic:
        return (
          icon: Icons.error_outline,
          title: 'Unable to load',
          message: 'Please try again.',
        );
    }
  }
}

class MeRetry extends StatelessWidget {
  const MeRetry({
    super.key,
    required this.onRetry,
    this.label = 'Retry',
  });

  final VoidCallback onRetry;
  final String label;

  @override
  Widget build(BuildContext context) {
    return MeButton.text(label: label, onPressed: onRetry);
  }
}
