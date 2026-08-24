import 'package:flutter/material.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/customer/catalog/catalog_image_resolver.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class HomeSectionHeader extends StatelessWidget {
  const HomeSectionHeader({
    super.key,
    required this.title,
    this.onViewAll,
    this.viewAllSemanticLabel,
  });

  final String title;
  final VoidCallback? onViewAll;
  final String? viewAllSemanticLabel;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Text(
              title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.titleLg,
            ),
          ),
          if (onViewAll != null)
            Semantics(
              button: true,
              label: viewAllSemanticLabel ?? 'View all',
              excludeSemantics: true,
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: onViewAll,
                  borderRadius: AppRadius.smAll,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(
                      minHeight: 44,
                      minWidth: 44,
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                      ),
                      child: Center(
                        child: Text(
                          'View all',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.bodySm.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
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
    );
  }
}

class HomeDiscoveryTone {
  const HomeDiscoveryTone({
    required this.background,
    required this.foreground,
    required this.accent,
  });

  final Color background;
  final Color foreground;
  final Color accent;

  static const palette = [
    HomeDiscoveryTone(
      background: AppColors.primary,
      foreground: AppColors.goldSoft,
      accent: AppColors.goldAccent,
    ),
    HomeDiscoveryTone(
      background: AppColors.goldSoft,
      foreground: AppColors.brandMark,
      accent: AppColors.primary,
    ),
    HomeDiscoveryTone(
      background: AppColors.surfaceStrong,
      foreground: AppColors.primary,
      accent: AppColors.goldAntique,
    ),
    HomeDiscoveryTone(
      background: AppColors.primarySoft,
      foreground: AppColors.primaryActive,
      accent: AppColors.goldAntique,
    ),
  ];

  static HomeDiscoveryTone forCode(String code) {
    return palette[code.hashCode.abs() % palette.length];
  }
}

class HomeIconFallback extends StatelessWidget {
  const HomeIconFallback({
    super.key,
    required this.icon,
    required this.tone,
    this.compact = false,
  });

  final IconData icon;
  final HomeDiscoveryTone tone;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      key: HomeCatalogVisual.fallbackKey,
      decoration: BoxDecoration(color: tone.background),
      child: Stack(
        children: [
          Positioned(
            right: compact ? -10 : -16,
            top: compact ? -12 : -18,
            child: Container(
              width: compact ? 36 : 56,
              height: compact ? 36 : 56,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: tone.accent.withValues(alpha: 0.28),
              ),
            ),
          ),
          Center(
            child: Icon(icon, size: compact ? 22 : 32, color: tone.foreground),
          ),
        ],
      ),
    );
  }
}

/// Single-row editorial occasion discovery rail.
class OccasionSection extends StatelessWidget {
  const OccasionSection({
    super.key,
    required this.title,
    required this.items,
    required this.onTileTap,
    this.onViewAll,
  });

  final String title;
  final List<CatalogItem> items;
  final ValueChanged<CatalogItem> onTileTap;
  final VoidCallback? onViewAll;

  static double columnWidth(double maxWidth) {
    final inner = (maxWidth - AppSpacing.lg * 2).clamp(0.0, double.infinity);
    return (inner - AppSpacing.md * 2) / 2.35;
  }

  static double tileImageSize(double columnWidth) => 120;

  static double railHeight(double textScale) =>
      96 + AppSpacing.sm + (40 * textScale).clamp(36, 72) + 20;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

    return LayoutBuilder(
      builder: (context, constraints) {
        final width = columnWidth(constraints.maxWidth);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            HomeSectionHeader(
              title: title,
              onViewAll: onViewAll,
              viewAllSemanticLabel: 'View all occasions',
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
                    for (var i = 0; i < items.length; i++) ...[
                      if (i > 0) const SizedBox(width: AppSpacing.md),
                      _OccasionCard(
                        item: items[i],
                        cardWidth: width,
                        imageSize: tileImageSize(width),
                        onTap: () => onTileTap(items[i]),
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

class _OccasionCard extends StatelessWidget {
  const _OccasionCard({
    required this.item,
    required this.cardWidth,
    required this.imageSize,
    required this.onTap,
  });

  final CatalogItem item;
  final double cardWidth;
  final double imageSize;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final imageUrl = CatalogImageResolver.resolvedHomeImage(
      code: item.code,
      remoteUrl: item.thumbnailUrl,
      coverImageUrl: item.coverImageUrl,
    );
    final tone = HomeDiscoveryTone.forCode(item.code);
    return Semantics(
      button: true,
      label: item.displayName,
      excludeSemantics: true,
      child: MePressable(
        onTap: onTap,
        borderRadius: AppRadius.mdAll,
        child: ExcludeSemantics(
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
            child: SizedBox(
              key: ValueKey<String>('home-occasion-${item.code}'),
              width: cardWidth,
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
                        width: cardWidth,
                        height: imageSize,
                        child: imageUrl == null
                            ? HomeIconFallback(
                                icon: homeOccasionFallbackIcon(item.code),
                                tone: tone,
                              )
                            : HomeCatalogVisual(
                                imageUrl: imageUrl,
                                label: item.displayName,
                                borderRadius: BorderRadius.zero,
                                fallbackIcon: homeOccasionFallbackIcon(
                                  item.code,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      item.displayName,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.start,
                      style: AppTypography.caption.copyWith(
                        color: AppColors.ink,
                        fontWeight: FontWeight.w600,
                        height: 1.2,
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
