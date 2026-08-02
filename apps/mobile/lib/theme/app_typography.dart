import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// Airbnb-inspired Typography System
class AppTypography {
  static final TextStyle _sansBase = GoogleFonts.inter(
    color: AppColors.ink,
  );

  // Displays (Modest weights, relies on photography for heft)
  static final TextStyle displayXl = _sansBase.copyWith(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    height: 1.43,
    letterSpacing: 0,
  );

  static final TextStyle displayLg = _sansBase.copyWith(
    fontSize: 22,
    fontWeight: FontWeight.w500,
    height: 1.18,
    letterSpacing: -0.44,
  );

  static final TextStyle displayMd = _sansBase.copyWith(
    fontSize: 21,
    fontWeight: FontWeight.w700,
    height: 1.43,
    letterSpacing: 0,
  );

  static final TextStyle displaySm = _sansBase.copyWith(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    height: 1.20,
    letterSpacing: -0.18,
  );

  // Titles
  static final TextStyle titleMd = _sansBase.copyWith(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    height: 1.25,
    letterSpacing: 0,
  );

  static final TextStyle titleSm = _sansBase.copyWith(
    fontSize: 16,
    fontWeight: FontWeight.w500,
    height: 1.25,
    letterSpacing: 0,
  );

  // Body
  static final TextStyle bodyMd = _sansBase.copyWith(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    height: 1.5,
    letterSpacing: 0,
  );

  static final TextStyle bodySm = _sansBase.copyWith(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 1.43,
    letterSpacing: 0,
  );

  // Labels & Captions
  static final TextStyle caption = _sansBase.copyWith(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    height: 1.29,
    letterSpacing: 0,
  );

  static final TextStyle captionSm = _sansBase.copyWith(
    fontSize: 13,
    fontWeight: FontWeight.w400,
    height: 1.23,
    letterSpacing: 0,
  );

  static final TextStyle badge = _sansBase.copyWith(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    height: 1.18,
    letterSpacing: 0,
  );

  // Rating Display
  static final TextStyle ratingDisplay = _sansBase.copyWith(
    fontSize: 64,
    fontWeight: FontWeight.w700,
    height: 1.1,
    letterSpacing: -1,
  );

  // Legacy Aliases
  static final TextStyle buttonMd = _sansBase.copyWith(
    fontSize: 16,
    fontWeight: FontWeight.w500,
  );
  static final TextStyle buttonSm = _sansBase.copyWith(
    fontSize: 14,
    fontWeight: FontWeight.w500,
  );
  static final TextStyle uppercaseTag = _sansBase.copyWith(
    fontSize: 8,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.32,
  );
  static final TextStyle eyebrow = _sansBase.copyWith(
    fontSize: 12,
    fontWeight: FontWeight.w700,
    letterSpacing: 1.5,
  );
}
