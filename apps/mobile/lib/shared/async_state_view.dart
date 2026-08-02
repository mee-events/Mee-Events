import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

enum AsyncState { loading, error, offline, empty }

class AsyncStateView extends StatelessWidget {
  final AsyncState state;
  final String? message;
  final VoidCallback? onRetry;

  const AsyncStateView({
    super.key,
    required this.state,
    this.message,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color iconColor;
    String title;

    switch (state) {
      case AsyncState.loading:
        return Center(
          child: CircularProgressIndicator(color: AppColors.ink),
        );
      case AsyncState.error:
        icon = Icons.error_outline;
        iconColor = AppColors.error;
        title = 'Something went wrong';
        break;
      case AsyncState.offline:
        icon = Icons.cloud_off;
        iconColor = AppColors.muted;
        title = 'You are offline';
        break;
      case AsyncState.empty:
        icon = Icons.inbox_outlined;
        iconColor = AppColors.muted;
        title = 'Nothing here yet';
        break;
    }

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 40, color: iconColor),
          const SizedBox(height: AppSpacing.md),
          Text(title, style: AppTypography.displaySm),
          if (message != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              message!,
              style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
              textAlign: TextAlign.center,
            ),
          ],
          if (onRetry != null) ...[
            const SizedBox(height: AppSpacing.lg),
            ElevatedButton(
              onPressed: onRetry,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.ink,
              ),
              child: const Text('Retry'),
            ),
          ],
        ],
      ),
    );
  }
}
