import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/favorites/favorites_provider.dart';
import 'package:mee_events/features/customer/favorites/favorites_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'support/favorites_test_fakes.dart';

FavoriteItem fav({
  required FavoriteKind kind,
  required String code,
  String? title,
  DateTime? savedAt,
  String? departmentCode,
}) {
  return testFavorite(
    kind: kind,
    code: code,
    title: title,
    savedAt: savedAt,
    departmentCode: departmentCode,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('initial load success', () async {
    final wedding = fav(kind: FavoriteKind.occasion, code: 'wedding');
    final notifier = FavoritesNotifier(
      ScriptedFavoritesStore(loadFn: () async => [wedding]),
    );
    await Future<void>.delayed(Duration.zero);
    expect(notifier.state.valueOrNull?.single.code, 'wedding');
    notifier.dispose();
  });

  test('initial load failure keeps a safe error state', () async {
    final notifier = FavoritesNotifier(
      ScriptedFavoritesStore(
        loadFn: () async => throw Exception('secret-fav-load'),
      ),
    );
    await Future<void>.delayed(Duration.zero);
    expect(notifier.state.hasError, isTrue);
    expect(notifier.state.valueOrNull, isNull);
    notifier.dispose();
  });

  test('retry after initial failure reloads the store', () async {
    var fail = true;
    var loads = 0;
    final store = ScriptedFavoritesStore(
      loadFn: () async {
        loads += 1;
        if (fail) throw Exception('secret-fav-load');
        return [fav(kind: FavoriteKind.occasion, code: 'wedding')];
      },
    );
    final notifier = FavoritesNotifier(store);
    await Future<void>.delayed(Duration.zero);
    expect(notifier.state.hasError, isTrue);
    fail = false;
    expect(await notifier.refresh(), isTrue);
    expect(loads, 2);
    expect(notifier.state.valueOrNull?.single.code, 'wedding');
    notifier.dispose();
  });

  test('refresh failure reports false and retains trusted favorites', () async {
    var fail = false;
    final wedding = fav(kind: FavoriteKind.occasion, code: 'wedding');
    final store = ScriptedFavoritesStore(
      loadFn: () async {
        if (fail) throw Exception('favorites-refresh-failed');
        return [wedding];
      },
    );
    final notifier = FavoritesNotifier(store);
    await Future<void>.delayed(Duration.zero);
    expect(notifier.state.valueOrNull?.single.code, 'wedding');

    fail = true;
    expect(await notifier.refresh(), isFalse);
    expect(notifier.state.hasError, isFalse);
    expect(notifier.state.valueOrNull?.single.code, 'wedding');
    notifier.dispose();
  });

  test('dispose during delayed initial load is safe', () async {
    final delayed = Completer<List<FavoriteItem>>();
    final notifier = FavoritesNotifier(
      ScriptedFavoritesStore(loadFn: () => delayed.future),
    );
    notifier.dispose();
    delayed.complete([fav(kind: FavoriteKind.occasion, code: 'wedding')]);
    await Future<void>.delayed(Duration.zero);
  });

  test('delayed initial load cannot overwrite a newer mutation', () async {
    final delayed = Completer<List<FavoriteItem>>();
    final wedding = fav(kind: FavoriteKind.occasion, code: 'wedding');
    final cake = fav(kind: FavoriteKind.product, code: 'cake');
    final store = ScriptedFavoritesStore(
      loadFn: () => delayed.future,
      toggleFn: (item) async => [item],
    );
    final notifier = FavoritesNotifier(store);
    final pending = notifier.toggle(cake);
    await Future<void>.delayed(Duration.zero);
    delayed.complete([wedding]);
    await pending;
    expect(notifier.state.valueOrNull?.single.code, 'cake');
    notifier.dispose();
  });

  test('rapid mutations preserve unrelated items', () async {
    final prefs = await SharedPreferences.getInstance();
    final store = FavoritesStore(prefs: prefs, userId: 'user-a');
    final notifier = FavoritesNotifier(store);
    await Future<void>.delayed(Duration.zero);
    await Future.wait([
      notifier.toggle(fav(kind: FavoriteKind.occasion, code: 'wedding')),
      notifier.toggle(fav(kind: FavoriteKind.service, code: 'photo')),
      notifier.toggle(fav(kind: FavoriteKind.product, code: 'cake')),
    ]);
    expect(notifier.state.valueOrNull?.map((e) => e.code).toSet(), {
      'wedding',
      'photo',
      'cake',
    });
    notifier.dispose();
  });

  test('failed remove rolls back state', () async {
    final wedding = fav(kind: FavoriteKind.occasion, code: 'wedding');
    final notifier = FavoritesNotifier(
      ScriptedFavoritesStore(
        loadFn: () async => [wedding],
        removeFn: (_) async => throw Exception('secret-fav-remove'),
      ),
    );
    await Future<void>.delayed(Duration.zero);
    final ok = await notifier.remove(wedding);
    expect(ok, isFalse);
    expect(notifier.state.valueOrNull?.single.code, 'wedding');
    expect(notifier.state.hasError, isFalse);
    notifier.dispose();
  });

  test('successful remove persists', () async {
    final prefs = await SharedPreferences.getInstance();
    final store = FavoritesStore(prefs: prefs, userId: 'user-a');
    final wedding = fav(kind: FavoriteKind.occasion, code: 'wedding');
    await store.toggle(wedding);
    final notifier = FavoritesNotifier(store);
    await Future<void>.delayed(Duration.zero);
    final saved = notifier.state.valueOrNull!.single;
    final ok = await notifier.remove(saved);
    expect(ok, isTrue);
    expect(notifier.state.valueOrNull, isEmpty);
    expect(await store.load(), isEmpty);
    notifier.dispose();
  });

  test('remove then undo restores exactly one item', () async {
    final prefs = await SharedPreferences.getInstance();
    final store = FavoritesStore(prefs: prefs, userId: 'user-a');
    await store.toggle(fav(kind: FavoriteKind.occasion, code: 'wedding'));
    final notifier = FavoritesNotifier(store);
    await Future<void>.delayed(Duration.zero);
    final saved = notifier.state.valueOrNull!.single;
    await notifier.remove(saved);
    final ok = await notifier.restore(saved);
    expect(ok, isTrue);
    expect(notifier.state.valueOrNull?.map((e) => e.code), ['wedding']);
    expect((await store.load()).map((e) => e.code), ['wedding']);
    notifier.dispose();
  });

  test('sequential remove restore remove is deterministic', () async {
    final prefs = await SharedPreferences.getInstance();
    final store = FavoritesStore(prefs: prefs, userId: 'user-a');
    await store.toggle(fav(kind: FavoriteKind.occasion, code: 'wedding'));
    final notifier = FavoritesNotifier(store);
    await Future<void>.delayed(Duration.zero);
    final saved = notifier.state.valueOrNull!.single;
    await notifier.remove(saved);
    await notifier.restore(saved);
    await notifier.remove(saved);
    expect(notifier.state.valueOrNull, isEmpty);
    expect(await store.load(), isEmpty);
    notifier.dispose();
  });

  test(
    'overlapping remove restore remove keeps last intent and unrelated item',
    () async {
      final prefs = await SharedPreferences.getInstance();
      final store = FavoritesStore(prefs: prefs, userId: 'user-a');
      await store.toggle(fav(kind: FavoriteKind.occasion, code: 'wedding'));
      await store.toggle(fav(kind: FavoriteKind.product, code: 'cake'));
      final notifier = FavoritesNotifier(store);
      await Future<void>.delayed(Duration.zero);
      final items = notifier.state.valueOrNull!;
      final cake = items.firstWhere((e) => e.code == 'cake');
      final first = notifier.remove(cake);
      final second = notifier.restore(cake);
      final third = notifier.remove(cake);
      await first;
      await second;
      await third;
      expect(notifier.state.valueOrNull?.map((e) => e.code), ['wedding']);
      expect((await store.load()).map((e) => e.code), ['wedding']);
      expect(
        notifier.state.valueOrNull?.where((e) => e.code == 'cake'),
        isEmpty,
      );
      await notifier.toggle(fav(kind: FavoriteKind.service, code: 'photo'));
      expect(notifier.state.valueOrNull?.map((e) => e.code).toSet(), {
        'photo',
        'wedding',
      });
      notifier.dispose();
    },
  );

  test('cold-start toggle failure recovers persisted favorites', () async {
    final uncaught = <Object>[];
    await runZoned(
      () async {
        final prefs = await SharedPreferences.getInstance();
        final inner = FavoritesStore(prefs: prefs, userId: 'user-a');
        final wedding = fav(kind: FavoriteKind.occasion, code: 'wedding');
        final cake = fav(kind: FavoriteKind.product, code: 'cake');
        await inner.toggle(wedding);
        await inner.toggle(cake);
        final persisted = await inner.load();
        final loadGate = Completer<void>();
        var failToggle = true;
        final store = ScriptedFavoritesStore(
          prefs: prefs,
          userId: 'user-a',
          loadFn: () async {
            await loadGate.future;
            return persisted;
          },
          toggleFn: (item) async {
            if (failToggle) {
              throw Exception('secret-fav-toggle');
            }
            return inner.toggle(item);
          },
        );
        final notifier = FavoritesNotifier(store);
        final pending = notifier.toggle(
          fav(kind: FavoriteKind.service, code: 'photo'),
        );
        await Future<void>.delayed(Duration.zero);
        loadGate.complete();
        await pending;
        expect(notifier.state.valueOrNull?.map((e) => e.code).toSet(), {
          'cake',
          'wedding',
        });
        expect(
          notifier.state.valueOrNull?.any((e) => e.code == 'photo'),
          isFalse,
        );
        expect((await inner.load()).map((e) => e.code).toSet(), {
          'cake',
          'wedding',
        });
        failToggle = false;
        await notifier.toggle(fav(kind: FavoriteKind.service, code: 'photo'));
        expect(notifier.state.valueOrNull?.map((e) => e.code).toSet(), {
          'photo',
          'cake',
          'wedding',
        });
        notifier.dispose();
      },
      zoneSpecification: ZoneSpecification(
        handleUncaughtError: (self, parent, zone, error, stack) {
          uncaught.add(error);
        },
      ),
    );
    expect(uncaught, isEmpty);
  });

  test(
    'cold-start remove failure returns false and recovers persisted state',
    () async {
      final prefs = await SharedPreferences.getInstance();
      final inner = FavoritesStore(prefs: prefs, userId: 'user-a');
      await inner.toggle(fav(kind: FavoriteKind.occasion, code: 'wedding'));
      await inner.toggle(fav(kind: FavoriteKind.product, code: 'cake'));
      final persisted = await inner.load();
      final loadGate = Completer<void>();
      final store = ScriptedFavoritesStore(
        prefs: prefs,
        userId: 'user-a',
        loadFn: () async {
          await loadGate.future;
          return persisted;
        },
        removeFn: (_) async => throw Exception('secret-fav-remove'),
      );
      final notifier = FavoritesNotifier(store);
      final pending = notifier.remove(persisted.first);
      await Future<void>.delayed(Duration.zero);
      loadGate.complete();
      final ok = await pending;
      expect(ok, isFalse);
      expect(notifier.state.valueOrNull?.map((e) => e.code).toSet(), {
        'cake',
        'wedding',
      });
      expect(notifier.state.hasError, isFalse);
      expect((await inner.load()).map((e) => e.code).toSet(), {
        'cake',
        'wedding',
      });
      notifier.dispose();
    },
  );

  test('delayed account A load cannot populate Riverpod account B', () async {
    final prefs = await SharedPreferences.getInstance();
    await FavoritesStore(
      prefs: prefs,
      userId: 'user-a',
    ).toggle(fav(kind: FavoriteKind.occasion, code: 'wedding'));
    await FavoritesStore(
      prefs: prefs,
      userId: 'user-b',
    ).toggle(fav(kind: FavoriteKind.service, code: 'catering'));
    final loadA = Completer<List<FavoriteItem>>();
    final accountId = StateProvider<String?>((ref) => 'user-a');
    final container = ProviderContainer(
      overrides: [
        sessionUserIdProvider.overrideWith((ref) => ref.watch(accountId)),
        favoritesStoreProvider.overrideWith((ref) {
          final id = ref.watch(sessionUserIdProvider);
          if (id == 'user-a') {
            return ScriptedFavoritesStore(
              prefs: prefs,
              userId: 'user-a',
              loadFn: () => loadA.future,
            );
          }
          return FavoritesStore(prefs: prefs, userId: id);
        }),
      ],
    );
    addTearDown(container.dispose);
    container.listen(favoritesProvider, (_, _) {});
    expect(container.read(favoritesProvider).isLoading, isTrue);
    container.read(accountId.notifier).state = 'user-b';
    await Future<void>.delayed(Duration.zero);
    await container.read(favoritesProvider.notifier).refresh();
    expect(container.read(favoritesProvider).valueOrNull?.map((e) => e.code), [
      'catering',
    ]);
    loadA.complete([fav(kind: FavoriteKind.occasion, code: 'wedding')]);
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);
    expect(container.read(favoritesProvider).valueOrNull?.map((e) => e.code), [
      'catering',
    ]);
    expect(
      container
          .read(favoritesProvider)
          .valueOrNull
          ?.any((e) => e.code == 'wedding'),
      isFalse,
    );
    container.read(accountId.notifier).state = null;
    await Future<void>.delayed(Duration.zero);
    await container.read(favoritesProvider.notifier).refresh();
    expect(container.read(favoritesProvider).valueOrNull, isEmpty);
    expect(
      (await FavoritesStore(prefs: prefs, userId: 'user-a').load()).single.code,
      'wedding',
    );
    expect(
      (await FavoritesStore(prefs: prefs, userId: 'user-b').load()).single.code,
      'catering',
    );
  });

  test('account A delayed load cannot populate account B', () async {
    final delayedA = Completer<List<FavoriteItem>>();
    final prefs = await SharedPreferences.getInstance();
    final storeB = FavoritesStore(prefs: prefs, userId: 'user-b');
    await storeB.toggle(fav(kind: FavoriteKind.service, code: 'catering'));
    final notifierA = FavoritesNotifier(
      ScriptedFavoritesStore(loadFn: () => delayedA.future),
    );
    final notifierB = FavoritesNotifier(storeB);
    await notifierB.refresh();
    notifierA.dispose();
    delayedA.complete([fav(kind: FavoriteKind.occasion, code: 'wedding')]);
    await Future<void>.delayed(Duration.zero);
    expect(notifierB.state.valueOrNull?.single.code, 'catering');
    notifierB.dispose();
  });

  test('null-account notifier stays empty', () async {
    final prefs = await SharedPreferences.getInstance();
    final notifier = FavoritesNotifier(
      FavoritesStore(prefs: prefs, userId: null),
    );
    await Future<void>.delayed(Duration.zero);
    expect(notifier.state.valueOrNull, isEmpty);
    await notifier.toggle(fav(kind: FavoriteKind.occasion, code: 'wedding'));
    expect(notifier.state.valueOrNull, isEmpty);
    notifier.dispose();
  });

  test('toggle failure does not emit an uncaught error', () async {
    final uncaught = <Object>[];
    await runZoned(
      () async {
        final notifier = FavoritesNotifier(
          ScriptedFavoritesStore(
            loadFn: () async => const [],
            toggleFn: (_) async => throw Exception('secret-fav-toggle'),
          ),
        );
        await Future<void>.delayed(Duration.zero);
        await notifier.toggle(
          fav(kind: FavoriteKind.occasion, code: 'wedding'),
        );
        expect(notifier.state.valueOrNull, isEmpty);
        notifier.dispose();
      },
      zoneSpecification: ZoneSpecification(
        handleUncaughtError: (self, parent, zone, error, stack) {
          uncaught.add(error);
        },
      ),
    );
    expect(uncaught, isEmpty);
  });

  test('provider newest-first matches store', () async {
    final prefs = await SharedPreferences.getInstance();
    final store = FavoritesStore(prefs: prefs, userId: 'user-a');
    await store.toggle(fav(kind: FavoriteKind.occasion, code: 'wedding'));
    await store.toggle(fav(kind: FavoriteKind.product, code: 'cake'));
    final notifier = FavoritesNotifier(store);
    await Future<void>.delayed(Duration.zero);
    expect(notifier.state.valueOrNull?.map((e) => e.code), ['cake', 'wedding']);
    notifier.dispose();
  });

  test('account switch via provider stays isolated', () async {
    final prefs = await SharedPreferences.getInstance();
    await FavoritesStore(
      prefs: prefs,
      userId: 'user-a',
    ).toggle(fav(kind: FavoriteKind.service, code: 'photography'));
    await FavoritesStore(
      prefs: prefs,
      userId: 'user-b',
    ).toggle(fav(kind: FavoriteKind.service, code: 'catering'));
    final accountId = StateProvider<String?>((ref) => 'user-a');
    final container = ProviderContainer(
      overrides: [
        sessionUserIdProvider.overrideWith((ref) => ref.watch(accountId)),
        favoritesStoreProvider.overrideWith((ref) {
          return FavoritesStore(
            prefs: prefs,
            userId: ref.watch(sessionUserIdProvider),
          );
        }),
      ],
    );
    addTearDown(container.dispose);
    await container.read(favoritesProvider.notifier).refresh();
    expect(
      container.read(favoritesProvider).valueOrNull?.single.code,
      'photography',
    );
    container.read(accountId.notifier).state = 'user-b';
    await container.read(favoritesProvider.notifier).refresh();
    expect(
      container.read(favoritesProvider).valueOrNull?.single.code,
      'catering',
    );
  });
}
