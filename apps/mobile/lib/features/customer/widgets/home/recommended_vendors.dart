import 'package:flutter/material.dart';
import 'package:mee_events/core/widgets/image/app_image.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';
import '../../models/super_app_models.dart';

class RecommendedVendorsSection extends StatelessWidget {
  final List<VendorModel> vendors;

  const RecommendedVendorsSection({super.key, required this.vendors});

  @override
  Widget build(BuildContext context) {
    if (vendors.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Text('Top Rated Vendors', style: AppTypography.displayMd),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 340,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: vendors.length,
            itemBuilder: (context, index) {
              final vendor = vendors[index];
              return Container(
                width: 260,
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
                            height: 260,
                            width: double.infinity,
                            child: vendor.image.startsWith('assets/')
                                ? Image.asset(
                                    vendor.image,
                                    fit: BoxFit.cover,
                                  )
                                : AppImage(
                                    imageUrl: vendor.image,
                                    fit: BoxFit.cover,
                                  ),
                          ),
                        ),
                        // Guest Favorite Badge
                        if (vendor.isVerified)
                          Positioned(
                            top: 12,
                            left: 12,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.canvas,
                                borderRadius: AppRadius.fullAll,
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.1),
                                    blurRadius: 8,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Text('Guest favorite', style: AppTypography.badge),
                            ),
                          ),
                        // Heart Icon
                        Positioned(
                          top: 12,
                          right: 12,
                          child: Icon(Icons.favorite_border, color: AppColors.canvas, size: 28),
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
                            vendor.name,
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
                            Text(vendor.rating.toString(), style: AppTypography.bodySm),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      vendor.location,
                      style: AppTypography.bodySm.copyWith(color: AppColors.muted),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    RichText(
                      text: TextSpan(
                        style: AppTypography.bodySm.copyWith(color: AppColors.ink),
                        children: [
                          TextSpan(text: vendor.startingPrice, style: const TextStyle(fontWeight: FontWeight.w600)),
                          const TextSpan(text: ' onwards'),
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
