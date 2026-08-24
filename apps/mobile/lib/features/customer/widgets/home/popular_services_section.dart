import 'package:flutter/material.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/customer/catalog/catalog_image_resolver.dart';
import 'package:mee_events/features/customer/widgets/home/occasion_section.dart';
import 'package:mee_events/models/catalog_service.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class EventServicesSection extends StatelessWidget {
  const EventServicesSection({
    super.key,
    required this.title,
    required this.services,
    required this.onTap,
    this.onViewAll,
    this.viewAllSemanticLabel,
  });

  final String title;
  final List<CatalogService> services;
  final ValueChanged<CatalogService> onTap;
  final VoidCallback? onViewAll;
  final String? viewAllSemanticLabel;

  static double cardWidth(double maxWidth) {
    final inner = (maxWidth - AppSpacing.lg * 2).clamp(0.0, double.infinity);
    return (inner - AppSpacing.md) / 2.35;
  }

  static const double imageHeight = 112;

  static double railHeight(double textScale) =>
      EventServicesSection.imageHeight +
      (92 * textScale).clamp(92.0, 180.0) +
      16;

  @override
  Widget build(BuildContext context) {
    if (services.isEmpty) return const SizedBox.shrink();

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = cardWidth(constraints.maxWidth);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            HomeSectionHeader(
              title: title,
              onViewAll: onViewAll,
              viewAllSemanticLabel: viewAllSemanticLabel ?? 'View all services',
            ),
            const SizedBox(height: AppSpacing.sm),
            Semantics(
              container: true,
              explicitChildNodes: true,
              label: '$title, horizontal list',
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(
                  parent: AlwaysScrollableScrollPhysics(),
                ),
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (var i = 0; i < services.length; i++) ...[
                      if (i > 0) const SizedBox(width: AppSpacing.md),
                      _ServiceCard(
                        service: services[i],
                        width: width,
                        onTap: () => onTap(services[i]),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _ServiceCard extends StatelessWidget {
  const _ServiceCard({
    required this.service,
    required this.width,
    required this.onTap,
  });

  final CatalogService service;
  final double width;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final meta = homeServiceMetadata(service);
    final imageUrl = CatalogImageResolver.resolvedHomeImage(
      code: service.code,
      remoteUrl: service.thumbnailUrl,
      coverImageUrl: service.coverImageUrl,
      iconUrl: service.iconUrl,
    );
    final tone = HomeDiscoveryTone.forCode(service.code);
    return Semantics(
      button: true,
      label: service.displayName,
      excludeSemantics: true,
      child: MePressable(
        onTap: onTap,
        borderRadius: AppRadius.mdAll,
        child: ExcludeSemantics(
          child: ConstrainedBox(
            constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
            child: SizedBox(
              key: ValueKey<String>('home-service-${service.code}'),
              width: width,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: AppColors.surfaceCard,
                  borderRadius: AppRadius.mdAll,
                  border: Border.all(color: AppColors.hairline),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.scrim.withValues(alpha: 0.07),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    ClipRRect(
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(AppRadius.md),
                      ),
                      child: SizedBox(
                        width: width,
                        height: EventServicesSection.imageHeight,
                        child: imageUrl == null
                            ? HomeIconFallback(
                                icon: homeServiceFallbackIcon(service.code),
                                tone: tone,
                              )
                            : HomeCatalogVisual(
                                imageUrl: imageUrl,
                                label: service.displayName,
                                borderRadius: BorderRadius.zero,
                                fallbackIcon: homeServiceFallbackIcon(
                                  service.code,
                                ),
                              ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(
                        AppSpacing.sm,
                        AppSpacing.sm,
                        AppSpacing.sm,
                        AppSpacing.md,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            service.displayName,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.titleSm,
                          ),
                          if (meta != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              meta,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.captionSm.copyWith(
                                color: AppColors.muted,
                              ),
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
        ),
      ),
    );
  }
}

String? homeServiceMetadata(CatalogService service) {
  if (service.productCount > 0) {
    return service.productCount == 1
        ? '1 option'
        : '${service.productCount} options';
  }
  if (service.subcategoryCount > 0) {
    return service.subcategoryCount == 1
        ? '1 category'
        : '${service.subcategoryCount} categories';
  }
  return null;
}
