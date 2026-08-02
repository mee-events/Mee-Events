import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class RoleBottomBarItem {
  final IconData icon;
  final String label;

  RoleBottomBarItem({required this.icon, required this.label});
}

class RoleBottomBar extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;

  const RoleBottomBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final items = [
      RoleBottomBarItem(icon: Icons.home_rounded, label: 'Home'),
      RoleBottomBarItem(icon: Icons.category_rounded, label: 'Categories'),
      RoleBottomBarItem(icon: Icons.assignment_rounded, label: 'Enquiry / Order'),
      RoleBottomBarItem(icon: Icons.calendar_month_rounded, label: 'ME Plan'),
      RoleBottomBarItem(icon: Icons.more_horiz_rounded, label: 'More'),
    ];

    return Container(
      decoration: BoxDecoration(
        color: AppColors.canvas,
        border: Border(
          top: BorderSide(
            color: AppColors.hairlineSoft,
            width: 1,
          ),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(items.length, (index) {
              final isSelected = currentIndex == index;
              final item = items[index];

              return InkWell(
                onTap: () => onTap(index),
                splashColor: Colors.transparent,
                highlightColor: Colors.transparent,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs, horizontal: AppSpacing.sm),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isSelected ? _getFilledIcon(item.icon) : item.icon,
                        color: isSelected ? AppColors.primary : AppColors.mutedSoft,
                        size: 26,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        item.label,
                        style: AppTypography.uppercaseTag.copyWith(
                          color: isSelected ? AppColors.primary : AppColors.mutedSoft,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          textBaseline: TextBaseline.alphabetic,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }

  IconData _getFilledIcon(IconData outlineIcon) {
    if (outlineIcon == Icons.search_rounded) return Icons.search_rounded;
    if (outlineIcon == Icons.favorite_border_rounded) return Icons.favorite_rounded;
    if (outlineIcon == Icons.calendar_today_rounded) return Icons.calendar_month_rounded;
    if (outlineIcon == Icons.chat_bubble_outline_rounded) return Icons.chat_bubble_rounded;
    if (outlineIcon == Icons.person_outline_rounded) return Icons.person_rounded;
    return outlineIcon;
  }
}
