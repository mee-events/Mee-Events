import 'package:mee_events/features/customer/favorites/favorites_store.dart';

enum SavedFilter { all, occasions, services, options }

extension SavedFilterX on SavedFilter {
  String get label => switch (this) {
    SavedFilter.all => 'All',
    SavedFilter.occasions => 'Occasions',
    SavedFilter.services => 'Services',
    SavedFilter.options => 'Options',
  };

  String get emptyTitle => switch (this) {
    SavedFilter.all => 'Nothing saved yet',
    SavedFilter.occasions => 'No saved occasions',
    SavedFilter.services => 'No saved services',
    SavedFilter.options => 'No saved options',
  };

  bool matches(FavoriteKind kind) => switch (this) {
    SavedFilter.all => true,
    SavedFilter.occasions => kind == FavoriteKind.occasion,
    SavedFilter.services =>
      kind == FavoriteKind.category || kind == FavoriteKind.service,
    SavedFilter.options => kind == FavoriteKind.product,
  };
}

List<FavoriteItem> applySavedFilter(
  List<FavoriteItem> items,
  SavedFilter filter,
) {
  return [
    for (final item in items)
      if (filter.matches(item.kind)) item,
  ];
}
