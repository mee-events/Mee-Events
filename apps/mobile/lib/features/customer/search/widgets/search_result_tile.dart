import 'package:flutter/material.dart';
import 'package:mee_events/features/customer/catalog/catalog_image_resolver.dart';
import 'package:mee_events/features/customer/search/search_models.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class SearchResultTile extends StatelessWidget {
  const SearchResultTile({super.key, required this.hit, required this.onTap});

  final SearchHit hit;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final imageUrl = CatalogImageResolver.resolvedServiceImage(
      coverImageUrl: hit.imageUrl,
    );
    return Semantics(
      button: true,
      enabled: true,
      label: searchHitSemanticLabel(hit),
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
                      label: hit.name,
                      borderRadius: AppRadius.mdAll,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          hit.name,
                          style: AppTypography.titleSm,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          searchHitKindLabel(hit),
                          style: AppTypography.captionSm.copyWith(
                            color: AppColors.muted,
                          ),
                        ),
                      ],
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
