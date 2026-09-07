import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/planning_context/planning_context_store.dart';

typedef PlanningContextClock = DateTime Function();

enum PlanningContextSaveResult {
  persisted,
  sessionOnly,
  persistenceFailed,
  rejectedPastDate,
}

final planningContextClockProvider = Provider<PlanningContextClock>(
  (ref) => DateTime.now,
);

final planningContextStoreProvider = Provider<PlanningContextStore>((ref) {
  return PlanningContextStore(userId: ref.watch(sessionUserIdProvider));
});

final planningContextProvider =
    StateNotifierProvider<PlanningContextNotifier, CustomerPlanningContext>((
      ref,
    ) {
      return PlanningContextNotifier(
        ref.watch(planningContextStoreProvider),
        clock: ref.watch(planningContextClockProvider),
      );
    });

class PlanningContextNotifier extends StateNotifier<CustomerPlanningContext> {
  PlanningContextNotifier(this._store, {this._clock = DateTime.now})
    : super(const CustomerPlanningContext()) {
    _ready = _load();
  }

  final PlanningContextStore _store;
  final PlanningContextClock _clock;
  late final Future<CustomerPlanningContext> _ready;
  Future<void> _persistenceQueue = Future<void>.value();

  Future<CustomerPlanningContext> get ready async {
    await _ready;
    return mounted ? state : const CustomerPlanningContext();
  }

  Future<CustomerPlanningContext> _load() async {
    try {
      final loaded = await _store.load(today: _clock());
      if (mounted) state = loaded;
      return loaded;
    } catch (_) {
      return mounted ? state : const CustomerPlanningContext();
    }
  }

  Future<PlanningContextSaveResult> save({
    required String area,
    DateTime? eventDate,
  }) async {
    await _ready;
    if (eventDate != null && isPastPlanningContextDate(eventDate, _clock())) {
      return PlanningContextSaveResult.rejectedPastDate;
    }
    final next = CustomerPlanningContext(
      area: sanitizePlanningContextArea(area),
      eventDate: eventDate == null ? null : planningContextDateOnly(eventDate),
    );
    if (mounted) state = next;
    if (!_store.persistsAcrossSessions) {
      return PlanningContextSaveResult.sessionOnly;
    }

    final write = Completer<bool>();
    _persistenceQueue = _persistenceQueue.then((_) async {
      try {
        write.complete(await _store.save(next));
      } catch (error, stackTrace) {
        write.completeError(error, stackTrace);
      }
    });
    try {
      final persisted = await write.future;
      return persisted
          ? PlanningContextSaveResult.persisted
          : PlanningContextSaveResult.persistenceFailed;
    } catch (_) {
      // Keep the safe in-memory value. Persistence can be retried by editing.
      return PlanningContextSaveResult.persistenceFailed;
    }
  }

  Future<PlanningContextSaveResult> clearArea() async {
    await _ready;
    return save(area: '', eventDate: state.eventDate);
  }

  Future<PlanningContextSaveResult> clearDate() async {
    await _ready;
    return save(area: state.area, eventDate: null);
  }
}
