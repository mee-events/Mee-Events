import 'package:flutter/material.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_icon_size.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class EnquirySuccessScreen extends StatelessWidget {
  const EnquirySuccessScreen({super.key, required this.referenceCode});

  final String referenceCode;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(
        title: 'Success',
        leading: SizedBox.shrink(), // No back button
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xxxl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: const BoxDecoration(
                  color: AppColors.primarySoft,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle_outline_rounded,
                  color: AppColors.primary,
                  size: AppIconSize.hero,
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),
              Text(
                'Enquiry Received',
                style: AppTypography.displaySm,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Reference: $referenceCode',
                style: AppTypography.titleSm.copyWith(color: AppColors.primary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'Our team will review your requirements and contact you shortly to begin planning.',
                style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xxxl),
              MeButton.primary(
                label: 'Go to Dashboard',
                onPressed: () {
                  // Pop back to root (Home/Explore/Dashboard)
                  Navigator.of(context).popUntil((route) => route.isFirst);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
