import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

const kHomeSearchHint = 'Search occasions, services and options';

class HomeSearchBar extends StatelessWidget {
  const HomeSearchBar({
    super.key,
    this.onTap,
    this.hint = kHomeSearchHint,
    this.padded = true,
    this.semanticLabel,
  });

  final VoidCallback? onTap;
  final String hint;
  final bool padded;
  final String? semanticLabel;

  static const double minHeight = 48;

  @override
  Widget build(BuildContext context) {
    final label = semanticLabel ?? hint;
    final field = Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: Material(
        color: AppColors.surfaceCard,
        elevation: 0,
        shadowColor: AppColors.scrim.withValues(alpha: 0.12),
        borderRadius: AppRadius.lgAll,
        child: InkWell(
          onTap: onTap,
          borderRadius: AppRadius.lgAll,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: minHeight),
            child: Container(
              height: minHeight,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
              decoration: BoxDecoration(
                borderRadius: AppRadius.lgAll,
                border: Border.all(
                  color: AppColors.goldAccent.withValues(alpha: 0.45),
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.scrim.withValues(alpha: 0.06),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.search_rounded,
                    color: AppColors.primary,
                    size: 22,
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Text(
                      hint,
                      style: AppTypography.bodySm.copyWith(
                        color: AppColors.muted,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    if (!padded) return field;
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.xl,
        AppSpacing.sm,
        AppSpacing.xl,
        AppSpacing.md,
      ),
      child: field,
    );
  }
}
