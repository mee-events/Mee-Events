import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:mee_events/core/widgets/image/app_image.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
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
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                eventName, 
                style: AppTypography.displayMd,
              ),
              GestureDetector(
                onTap: onShowAll,
                child: Text(
                  'Show all', 
                  style: AppTypography.bodySm.copyWith(
                    color: AppColors.ink,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 220,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 24),
            itemCount: subcategories.length,
            itemBuilder: (context, index) {
              final sub = subcategories[index];
              return Container(
                width: 160,
                margin: EdgeInsets.only(right: index == subcategories.length - 1 ? 0 : 16),
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
                      onTap: () {},
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: SizedBox(
                              width: double.infinity,
                              child: sub.image.startsWith('assets/')
                                  ? Image.asset(
                                      sub.image,
                                      fit: BoxFit.cover,
                                    )
                                  : AppImage(
                                      imageUrl: sub.image,
                                      fit: BoxFit.cover,
                                    ),
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
                                  style: AppTypography.bodySm.copyWith(color: AppColors.muted),
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
