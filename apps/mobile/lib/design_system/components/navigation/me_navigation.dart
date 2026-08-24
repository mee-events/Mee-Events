import 'package:flutter/material.dart';
import 'package:mee_events/design_system/components/navigation/app_header.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_elevation.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class MeAppBar extends StatelessWidget implements PreferredSizeWidget {
  const MeAppBar({
    super.key,
    required this.title,
    this.actions,
    this.leading,
    this.centerTitle = false,
    this.bottom,
  });

  final String title;
  final List<Widget>? actions;
  final Widget? leading;
  final bool centerTitle;
  final PreferredSizeWidget? bottom;

  @override
  Size get preferredSize {
    final bottomHeight = bottom?.preferredSize.height ?? 0;
    return Size.fromHeight(kToolbarHeight + bottomHeight);
  }

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.canvas,
      elevation: AppElevation.flat,
      scrolledUnderElevation: AppElevation.flat,
      centerTitle: centerTitle,
      leading: leading,
      title: Text(title, style: AppTypography.displaySm),
      actions: actions,
      bottom: bottom,
    );
  }
}

enum MePlatformHeaderMode { brand, title }

/// Shell-level platform header. Prefer this over feature-local app bars on tabs.
///
/// Brand mode delegates to [AppHeader] (role avatar · brand · search · fav ·
/// disabled notifications).
class MePlatformHeader extends StatelessWidget implements PreferredSizeWidget {
  const MePlatformHeader({
    super.key,
    this.mode = MePlatformHeaderMode.brand,
    this.title,
    this.leading,
    this.actions,
    this.onFavorites,
    this.onNotifications,
    this.onSearch,
    this.onSwitchRole,
    this.roleLabel,
    this.showSearch = true,
    this.showFavourite = true,
    this.showNotification = true,
    this.brandLabel = kCustomerBrandLabel,
    this.backgroundColor,
    this.iconColor,
  });

  final MePlatformHeaderMode mode;
  final String? title;
  final Widget? leading;
  final List<Widget>? actions;
  final VoidCallback? onFavorites;
  final VoidCallback? onNotifications;
  final VoidCallback? onSearch;
  final VoidCallback? onSwitchRole;
  final String? roleLabel;
  final bool showSearch;
  final bool showFavourite;
  final bool showNotification;
  final String brandLabel;
  final Color? backgroundColor;
  final Color? iconColor;

  static const double height = AppHeader.height;

  @override
  Size get preferredSize => const Size.fromHeight(height);

  @override
  Widget build(BuildContext context) {
    if (mode == MePlatformHeaderMode.brand) {
      return AppHeader(
        brandLabel: brandLabel,
        showSearch: showSearch,
        showFavourite: showFavourite,
        showNotification: showNotification,
        backgroundColor: backgroundColor,
        iconColor: iconColor,
        roleLabel: roleLabel,
        onSwitchRole: onSwitchRole,
        onSearch: onSearch,
        onFavourite: onFavorites,
        onNotification: onNotifications,
      );
    }

    return Material(
      color: backgroundColor ?? AppColors.canvas,
      elevation: AppElevation.flat,
      child: SizedBox(
        height: height,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
          child: _TitleRow(
            title: title ?? '',
            leading: leading,
            actions: actions,
          ),
        ),
      ),
    );
  }
}

class _TitleRow extends StatelessWidget {
  const _TitleRow({
    required this.title,
    required this.leading,
    required this.actions,
  });

  final String title;
  final Widget? leading;
  final List<Widget>? actions;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (leading != null) ...[
          leading!,
          const SizedBox(width: AppSpacing.sm),
        ],
        Expanded(
          child: Text(
            title,
            style: AppTypography.displaySm,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        ...?actions,
      ],
    );
  }
}

class MeBottomNavItem {
  const MeBottomNavItem({
    required this.icon,
    required this.selectedIcon,
    required this.label,
    this.badgeLabel,
    this.semanticLabel,
  });

  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final String? badgeLabel;
  final String? semanticLabel;
}

class MeBottomNav extends StatelessWidget {
  const MeBottomNav({
    super.key,
    required this.items,
    required this.currentIndex,
    required this.onTap,
    this.accentColor = AppColors.primary,
    this.softAccentColor = AppColors.primarySoft,
  });

  final List<MeBottomNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;
  final Color accentColor;
  final Color softAccentColor;

  @override
  Widget build(BuildContext context) {
    final textScale = MediaQuery.textScalerOf(context).scale(1);
    final barHeight = textScale > 1.15 ? 80.0 : 64.0;

    return DecoratedBox(
      decoration: const BoxDecoration(
        color: AppColors.surfaceCard,
        border: Border(top: BorderSide(color: AppColors.hairlineSoft)),
      ),
      child: SafeArea(
        top: false,
        child: NavigationBarTheme(
          data: NavigationBarThemeData(
            height: barHeight,
            labelTextStyle: WidgetStateProperty.resolveWith((states) {
              final selected = states.contains(WidgetState.selected);
              return AppTypography.caption.copyWith(
                color: selected ? accentColor : AppColors.navInactive,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
              );
            }),
          ),
          child: NavigationBar(
            selectedIndex: currentIndex,
            onDestinationSelected: onTap,
            backgroundColor: AppColors.surfaceCard,
            elevation: AppElevation.flat,
            indicatorColor: softAccentColor,
            labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            destinations: [
              for (final item in items)
                NavigationDestination(
                  icon: _destinationIcon(
                    item,
                    selected: false,
                    accentColor: accentColor,
                  ),
                  selectedIcon: _destinationIcon(
                    item,
                    selected: true,
                    accentColor: accentColor,
                  ),
                  label: item.label,
                  tooltip: item.semanticLabel ?? item.label,
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _destinationIcon(
    MeBottomNavItem item, {
    required bool selected,
    required Color accentColor,
  }) {
    final icon = Icon(
      selected ? item.selectedIcon : item.icon,
      color: selected ? accentColor : AppColors.navInactive,
    );
    final badge = item.badgeLabel;
    final Widget visual = badge == null
        ? icon
        : ExcludeSemantics(
            child: Badge(
              label: Text(badge),
              backgroundColor: accentColor,
              textColor: AppColors.onPrimary,
              child: icon,
            ),
          );
    final announced = item.semanticLabel;
    if (announced == null || announced == item.label) {
      return visual;
    }
    return Semantics(label: announced, child: visual);
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
  const MeSideNav({super.key, required this.items, this.header});

  final List<MeSideNavItem> items;
  final Widget? header;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surfaceCard,
      child: ListView(
        children: [
          ?header,
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
  const MeDrawer({super.key, required this.child});

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
  const MeTabs({super.key, required this.tabs, this.controller});

  final List<Tab> tabs;
  final TabController? controller;

  @override
  Widget build(BuildContext context) {
    return TabBar(
      controller: controller,
      labelColor: AppColors.primary,
      unselectedLabelColor: AppColors.navInactive,
      indicatorColor: AppColors.primary,
      labelStyle: AppTypography.titleSm,
      tabs: tabs,
    );
  }
}
