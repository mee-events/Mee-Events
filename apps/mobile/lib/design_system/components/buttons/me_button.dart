import 'package:flutter/material.dart';
import 'package:mee_events/design_system/components/motion/me_pressable.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_elevation.dart';
import 'package:mee_events/theme/app_icon_size.dart';
import 'package:mee_events/theme/app_opacity.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

enum MeButtonVariant { primary, secondary, outline, text, premium, destructive }

/// Matches [MeCircularLoader] stroke for busy state consistency.
const double _loaderStrokeWidth = 2.5;

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

  const MeButton.premium({
    super.key,
    required this.label,
    required this.onPressed,
    this.expand = true,
    this.busy = false,
    this.pill = true,
    this.icon,
  }) : variant = MeButtonVariant.premium;

  const MeButton.destructive({
    super.key,
    required this.label,
    required this.onPressed,
    this.expand = true,
    this.busy = false,
    this.pill = false,
    this.icon,
  }) : variant = MeButtonVariant.destructive;

  final String label;
  final VoidCallback? onPressed;
  final MeButtonVariant variant;
  final bool expand;
  final bool busy;
  final bool pill;
  final IconData? icon;

  bool get _usesOnPrimaryLoader =>
      variant == MeButtonVariant.primary ||
      variant == MeButtonVariant.premium ||
      variant == MeButtonVariant.destructive;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !busy;
    final radius = pill ? AppRadius.pillAll : AppRadius.mdAll;
    final child = busy
        ? SizedBox(
            width: AppIconSize.md,
            height: AppIconSize.md,
            child: CircularProgressIndicator(
              strokeWidth: _loaderStrokeWidth,
              color: _usesOnPrimaryLoader
                  ? AppColors.onPrimary
                  : AppColors.primary,
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
              Flexible(child: Text(label, textAlign: TextAlign.center)),
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
            disabledBackgroundColor: AppColors.disabledSurface,
            disabledForegroundColor: AppColors.disabledText,
            overlayColor: AppColors.primaryActive.withValues(alpha: 0.18),
            elevation: AppElevation.flat,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xxl,
              vertical: AppSpacing.lg,
            ),
            shape: RoundedRectangleBorder(borderRadius: radius),
            textStyle: AppTypography.titleSm.copyWith(
              color: AppColors.onPrimary,
            ),
          ),
          child: child,
        );
      case MeButtonVariant.premium:
        button = ElevatedButton(
          onPressed: enabled ? onPressed : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.goldAccent,
            foregroundColor: AppColors.onGold,
            disabledBackgroundColor: AppColors.disabledSurface,
            disabledForegroundColor: AppColors.disabledText,
            overlayColor: AppColors.goldAntique.withValues(alpha: 0.22),
            elevation: AppElevation.flat,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xxl,
              vertical: AppSpacing.lg,
            ),
            shape: RoundedRectangleBorder(borderRadius: radius),
            textStyle: AppTypography.titleSm.copyWith(
              color: AppColors.onGold,
              fontWeight: FontWeight.w700,
            ),
          ),
          child: child,
        );
      case MeButtonVariant.secondary:
        button = ElevatedButton(
          onPressed: enabled ? onPressed : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primarySoft,
            foregroundColor: AppColors.primary,
            disabledBackgroundColor: AppColors.disabledSurface,
            disabledForegroundColor: AppColors.disabledText,
            overlayColor: AppColors.primary.withValues(alpha: 0.12),
            elevation: AppElevation.flat,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xxl,
              vertical: AppSpacing.lg,
            ),
            shape: RoundedRectangleBorder(borderRadius: radius),
            textStyle: AppTypography.titleSm.copyWith(color: AppColors.primary),
          ),
          child: child,
        );
      case MeButtonVariant.outline:
        button = OutlinedButton(
          onPressed: enabled ? onPressed : null,
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.primary,
            side: BorderSide(
              color: enabled ? AppColors.primary : AppColors.hairline,
            ),
            disabledForegroundColor: AppColors.disabledText,
            overlayColor: AppColors.primarySoft,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xxl,
              vertical: AppSpacing.lg,
            ),
            shape: RoundedRectangleBorder(borderRadius: radius),
            textStyle: AppTypography.titleSm,
          ),
          child: child,
        );
      case MeButtonVariant.destructive:
        button = ElevatedButton(
          onPressed: enabled ? onPressed : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.error,
            foregroundColor: AppColors.onPrimary,
            disabledBackgroundColor: AppColors.disabledSurface,
            disabledForegroundColor: AppColors.disabledText,
            elevation: AppElevation.flat,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xxl,
              vertical: AppSpacing.lg,
            ),
            shape: RoundedRectangleBorder(borderRadius: radius),
            textStyle: AppTypography.titleSm.copyWith(
              color: AppColors.onPrimary,
            ),
          ),
          child: child,
        );
      case MeButtonVariant.text:
        button = TextButton(
          onPressed: enabled ? onPressed : null,
          style: TextButton.styleFrom(
            foregroundColor: AppColors.primary,
            disabledForegroundColor: AppColors.disabledText,
            textStyle: AppTypography.bodyMd,
          ),
          child: child,
        );
    }

    final sized = expand
        ? SizedBox(width: double.infinity, child: button)
        : button;
    return MePressable(enabled: enabled, borderRadius: radius, child: sized);
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
        : color ?? AppColors.primaryActive;
    return MePressable(
      enabled: onPressed != null,
      borderRadius: AppRadius.pillAll,
      child: IconButton(
        onPressed: onPressed,
        tooltip: tooltip,
        icon: Icon(icon, color: resolved, size: AppIconSize.lg),
        style: IconButton.styleFrom(
          foregroundColor: resolved,
          disabledForegroundColor: resolved.withValues(
            alpha: AppOpacity.disabled,
          ),
        ),
      ),
    );
  }
}

/// Favorite / heart control — inactive white circle + burgundy outline;
/// active burgundy fill + white heart with press scale via [MePressable].
class MeFavoriteButton extends StatelessWidget {
  const MeFavoriteButton({
    super.key,
    required this.active,
    required this.onPressed,
    this.size = 36,
  });

  final bool active;
  final VoidCallback? onPressed;
  final double size;

  @override
  Widget build(BuildContext context) {
    return MePressable(
      enabled: onPressed != null,
      borderRadius: AppRadius.pillAll,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          customBorder: const CircleBorder(),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: active ? AppColors.primary : AppColors.surfaceCard,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.primary, width: 1.5),
            ),
            alignment: Alignment.center,
            child: Icon(
              active ? Icons.favorite_rounded : Icons.favorite_border_rounded,
              size: size * 0.5,
              color: active ? AppColors.onPrimary : AppColors.primary,
            ),
          ),
        ),
      ),
    );
  }
}
