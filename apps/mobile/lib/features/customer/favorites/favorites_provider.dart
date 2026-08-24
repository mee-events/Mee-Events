import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/favorites/favorites_store.dart';

final favoritesStoreProvider = Provider<FavoritesStore>((ref) {
  final userId = ref.watch(sessionUserIdProvider);
  return FavoritesStore(userId: userId);
});

final favoritesProvider =
    StateNotifierProvider<FavoritesNotifier, AsyncValue<List<FavoriteItem>>>(
      (ref) => FavoritesNotifier(ref.watch(favoritesStoreProvider)),
    );

class FavoritesNotifier extends StateNotifier<AsyncValue<List<FavoriteItem>>> {
  FavoritesNotifier(this._store) : super(const AsyncValue.loading()) {
    unawaited(_enqueue(_reload).then<void>((_) {}, onError: (_) {}));
  }

  final FavoritesStore _store;
  Future<void> _chain = Future<void>.value();
  int _writeEpoch = 0;
  List<FavoriteItem>? _trustedPersisted;

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

  List<FavoriteItem> _knownItems() {
    return state.valueOrNull ?? _trustedPersisted ?? const <FavoriteItem>[];
  }

  bool get _hasTrustedPersisted => state.hasValue || _trustedPersisted != null;

  Future<void> _reload() async {
    final epoch = _writeEpoch;
    try {
      final items = await _store.load();
      if (!mounted) return;
      _trustedPersisted = items;
      if (epoch != _writeEpoch) {
        return;
      }
      state = AsyncValue.data(items);
    } catch (error, stack) {
      if (!mounted || epoch != _writeEpoch) {
        return;
      }
      state = AsyncValue.error(error, stack);
      rethrow;
    }
  }

  Future<void> _recoverFromPersistence() async {
    try {
      final persisted = await _store.load();
      if (!mounted) return;
      _trustedPersisted = persisted;
      state = AsyncValue.data(persisted);
    } catch (error, stack) {
      if (!mounted) return;
      final trusted = _trustedPersisted;
      if (trusted != null) {
        state = AsyncValue.data(trusted);
      } else {
        state = AsyncValue.error(error, stack);
      }
    }
  }

  bool isSaved(FavoriteKind kind, String code) {
    return _knownItems().any((e) => e.kind == kind && e.code == code);
  }

  /// Fire-and-forget safe for Detail screens. Persistence failure rolls back
  /// and completes without throwing.
  Future<void> toggle(FavoriteItem item) {
    _writeEpoch++;
    return _enqueue(() async {
      final previous = _knownItems();
      final exists = previous.any((e) => e.key == item.key);
      final optimistic = exists
          ? previous.where((e) => e.key != item.key).toList()
          : [
              FavoriteItem(
                kind: item.kind,
                code: item.code,
                title: item.title,
                imageUrl: item.imageUrl,
                departmentCode: item.departmentCode,
                savedAt: DateTime.now(),
              ),
              ...previous,
            ];
      if (!mounted) return;
      if (_hasTrustedPersisted || state.hasValue) {
        state = AsyncValue.data(optimistic);
      }
      try {
        final next = await _store.toggle(item);
        if (!mounted) return;
        _trustedPersisted = next;
        state = AsyncValue.data(next);
      } catch (_) {
        await _recoverFromPersistence();
      }
    });
  }

  /// Returns true when persistence succeeded. False after rollback.
  Future<bool> remove(FavoriteItem item) {
    _writeEpoch++;
    return _mutateBool(() async {
      final previous = _knownItems();
      if (!mounted) return false;
      if (_hasTrustedPersisted || state.hasValue) {
        state = AsyncValue.data(
          previous.where((e) => e.key != item.key).toList(),
        );
      }
      try {
        final next = await _store.remove(item);
        if (!mounted) return true;
        _trustedPersisted = next;
        state = AsyncValue.data(next);
        return true;
      } catch (_) {
        await _recoverFromPersistence();
        return false;
      }
    });
  }

  /// Restores a previously removed snapshot. Returns true on success.
  Future<bool> restore(FavoriteItem item) {
    _writeEpoch++;
    return _mutateBool(() async {
      final previous = _knownItems();
      if (!mounted) return false;
      if (_hasTrustedPersisted || state.hasValue) {
        if (!previous.any((e) => e.key == item.key)) {
          final optimistic = [...previous, item]
            ..sort((a, b) {
              final at = a.savedAt;
              final bt = b.savedAt;
              if (at == null && bt == null) return 0;
              if (at == null) return 1;
              if (bt == null) return -1;
              return bt.compareTo(at);
            });
          state = AsyncValue.data(optimistic);
        }
      }
      try {
        final next = await _store.restore(item);
        if (!mounted) return true;
        _trustedPersisted = next;
        state = AsyncValue.data(next);
        return true;
      } catch (_) {
        await _recoverFromPersistence();
        return false;
      }
    });
  }

  Future<bool> _mutateBool(Future<bool> Function() op) {
    final result = Completer<bool>();
    unawaited(
      _enqueue(() async {
        final ok = await op();
        if (!result.isCompleted) {
          result.complete(ok);
        }
      }).then(
        (_) {
          if (!result.isCompleted) {
            result.complete(false);
          }
        },
        onError: (_) {
          if (!result.isCompleted) {
            result.complete(false);
          }
        },
      ),
    );
    return result.future;
  }

  Future<void> refresh() {
    _writeEpoch++;
    return _enqueue(() async {
      try {
        await _reload();
      } catch (_) {
        // Error already assigned in _reload.
      }
    });
  }
}
