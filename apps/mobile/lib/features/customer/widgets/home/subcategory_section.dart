import 'package:flutter/material.dart';
import 'package:mee_events/core/widgets/image/app_image.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';
import '../../models/super_app_models.dart';

class SubcategorySection extends StatelessWidget {
  final CategoryModel currentCategory;
  final List<SubcategoryModel> subcategories;

  const SubcategorySection({
    super.key,
    required this.currentCategory,
    required this.subcategories,
  });

  @override
  Widget build(BuildContext context) {
    if (subcategories.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${currentCategory.name} Services',
                style: AppTypography.displayMd,
              ),
              Text(
                'Show all',
                style: AppTypography.bodySm.copyWith(
                  color: AppColors.ink,
                  decoration: TextDecoration.underline,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 160,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: subcategories.length,
            itemBuilder: (context, index) {
              final sub = subcategories[index];
              return Container(
                width: 140,
                margin: const EdgeInsets.symmetric(horizontal: 8),
                decoration: BoxDecoration(
                  color: AppColors.canvas,
                  borderRadius: AppRadius.mdAll,
                  border: Border.all(color: AppColors.hairline),
                ),
                child: ClipRRect(
                  borderRadius: AppRadius.mdAll,
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () {
                        // TODO: Navigate to Subcategory details
                      },
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            height: 90,
                            width: double.infinity,
                            child: AppImage(
                              imageUrl: sub.image,
                              fit: BoxFit.cover,
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  sub.name,
                                  style: AppTypography.titleSm,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  sub.description,
                                  style: AppTypography.bodySm.copyWith(
                                    color: AppColors.muted,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
