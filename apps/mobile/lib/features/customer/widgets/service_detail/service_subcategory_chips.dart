import 'package:flutter/material.dart';
import 'package:mee_events/models/catalog_subcategory.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class ServiceSubcategoryChips extends StatelessWidget {
  const ServiceSubcategoryChips({
    super.key,
    required this.subcategories,
    required this.selectedCode,
    required this.onSelected,
  });

  static const allCode = '__all__';

  final List<CatalogSubcategory> subcategories;
  final String? selectedCode;
  final ValueChanged<String?> onSelected;

  static List<CatalogSubcategory> visible(List<CatalogSubcategory> items) {
    return items.where((item) => item.productCount > 0).toList();
  }

  @override
  Widget build(BuildContext context) {
    final chips = visible(subcategories);
    if (chips.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: 48,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
        child: Row(
          children: [
            Padding(
              padding: const EdgeInsets.only(right: AppSpacing.sm),
              child: _FilterChip(
                key: const ValueKey(allCode),
                label: 'All',
                selected: selectedCode == null,
                onTap: () => onSelected(null),
              ),
            ),
            for (final item in chips)
              Padding(
                padding: const EdgeInsets.only(right: AppSpacing.sm),
                child: _FilterChip(
                  key: ValueKey(item.code),
                  label: item.productCount > 0
                      ? '${item.displayName} · ${item.productCount}'
                      : item.displayName,
                  selected: selectedCode == item.code,
                  onTap: () => onSelected(item.code),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      excludeSemantics: true,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
        child: Material(
          color: selected ? AppColors.primarySoft : AppColors.surfaceCard,
          borderRadius: AppRadius.pillAll,
          child: InkWell(
            onTap: onTap,
            borderRadius: AppRadius.pillAll,
            child: Container(
              constraints: const BoxConstraints(maxWidth: 220),
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                borderRadius: AppRadius.pillAll,
                border: Border.all(
                  color: selected ? AppColors.primary : AppColors.hairlineSoft,
                ),
              ),
              alignment: Alignment.center,
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.bodySm.copyWith(
                  color: selected ? AppColors.primary : AppColors.ink,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
