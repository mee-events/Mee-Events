import 'package:flutter/material.dart';
import 'package:mee_events/core/widgets/image/app_image.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';
import '../../models/super_app_models.dart';

class TrendingServicesSection extends StatelessWidget {
  final List<TrendingServiceModel> services;

  const TrendingServicesSection({super.key, required this.services});

  @override
  Widget build(BuildContext context) {
    if (services.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Text('Trending Services', style: AppTypography.displayMd),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 380,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: services.length,
            itemBuilder: (context, index) {
              final service = services[index];
              return Container(
                width: 300,
                margin: const EdgeInsets.symmetric(horizontal: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Photo Plate
                    Stack(
                      children: [
                        ClipRRect(
                          borderRadius: AppRadius.mdAll,
                          child: SizedBox(
                            height: 300,
                            width: double.infinity,
                            child: service.image.startsWith('assets/')
                                ? Image.asset(
                                    service.image,
                                    fit: BoxFit.cover,
                                  )
                                : AppImage(
                                    imageUrl: service.image,
                                    fit: BoxFit.cover,
                                  ),
                          ),
                        ),
                        // Heart Icon
                        Positioned(
                          top: 12,
                          right: 12,
                          child: Icon(Icons.favorite_border, color: AppColors.canvas, size: 28),
                        ),
                        // Floating Badge
                        Positioned(
                          top: 12,
                          left: 12,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.canvas.withValues(alpha: 0.9),
                              borderRadius: AppRadius.fullAll,
                            ),
                            child: Text('Trending', style: AppTypography.uppercaseTag),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // Meta Block
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            service.name,
                            style: AppTypography.titleMd,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            const Icon(Icons.star, color: AppColors.starRating, size: 14),
                            const SizedBox(width: 4),
                            Text(service.rating.toString(), style: AppTypography.bodySm),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    RichText(
                      text: TextSpan(
                        style: AppTypography.bodySm.copyWith(color: AppColors.ink),
                        children: [
                          TextSpan(text: service.price, style: const TextStyle(fontWeight: FontWeight.w600)),
                          const TextSpan(text: ' per session'),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
