class VenueFilter {
  final String searchQuery;
  final String selectedLocality;
  final double maxBudget;
  final double minRating;

  const VenueFilter({
    this.searchQuery = '',
    this.selectedLocality = 'All',
    this.maxBudget = 2000000.0, // Default 20 Lakhs
    this.minRating = 0.0,
  });

  VenueFilter copyWith({
    String? searchQuery,
    String? selectedLocality,
    double? maxBudget,
    double? minRating,
  }) {
    return VenueFilter(
      searchQuery: searchQuery ?? this.searchQuery,
      selectedLocality: selectedLocality ?? this.selectedLocality,
      maxBudget: maxBudget ?? this.maxBudget,
      minRating: minRating ?? this.minRating,
    );
  }

  bool get isFiltered =>
      searchQuery.isNotEmpty ||
      selectedLocality != 'All' ||
      maxBudget < 2000000.0 ||
      minRating > 0.0;
}
