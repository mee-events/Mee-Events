import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_elevation.dart';
import 'package:mee_events/theme/app_icon_size.dart';
import 'package:mee_events/theme/app_opacity.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

const kCustomerBrandLabel = 'Mee Events';
const kCustomerBrandKey = ValueKey<String>('customer-header-brand');
const kHeaderActionSize = 44.0;
const kHeaderBrandGap = AppSpacing.xs;

/// Unified customer shell header: role avatar · brand · search · favorites ·
/// notifications.
///
/// Notifications stay visible but disabled until the Notification Centre
/// module exists. Do not pass a no-op [onNotification].
class AppHeader extends StatelessWidget implements PreferredSizeWidget {
  const AppHeader({
    super.key,
    this.showSearch = true,
    this.showFavourite = true,
    this.showNotification = true,
    this.backgroundColor,
    this.iconColor,
    this.brandLabel = kCustomerBrandLabel,
    this.roleLabel,
    this.onSwitchRole,
    this.onSearch,
    this.onFavourite,
    this.onNotification,
  });

  final bool showSearch;
  final bool showFavourite;
  final bool showNotification;
  final Color? backgroundColor;
  final Color? iconColor;
  final String brandLabel;
  final String? roleLabel;
  final VoidCallback? onSwitchRole;
  final VoidCallback? onSearch;
  final VoidCallback? onFavourite;
  final VoidCallback? onNotification;

  static const double height = 56;

  static double barHeightFor(BuildContext context) {
    return MediaQuery.textScalerOf(context).scale(height).clamp(height, 72.0);
  }

  @override
  Size get preferredSize => const Size.fromHeight(height);

  int get _actionCount => [
    showSearch,
    showFavourite,
    showNotification,
  ].where((visible) => visible).length;

  @override
  Widget build(BuildContext context) {
    final resolvedIcon = iconColor ?? AppColors.primaryActive;
    final bg = backgroundColor ?? AppColors.canvas;

    return Material(
      color: bg,
      elevation: AppElevation.flat,
      child: SizedBox(
        height: barHeightFor(context),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
          child: LayoutBuilder(
            builder: (context, constraints) {
              return _buildRow(context, constraints.maxWidth, resolvedIcon);
            },
          ),
        ),
      ),
    );
  }

  Widget _buildRow(BuildContext context, double innerWidth, Color iconColor) {
    final rightW = kHeaderActionSize * _actionCount;
    final scale = MediaQuery.textScalerOf(context).scale(1);
    final brandStyle = AppTypography.titleMd.copyWith(
      color: AppColors.brandMark,
    );
    final minBrandLane = scale <= 1.15 ? 96.0 : 88.0;
    final canBalance =
        innerWidth >= (rightW * 2) + minBrandLane + (kHeaderBrandGap * 2);

    final role = _RoleAvatarButton(
      roleLabel: roleLabel ?? 'Customer',
      onPressed: onSwitchRole,
      iconColor: iconColor,
    );
    final actions = _HeaderActions(
      iconColor: iconColor,
      showSearch: showSearch,
      showFavourite: showFavourite,
      showNotification: showNotification,
      onSearch: onSearch,
      onFavourite: onFavourite,
      onNotification: onNotification,
    );
    final brand = _BrandLabel(text: brandLabel, style: brandStyle);

    if (canBalance) {
      return Row(
        children: [
          SizedBox(
            width: rightW,
            child: Align(alignment: Alignment.centerLeft, child: role),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: kHeaderBrandGap),
              child: Center(child: brand),
            ),
          ),
          SizedBox(
            width: rightW,
            child: Align(alignment: Alignment.centerRight, child: actions),
          ),
        ],
      );
    }

    return Row(
      children: [
        role,
        const SizedBox(width: kHeaderBrandGap),
        Expanded(child: Center(child: brand)),
        const SizedBox(width: kHeaderBrandGap),
        actions,
      ],
    );
  }
}

class _BrandLabel extends StatelessWidget {
  const _BrandLabel({required this.text, required this.style});

  final String text;
  final TextStyle style;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      key: kCustomerBrandKey,
      maxLines: 1,
      softWrap: false,
      overflow: TextOverflow.visible,
      textAlign: TextAlign.center,
      style: style,
    );
  }
}

class _HeaderActions extends StatelessWidget {
  const _HeaderActions({
    required this.iconColor,
    required this.showSearch,
    required this.showFavourite,
    required this.showNotification,
    this.onSearch,
    this.onFavourite,
    this.onNotification,
  });

  final Color iconColor;
  final bool showSearch;
  final bool showFavourite;
  final bool showNotification;
  final VoidCallback? onSearch;
  final VoidCallback? onFavourite;
  final VoidCallback? onNotification;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (showSearch)
          _HeaderActionButton(
            icon: Icons.search_rounded,
            color: iconColor,
            tooltip: 'Search',
            semanticLabel: 'Search',
            onPressed: onSearch,
          ),
        if (showFavourite)
          _HeaderActionButton(
            icon: Icons.favorite_border_rounded,
            color: iconColor,
            tooltip: 'Favorites',
            semanticLabel: 'Favorites',
            onPressed: onFavourite,
          ),
        if (showNotification)
          _HeaderActionButton(
            icon: Icons.notifications_none_rounded,
            color: iconColor,
            tooltip: 'Notifications unavailable',
            semanticLabel: 'Notifications unavailable',
            onPressed: onNotification,
          ),
      ],
    );
  }
}

class _RoleAvatarButton extends StatelessWidget {
  const _RoleAvatarButton({
    required this.roleLabel,
    required this.iconColor,
    this.onPressed,
  });

  final String roleLabel;
  final Color iconColor;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      enabled: onPressed != null,
      label: 'Switch role, current role $roleLabel',
      child: ExcludeSemantics(
        child: SizedBox(
          width: kHeaderActionSize,
          height: kHeaderActionSize,
          child: IconButton(
            onPressed: onPressed,
            tooltip: 'Switch role, current role $roleLabel',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints.tightFor(
              width: kHeaderActionSize,
              height: kHeaderActionSize,
            ),
            style: IconButton.styleFrom(
              minimumSize: const Size(kHeaderActionSize, kHeaderActionSize),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              padding: EdgeInsets.zero,
            ),
            icon: SizedBox(
              width: 32,
              height: 32,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  DecoratedBox(
                    decoration: BoxDecoration(
                      color: AppColors.primarySoft,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.primary, width: 1),
                    ),
                    child: Center(
                      child: Icon(
                        Icons.person_rounded,
                        size: AppIconSize.md,
                        color: iconColor,
                      ),
                    ),
                  ),
                  Positioned(
                    right: -2,
                    bottom: -2,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: AppColors.surfaceCard,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.primary, width: 1),
                      ),
                      child: Icon(
                        Icons.swap_horiz_rounded,
                        size: 12,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _HeaderActionButton extends StatelessWidget {
  const _HeaderActionButton({
    required this.icon,
    required this.color,
    required this.tooltip,
    required this.semanticLabel,
    this.onPressed,
  });

  final IconData icon;
  final Color color;
  final String tooltip;
  final String semanticLabel;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null;
    final resolved = enabled
        ? color
        : color.withValues(alpha: AppOpacity.disabled);
    return Semantics(
      button: true,
      enabled: enabled,
      label: semanticLabel,
      child: ExcludeSemantics(
        child: SizedBox(
          width: kHeaderActionSize,
          height: kHeaderActionSize,
          child: IconButton(
            onPressed: onPressed,
            tooltip: tooltip,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints.tightFor(
              width: kHeaderActionSize,
              height: kHeaderActionSize,
            ),
            style: IconButton.styleFrom(
              foregroundColor: resolved,
              disabledForegroundColor: resolved,
              minimumSize: const Size(kHeaderActionSize, kHeaderActionSize),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              padding: EdgeInsets.zero,
              shape: const CircleBorder(),
            ),
            icon: Icon(icon, color: resolved, size: AppIconSize.lg),
          ),
        ),
      ),
    );
  }
}
