import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';

enum SummaryTone { green, gold, paper }

class SummaryCard extends StatelessWidget {
  final String label;
  final String value;
  final String? helper;
  final SummaryTone tone;

  const SummaryCard({
    super.key,
    required this.label,
    required this.value,
    this.helper,
    required this.tone,
  });

  @override
  Widget build(BuildContext context) {
    Color backgroundColor;
    Color borderColor;

    switch (tone) {
      case SummaryTone.green:
        backgroundColor = AppColors.mutedSoft;
        borderColor = AppColors.ink;
        break;
      case SummaryTone.gold:
        backgroundColor = AppColors.primarySoft;
        borderColor = AppColors.primary;
        break;
      case SummaryTone.paper:
        backgroundColor = AppColors.surfaceCard;
        borderColor = AppColors.hairlineSoft;
        break;
    }

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: backgroundColor,
        border: Border.all(color: borderColor),
        borderRadius: AppRadius.cardAll,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: AppTypography.caption.copyWith(color: AppColors.muted),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(value, style: AppTypography.displayMd),
          if (helper != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(helper!, style: AppTypography.bodySm),
          ],
        ],
      ),
    );
  }
}
