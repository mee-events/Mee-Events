import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';

class HomeAppBar extends StatelessWidget {
  const HomeAppBar({super.key});

  @override
  Widget build(BuildContext context) {
    return SliverAppBar(
      pinned: true,
      floating: true,
      backgroundColor: AppColors.canvas,
      elevation: 0,
      scrolledUnderElevation: 1,
      surfaceTintColor: AppColors.canvas,
      toolbarHeight: 70,
      title: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Location / Greeting (Left side)
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(
                  children: [
                    Icon(Icons.location_on, color: AppColors.primary, size: 16),
                    const SizedBox(width: 4),
                    Text('Current Location', style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
                    const Icon(Icons.keyboard_arrow_down, color: AppColors.muted, size: 16),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  'Hyderabad, India',
                  style: AppTypography.titleMd,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          // Actions: Search, Favorite, Notifications (Right side)
          Row(
            children: [
              _buildActionIcon(Icons.search, () {
                // TODO: Open Search
              }),
              const SizedBox(width: 8),
              _buildActionIcon(Icons.favorite_border, () {
                // TODO: Open Favorites
              }),
              const SizedBox(width: 8),
              _buildActionIcon(Icons.notifications_none, () {
                // TODO: Open Notifications
              }, hasBadge: true),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionIcon(IconData icon, VoidCallback onTap, {bool hasBadge = false}) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceSoft,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.hairlineSoft),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: AppRadius.fullAll,
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(10.0),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(icon, color: AppColors.ink, size: 22),
                if (hasBadge)
                  Positioned(
                    top: -2,
                    right: -2,
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.canvas, width: 2),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
