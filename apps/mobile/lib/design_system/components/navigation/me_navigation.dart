import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_typography.dart';

class MeAppBar extends StatelessWidget implements PreferredSizeWidget {
  const MeAppBar({
    super.key,
    required this.title,
    this.actions,
    this.leading,
    this.centerTitle = false,
  });

  final String title;
  final List<Widget>? actions;
  final Widget? leading;
  final bool centerTitle;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.canvas,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: centerTitle,
      leading: leading,
      title: Text(title, style: AppTypography.displaySm),
      actions: actions,
    );
  }
}

class MeBottomNavItem {
  const MeBottomNavItem({
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });

  final IconData icon;
  final IconData selectedIcon;
  final String label;
}

class MeBottomNav extends StatelessWidget {
  const MeBottomNav({
    super.key,
    required this.items,
    required this.currentIndex,
    required this.onTap,
  });

  final List<MeBottomNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      selectedIndex: currentIndex,
      onDestinationSelected: onTap,
      backgroundColor: AppColors.canvas,
      indicatorColor: AppColors.primaryDisabled,
      destinations: [
        for (final item in items)
          NavigationDestination(
            icon: Icon(item.icon, color: AppColors.mutedSoft),
            selectedIcon: Icon(item.selectedIcon, color: AppColors.primary),
            label: item.label,
          ),
      ],
    );
  }
}

class MeSideNavItem {
  const MeSideNavItem({
    required this.label,
    required this.icon,
    this.selected = false,
    this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback? onTap;
}

class MeSideNav extends StatelessWidget {
  const MeSideNav({
    super.key,
    required this.items,
    this.header,
  });

  final List<MeSideNavItem> items;
  final Widget? header;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surfaceCard,
      child: ListView(
        children: [
          if (header != null) header!,
          for (final item in items)
            ListTile(
              leading: Icon(
                item.icon,
                color: item.selected ? AppColors.primary : AppColors.ink,
              ),
              title: Text(
                item.label,
                style: AppTypography.titleSm.copyWith(
                  color: item.selected ? AppColors.primary : AppColors.ink,
                ),
              ),
              selected: item.selected,
              onTap: item.onTap,
            ),
        ],
      ),
    );
  }
}

class MeDrawer extends StatelessWidget {
  const MeDrawer({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: AppColors.surfaceCard,
      child: SafeArea(child: child),
    );
  }
}

class MeTabs extends StatelessWidget {
  const MeTabs({
    super.key,
    required this.tabs,
    this.controller,
  });

  final List<Tab> tabs;
  final TabController? controller;

  @override
  Widget build(BuildContext context) {
    return TabBar(
      controller: controller,
      labelColor: AppColors.primary,
      unselectedLabelColor: AppColors.muted,
      indicatorColor: AppColors.primary,
      labelStyle: AppTypography.titleSm,
      tabs: tabs,
    );
  }
}
