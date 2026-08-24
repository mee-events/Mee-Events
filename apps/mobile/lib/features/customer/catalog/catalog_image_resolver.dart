import 'package:flutter/material.dart';
import 'package:mee_events/core/widgets/image/app_image.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_icon_size.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Thin display resolver: backend media first, then branded fallback (null).
class CatalogImageResolver {
  CatalogImageResolver._();

  static String? forOccasion({required String code, String? remoteUrl}) {
    return _firstUsable([remoteUrl]);
  }

  static String? forService({
    required String code,
    String? coverImageUrl,
    String? iconUrl,
    String? departmentCode,
  }) {
    return resolvedServiceImage(coverImageUrl: coverImageUrl, iconUrl: iconUrl);
  }

  static String? resolvedServiceImage({
    String? coverImageUrl,
    String? iconUrl,
  }) {
    return _firstUsable([coverImageUrl, iconUrl]);
  }

  static String? resolvedProductImage({
    String? coverImageUrl,
    List<String> gallery = const [],
    String? subcategoryCoverUrl,
    String? serviceCoverUrl,
    String? serviceIconUrl,
  }) {
    return _firstUsable([
      coverImageUrl,
      ...gallery,
      subcategoryCoverUrl,
      serviceCoverUrl,
      serviceIconUrl,
    ]);
  }

  static String? resolvedHomeImage({
    required String code,
    String? remoteUrl,
    String? coverImageUrl,
    String? iconUrl,
  }) {
    return _firstUsable([remoteUrl, coverImageUrl, iconUrl]);
  }

  static String? _firstUsable(Iterable<String?> candidates) {
    for (final candidate in candidates) {
      if (_isUsableHomeImage(candidate)) {
        return candidate!.trim();
      }
    }
    return null;
  }

  static bool _isUsableHomeImage(String? url) {
    if (url == null) return false;
    final value = url.trim();
    if (value.isEmpty) return false;
    return value.startsWith('http://') || value.startsWith('https://');
  }
}

IconData homeOccasionFallbackIcon(String code) {
  final key = code.trim().toLowerCase().replaceAll(' ', '_');
  if (key.contains('mehnd') || key.contains('mehend')) {
    return Icons.spa_outlined;
  }
  if (key.contains('reception')) return Icons.nightlife_outlined;
  if (key.contains('birthday')) return Icons.cake_outlined;
  if (key.contains('corporate')) return Icons.apartment_outlined;
  if (key.contains('half') ||
      key.contains('saree') ||
      key.contains('dhoti') ||
      key.contains('cradle')) {
    return Icons.temple_hindu_outlined;
  }
  if (key.contains('sangeet') || key.contains('entertain')) {
    return Icons.music_note_outlined;
  }
  if (key.contains('festival')) return Icons.auto_awesome_outlined;
  if (key.contains('house')) return Icons.cottage_outlined;
  if (key.contains('pre') && key.contains('wedding')) {
    return Icons.favorite_border;
  }
  if (key.contains('engag')) return Icons.diamond_outlined;
  if (key.contains('wedding')) return Icons.church_outlined;
  const palette = <IconData>[
    Icons.event_outlined,
    Icons.local_activity_outlined,
    Icons.diversity_3_outlined,
    Icons.interests_outlined,
  ];
  return palette[key.hashCode.abs() % palette.length];
}

IconData homeServiceFallbackIcon(String code) {
  final key = code.trim().toLowerCase().replaceAll(' ', '_');
  if (key.contains('photo') || key.contains('video')) {
    return Icons.photo_camera_outlined;
  }
  if (key.contains('cater') || key.contains('food') || key.contains('cake')) {
    return Icons.restaurant_outlined;
  }
  if (key.contains('decor') ||
      key.contains('flower') ||
      key.contains('floral')) {
    return Icons.local_florist_outlined;
  }
  if (key.contains('entertain') ||
      key.contains('dj') ||
      key.contains('music') ||
      key.contains('band')) {
    return Icons.queue_music_outlined;
  }
  if (key.contains('makeup') ||
      key.contains('mehnd') ||
      key.contains('beauty')) {
    return Icons.brush_outlined;
  }
  if (key.contains('gift')) return Icons.card_giftcard_outlined;
  if (key.contains('transport') ||
      key.contains('car') ||
      key.contains('travel')) {
    return Icons.directions_car_outlined;
  }
  if (key.contains('venue') || key.contains('hall')) {
    return Icons.location_city_outlined;
  }
  if (key.contains('light')) return Icons.lightbulb_outline;
  if (key.contains('sound')) return Icons.speaker_outlined;
  if (key.contains('tent')) return Icons.holiday_village_outlined;
  if (key.contains('advert')) return Icons.campaign_outlined;
  if (key.contains('material') || key.contains('equip')) {
    return Icons.inventory_2_outlined;
  }
  const palette = <IconData>[
    Icons.event_seat_outlined,
    Icons.handshake_outlined,
    Icons.storefront_outlined,
    Icons.chair_outlined,
  ];
  return palette[key.hashCode.abs() % palette.length];
}

/// Photography when a real image exists; otherwise a branded fallback.
///
/// Default (no [fallbackIcon]) keeps the label-initial tile used by Explore,
/// Search and detail screens. Home supplies an explicit pictogram.
class HomeCatalogVisual extends StatelessWidget {
  const HomeCatalogVisual({
    super.key,
    this.imageUrl,
    required this.label,
    this.borderRadius,
    this.fallbackIcon,
  });

  static const fallbackKey = Key('home-branded-fallback');

  final String? imageUrl;
  final String label;
  final BorderRadius? borderRadius;
  final IconData? fallbackIcon;

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? AppRadius.mdAll;
    final branded = _HomeBrandedFallback(
      label: label,
      borderRadius: radius,
      icon: fallbackIcon,
    );
    final url = imageUrl?.trim();
    if (url == null || url.isEmpty) {
      return branded;
    }
    return ClipRRect(
      borderRadius: radius,
      child: AppImage(
        imageUrl: url,
        fit: BoxFit.cover,
        fallbackWidget: branded,
      ),
    );
  }
}

class _HomeBrandedFallback extends StatelessWidget {
  const _HomeBrandedFallback({
    required this.label,
    required this.borderRadius,
    this.icon,
  });

  final String label;
  final BorderRadius borderRadius;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: DecoratedBox(
        key: HomeCatalogVisual.fallbackKey,
        decoration: BoxDecoration(
          borderRadius: borderRadius,
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppColors.goldSoft, AppColors.primarySoft],
          ),
          border: Border.all(
            color: AppColors.goldAccent.withValues(alpha: 0.4),
          ),
        ),
        child: Center(child: icon == null ? _initialText() : _pictogram()),
      ),
    );
  }

  Widget _pictogram() {
    return Icon(icon, size: AppIconSize.xl, color: AppColors.brandMark);
  }

  Widget _initialText() {
    return Text(
      _initial(label),
      style: AppTypography.displayMd.copyWith(color: AppColors.brandMark),
    );
  }

  static String _initial(String label) {
    final trimmed = label.trim();
    if (trimmed.isEmpty) return 'M';
    return trimmed.substring(0, 1).toUpperCase();
  }
}
