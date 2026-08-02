import 'package:flutter/material.dart';

/// Airbnb-inspired Design System Colors
class AppColors {
  // Brand
  static const Color primary = Color(0xFFFF385C); // Airbnb Rausch
  static const Color primaryActive = Color(0xFFE00B41);
  static const Color primaryDisabled = Color(0xFFFFD1DA);
  
  static const Color secondary = Color(0xFF222222); // Ink used as secondary
  static const Color secondaryAccent = Color(0xFF222222);
  static const Color goldAccent = Color(0xFFFF385C); // Mapped to primary for legacy compat

  // Backgrounds
  static const Color canvas = Color(0xFFFFFFFF); // Pure White Background
  static const Color surfaceCard = Color(0xFFFFFFFF); // White Cards
  static const Color surfaceSoft = Color(0xFFF7F7F7); 
  static const Color surfaceStrong = Color(0xFFF2F2F2);

  // Typography
  static const Color ink = Color(0xFF222222); // Deep Black
  static const Color body = Color(0xFF3F3F3F); // Dark Slate
  static const Color muted = Color(0xFF6A6A6A); 
  static const Color mutedSoft = Color(0xFF929292);

  // Borders & Dividers
  static const Color hairline = Color(0xFFDDDDDD);
  static const Color hairlineSoft = Color(0xFFEBEBEB);
  static const Color borderStrong = Color(0xFFC1C1C1);

  // Status & Accents
  static const Color error = Color(0xFFC13515); // Airbnb Error Red
  static const Color errorSoft = Color(0xFFB32505); // Error Hover
  static const Color warning = Color(0xFFFFB300);
  static const Color success = Color(0xFF2E7D32); // Green
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color starRating = Color(0xFF222222); // Airbnb stars are ink
  
  // Scrim (Overlays)
  static const Color scrim = Color(0xFF000000); // 50% opacity in use
  static final Color glassBackground = canvas.withValues(alpha: 0.9);
  static final Color glassBorder = hairlineSoft;
  
  // Legacy Aliases (to prevent build errors)
  static const Color primarySoft = primaryDisabled;
  static const Color inkLight = muted;
  static const Color vendorAccent = primary;
  static const Color workerAccent = primary;
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, primaryActive],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient goldGradient = LinearGradient(
    colors: [primary, primaryActive],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static final Color glassBackgroundLight = canvas.withValues(alpha: 0.7);
}
