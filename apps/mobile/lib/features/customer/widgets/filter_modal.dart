import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';
import 'package:mee_events/core/providers/filter_provider.dart';

class FilterModal extends ConsumerStatefulWidget {
  const FilterModal({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const FilterModal(),
    );
  }

  @override
  ConsumerState<FilterModal> createState() => _FilterModalState();
}

class _FilterModalState extends ConsumerState<FilterModal> {
  final List<String> localities = [
    'All',
    'Jubilee Hills',
    'Banjara Hills',
    'Madhapur',
    'Engine Bowli',
    'Motigalli',
  ];

  @override
  Widget build(BuildContext context) {
    final filter = ref.watch(venueFilterProvider);
    final filterNotifier = ref.read(venueFilterProvider.notifier);

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.canvas,
        borderRadius: AppRadius.topModal,
      ),
      padding: EdgeInsets.only(
        top: AppSpacing.lg,
        left: AppSpacing.lg,
        right: AppSpacing.lg,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.xl,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.hairlineSoft,
                borderRadius: AppRadius.pillAll,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),

          // Modal Title & Reset
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Filter Royal Venues', style: AppTypography.displaySm),
              TextButton(
                onPressed: () => filterNotifier.reset(),
                child: Text('Reset', style: AppTypography.bodySm.copyWith(color: AppColors.goldAccent)),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),

          // Locality Filter
          Text('Hyderabad Locality', style: AppTypography.titleSm),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: localities.map((locality) {
              final isSelected = filter.selectedLocality == locality;
              return ChoiceChip(
                label: Text(locality),
                selected: isSelected,
                onSelected: (selected) {
                  if (selected) filterNotifier.updateLocality(locality);
                },
                selectedColor: AppColors.surfaceSoft,
                backgroundColor: AppColors.canvas,
                labelStyle: AppTypography.caption.copyWith(
                  color: isSelected ? AppColors.primary : AppColors.muted,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: AppRadius.pillAll,
                  side: BorderSide(
                    color: isSelected ? AppColors.primary : AppColors.hairlineSoft,
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: AppSpacing.xl),

          // Max Budget Slider
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Max Budget', style: AppTypography.titleSm),
              Text(
                '₹${(filter.maxBudget / 100000).toStringAsFixed(1)} Lakhs',
                style: AppTypography.titleSm.copyWith(color: AppColors.primary),
              ),
            ],
          ),
          SliderTheme(
            data: SliderThemeData(
              activeTrackColor: AppColors.primary,
              inactiveTrackColor: AppColors.surfaceSoft,
              thumbColor: AppColors.goldAccent,
              overlayColor: AppColors.goldAccent.withValues(alpha: 0.2),
            ),
            child: Slider(
              value: filter.maxBudget,
              min: 200000,
              max: 2000000,
              divisions: 18,
              onChanged: (value) => filterNotifier.updateMaxBudget(value),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),

          // Minimum Rating Filter
          Text('Minimum Rating', style: AppTypography.titleSm),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [4.0, 4.5, 4.8].map((rating) {
              final isSelected = filter.minRating == rating;
              return Padding(
                padding: const EdgeInsets.only(right: 8.0),
                child: FilterChip(
                  label: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.star, size: 14, color: AppColors.goldAccent),
                      const SizedBox(width: 4),
                      Text('$rating+'),
                    ],
                  ),
                  selected: isSelected,
                  onSelected: (selected) {
                    filterNotifier.updateMinRating(selected ? rating : 0.0);
                  },
                  selectedColor: AppColors.surfaceSoft,
                  backgroundColor: AppColors.canvas,
                  labelStyle: AppTypography.caption.copyWith(
                    color: isSelected ? AppColors.primary : AppColors.muted,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: AppRadius.pillAll,
                    side: BorderSide(
                      color: isSelected ? AppColors.primary : AppColors.hairlineSoft,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: AppSpacing.xxl),

          // Apply Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: AppColors.canvas,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: const RoundedRectangleBorder(borderRadius: AppRadius.smAll),
              ),
              child: Text('Apply Filters', style: AppTypography.buttonMd),
            ),
          ),
        ],
      ),
    );
  }
}
