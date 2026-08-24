import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/search/recent_searches_store.dart';
import 'package:mee_events/features/customer/search/search_models.dart';

final recentSearchesStoreProvider = Provider<RecentSearchesStore>((ref) {
  final userId = ref.watch(sessionUserIdProvider);
  return RecentSearchesStore(userId: userId);
});

final recentSearchesProvider =
    StateNotifierProvider<RecentSearchesNotifier, List<String>>((ref) {
      return RecentSearchesNotifier(ref.watch(recentSearchesStoreProvider));
    });

class RecentSearchesNotifier extends StateNotifier<List<String>> {
  RecentSearchesNotifier(this._store) : super(const []) {
    unawaited(
      _enqueue(() async {
        final next = await _store.load();
        if (!mounted) return;
        state = next;
      }).then<void>((_) {}, onError: (_) {}),
    );
  }

  final RecentSearchesStore _store;
  Future<void> _chain = Future<void>.value();

  Future<void> _enqueue(Future<void> Function() op) {
    final done = Completer<void>();
    final run = _chain.then((_) async {
      if (!mounted) {
        if (!done.isCompleted) {
          done.complete();
        }
        return;
      }
      try {
        await op();
        if (!done.isCompleted) {
          done.complete();
        }
      } catch (error, stack) {
        if (!done.isCompleted) {
          done.completeError(error, stack);
        }
      }
    });
    _chain = run.then((_) {}, onError: (_) {});
    return done.future;
  }

  Future<void> add(String term) {
    return _enqueue(() async {
      final next = await _store.add(term);
      if (!mounted) return;
      state = next;
    });
  }

  Future<void> remove(String term) {
    return _enqueue(() async {
      final next = await _store.remove(term);
      if (!mounted) return;
      state = next;
    });
  }

  Future<void> clear() {
    return _enqueue(() async {
      final next = await _store.clear();
      if (!mounted) return;
      state = next;
    });
  }

  Future<void> refresh() {
    return _enqueue(() async {
      final next = await _store.load();
      if (!mounted) return;
      state = next;
    });
  }
}

final trendingSearchesProvider = FutureProvider<List<String>>((ref) async {
  final api = ref.watch(mobileApiProvider);
  return api.trendingSearches();
});

class SearchQueryState {
  const SearchQueryState({
    this.query = '',
    this.debouncedQuery = '',
    this.results = const [],
    this.nextCursor,
    this.isLoading = false,
    this.isLoadingMore = false,
    this.hasSearched = false,
    this.error,
    this.loadMoreError,
  });

  final String query;
  final String debouncedQuery;
  final List<SearchHit> results;
  final String? nextCursor;
  final bool isLoading;
  final bool isLoadingMore;
  final bool hasSearched;
  final Object? error;
  final Object? loadMoreError;

  bool get isIdle => !hasSearched && query.trim().isEmpty;

  bool get canLoadMore =>
      nextCursor != null && nextCursor!.isNotEmpty && !isLoading;

  SearchQueryState copyWith({
    String? query,
    String? debouncedQuery,
    List<SearchHit>? results,
    String? nextCursor,
    bool clearCursor = false,
    bool? isLoading,
    bool? isLoadingMore,
    bool? hasSearched,
    Object? error,
    bool clearError = false,
    Object? loadMoreError,
    bool clearLoadMoreError = false,
  }) {
    return SearchQueryState(
      query: query ?? this.query,
      debouncedQuery: debouncedQuery ?? this.debouncedQuery,
      results: results ?? this.results,
      nextCursor: clearCursor ? null : (nextCursor ?? this.nextCursor),
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasSearched: hasSearched ?? this.hasSearched,
      error: clearError ? null : (error ?? this.error),
      loadMoreError: clearLoadMoreError
          ? null
          : (loadMoreError ?? this.loadMoreError),
    );
  }
}

final searchQueryProvider =
    StateNotifierProvider.autoDispose<SearchQueryNotifier, SearchQueryState>((
      ref,
    ) {
      return SearchQueryNotifier(ref);
    });

class SearchQueryNotifier extends StateNotifier<SearchQueryState> {
  SearchQueryNotifier(this._ref) : super(const SearchQueryState());

  final Ref _ref;
  Timer? _debounce;
  int _generation = 0;
  String? _inFlightKey;

  void setQuery(String value) {
    if (value.trim().isEmpty) {
      clear();
      return;
    }
    if (!mounted) return;
    _debounce?.cancel();
    final generation = ++_generation;
    _inFlightKey = null;
    state = state.copyWith(
      query: value,
      results: const [],
      isLoading: false,
      isLoadingMore: false,
      hasSearched: false,
      clearCursor: true,
      clearError: true,
      clearLoadMoreError: true,
    );
    _debounce = Timer(const Duration(milliseconds: 300), () {
      if (!mounted || generation != _generation) return;
      if (state.query.trim() != value.trim()) return;
      unawaited(_runSearch(value.trim(), generation: generation));
    });
  }

  void clear() {
    _debounce?.cancel();
    _generation++;
    _inFlightKey = null;
    if (!mounted) return;
    state = const SearchQueryState();
  }

  Future<void> submit(String value, {bool recordRecent = true}) async {
    _debounce?.cancel();
    final term = value.trim();
    if (term.isEmpty) {
      clear();
      return;
    }
    if (!mounted) return;
    final generation = ++_generation;
    _inFlightKey = null;
    state = state.copyWith(query: term);
    if (recordRecent) {
      unawaited(_recordRecentSafely(term));
    }
    await _runSearch(term, generation: generation);
  }

  Future<void> retry() {
    if (!mounted) return Future<void>.value();
    final term = state.query.trim();
    if (term.isEmpty) {
      clear();
      return Future<void>.value();
    }
    return _runSearch(term, generation: _generation);
  }

  Future<void> loadMore() async {
    final cursor = state.nextCursor;
    final term = state.debouncedQuery;
    final generation = _generation;
    if (cursor == null ||
        cursor.isEmpty ||
        state.isLoading ||
        state.isLoadingMore ||
        term.isEmpty) {
      return;
    }
    await _runSearch(
      term,
      cursor: cursor,
      append: true,
      generation: generation,
    );
  }

  Future<void> _runSearch(
    String term, {
    String? cursor,
    bool append = false,
    required int generation,
  }) async {
    if (term.isEmpty) {
      clear();
      return;
    }
    if (!mounted || generation != _generation) return;

    final key = '$term|${cursor ?? ''}';
    if (_inFlightKey == key) {
      return;
    }
    _inFlightKey = key;
    state = state.copyWith(
      query: term,
      debouncedQuery: term,
      isLoading: append ? false : true,
      isLoadingMore: append,
      hasSearched: true,
      clearError: !append,
      clearLoadMoreError: true,
      clearCursor: !append,
      results: append ? state.results : const [],
    );

    try {
      final api = _ref.read(mobileApiProvider);
      final response = await api.search(term, cursor: cursor);
      if (!mounted || generation != _generation) return;
      if (append && state.debouncedQuery != term) return;
      final incoming = customerSearchHits(response.results);
      state = state.copyWith(
        results: append ? mergeSearchHits(state.results, incoming) : incoming,
        nextCursor: response.nextCursor,
        clearCursor: response.nextCursor == null,
        isLoading: false,
        isLoadingMore: false,
        hasSearched: true,
        clearError: true,
        clearLoadMoreError: true,
      );
    } catch (error) {
      if (!mounted || generation != _generation) return;
      if (append) {
        state = state.copyWith(
          isLoading: false,
          isLoadingMore: false,
          loadMoreError: error,
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          isLoadingMore: false,
          error: error,
          hasSearched: true,
        );
      }
    } finally {
      if (generation == _generation && _inFlightKey == key) {
        _inFlightKey = null;
      }
    }
  }

  Future<void> _recordRecentSafely(String term) {
    return _ref
        .read(recentSearchesProvider.notifier)
        .add(term)
        .then((_) {}, onError: (_) {});
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _generation++;
    _inFlightKey = null;
    super.dispose();
  }
}
