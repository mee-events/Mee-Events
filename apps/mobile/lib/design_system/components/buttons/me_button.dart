import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_icon_size.dart';
import 'package:mee_events/theme/app_opacity.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

enum MeButtonVariant { primary, secondary, outline, text }

/// Brand-aware button. Prefer this over raw [ElevatedButton] in feature UI.
class MeButton extends StatelessWidget {
  const MeButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = MeButtonVariant.primary,
    this.expand = true,
    this.busy = false,
    this.pill = false,
    this.icon,
  });

  const MeButton.primary({
    super.key,
    required this.label,
    required this.onPressed,
    this.expand = true,
    this.busy = false,
    this.pill = true,
    this.icon,
  }) : variant = MeButtonVariant.primary;

  const MeButton.secondary({
    super.key,
    required this.label,
    required this.onPressed,
    this.expand = true,
    this.busy = false,
    this.pill = false,
    this.icon,
  }) : variant = MeButtonVariant.secondary;

  const MeButton.outline({
    super.key,
    required this.label,
    required this.onPressed,
    this.expand = true,
    this.busy = false,
    this.pill = false,
    this.icon,
  }) : variant = MeButtonVariant.outline;

  const MeButton.text({
    super.key,
    required this.label,
    required this.onPressed,
    this.expand = false,
    this.busy = false,
    this.pill = false,
    this.icon,
  }) : variant = MeButtonVariant.text;

  final String label;
  final VoidCallback? onPressed;
  final MeButtonVariant variant;
  final bool expand;
  final bool busy;
  final bool pill;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !busy;
    final radius = pill ? AppRadius.pillAll : AppRadius.mdAll;
    final child = busy
        ? SizedBox(
            width: AppIconSize.md,
            height: AppIconSize.md,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: variant == MeButtonVariant.outline ||
                      variant == MeButtonVariant.text
                  ? AppColors.primary
                  : AppColors.onPrimary,
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: AppIconSize.md),
                const SizedBox(width: AppSpacing.sm),
              ],
              Text(label),
            ],
          );

    final Widget button;
    switch (variant) {
      case MeButtonVariant.primary:
        button = ElevatedButton(
          onPressed: enabled ? onPressed : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: AppColors.onPrimary,
            disabledBackgroundColor: AppColors.primaryDisabled,
            elevation: 0,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xxl,
              vertical: AppSpacing.lg,
            ),
            shape: RoundedRectangleBorder(borderRadius: radius),
            textStyle: AppTypography.titleSm.copyWith(color: AppColors.onPrimary),
          ),
          child: child,
        );
      case MeButtonVariant.secondary:
        button = ElevatedButton(
          onPressed: enabled ? onPressed : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.ink,
            foregroundColor: AppColors.onPrimary,
            elevation: 0,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xxl,
              vertical: AppSpacing.lg,
            ),
            shape: RoundedRectangleBorder(borderRadius: radius),
            textStyle: AppTypography.titleSm,
          ),
          child: child,
        );
      case MeButtonVariant.outline:
        button = OutlinedButton(
          onPressed: enabled ? onPressed : null,
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.ink,
            side: const BorderSide(color: AppColors.hairline),
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xxl,
              vertical: AppSpacing.lg,
            ),
            shape: RoundedRectangleBorder(borderRadius: radius),
            textStyle: AppTypography.titleSm,
          ),
          child: child,
        );
      case MeButtonVariant.text:
        button = TextButton(
          onPressed: enabled ? onPressed : null,
          style: TextButton.styleFrom(
            foregroundColor: AppColors.primary,
            textStyle: AppTypography.bodyMd,
          ),
          child: child,
        );
    }

    if (!expand) return button;
    return SizedBox(width: double.infinity, child: button);
  }
}

class MeIconButton extends StatelessWidget {
  const MeIconButton({
    super.key,
    required this.icon,
    required this.onPressed,
    this.tooltip,
    this.color,
    this.destructive = false,
  });

  final IconData icon;
  final VoidCallback? onPressed;
  final String? tooltip;
  final Color? color;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final resolved = destructive
        ? AppColors.error
        : color ?? AppColors.ink;
    return IconButton(
      onPressed: onPressed,
      tooltip: tooltip,
      icon: Icon(icon, color: resolved, size: AppIconSize.lg),
      style: IconButton.styleFrom(
        foregroundColor: resolved,
        disabledForegroundColor:
            resolved.withValues(alpha: AppOpacity.disabled),
      ),
    );
  }
}
