import 'package:flutter/material.dart';
import 'package:mee_events/features/customer/catalog/catalog_image_resolver.dart';
import 'package:mee_events/models/catalog_product.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_elevation.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class ServiceProductCard extends StatelessWidget {
  const ServiceProductCard({
    super.key,
    required this.product,
    required this.inPlan,
    required this.onOpen,
    this.planLocked = false,
    this.subcategoryLabel,
    this.onAdd,
    this.onRemove,
  });

  final CatalogProduct product;
  final bool inPlan;
  final bool planLocked;
  final VoidCallback onOpen;
  final String? subcategoryLabel;
  final VoidCallback? onAdd;
  final VoidCallback? onRemove;

  bool get _eligible => product.addToPlanAllowed && !product.restricted;

  @override
  Widget build(BuildContext context) {
    final imageUrl = CatalogImageResolver.resolvedProductImage(
      coverImageUrl: product.coverImageUrl,
      gallery: product.gallery,
    );
    final description = product.description?.trim();

    return DecoratedBox(
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: AppRadius.cardAll,
        border: Border.all(color: AppColors.hairlineSoft),
        boxShadow: AppElevation.lowShadow,
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Semantics(
                button: true,
                label: serviceProductCardLabel(
                  product: product,
                  subcategoryLabel: subcategoryLabel,
                ),
                excludeSemantics: true,
                child: InkWell(
                  onTap: onOpen,
                  borderRadius: AppRadius.mdAll,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: 72,
                        height: 72,
                        child: ExcludeSemantics(
                          child: HomeCatalogVisual(
                            imageUrl: imageUrl,
                            label: product.displayName,
                            borderRadius: AppRadius.mdAll,
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              product.displayName,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.titleSm,
                            ),
                            if (subcategoryLabel != null &&
                                subcategoryLabel!.trim().isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                subcategoryLabel!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTypography.captionSm.copyWith(
                                  color: AppColors.muted,
                                ),
                              ),
                            ],
                            if (description != null &&
                                description.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                description,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: AppTypography.captionSm.copyWith(
                                  color: AppColors.muted,
                                ),
                              ),
                            ],
                            if (product.restricted ||
                                !product.addToPlanAllowed) ...[
                              const SizedBox(height: AppSpacing.xs),
                              Row(
                                children: [
                                  Icon(
                                    Icons.info_outline_rounded,
                                    size: 14,
                                    color: AppColors.goldAntique,
                                  ),
                                  const SizedBox(width: 4),
                                  Flexible(
                                    child: Text(
                                      'Eligibility review',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: AppTypography.captionSm.copyWith(
                                        color: AppColors.goldAntique,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            if (_eligible)
              _PlanControl(
                productName: product.displayName,
                inPlan: inPlan,
                enabled: !planLocked && (inPlan ? onRemove : onAdd) != null,
                onAdd: onAdd,
                onRemove: onRemove,
              ),
          ],
        ),
      ),
    );
  }
}

String serviceProductCardLabel({
  required CatalogProduct product,
  String? subcategoryLabel,
}) {
  final parts = <String>[product.displayName];
  final subcategory = subcategoryLabel?.trim();
  if (subcategory != null && subcategory.isNotEmpty) {
    parts.add(subcategory);
  }
  if (product.restricted || !product.addToPlanAllowed) {
    parts.add('Eligibility review');
  }
  final description = product.description?.trim();
  if (description != null &&
      description.isNotEmpty &&
      description.length <= 80) {
    parts.add(description);
  }
  return parts.join('. ');
}

class _PlanControl extends StatelessWidget {
  const _PlanControl({
    required this.productName,
    required this.inPlan,
    required this.enabled,
    this.onAdd,
    this.onRemove,
  });

  final String productName;
  final bool inPlan;
  final bool enabled;
  final VoidCallback? onAdd;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final label = inPlan ? 'Added' : 'Add';
    final semantic = inPlan
        ? 'Remove $productName from Event Plan'
        : 'Add $productName to Event Plan';
    return Semantics(
      button: true,
      enabled: enabled,
      label: semantic,
      excludeSemantics: true,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
        child: Material(
          color: inPlan ? AppColors.primarySoft : AppColors.surfaceCard,
          borderRadius: AppRadius.mdAll,
          child: InkWell(
            onTap: enabled ? (inPlan ? onRemove : onAdd) : null,
            borderRadius: AppRadius.mdAll,
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              child: Text(
                label,
                style: AppTypography.titleSm.copyWith(
                  color: enabled ? AppColors.primary : AppColors.disabledText,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
