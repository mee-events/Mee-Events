import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_opacity.dart';

/// Reusable premium gradients. Use sparingly (hero, promo, upcoming).
class AppGradients {
  AppGradients._();

  static const LinearGradient brandPremium = LinearGradient(
    colors: [Color(0xFF4A0D1D), Color(0xFF8E1C3C)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient celebration = LinearGradient(
    colors: [Color(0xFF7A1631), Color(0xFFBA3A5B)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient premiumGold = LinearGradient(
    colors: [Color(0xFFB98629), Color(0xFFE4BF69)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient upcomingEvent = LinearGradient(
    colors: [Color(0xFFFFF2E1), Color(0xFFF9E8EB)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// Dark wine scrim for hero photography readability.
  static LinearGradient get heroScrim => LinearGradient(
    begin: Alignment.bottomCenter,
    end: Alignment.topCenter,
    colors: [
      AppColors.scrim.withValues(alpha: 0.72),
      AppColors.scrim.withValues(alpha: 0.28),
      AppColors.scrim.withValues(alpha: AppOpacity.invisible),
    ],
    stops: const [0.0, 0.45, 1.0],
  );

  /// Backward-compatible aliases previously on [AppColors].
  static const LinearGradient primaryGradient = brandPremium;
  static const LinearGradient goldGradient = premiumGold;
}
