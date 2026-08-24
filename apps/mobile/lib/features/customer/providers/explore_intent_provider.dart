import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Explore tab intent: 0 = Occasions, 1 = Services.
/// Home "View all" and search empty CTAs write here before switching to Explore.
final exploreIntentProvider = StateProvider<int>((ref) => 0);
