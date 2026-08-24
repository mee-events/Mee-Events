import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/search/recent_searches_store.dart';
import 'package:mee_events/features/customer/search/search_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test(
    'case-insensitive duplicates collapse and max 10 is preserved',
    () async {
      final prefs = await SharedPreferences.getInstance();
      final store = RecentSearchesStore(prefs: prefs, userId: 'user-a');
      await store.add('Wedding');
      await store.add('wedding');
      expect(await store.load(), ['wedding']);
      for (var i = 0; i < 12; i++) {
        await store.add('term $i');
      }
      final loaded = await store.load();
      expect(loaded, hasLength(10));
      expect(loaded.first, 'term 11');
      expect(loaded.contains('wedding'), isFalse);
    },
  );

  test('blank terms are ignored', () async {
    final prefs = await SharedPreferences.getInstance();
    final store = RecentSearchesStore(prefs: prefs, userId: 'user-a');
    await store.add('   ');
    expect(await store.load(), isEmpty);
  });

  test('delayed initial load cannot overwrite add', () async {
    final prefs = await SharedPreferences.getInstance();
    await RecentSearchesStore(prefs: prefs, userId: 'user-a').add('Old');
    final store = RecentSearchesStore(prefs: prefs, userId: 'user-a');
    final notifier = RecentSearchesNotifier(store);
    await notifier.add('New');
    await Future<void>.delayed(Duration.zero);
    expect(notifier.state, ['New', 'Old']);
    notifier.dispose();
  });

  test('accounts stay isolated and logout is empty', () async {
    final prefs = await SharedPreferences.getInstance();
    await RecentSearchesStore(prefs: prefs, userId: 'user-a').add('Wedding');
    await RecentSearchesStore(prefs: prefs, userId: 'user-b').add('Birthday');
    final accountId = StateProvider<String?>((ref) => 'user-a');
    final container = ProviderContainer(
      overrides: [
        sessionUserIdProvider.overrideWith((ref) => ref.watch(accountId)),
        recentSearchesStoreProvider.overrideWith((ref) {
          return RecentSearchesStore(
            prefs: prefs,
            userId: ref.watch(sessionUserIdProvider),
          );
        }),
      ],
    );
    addTearDown(container.dispose);
    await container.read(recentSearchesProvider.notifier).refresh();
    expect(container.read(recentSearchesProvider), ['Wedding']);
    container.read(accountId.notifier).state = null;
    await container.read(recentSearchesProvider.notifier).refresh();
    expect(container.read(recentSearchesProvider), isEmpty);
  });

  test(
    'constructor load failure stays empty and later add still runs',
    () async {
      var loads = 0;
      var adds = 0;
      final store = _ScriptedStore(
        loadFn: () async {
          loads += 1;
          throw Exception('load-failed');
        },
        addFn: (term) async {
          adds += 1;
          return [term];
        },
      );
      final uncaught = <Object>[];
      await runZoned(
        () async {
          final notifier = RecentSearchesNotifier(store);
          await Future<void>.delayed(Duration.zero);
          expect(notifier.state, isEmpty);
          expect(loads, 1);
          await notifier.add('Wedding');
          expect(adds, 1);
          expect(notifier.state, ['Wedding']);
          notifier.dispose();
        },
        zoneSpecification: ZoneSpecification(
          handleUncaughtError: (self, parent, zone, error, stack) {
            uncaught.add(error);
          },
        ),
      );
      expect(uncaught, isEmpty);
    },
  );

  test('failed queued add reports error and later add still runs', () async {
    var failFirst = true;
    final store = _ScriptedStore(
      addFn: (term) async {
        if (failFirst) {
          failFirst = false;
          throw Exception('persist-failed');
        }
        return [term];
      },
    );
    final notifier = RecentSearchesNotifier(store);
    addTearDown(notifier.dispose);
    await Future<void>.delayed(Duration.zero);
    await expectLater(notifier.add('first'), throwsA(isA<Exception>()));
    await notifier.add('second');
    expect(notifier.state, ['second']);
  });

  test('delayed load after dispose does not update state', () async {
    final delayed = Completer<List<String>>();
    final store = _ScriptedStore(loadFn: () => delayed.future);
    final notifier = RecentSearchesNotifier(store);
    notifier.dispose();
    delayed.complete(const ['Wedding']);
    await Future<void>.delayed(Duration.zero);
  });

  test('delayed account A load cannot populate account B', () async {
    final delayedA = Completer<List<String>>();
    final prefs = await SharedPreferences.getInstance();
    final storeA = _ScriptedStore(loadFn: () => delayedA.future);
    final storeB = RecentSearchesStore(prefs: prefs, userId: 'user-b');
    await storeB.add('Birthday');
    final notifierA = RecentSearchesNotifier(storeA);
    final notifierB = RecentSearchesNotifier(storeB);
    addTearDown(notifierB.dispose);
    await notifierB.refresh();
    notifierA.dispose();
    delayedA.complete(const ['Wedding']);
    await Future<void>.delayed(Duration.zero);
    expect(notifierB.state, ['Birthday']);
  });
}

class _ScriptedStore extends RecentSearchesStore {
  _ScriptedStore({this.loadFn, this.addFn}) : super(userId: 'scripted');

  final Future<List<String>> Function()? loadFn;
  final Future<List<String>> Function(String term)? addFn;

  @override
  Future<List<String>> load() {
    final fn = loadFn;
    if (fn != null) return fn();
    return Future.value(const []);
  }

  @override
  Future<List<String>> add(String raw) {
    final fn = addFn;
    if (fn != null) return fn(raw);
    return super.add(raw);
  }
}
