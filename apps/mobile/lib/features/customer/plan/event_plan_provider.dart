import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/plan/event_plan_store.dart';

final eventPlanStoreProvider = Provider<EventPlanStore>((ref) {
  final userId = ref.watch(sessionUserIdProvider);
  return EventPlanStore(userId: userId);
});

final eventPlanProvider =
    StateNotifierProvider<EventPlanNotifier, AsyncValue<List<EventPlanItem>>>(
      (ref) => EventPlanNotifier(ref.watch(eventPlanStoreProvider)),
    );

class EventPlanNotifier extends StateNotifier<AsyncValue<List<EventPlanItem>>> {
  EventPlanNotifier(this._store) : super(const AsyncValue.loading()) {
    _enqueue(_readFromStore);
  }

  final EventPlanStore _store;
  Future<void> _tail = Future<void>.value();

  /// Serializes initialization and mutations in call order.
  Future<void> _enqueue(Future<void> Function() operation) {
    final scheduled = _tail.then((_) => operation());
    _tail = scheduled.then((_) {}, onError: (_) {});
    return scheduled;
  }

  Future<void> _readFromStore() async {
    try {
      final items = await _store.load();
      if (!mounted) return;
      state = AsyncValue.data(items);
    } catch (error, stackTrace) {
      if (!mounted) return;
      if (state.hasValue) return;
      state = AsyncValue.error(error, stackTrace);
    }
  }

  Future<void> add(EventPlanItem item) {
    return _enqueue(() async {
      if (item.restricted) return;
      final previous = state.valueOrNull;
      if (previous != null) {
        state = AsyncValue.data([
          item,
          ...previous.where((e) => e.productCode != item.productCode),
        ]);
      }
      try {
        final next = await _store.add(item);
        if (!mounted) return;
        state = AsyncValue.data(next);
      } catch (error, stackTrace) {
        if (!mounted) return;
        if (previous != null) {
          state = AsyncValue.data(previous);
        } else if (!state.hasValue) {
          state = AsyncValue.error(error, stackTrace);
        }
      }
    });
  }

  Future<void> remove(String productCode) {
    return _enqueue(() async {
      final previous = state.valueOrNull;
      if (previous != null) {
        state = AsyncValue.data(
          previous.where((e) => e.productCode != productCode).toList(),
        );
      }
      try {
        final next = await _store.remove(productCode);
        if (!mounted) return;
        state = AsyncValue.data(next);
      } catch (error, stackTrace) {
        if (!mounted) return;
        if (previous != null) {
          state = AsyncValue.data(previous);
        } else if (!state.hasValue) {
          state = AsyncValue.error(error, stackTrace);
        }
      }
    });
  }

  Future<void> clear() {
    return _enqueue(() async {
      final previous = state.valueOrNull;
      if (previous != null) {
        state = const AsyncValue.data([]);
      }
      try {
        final next = await _store.clear();
        if (!mounted) return;
        state = AsyncValue.data(next);
      } catch (error, stackTrace) {
        if (!mounted) return;
        if (previous != null) {
          state = AsyncValue.data(previous);
        } else if (!state.hasValue) {
          state = AsyncValue.error(error, stackTrace);
        }
      }
    });
  }

  Future<void> refresh() => _enqueue(_readFromStore);
}
