import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_elevation.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Persistent bottom action bar for category / service detail screens.
class StickyEnquiryBar extends StatelessWidget {
  const StickyEnquiryBar({
    super.key,
    required this.label,
    this.onPressed,
    this.resultCount,
    this.semanticLabel,
  });

  final String label;
  final VoidCallback? onPressed;
  final int? resultCount;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    final enabled = onPressed != null;

    return Align(
      alignment: Alignment.bottomCenter,
      heightFactor: 1,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.surfaceCard,
          border: const Border(top: BorderSide(color: AppColors.hairlineSoft)),
          boxShadow: AppElevation.mediumShadow,
        ),
        child: Padding(
          padding: EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.lg,
            AppSpacing.lg,
            AppSpacing.lg + bottomPadding,
          ),
          child: Row(
            children: [
              if (resultCount != null) ...[
                Expanded(
                  child: Text(
                    '$resultCount ${resultCount == 1 ? 'service' : 'services'}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.captionSm.copyWith(
                      color: AppColors.muted,
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
              ],
              Expanded(
                flex: resultCount != null ? 2 : 1,
                child: Semantics(
                  button: true,
                  enabled: enabled,
                  label: semanticLabel ?? label,
                  excludeSemantics: true,
                  child: Material(
                    color: enabled
                        ? AppColors.primary
                        : AppColors.primaryDisabled,
                    borderRadius: AppRadius.mdAll,
                    child: InkWell(
                      onTap: onPressed,
                      borderRadius: AppRadius.mdAll,
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(
                          minHeight: 44,
                          minWidth: 44,
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.md,
                          ),
                          child: Center(
                            child: Text(
                              label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.center,
                              style: AppTypography.titleSm.copyWith(
                                color: enabled
                                    ? AppColors.onPrimary
                                    : AppColors.disabledText,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
