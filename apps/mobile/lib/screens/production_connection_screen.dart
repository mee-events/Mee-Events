import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class ProductionConnectionScreen extends StatelessWidget {
  const ProductionConnectionScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                color: AppColors.ink,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  'M',
                  style: AppTypography.displayMd.copyWith(color: AppColors.canvas),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Mee Events',
              style: AppTypography.displayMd,
            ),
            const SizedBox(height: AppSpacing.lg),
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.ink,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Connecting...',
              style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
            ),
            const SizedBox(height: AppSpacing.xl),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxxl),
              child: Text(
                'Development previews are disabled in production builds. The app will connect to the Mee Events platform for authentication.',
                textAlign: TextAlign.center,
                style: AppTypography.bodySm.copyWith(color: AppColors.muted),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
