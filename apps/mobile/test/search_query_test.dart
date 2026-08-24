import 'dart:async';

import 'package:fake_async/fake_async.dart'; // ignore: depend_on_referenced_packages
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/api/api_client.dart';
import 'package:mee_events/api/mobile_api.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/search/recent_searches_store.dart';
import 'package:mee_events/features/customer/search/search_models.dart';
import 'package:mee_events/features/customer/search/search_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FakeMobileApi extends MobileApi {
  FakeMobileApi() : super(apiClient: ApiClient(baseUrl: 'http://127.0.0.1'));

  final calls = <({String q, String? cursor})>[];
  Future<SearchResponse> Function(String q, String? cursor)? onSearch;
  List<String> trending = const [];

  @override
  Future<SearchResponse> search(String q, {String? cursor, int? limit}) {
    calls.add((q: q, cursor: cursor));
    final handler = onSearch;
    if (handler != null) {
      return handler(q, cursor);
    }
    return Future.value(
      SearchResponse(query: q, results: const [], nextCursor: null),
    );
  }

  @override
  Future<List<String>> trendingSearches() async => trending;
}

SearchHit hit({
  required String type,
  required String code,
  String? name,
  String? parentCode,
  String? parentName,
  double score = 1,
}) {
  return SearchHit(
    id: '$type-$code',
    code: code,
    type: type,
    name: name ?? code,
    score: score,
    parentOccasionCode: parentCode,
    parentOccasionName: parentName,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeMobileApi api;
  late ProviderContainer container;

  SearchQueryNotifier notifier() =>
      container.read(searchQueryProvider.notifier);
  SearchQueryState state() => container.read(searchQueryProvider);

  ProviderContainer makeContainer() {
    return ProviderContainer(
      overrides: [
        sessionUserIdProvider.overrideWithValue('search-user'),
        mobileApiProvider.overrideWithValue(api),
        recentSearchesStoreProvider.overrideWith(
          (ref) => RecentSearchesStore(userId: 'search-user'),
        ),
      ],
    );
  }

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    api = FakeMobileApi();
    container = makeContainer();
    container.listen(searchQueryProvider, (_, _) {});
  });

  tearDown(() => container.dispose());

  test('typing debounces and blank query never calls API', () {
    fakeAsync((async) {
      notifier().setQuery('wed');
      async.elapse(const Duration(milliseconds: 299));
      expect(api.calls, isEmpty);
      async.elapse(const Duration(milliseconds: 1));
      async.flushMicrotasks();
      expect(api.calls.map((c) => c.q), ['wed']);

      notifier().setQuery('   ');
      async.elapse(const Duration(milliseconds: 400));
      async.flushMicrotasks();
      expect(api.calls, hasLength(1));
      expect(state().isIdle, isTrue);
    });
  });

  test('submit bypasses debounce and records recent once', () async {
    SharedPreferences.setMockInitialValues({});
    await notifier().submit('wedding');
    expect(api.calls.map((c) => c.q), ['wedding']);
    await container.read(recentSearchesProvider.notifier).refresh();
    expect(container.read(recentSearchesProvider), ['wedding']);
    await notifier().submit('wedding');
    await container.read(recentSearchesProvider.notifier).refresh();
    expect(container.read(recentSearchesProvider), ['wedding']);
  });

  test('clear resets immediately and old response cannot restore results', () {
    fakeAsync((async) {
      final delayed = Completer<SearchResponse>();
      api.onSearch = (q, cursor) => delayed.future;
      notifier().setQuery('wedding');
      async.elapse(const Duration(milliseconds: 300));
      async.flushMicrotasks();
      expect(api.calls, hasLength(1));
      notifier().clear();
      expect(state().isIdle, isTrue);
      expect(state().results, isEmpty);
      delayed.complete(
        SearchResponse(
          query: 'wedding',
          results: [hit(type: 'occasion', code: 'wedding', name: 'Wedding')],
        ),
      );
      async.flushMicrotasks();
      expect(state().isIdle, isTrue);
      expect(state().results, isEmpty);
      expect(state().hasSearched, isFalse);
    });
  });

  test('slow older query cannot overwrite a newer query', () {
    fakeAsync((async) {
      final first = Completer<SearchResponse>();
      final second = Completer<SearchResponse>();
      api.onSearch = (q, cursor) => q == 'wed' ? first.future : second.future;
      notifier().setQuery('wed');
      async.elapse(const Duration(milliseconds: 300));
      async.flushMicrotasks();
      notifier().setQuery('wedding');
      async.elapse(const Duration(milliseconds: 300));
      async.flushMicrotasks();
      second.complete(
        SearchResponse(
          query: 'wedding',
          results: [hit(type: 'occasion', code: 'wedding', name: 'Wedding')],
        ),
      );
      async.flushMicrotasks();
      first.complete(
        SearchResponse(
          query: 'wed',
          results: [hit(type: 'service', code: 'stale', name: 'Stale')],
        ),
      );
      async.flushMicrotasks();
      expect(state().results.single.code, 'wedding');
      expect(state().results.any((h) => h.code == 'stale'), isFalse);
    });
  });

  test('disposal during pending request is safe', () {
    fakeAsync((async) {
      final delayed = Completer<SearchResponse>();
      api.onSearch = (q, cursor) => delayed.future;
      notifier().setQuery('wedding');
      async.elapse(const Duration(milliseconds: 300));
      async.flushMicrotasks();
      container.dispose();
      delayed.complete(
        SearchResponse(
          query: 'wedding',
          results: [hit(type: 'occasion', code: 'wedding', name: 'Wedding')],
        ),
      );
      async.flushMicrotasks();
    });
  });

  test('initial error retains query and retry repeats it', () async {
    var fail = true;
    api.onSearch = (q, cursor) async {
      if (fail) throw Exception('secret-search-error');
      return SearchResponse(query: q, results: const [], nextCursor: null);
    };
    await notifier().submit('mehndi');
    expect(state().query, 'mehndi');
    expect(state().error, isNotNull);
    expect(state().results, isEmpty);
    fail = false;
    await notifier().retry();
    expect(state().error, isNull);
    expect(state().hasSearched, isTrue);
    expect(api.calls.map((c) => c.q), ['mehndi', 'mehndi']);
  });

  test(
    'load more preserves results, dedupes, and cannot start twice',
    () async {
      final more = Completer<SearchResponse>();
      var page = 0;
      api.onSearch = (q, cursor) {
        page += 1;
        if (page == 1) {
          return Future.value(
            SearchResponse(
              query: q,
              results: [hit(type: 'service', code: 'photo', name: 'Photo')],
              nextCursor: 'abc',
            ),
          );
        }
        return more.future;
      };
      await notifier().submit('photo');
      expect(state().results, hasLength(1));
      final first = notifier().loadMore();
      final second = notifier().loadMore();
      expect(api.calls.where((c) => c.cursor != null), hasLength(1));
      more.complete(
        SearchResponse(
          query: 'photo',
          results: [
            hit(type: 'service', code: 'photo', name: 'Photo'),
            hit(type: 'service', code: 'video', name: 'Video'),
          ],
          nextCursor: null,
        ),
      );
      await first;
      await second;
      expect(state().results.map((h) => h.code), ['photo', 'video']);
      expect(state().nextCursor, isNull);
      final before = api.calls.length;
      await notifier().loadMore();
      expect(api.calls, hasLength(before));
    },
  );

  test('old-query pagination cannot append to a newer query', () async {
    final firstMore = Completer<SearchResponse>();
    api.onSearch = (q, cursor) {
      if (cursor != null) {
        return firstMore.future;
      }
      return Future.value(
        SearchResponse(
          query: q,
          results: [hit(type: 'occasion', code: q, name: q)],
          nextCursor: 'c1',
        ),
      );
    };
    await notifier().submit('wed');
    final pending = notifier().loadMore();
    await notifier().submit('wedding', recordRecent: false);
    firstMore.complete(
      SearchResponse(
        query: 'wed',
        results: [hit(type: 'service', code: 'stale', name: 'Stale')],
      ),
    );
    await pending;
    expect(state().results.any((h) => h.code == 'stale'), isFalse);
    expect(state().results.single.code, 'wedding');
  });

  test('old photo response cannot land under catering during debounce', () {
    fakeAsync((async) {
      final photo = Completer<SearchResponse>();
      api.onSearch = (q, cursor) {
        if (q == 'photo') return photo.future;
        return Future.value(
          SearchResponse(
            query: q,
            results: [hit(type: 'service', code: 'catering', name: 'Catering')],
          ),
        );
      };
      notifier().setQuery('photo');
      async.elapse(const Duration(milliseconds: 300));
      async.flushMicrotasks();
      expect(api.calls.map((c) => c.q), ['photo']);
      notifier().setQuery('catering');
      expect(state().query, 'catering');
      expect(api.calls, hasLength(1));
      photo.complete(
        SearchResponse(
          query: 'photo',
          results: [hit(type: 'service', code: 'photo', name: 'Photography')],
        ),
      );
      async.flushMicrotasks();
      expect(state().query, 'catering');
      expect(state().results, isEmpty);
      expect(state().results.any((h) => h.code == 'photo'), isFalse);
      expect(state().isLoading, isFalse);
      expect(state().error, isNull);
      async.elapse(const Duration(milliseconds: 300));
      async.flushMicrotasks();
      expect(api.calls.map((c) => c.q), ['photo', 'catering']);
      expect(state().results.single.code, 'catering');
      expect(state().results.any((h) => h.code == 'photo'), isFalse);
    });
  });

  test('submit starts Search before recent persistence completes', () async {
    final pendingAdd = Completer<List<String>>();
    final photo = Completer<SearchResponse>();
    final catering = Completer<SearchResponse>();
    var searchStarts = 0;
    api.onSearch = (q, cursor) {
      searchStarts += 1;
      if (q == 'photo') return photo.future;
      return catering.future;
    };
    final hanging = _PendingAddStore(pendingAdd);
    container.dispose();
    container = ProviderContainer(
      overrides: [
        sessionUserIdProvider.overrideWithValue('search-user'),
        mobileApiProvider.overrideWithValue(api),
        recentSearchesStoreProvider.overrideWith((ref) => hanging),
      ],
    );
    container.listen(searchQueryProvider, (_, _) {});
    final first = notifier().submit('photo', recordRecent: false);
    await Future<void>.delayed(Duration.zero);
    expect(api.calls.map((c) => c.q), ['photo']);
    final submitted = notifier().submit('catering');
    await Future<void>.delayed(Duration.zero);
    await Future<void>.delayed(Duration.zero);
    expect(api.calls.map((c) => c.q), ['photo', 'catering']);
    expect(pendingAdd.isCompleted, isFalse);
    expect(hanging.addCount, 1);
    photo.complete(
      SearchResponse(
        query: 'photo',
        results: [hit(type: 'service', code: 'photo', name: 'Photography')],
      ),
    );
    await Future<void>.delayed(Duration.zero);
    expect(state().query, 'catering');
    expect(state().results.any((h) => h.code == 'photo'), isFalse);
    pendingAdd.complete(['catering']);
    await Future<void>.delayed(Duration.zero);
    expect(api.calls.where((c) => c.q == 'catering'), hasLength(1));
    catering.complete(
      SearchResponse(
        query: 'catering',
        results: [hit(type: 'service', code: 'catering', name: 'Catering')],
      ),
    );
    await submitted;
    expect(state().results.single.code, 'catering');
    expect(searchStarts, 2);
    await first;
  });

  test('recent persistence failure still renders Search results', () async {
    api.onSearch = (q, cursor) async => SearchResponse(
      query: q,
      results: [hit(type: 'service', code: 'photo', name: 'Photography')],
    );
    container.dispose();
    container = ProviderContainer(
      overrides: [
        sessionUserIdProvider.overrideWithValue('search-user'),
        mobileApiProvider.overrideWithValue(api),
        recentSearchesStoreProvider.overrideWith((ref) => _FailingAddStore()),
      ],
    );
    container.listen(searchQueryProvider, (_, _) {});
    await notifier().submit('photo');
    expect(state().results.single.code, 'photo');
    expect(state().error, isNull);
  });

  test(
    'unsupported-only page keeps cursor so load more can reach hits',
    () async {
      var page = 0;
      api.onSearch = (q, cursor) async {
        page += 1;
        if (cursor == null) {
          return SearchResponse(
            query: q,
            results: [hit(type: 'blog', code: 'post', name: 'Hidden')],
            nextCursor: 'p2',
          );
        }
        return SearchResponse(
          query: q,
          results: [hit(type: 'product', code: 'cake', name: 'Cake')],
          nextCursor: null,
        );
      };
      await notifier().submit('cake');
      expect(state().results, isEmpty);
      expect(state().nextCursor, 'p2');
      await notifier().loadMore();
      expect(page, 2);
      expect(state().results.single.code, 'cake');
      expect(state().nextCursor, isNull);
    },
  );

  test('load-more failure retains results', () async {
    var page = 0;
    api.onSearch = (q, cursor) async {
      page += 1;
      if (page == 1) {
        return SearchResponse(
          query: q,
          results: [hit(type: 'service', code: 'photo', name: 'Photo')],
          nextCursor: 'n',
        );
      }
      throw Exception('page-secret');
    };
    await notifier().submit('photo');
    await notifier().loadMore();
    expect(state().results, hasLength(1));
    expect(state().loadMoreError, isNotNull);
    expect(state().nextCursor, 'n');
  });
}

class _PendingAddStore extends RecentSearchesStore {
  _PendingAddStore(this.pending) : super(userId: 'search-user');

  final Completer<List<String>> pending;
  int addCount = 0;

  @override
  Future<List<String>> add(String raw) {
    addCount += 1;
    return pending.future;
  }
}

class _FailingAddStore extends RecentSearchesStore {
  _FailingAddStore() : super(userId: 'search-user');

  @override
  Future<List<String>> add(String raw) {
    return Future<List<String>>.error(StateError('prefs-down'));
  }
}
