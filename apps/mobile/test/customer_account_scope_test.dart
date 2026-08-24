import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/favorites/favorites_provider.dart';
import 'package:mee_events/features/customer/favorites/favorites_store.dart';
import 'package:mee_events/features/customer/plan/event_plan_provider.dart';
import 'package:mee_events/features/customer/plan/event_plan_store.dart';
import 'package:mee_events/features/customer/search/recent_searches_store.dart';
import 'package:mee_events/features/customer/search/search_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const itemA = FavoriteItem(
    kind: FavoriteKind.service,
    code: 'photography',
    title: 'Photography',
  );
  const itemB = FavoriteItem(
    kind: FavoriteKind.service,
    code: 'catering',
    title: 'Catering',
  );
  const planA = EventPlanItem(
    productCode: 'photo.A1',
    displayName: 'Album',
    serviceCode: 'photography',
  );
  const planB = EventPlanItem(
    productCode: 'food.A1',
    displayName: 'Buffet',
    serviceCode: 'catering',
  );

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('User A and User B load different Favorites', () async {
    final prefs = await SharedPreferences.getInstance();
    final storeA = FavoritesStore(prefs: prefs, userId: 'user-a');
    final storeB = FavoritesStore(prefs: prefs, userId: 'user-b');

    await storeA.toggle(itemA);
    await storeB.toggle(itemB);

    expect((await storeA.load()).map((e) => e.code), ['photography']);
    expect((await storeB.load()).map((e) => e.code), ['catering']);
  });

  test('User A and User B load different Event Plans', () async {
    final prefs = await SharedPreferences.getInstance();
    final storeA = EventPlanStore(prefs: prefs, userId: 'user-a');
    final storeB = EventPlanStore(prefs: prefs, userId: 'user-b');

    await storeA.add(planA);
    await storeB.add(planB);

    expect((await storeA.load()).map((e) => e.productCode), ['photo.A1']);
    expect((await storeB.load()).map((e) => e.productCode), ['food.A1']);
  });

  test('User A and User B load different recent searches', () async {
    final prefs = await SharedPreferences.getInstance();
    final storeA = RecentSearchesStore(prefs: prefs, userId: 'user-a');
    final storeB = RecentSearchesStore(prefs: prefs, userId: 'user-b');

    await storeA.add('Wedding');
    await storeB.add('Birthday');

    expect(await storeA.load(), ['Wedding']);
    expect(await storeB.load(), ['Birthday']);
  });

  test('Account switching rebuilds provider state', () async {
    final prefs = await SharedPreferences.getInstance();
    await FavoritesStore(prefs: prefs, userId: 'user-a').toggle(itemA);
    await FavoritesStore(prefs: prefs, userId: 'user-b').toggle(itemB);
    await EventPlanStore(prefs: prefs, userId: 'user-a').add(planA);
    await EventPlanStore(prefs: prefs, userId: 'user-b').add(planB);
    await RecentSearchesStore(prefs: prefs, userId: 'user-a').add('Wedding');
    await RecentSearchesStore(prefs: prefs, userId: 'user-b').add('Birthday');

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
        eventPlanStoreProvider.overrideWith((ref) {
          return EventPlanStore(
            prefs: prefs,
            userId: ref.watch(sessionUserIdProvider),
          );
        }),
        recentSearchesStoreProvider.overrideWith((ref) {
          return RecentSearchesStore(
            prefs: prefs,
            userId: ref.watch(sessionUserIdProvider),
          );
        }),
      ],
    );
    addTearDown(container.dispose);

    await container.read(favoritesProvider.notifier).refresh();
    await container.read(eventPlanProvider.notifier).refresh();
    await container.read(recentSearchesProvider.notifier).refresh();
    expect(container.read(favoritesProvider).valueOrNull?.map((e) => e.code), [
      'photography',
    ]);
    expect(
      container.read(eventPlanProvider).valueOrNull?.map((e) => e.productCode),
      ['photo.A1'],
    );
    expect(container.read(recentSearchesProvider), ['Wedding']);

    container.read(accountId.notifier).state = 'user-b';
    await container.read(favoritesProvider.notifier).refresh();
    await container.read(eventPlanProvider.notifier).refresh();
    await container.read(recentSearchesProvider.notifier).refresh();
    expect(container.read(favoritesProvider).valueOrNull?.map((e) => e.code), [
      'catering',
    ]);
    expect(
      container.read(eventPlanProvider).valueOrNull?.map((e) => e.productCode),
      ['food.A1'],
    );
    expect(container.read(recentSearchesProvider), ['Birthday']);
  });

  test('Signing out leaves no previous-user plan visible', () async {
    final prefs = await SharedPreferences.getInstance();
    await EventPlanStore(prefs: prefs, userId: 'user-a').add(planA);
    await FavoritesStore(prefs: prefs, userId: 'user-a').toggle(itemA);
    await RecentSearchesStore(prefs: prefs, userId: 'user-a').add('Wedding');

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
        eventPlanStoreProvider.overrideWith((ref) {
          return EventPlanStore(
            prefs: prefs,
            userId: ref.watch(sessionUserIdProvider),
          );
        }),
        recentSearchesStoreProvider.overrideWith((ref) {
          return RecentSearchesStore(
            prefs: prefs,
            userId: ref.watch(sessionUserIdProvider),
          );
        }),
      ],
    );
    addTearDown(container.dispose);

    await container.read(favoritesProvider.notifier).refresh();
    await container.read(eventPlanProvider.notifier).refresh();
    await container.read(recentSearchesProvider.notifier).refresh();
    expect(container.read(eventPlanProvider).valueOrNull, isNotEmpty);

    container.read(accountId.notifier).state = null;
    await container.read(favoritesProvider.notifier).refresh();
    await container.read(eventPlanProvider.notifier).refresh();
    await container.read(recentSearchesProvider.notifier).refresh();
    expect(container.read(favoritesProvider).valueOrNull, isEmpty);
    expect(container.read(eventPlanProvider).valueOrNull, isEmpty);
    expect(container.read(recentSearchesProvider), isEmpty);
    expect(
      prefs.getStringList(eventPlanStorageKey('user-a')),
      isNotEmpty,
      reason: 'sign-out must not clear another account scoped key',
    );
  });

  test(
    'Legacy global values are not exposed to the next authenticated user',
    () async {
      SharedPreferences.setMockInitialValues({
        kLegacyFavoritesKey: [jsonEncode(itemA.toJson())],
        kLegacyEventPlanKey: [jsonEncode(planA.toJson())],
        kLegacyRecentSearchesKey: ['Legacy Wedding'],
      });
      final prefs = await SharedPreferences.getInstance();
      final favorites = FavoritesStore(prefs: prefs, userId: 'user-next');
      final plan = EventPlanStore(prefs: prefs, userId: 'user-next');
      final searches = RecentSearchesStore(prefs: prefs, userId: 'user-next');

      expect(await favorites.load(), isEmpty);
      expect(await plan.load(), isEmpty);
      expect(await searches.load(), isEmpty);
      expect(prefs.containsKey(kLegacyFavoritesKey), isFalse);
      expect(prefs.containsKey(kLegacyEventPlanKey), isFalse);
      expect(prefs.containsKey(kLegacyRecentSearchesKey), isFalse);
    },
  );

  test('Event Plan still deduplicates by product code', () async {
    final prefs = await SharedPreferences.getInstance();
    final store = EventPlanStore(prefs: prefs, userId: 'user-a');
    await store.add(planA);
    await store.add(
      const EventPlanItem(
        productCode: 'photo.A1',
        displayName: 'Album reprint',
        serviceCode: 'photography',
      ),
    );
    final items = await store.load();
    expect(items, hasLength(1));
    expect(items.single.displayName, 'Album reprint');
  });
}
