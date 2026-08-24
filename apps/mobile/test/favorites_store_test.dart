import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/features/customer/favorites/favorites_store.dart';
import 'package:shared_preferences/shared_preferences.dart';
// ignore: depend_on_referenced_packages
import 'package:shared_preferences_platform_interface/shared_preferences_platform_interface.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.resetStatic();
    SharedPreferences.setMockInitialValues({});
  });

  tearDown(() {
    SharedPreferences.resetStatic();
    SharedPreferences.setMockInitialValues({});
  });

  FavoriteItem item({
    required FavoriteKind kind,
    required String code,
    String? title,
    DateTime? savedAt,
  }) {
    return FavoriteItem(
      kind: kind,
      code: code,
      title: title ?? code,
      savedAt: savedAt,
    );
  }

  test('FavoritesStore toggle saves and removes items', () async {
    final store = FavoritesStore(userId: 'user-a');
    final photo = FavoriteItem(
      kind: FavoriteKind.service,
      code: 'photo_wedding',
      title: 'Wedding Photography',
      departmentCode: 'PHOTO',
    );

    var items = await store.toggle(photo);
    expect(items, hasLength(1));
    expect(items.first.code, 'photo_wedding');

    items = await store.toggle(photo);
    expect(items, isEmpty);
  });

  test('FavoritesStore keeps newest first across kinds', () async {
    final store = FavoritesStore(userId: 'user-a');
    await store.toggle(
      const FavoriteItem(
        kind: FavoriteKind.occasion,
        code: 'wedding',
        title: 'Wedding',
      ),
    );
    await store.toggle(
      const FavoriteItem(
        kind: FavoriteKind.category,
        code: 'DECOR',
        title: 'Decoration',
      ),
    );
    final items = await store.load();
    expect(items.first.code, 'DECOR');
    expect(items.last.code, 'wedding');
  });

  test('JSON without savedAt remains compatible', () async {
    final prefs = await SharedPreferences.getInstance();
    final key = favoritesStorageKey('user-a');
    await prefs.setStringList(key, [
      jsonEncode({'kind': 'occasion', 'code': 'wedding', 'title': 'Wedding'}),
    ]);
    final loaded = await FavoritesStore(prefs: prefs, userId: 'user-a').load();
    expect(loaded.single.code, 'wedding');
    expect(loaded.single.savedAt, isNull);
  });

  test('corrupted rows are skipped', () async {
    final prefs = await SharedPreferences.getInstance();
    final key = favoritesStorageKey('user-a');
    await prefs.setStringList(key, [
      '{not-json',
      jsonEncode({'kind': 'service'}),
      jsonEncode({'kind': 'product', 'code': 'cake', 'title': 'Cake'}),
    ]);
    final loaded = await FavoritesStore(prefs: prefs, userId: 'user-a').load();
    expect(loaded.single.code, 'cake');
  });

  test('null account load is empty and does not write', () async {
    final prefs = await SharedPreferences.getInstance();
    final store = FavoritesStore(prefs: prefs, userId: null);
    expect(await store.load(), isEmpty);
    await store.toggle(item(kind: FavoriteKind.occasion, code: 'wedding'));
    expect(prefs.getKeys().where((k) => k.contains('favorites')), isEmpty);
  });

  test('restore keeps newest-first order without duplicates', () async {
    final store = FavoritesStore(userId: 'user-a');
    final older = item(
      kind: FavoriteKind.occasion,
      code: 'wedding',
      savedAt: DateTime.utc(2026, 1, 1),
    );
    final newer = item(
      kind: FavoriteKind.product,
      code: 'cake',
      savedAt: DateTime.utc(2026, 2, 1),
    );
    await store.restore(older);
    await store.restore(newer);
    await store.restore(older);
    final items = await store.load();
    expect(items.map((e) => e.code), ['cake', 'wedding']);
  });

  test(
    'unknown and missing kinds are skipped without becoming services',
    () async {
      final prefs = await SharedPreferences.getInstance();
      final key = favoritesStorageKey('user-a');
      await prefs.setStringList(key, [
        jsonEncode({'kind': 'occasion', 'code': 'wedding', 'title': 'Wedding'}),
        jsonEncode({'kind': 'venue', 'code': 'hall', 'title': 'Hall'}),
        jsonEncode({'code': 'photo', 'title': 'Photography'}),
        jsonEncode({'kind': 12, 'code': 'decor', 'title': 'Decor'}),
        jsonEncode({'kind': 'product', 'code': 'cake', 'title': 'Cake'}),
      ]);
      final loaded = await FavoritesStore(
        prefs: prefs,
        userId: 'user-a',
      ).load();
      expect(loaded.map((e) => e.code), ['wedding', 'cake']);
      expect(loaded.map((e) => e.kind), [
        FavoriteKind.occasion,
        FavoriteKind.product,
      ]);
      expect(loaded.any((e) => e.kind == FavoriteKind.service), isFalse);
    },
  );

  test('optional malformed fields do not drop a valid row', () async {
    final prefs = await SharedPreferences.getInstance();
    final key = favoritesStorageKey('user-a');
    await prefs.setStringList(key, [
      jsonEncode({
        'kind': 'service',
        'code': 'photo',
        'title': 'Photography',
        'imageUrl': 1,
        'departmentCode': true,
        'savedAt': 99,
      }),
    ]);
    final loaded = await FavoritesStore(prefs: prefs, userId: 'user-a').load();
    expect(loaded.single.code, 'photo');
    expect(loaded.single.kind, FavoriteKind.service);
    expect(loaded.single.imageUrl, isNull);
  });

  test('failed serialized store op still allows a later success', () async {
    final uncaught = <Object>[];
    await runZonedGuarded(() async {
      final platform = installControllablePrefs();
      final store = FavoritesStore(userId: 'user-a');
      platform.writesSucceed = false;
      await expectLater(
        store.toggle(item(kind: FavoriteKind.occasion, code: 'wedding')),
        throwsA(isA<StateError>()),
      );
      expect(await store.load(), isEmpty);
      platform.writesSucceed = true;
      final saved = await store.toggle(
        item(kind: FavoriteKind.product, code: 'cake'),
      );
      expect(saved, hasLength(1));
      expect(saved.single.code, 'cake');
      expect((await store.load()).single.code, 'cake');
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getStringList(favoritesStorageKey('user-a')), isNotNull);
      expect(prefs.getStringList(favoritesStorageKey('user-a')), isNotEmpty);
    }, (error, _) => uncaught.add(error));
    expect(uncaught, isEmpty);
  });

  test('setStringList false fails the public mutation future', () async {
    final platform = installControllablePrefs();
    final store = FavoritesStore(userId: 'user-a');
    platform.writesSucceed = false;
    await expectLater(
      store.toggle(item(kind: FavoriteKind.occasion, code: 'wedding')),
      throwsA(isA<StateError>()),
    );
    expect(await store.load(), isEmpty);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getStringList(favoritesStorageKey('user-a')), isNull);
  });

  test('clear fails when an existing key cannot be removed', () async {
    final platform = installControllablePrefs();
    final store = FavoritesStore(userId: 'user-a');
    await store.toggle(item(kind: FavoriteKind.occasion, code: 'wedding'));
    expect(await store.load(), isNotEmpty);
    platform.removesSucceed = false;
    await expectLater(store.clear(), throwsA(isA<StateError>()));
    expect((await store.load()).single.code, 'wedding');
    platform.removesSucceed = true;
    expect(await store.clear(), isEmpty);
    expect(await store.load(), isEmpty);
  });

  test('clear of an absent key succeeds idempotently', () async {
    installControllablePrefs();
    final store = FavoritesStore(userId: 'user-a');
    expect(await store.clear(), isEmpty);
    expect(await store.load(), isEmpty);
  });

  test('legacy key deletion failure does not claim success', () async {
    final platform = installControllablePrefs({
      kLegacyFavoritesKey: [
        jsonEncode({'kind': 'occasion', 'code': 'wedding', 'title': 'Wedding'}),
      ],
    });
    final store = FavoritesStore(userId: 'user-a');
    platform.removesSucceed = false;
    await expectLater(store.load(), throwsA(isA<StateError>()));
    platform.removesSucceed = true;
    expect(await store.load(), isEmpty);
  });

  test('serialized toggles keep every item', () async {
    final store = FavoritesStore(userId: 'user-a');
    await Future.wait([
      store.toggle(item(kind: FavoriteKind.occasion, code: 'wedding')),
      store.toggle(item(kind: FavoriteKind.service, code: 'photo')),
      store.toggle(item(kind: FavoriteKind.product, code: 'cake')),
    ]);
    final items = await store.load();
    expect(items.map((e) => e.code).toSet(), {'wedding', 'photo', 'cake'});
  });
}

ControllablePreferencesStore installControllablePrefs([
  Map<String, Object> seed = const {},
]) {
  SharedPreferences.resetStatic();
  final platform = ControllablePreferencesStore(seed);
  SharedPreferencesStorePlatform.instance = platform;
  return platform;
}

class ControllablePreferencesStore extends InMemorySharedPreferencesStore {
  ControllablePreferencesStore(Map<String, Object> data)
    : super.withData(_prefixed(data));

  bool writesSucceed = true;
  bool removesSucceed = true;

  static Map<String, Object> _prefixed(Map<String, Object> data) {
    return {
      for (final entry in data.entries)
        entry.key.startsWith('flutter.') ? entry.key : 'flutter.${entry.key}':
            entry.value,
    };
  }

  @override
  Future<bool> setValue(String valueType, String key, Object value) async {
    if (!writesSucceed) {
      return false;
    }
    return super.setValue(valueType, key, value);
  }

  @override
  Future<bool> remove(String key) async {
    if (!removesSucceed) {
      return false;
    }
    return super.remove(key);
  }
}
