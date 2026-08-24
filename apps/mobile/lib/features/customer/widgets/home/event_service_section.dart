import 'package:flutter/material.dart';
import 'package:mee_events/core/widgets/image/app_image.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_elevation.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';
import '../../models/super_app_models.dart';

class EventServiceSection extends StatelessWidget {
  final String eventId;
  final String eventName;
  final List<ServiceModel> subcategories;
  final VoidCallback onShowAll;

  const EventServiceSection({
    super.key,
    required this.eventId,
    required this.eventName,
    required this.subcategories,
    required this.onShowAll,
  });

  @override
  Widget build(BuildContext context) {
    if (subcategories.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'CURATED SERVICES',
                style: AppTypography.eyebrow.copyWith(
                  color: AppColors.goldAccent,
                ),
              ),
              const SizedBox(height: AppSpacing.xs + 2),
              Row(
                children: [
                  Expanded(
                    child: Text(eventName, style: AppTypography.displayMd),
                  ),
                  TextButton.icon(
                    onPressed: onShowAll,
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.ink,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                    label: Text('View all', style: AppTypography.caption),
                    iconAlignment: IconAlignment.end,
                    icon: const Icon(Icons.arrow_forward_rounded, size: 17),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        SizedBox(
          height: 246,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxl),
            itemCount: subcategories.length,
            itemBuilder: (context, index) {
              final sub = subcategories[index];
              return Container(
                width: 178,
                margin: EdgeInsets.only(
                  right: index == subcategories.length - 1 ? 0 : AppSpacing.lg,
                ),
                decoration: BoxDecoration(
                  color: AppColors.canvas,
                  borderRadius: AppRadius.mdAll,
                  border: Border.all(color: AppColors.hairline),
                  boxShadow: AppElevation.lowShadow,
                ),
                child: ClipRRect(
                  borderRadius: AppRadius.mdAll,
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () {},
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            height: 162,
                            child: SizedBox(
                              width: double.infinity,
                              child: AppImage(
                                imageUrl: sub.image,
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  sub.name,
                                  style: AppTypography.titleSm,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: AppSpacing.xs / 2),
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
