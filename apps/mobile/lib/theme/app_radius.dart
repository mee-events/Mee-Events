import 'package:flutter/material.dart';

/// Airbnb-inspired Border Radius
class AppRadius {
  // Primitives
  static const double none = 0;
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 14;
  static const double lg = 20;
  static const double xl = 32;
  static const double full = 9999;

  // BorderRadius specific
  static const BorderRadius noneAll = BorderRadius.all(Radius.circular(none));
  static const BorderRadius xsAll = BorderRadius.all(Radius.circular(xs));
  static const BorderRadius smAll = BorderRadius.all(Radius.circular(sm));
  static const BorderRadius mdAll = BorderRadius.all(Radius.circular(md)); // Default property card
  static const BorderRadius lgAll = BorderRadius.all(Radius.circular(lg));
  static const BorderRadius xlAll = BorderRadius.all(Radius.circular(xl));
  static const BorderRadius fullAll = BorderRadius.all(Radius.circular(full)); // Search orb, pills

  // Legacy Aliases
  static const BorderRadius cardAll = mdAll;
  static const BorderRadius pillAll = fullAll;
  static const BorderRadius topModal = BorderRadius.vertical(top: Radius.circular(20));
  static const BorderRadius topCard = BorderRadius.vertical(top: Radius.circular(md));
}
