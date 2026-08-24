import 'package:flutter/material.dart';
import 'package:mee_events/features/customer/widgets/favorites/saved_filter.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class FavoritesFilterBar extends StatelessWidget {
  const FavoritesFilterBar({
    super.key,
    required this.selected,
    required this.onSelected,
  });

  final SavedFilter selected;
  final ValueChanged<SavedFilter> onSelected;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: AppSpacing.sm,
      runSpacing: AppSpacing.sm,
      children: [
        for (final filter in SavedFilter.values)
          _FilterChip(
            filter: filter,
            selected: filter == selected,
            onTap: () => onSelected(filter),
          ),
      ],
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.filter,
    required this.selected,
    required this.onTap,
  });

  final SavedFilter filter;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      enabled: true,
      selected: selected,
      label: filter.label,
      onTap: onTap,
      excludeSemantics: true,
      child: Material(
        color: selected ? AppColors.primary : AppColors.surfaceCard,
        borderRadius: AppRadius.pillAll,
        child: InkWell(
          onTap: onTap,
          borderRadius: AppRadius.pillAll,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.sm,
              ),
              child: Center(
                child: Text(
                  filter.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.titleSm.copyWith(
                    color: selected ? AppColors.onPrimary : AppColors.ink,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
