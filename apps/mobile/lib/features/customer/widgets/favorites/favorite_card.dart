import 'package:flutter/material.dart';
import 'package:mee_events/core/widgets/image/app_image.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/customer/favorites/favorites_store.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class FavoriteCard extends StatelessWidget {
  const FavoriteCard({
    super.key,
    required this.item,
    required this.onOpen,
    required this.onRemove,
  });

  final FavoriteItem item;
  final VoidCallback onOpen;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final kindLabel = favoriteKindLabel(item.kind);
    return MeSurfaceCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              button: true,
              enabled: true,
              label: '${item.title}, $kindLabel',
              onTap: onOpen,
              excludeSemantics: true,
              child: InkWell(
                onTap: onOpen,
                borderRadius: AppRadius.mdAll,
                child: Row(
                  children: [
                    _FavoriteThumb(item: item),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.title,
                            style: AppTypography.titleSm,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            kindLabel,
                            style: AppTypography.captionSm.copyWith(
                              color: AppColors.muted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Semantics(
            button: true,
            enabled: true,
            label: 'Remove ${item.title} from saved',
            onTap: onRemove,
            excludeSemantics: true,
            child: MeFavoriteButton(
              active: true,
              onPressed: onRemove,
              size: 44,
            ),
          ),
        ],
      ),
    );
  }
}

class _FavoriteThumb extends StatelessWidget {
  const _FavoriteThumb({required this.item});

  final FavoriteItem item;

  @override
  Widget build(BuildContext context) {
    final fallback = _kindFallback(item.kind);
    return ExcludeSemantics(
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: AppRadius.mdAll,
          border: const Border.fromBorderSide(
            BorderSide(color: AppColors.goldSoft, width: 1),
          ),
        ),
        child: ClipRRect(
          borderRadius: AppRadius.mdAll,
          child: SizedBox(
            width: 72,
            height: 72,
            child: item.imageUrl == null || item.imageUrl!.isEmpty
                ? fallback
                : AppImage(
                    imageUrl: item.imageUrl!,
                    width: 72,
                    height: 72,
                    fit: BoxFit.cover,
                    fallbackWidget: fallback,
                  ),
          ),
        ),
      ),
    );
  }
}

Widget _kindFallback(FavoriteKind kind) {
  final icon = switch (kind) {
    FavoriteKind.occasion => Icons.celebration_outlined,
    FavoriteKind.category => Icons.grid_view_rounded,
    FavoriteKind.service => Icons.auto_awesome_outlined,
    FavoriteKind.product => Icons.inventory_2_outlined,
  };
  return ColoredBox(
    color: AppColors.primarySoft,
    child: Icon(icon, color: AppColors.primary),
  );
}
