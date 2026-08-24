import 'package:flutter/material.dart';
import 'package:mee_events/core/widgets/image/app_image.dart';
import 'package:mee_events/design_system/components/motion/me_pressable.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_elevation.dart';
import 'package:mee_events/theme/app_icon_size.dart';
import 'package:mee_events/theme/app_opacity.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Base bordered surface used by domain cards.
class MeSurfaceCard extends StatelessWidget {
  const MeSurfaceCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding,
    this.margin,
    this.clipBehavior = Clip.none,
    this.selected = false,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Clip clipBehavior;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final content = Container(
      margin: margin,
      padding: padding ?? const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: selected ? AppColors.primarySoft : AppColors.surfaceCard,
        borderRadius: AppRadius.cardAll,
        border: Border.all(
          color: selected ? AppColors.primary : AppColors.hairlineSoft,
          width: selected ? 1.75 : 1,
        ),
        boxShadow: AppElevation.lowShadow,
      ),
      clipBehavior: clipBehavior,
      child: child,
    );
    if (onTap == null) return content;
    return MePressable(
      onTap: onTap,
      borderRadius: AppRadius.cardAll,
      splashColor: AppColors.primarySoft,
      child: content,
    );
  }
}

class MeEventCard extends StatelessWidget {
  const MeEventCard({
    super.key,
    required this.title,
    this.subtitle,
    this.meta,
    this.trailing,
    this.onTap,
    this.image,
  });

  final String title;
  final String? subtitle;
  final String? meta;
  final Widget? trailing;
  final VoidCallback? onTap;
  final Widget? image;

  @override
  Widget build(BuildContext context) {
    return MeSurfaceCard(
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (image != null) ...[
            ClipRRect(
              borderRadius: AppRadius.smAll,
              child: SizedBox(width: 72, height: 72, child: image),
            ),
            const SizedBox(width: AppSpacing.md),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppTypography.titleMd),
                if (subtitle != null) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    subtitle!,
                    style: AppTypography.bodySm.copyWith(
                      color: AppColors.muted,
                    ),
                  ),
                ],
                if (meta != null) ...[
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    meta!,
                    style: AppTypography.captionSm.copyWith(
                      color: AppColors.mutedSoft,
                    ),
                  ),
                ],
              ],
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

class MeCategoryCard extends StatelessWidget {
  const MeCategoryCard({
    super.key,
    required this.label,
    required this.icon,
    this.onTap,
    this.selected = false,
  });

  final String label;
  final IconData icon;
  final VoidCallback? onTap;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    return MeSurfaceCard(
      onTap: onTap,
      selected: selected,
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: AppIconSize.xxl,
            color: selected ? AppColors.primary : AppColors.ink,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            label,
            textAlign: TextAlign.center,
            style: AppTypography.caption.copyWith(
              color: selected ? AppColors.primary : AppColors.ink,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class MeVendorCard extends StatelessWidget {
  const MeVendorCard({
    super.key,
    required this.name,
    this.category,
    this.rating,
    this.onTap,
    this.leading,
  });

  final String name;
  final String? category;
  final String? rating;
  final VoidCallback? onTap;
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    return MeEventCard(
      title: name,
      subtitle: category,
      meta: rating,
      onTap: onTap,
      image: leading,
    );
  }
}

class MeWorkerCard extends StatelessWidget {
  const MeWorkerCard({
    super.key,
    required this.name,
    this.role,
    this.status,
    this.onTap,
  });

  final String name;
  final String? role;
  final Widget? status;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return MeEventCard(
      title: name,
      subtitle: role,
      trailing: status,
      onTap: onTap,
    );
  }
}

class MeOrderCard extends StatelessWidget {
  const MeOrderCard({
    super.key,
    required this.reference,
    required this.title,
    this.subtitle,
    this.status,
    this.onTap,
  });

  final String reference;
  final String title;
  final String? subtitle;
  final Widget? status;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return MeSurfaceCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(title, style: AppTypography.titleMd)),
              ?status,
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            reference,
            style: AppTypography.captionSm.copyWith(color: AppColors.muted),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              subtitle!,
              style: AppTypography.bodySm.copyWith(color: AppColors.muted),
            ),
          ],
        ],
      ),
    );
  }
}

class MePaymentCard extends StatelessWidget {
  const MePaymentCard({
    super.key,
    required this.title,
    required this.amount,
    this.subtitle,
    this.trailing,
    this.onTap,
  });

  final String title;
  final String amount;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return MeSurfaceCard(
      onTap: onTap,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppTypography.titleMd),
                if (subtitle != null)
                  Text(
                    subtitle!,
                    style: AppTypography.captionSm.copyWith(
                      color: AppColors.muted,
                    ),
                  ),
              ],
            ),
          ),
          Text(amount, style: AppTypography.titleMd),
          if (trailing != null) ...[
            const SizedBox(width: AppSpacing.sm),
            trailing!,
          ],
        ],
      ),
    );
  }
}

class MeDashboardCard extends StatelessWidget {
  const MeDashboardCard({
    super.key,
    required this.label,
    required this.value,
    this.detail,
    this.tone = MeDashboardTone.neutral,
  });

  final String label;
  final String value;
  final String? detail;
  final MeDashboardTone tone;

  @override
  Widget build(BuildContext context) {
    final accent = switch (tone) {
      MeDashboardTone.success => AppColors.success,
      MeDashboardTone.warning => AppColors.warning,
      MeDashboardTone.brand => AppColors.primary,
      MeDashboardTone.neutral => AppColors.ink,
    };
    return MeSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: AppTypography.captionSm.copyWith(color: AppColors.muted),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(value, style: AppTypography.displaySm.copyWith(color: accent)),
          if (detail != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              detail!,
              style: AppTypography.captionSm.copyWith(
                color: AppColors.mutedSoft,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

enum MeDashboardTone { neutral, brand, success, warning }

/// Image-led card for discovery surfaces (Home spotlight, Explore, Category).
class MeMediaCard extends StatelessWidget {
  const MeMediaCard({
    super.key,
    required this.imageUrl,
    required this.title,
    this.subtitle,
    this.badge,
    this.onTap,
    this.aspectRatio = 16 / 10,
    this.width,
  });

  final String imageUrl;
  final String title;
  final String? subtitle;
  final Widget? badge;
  final VoidCallback? onTap;
  final double aspectRatio;
  final double? width;

  @override
  Widget build(BuildContext context) {
    final card = Container(
      width: width,
      decoration: BoxDecoration(
        borderRadius: AppRadius.cardAll,
        boxShadow: AppElevation.mediumShadow,
      ),
      child: ClipRRect(
        borderRadius: AppRadius.cardAll,
        child: AspectRatio(
          aspectRatio: aspectRatio,
          child: Stack(
            fit: StackFit.expand,
            children: [
              AppImage(imageUrl: imageUrl, fit: BoxFit.cover),
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        AppColors.scrim.withValues(alpha: AppOpacity.invisible),
                        AppColors.scrim.withValues(alpha: AppOpacity.scrim),
                        AppColors.ink.withValues(alpha: AppOpacity.heavy),
                      ],
                      stops: const [0.4, 0.72, 1.0],
                    ),
                  ),
                ),
              ),
              if (badge != null)
                Positioned(
                  top: AppSpacing.md,
                  left: AppSpacing.md,
                  child: badge!,
                ),
              Positioned(
                left: AppSpacing.lg,
                right: AppSpacing.lg,
                bottom: AppSpacing.lg,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      style: AppTypography.displaySm.copyWith(
                        color: AppColors.onPrimary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        subtitle!,
                        style: AppTypography.bodySm.copyWith(
                          color: AppColors.onPrimary.withValues(
                            alpha: AppOpacity.heavy,
                          ),
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );

    if (onTap == null) return card;
    return MePressable(
      onTap: onTap,
      borderRadius: AppRadius.cardAll,
      splashColor: AppColors.primarySoft,
      child: card,
    );
  }
}
