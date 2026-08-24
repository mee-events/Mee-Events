import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_typography.dart';
import '../../models/super_app_models.dart';

class CategorySection extends StatelessWidget {
  final List<CategoryModel> categories;
  final Function(CategoryModel) onCategoryTap;

  const CategorySection({
    super.key,
    required this.categories,
    required this.onCategoryTap,
  });

  @override
  Widget build(BuildContext context) {
    if (categories.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: const BoxDecoration(color: AppColors.canvas),
      child: SizedBox(
        height: 72,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: categories.length,
          itemBuilder: (context, index) {
            final category = categories[index];
            return GestureDetector(
              onTap: () => onCategoryTap(category),
              child: Container(
                margin: const EdgeInsets.only(right: 24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _getIcon(category.icon),
                      color: AppColors.muted,
                      size: 28,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      category.name,
                      style: AppTypography.captionSm.copyWith(
                        color: AppColors.muted,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  IconData _getIcon(String iconName) {
    switch (iconName) {
      case 'favorite':
        return Icons.favorite_border;
      case 'cake':
        return Icons.cake_outlined;
      case 'business':
        return Icons.business_center_outlined;
      case 'celebration':
        return Icons.celebration_outlined;
      default:
        return Icons.category_outlined;
    }
  }
}
