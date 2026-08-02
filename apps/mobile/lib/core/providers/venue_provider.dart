import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/venue.dart';
import '../repositories/venue_repository.dart';

final venueRepositoryProvider = Provider<VenueRepository>((ref) {
  return VenueRepository();
});

final premiumVenuesProvider = FutureProvider<List<EventVenue>>((ref) async {
  final repository = ref.watch(venueRepositoryProvider);
  return repository.fetchPremiumVenues();
});
