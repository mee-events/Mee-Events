import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/venue.dart';
import '../models/venue_filter.dart';
import 'venue_provider.dart';

class FilterNotifier extends StateNotifier<VenueFilter> {
  FilterNotifier() : super(const VenueFilter());

  void updateSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
  }

  void updateLocality(String locality) {
    state = state.copyWith(selectedLocality: locality);
  }

  void updateMaxBudget(double budget) {
    state = state.copyWith(maxBudget: budget);
  }

  void updateMinRating(double rating) {
    state = state.copyWith(minRating: rating);
  }

  void reset() {
    state = const VenueFilter();
  }
}

final venueFilterProvider =
    StateNotifierProvider<FilterNotifier, VenueFilter>((ref) {
  return FilterNotifier();
});

final filteredVenuesProvider = Provider<AsyncValue<List<EventVenue>>>((ref) {
  final venuesAsync = ref.watch(premiumVenuesProvider);
  final filter = ref.watch(venueFilterProvider);

  return venuesAsync.whenData((venues) {
    return venues.where((venue) {
      // 1. Search Query Filter
      if (filter.searchQuery.isNotEmpty) {
        final query = filter.searchQuery.toLowerCase();
        final matchesTitle = venue.title.toLowerCase().contains(query);
        final matchesLocation = venue.location.toLowerCase().contains(query);
        if (!matchesTitle && !matchesLocation) return false;
      }

      // 2. Hyderabad Locality Filter
      if (filter.selectedLocality != 'All') {
        if (!venue.location
            .toLowerCase()
            .contains(filter.selectedLocality.toLowerCase())) {
          return false;
        }
      }

      // 3. Price Filter
      if (venue.price > filter.maxBudget) {
        return false;
      }

      // 4. Rating Filter
      if (venue.rating < filter.minRating) {
        return false;
      }

      return true;
    }).toList();
  });
});
