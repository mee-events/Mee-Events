import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_opacity.dart';

/// Subtle elevation levels — prefer hairline borders over heavy shadows.
class AppElevation {
  AppElevation._();

  static const double flat = 0;
  static const double low = 1;
  static const double medium = 2;
  static const double high = 8;
  static const double overlay = 16;

  static List<BoxShadow> get lowShadow => [
        BoxShadow(
          color: AppColors.ink.withValues(alpha: AppOpacity.shadowLow),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ];

  static List<BoxShadow> get mediumShadow => [
        BoxShadow(
          color: AppColors.ink.withValues(alpha: AppOpacity.shadowMedium),
          blurRadius: 16,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get highShadow => [
        BoxShadow(
          color: AppColors.ink.withValues(alpha: AppOpacity.shadowHigh),
          blurRadius: 24,
          offset: const Offset(0, 8),
        ),
      ];
}
