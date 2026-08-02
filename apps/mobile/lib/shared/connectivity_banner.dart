import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class ConnectivityBanner extends StatelessWidget {
  const ConnectivityBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.error,
      padding: const EdgeInsets.all(AppSpacing.sm),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.cloud_off, size: 16, color: AppColors.canvas),
          const SizedBox(width: AppSpacing.sm),
          Text(
            'You are offline',
            style: AppTypography.caption.copyWith(color: AppColors.canvas),
          ),
        ],
      ),
    );
  }
}
