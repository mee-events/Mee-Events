import 'package:mee_events/features/customer/favorites/favorites_store.dart';

class ScriptedFavoritesStore extends FavoritesStore {
  ScriptedFavoritesStore({
    this.loadFn,
    this.toggleFn,
    this.removeFn,
    this.restoreFn,
    super.userId = 'scripted',
    super.prefs,
  });

  Future<List<FavoriteItem>> Function()? loadFn;
  Future<List<FavoriteItem>> Function(FavoriteItem item)? toggleFn;
  Future<List<FavoriteItem>> Function(FavoriteItem item)? removeFn;
  Future<List<FavoriteItem>> Function(FavoriteItem item)? restoreFn;
  int loads = 0;
  int removes = 0;
  int toggles = 0;

  @override
  Future<List<FavoriteItem>> load() {
    loads += 1;
    final fn = loadFn;
    if (fn != null) return fn();
    return super.load();
  }

  @override
  Future<List<FavoriteItem>> toggle(FavoriteItem item) {
    toggles += 1;
    final fn = toggleFn;
    if (fn != null) return fn(item);
    return super.toggle(item);
  }

  @override
  Future<List<FavoriteItem>> remove(FavoriteItem item) {
    removes += 1;
    final fn = removeFn;
    if (fn != null) return fn(item);
    return super.remove(item);
  }

  @override
  Future<List<FavoriteItem>> restore(FavoriteItem item) {
    final fn = restoreFn;
    if (fn != null) return fn(item);
    return super.restore(item);
  }
}

FavoriteItem testFavorite({
  required FavoriteKind kind,
  required String code,
  String? title,
  DateTime? savedAt,
  String? departmentCode,
  String? imageUrl,
}) {
  return FavoriteItem(
    kind: kind,
    code: code,
    title: title ?? code,
    departmentCode: departmentCode,
    imageUrl: imageUrl,
    savedAt: savedAt,
  );
}
