import 'package:flutter/material.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/customer/catalog/catalog_image_resolver.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_icon_size.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Card for a single service listing inside CategoryDetailScreen.
class ServiceListingCard extends StatelessWidget {
  const ServiceListingCard({
    super.key,
    required this.title,
    required this.onTap,
    this.subtitle,
    this.meta,
    this.imageUrl,
    this.semanticLabel,
  });

  final String title;
  final String? subtitle;
  final String? meta;
  final String? imageUrl;
  final VoidCallback onTap;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: semanticLabel ?? title,
      excludeSemantics: true,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
        child: MeSurfaceCard(
          onTap: onTap,
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Row(
            children: [
              SizedBox(
                width: 48,
                height: 48,
                child: HomeCatalogVisual(
                  imageUrl: imageUrl,
                  label: title,
                  borderRadius: AppRadius.mdAll,
                ),
              ),
              const SizedBox(width: AppSpacing.lg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: AppTypography.titleMd,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (subtitle != null && subtitle!.trim().isNotEmpty) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        subtitle!,
                        style: AppTypography.captionSm.copyWith(
                          color: AppColors.muted,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    if (meta != null && meta!.trim().isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        meta!,
                        style: AppTypography.captionSm.copyWith(
                          color: AppColors.muted,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              const Icon(
                Icons.chevron_right_rounded,
                color: AppColors.muted,
                size: AppIconSize.lg,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
