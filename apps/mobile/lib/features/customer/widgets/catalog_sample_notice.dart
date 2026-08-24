import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Honest label for Home/Explore sample catalog chrome.
/// Live customer path is Plan / Start enquiry — not this browse UI.
class CatalogSampleNotice extends StatelessWidget {
  const CatalogSampleNotice({
    super.key,
    this.onPlan,
    this.onStartEnquiry,
    this.compact = false,
  });

  final VoidCallback? onPlan;
  final VoidCallback? onStartEnquiry;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: compact ? AppSpacing.sm : AppSpacing.md,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceSoft,
        borderRadius: AppRadius.mdAll,
        border: Border.all(color: AppColors.goldAccent.withValues(alpha: 0.45)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                Icons.info_outline_rounded,
                size: 18,
                color: AppColors.muted,
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  'Browse below is sample inspiration only. '
                  'To book with Mee Events, start a plan or enquiry.',
                  style: AppTypography.bodySm.copyWith(color: AppColors.body),
                ),
              ),
            ],
          ),
          if (onPlan != null || onStartEnquiry != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: [
                if (onStartEnquiry != null)
                  TextButton(
                    onPressed: onStartEnquiry,
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      padding: EdgeInsets.zero,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(
                      'Start enquiry',
                      style: AppTypography.caption.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                if (onPlan != null)
                  TextButton(
                    onPressed: onPlan,
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.ink,
                      padding: EdgeInsets.zero,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(
                      'Go to Plan',
                      style: AppTypography.caption.copyWith(
                        color: AppColors.ink,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
