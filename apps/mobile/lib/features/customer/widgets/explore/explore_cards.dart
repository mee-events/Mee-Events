import 'package:flutter/material.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/customer/catalog/catalog_image_resolver.dart';
import 'package:mee_events/features/customer/widgets/home/discovery_skeletons.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class ExploreOccasionCard extends StatelessWidget {
  const ExploreOccasionCard({
    super.key,
    required this.code,
    required this.title,
    required this.onTap,
    this.coverImageUrl,
    this.thumbnailUrl,
  });

  final String code;
  final String title;
  final String? coverImageUrl;
  final String? thumbnailUrl;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final imageUrl = CatalogImageResolver.resolvedHomeImage(
      code: code,
      remoteUrl: thumbnailUrl ?? coverImageUrl,
    );
    return Semantics(
      button: true,
      enabled: true,
      label: '$title, occasion',
      onTap: onTap,
      excludeSemantics: true,
      child: Material(
        color: AppColors.surfaceCard,
        borderRadius: AppRadius.cardAll,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: HomeCatalogVisual(
                    imageUrl: imageUrl,
                    label: title,
                    borderRadius: BorderRadius.zero,
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.sm,
                    AppSpacing.sm,
                    AppSpacing.sm,
                    AppSpacing.md,
                  ),
                  child: Text(
                    title,
                    style: AppTypography.titleSm,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class ExploreServiceCard extends StatelessWidget {
  const ExploreServiceCard({
    super.key,
    required this.title,
    required this.onTap,
    this.coverImageUrl,
    this.iconUrl,
  });

  final String title;
  final String? coverImageUrl;
  final String? iconUrl;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final imageUrl = CatalogImageResolver.resolvedServiceImage(
      coverImageUrl: coverImageUrl,
      iconUrl: iconUrl,
    );
    return Semantics(
      button: true,
      enabled: true,
      label: '$title, service',
      onTap: onTap,
      excludeSemantics: true,
      child: Material(
        color: AppColors.surfaceCard,
        borderRadius: AppRadius.cardAll,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 64),
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.sm),
              child: Row(
                children: [
                  SizedBox(
                    width: 56,
                    height: 56,
                    child: HomeCatalogVisual(
                      imageUrl: imageUrl,
                      label: title,
                      borderRadius: AppRadius.mdAll,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Text(
                      title,
                      style: AppTypography.titleSm,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Icon(
                    Icons.chevron_right_rounded,
                    color: AppColors.muted,
                    size: 22,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class ExploreServiceListSkeleton extends StatelessWidget {
  const ExploreServiceListSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < 6; i++) ...[
          const MeSkeleton(height: 64, borderRadius: AppRadius.cardAll),
          if (i < 5) const SizedBox(height: AppSpacing.sm),
        ],
      ],
    );
  }
}

class ExploreOccasionGridSkeleton extends StatelessWidget {
  const ExploreOccasionGridSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const ExploreGridSkeleton();
  }
}
