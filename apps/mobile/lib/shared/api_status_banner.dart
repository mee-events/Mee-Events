import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class ApiStatusBanner extends StatelessWidget {
  final bool isConnected;

  const ApiStatusBanner({super.key, this.isConnected = true});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isConnected ? AppColors.ink : AppColors.warning,
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Text(
          isConnected ? 'Connected to Mee Events' : 'Preview · Sample data',
          style: AppTypography.bodySm,
        ),
      ],
    );
  }
}
