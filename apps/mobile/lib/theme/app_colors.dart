import 'package:flutter/material.dart';

/// Mee Events premium colour system — Burgundy + Champagne Gold + Warm Ivory.
class AppColors {
  AppColors._();

  // Brand — burgundy for customer actions and selection.
  static const Color primary = Color(0xFF7A1631);
  static const Color primaryActive = Color(0xFF4A0D1D);
  static const Color primaryDisabled = Color(0xFFE5DFE0);
  static const Color primarySoft = Color(0xFFF7E7EB);
  static const Color brandMark = Color(0xFF6A1028);

  // Premium accent — champagne gold.
  static const Color goldAccent = Color(0xFFD6A84B);
  static const Color goldAntique = Color(0xFFA97922);
  static const Color goldSoft = Color(0xFFF4EBD8);
  static const Color onGold = Color(0xFF3B0B17);

  // Legacy aliases (secondary previously meant ink).
  static const Color secondary = Color(0xFF211A1C);
  static const Color secondaryAccent = goldAccent;

  // Backgrounds
  static const Color canvas = Color(0xFFFFF9F5);
  static const Color surfaceCard = Color(0xFFFFFFFF);
  static const Color surfaceSoft = Color(0xFFF8F0E8);
  static const Color surfaceStrong = Color(0xFFEFE5E7);
  static const Color disabledSurface = Color(0xFFE5DFE0);

  // Typography
  static const Color ink = Color(0xFF211A1C);
  static const Color inkLight = Color(0xFF403832);
  static const Color body = Color(0xFF211A1C);
  static const Color muted = Color(0xFF776D70);
  static const Color mutedSoft = Color(0xFFABA1A3);
  static const Color navInactive = Color(0xFF958A8D);
  static const Color onPrimary = Color(0xFFFFFFFF);

  // Borders & Dividers
  static const Color hairline = Color(0xFFE9DDE0);
  static const Color hairlineSoft = Color(0xFFEFE5E7);
  static const Color borderStrong = Color(0xFFD8CED0);
  static const Color dragHandle = Color(0xFFD8CED0);

  // Status & Accents
  static const Color error = Color(0xFFD13C4C);
  static const Color errorSoft = Color(0xFFFBE3E0);
  static const Color warning = Color(0xFFE29A2D);
  static const Color success = Color(0xFF138A68);
  static const Color info = Color(0xFF3567C8);
  static const Color notification = Color(0xFFE53945);
  static const Color starRating = goldAccent;
  static const Color disabledText = Color(0xFFAAA1A3);

  // Scrim (Overlays)
  static const Color scrim = Color(0xFF260711);
  static final Color glassBackground = canvas.withValues(alpha: 0.9);
  static final Color glassBorder = hairlineSoft;
  static final Color glassBackgroundLight = canvas.withValues(alpha: 0.7);

  // Role accents (shared brand; contextual only).
  static const Color vendorAccent = Color(0xFF167463);
  static const Color vendorSoft = Color(0xFFE0F1ED);
  static const Color workerAccent = Color(0xFF3B5F9C);
  static const Color workerSoft = Color(0xFFE6ECF6);

  // Occasion accents — badges/chips only, never replace brand.
  static const Color occasionEngagement = Color(0xFFC65375);
  static const Color occasionPreWedding = Color(0xFF8D63B8);
  static const Color occasionMehndi = Color(0xFF4E8C61);
  static const Color occasionSangeet = Color(0xFF7C4DAD);
  static const Color occasionWedding = Color(0xFFA91838);
  static const Color occasionReception = Color(0xFF36567C);
  static const Color occasionBirthday = Color(0xFFE68A3F);
  static const Color occasionBaby = Color(0xFFD97891);
  static const Color occasionCorporate = Color(0xFF284E73);
}
