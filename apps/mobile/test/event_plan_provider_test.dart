import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/features/customer/plan/event_plan_provider.dart';
import 'package:mee_events/features/customer/plan/event_plan_store.dart';

class _FakeEventPlanStore extends EventPlanStore {
  _FakeEventPlanStore() : super(userId: 'plan-test-user');

  Completer<void>? loadGate;
  Object? loadError;
  Object? addError;
  final List<EventPlanItem> persisted = [];

  @override
  Future<List<EventPlanItem>> load() async {
    final gate = loadGate;
    if (gate != null) {
      await gate.future;
    }
    if (loadError != null) {
      throw loadError!;
    }
    return [...persisted];
  }

  @override
  Future<List<EventPlanItem>> add(EventPlanItem item) async {
    if (addError != null) {
      throw addError!;
    }
    if (item.restricted) return [...persisted];
    persisted.removeWhere((e) => e.productCode == item.productCode);
    persisted.insert(0, item);
    return [...persisted];
  }

  @override
  Future<List<EventPlanItem>> remove(String productCode) async {
    persisted.removeWhere((e) => e.productCode == productCode);
    return [...persisted];
  }

  @override
  Future<List<EventPlanItem>> clear() async {
    persisted.clear();
    return const [];
  }
}

void main() {
  const itemA = EventPlanItem(
    productCode: 'photo.A1',
    displayName: 'Album',
    serviceCode: 'photography',
  );
  const itemB = EventPlanItem(
    productCode: 'food.A1',
    displayName: 'Buffet',
    serviceCode: 'catering',
  );
  const itemC = EventPlanItem(
    productCode: 'decor.A1',
    displayName: 'Stage',
    serviceCode: 'decor',
  );

  test('Add during pending load keeps existing and new products', () async {
    final store = _FakeEventPlanStore()..persisted.add(itemA);
    store.loadGate = Completer<void>();
    final notifier = EventPlanNotifier(store);
    expect(notifier.state.isLoading, isTrue);

    final addB = notifier.add(itemB);
    store.loadGate!.complete();
    await addB;

    expect(notifier.state.valueOrNull?.map((e) => e.productCode), [
      'food.A1',
      'photo.A1',
    ]);
    expect(store.persisted.map((e) => e.productCode), ['food.A1', 'photo.A1']);
  });

  test('Two rapid Add calls preserve both distinct products', () async {
    final store = _FakeEventPlanStore();
    store.loadGate = Completer<void>();
    final notifier = EventPlanNotifier(store);
    final first = notifier.add(itemA);
    final second = notifier.add(itemB);
    store.loadGate!.complete();
    await Future.wait([first, second]);
    expect(notifier.state.valueOrNull?.map((e) => e.productCode).toSet(), {
      'photo.A1',
      'food.A1',
    });
  });

  test('Deduplication by product code remains correct', () async {
    final store = _FakeEventPlanStore();
    final notifier = EventPlanNotifier(store);
    await notifier.add(itemA);
    await notifier.add(
      const EventPlanItem(
        productCode: 'photo.A1',
        displayName: 'Album reprint',
        serviceCode: 'photography',
      ),
    );
    expect(notifier.state.valueOrNull, hasLength(1));
    expect(notifier.state.valueOrNull!.single.displayName, 'Album reprint');
  });

  test('Remove is not overwritten by the initial load', () async {
    final store = _FakeEventPlanStore()..persisted.addAll([itemA, itemB]);
    store.loadGate = Completer<void>();
    final notifier = EventPlanNotifier(store);
    final removed = notifier.remove(itemA.productCode);
    store.loadGate!.complete();
    await removed;
    expect(notifier.state.valueOrNull?.map((e) => e.productCode), ['food.A1']);
  });

  test('Clear is not overwritten by the initial load', () async {
    final store = _FakeEventPlanStore()..persisted.addAll([itemA, itemB]);
    store.loadGate = Completer<void>();
    final notifier = EventPlanNotifier(store);
    final cleared = notifier.clear();
    store.loadGate!.complete();
    await cleared;
    expect(notifier.state.valueOrNull, isEmpty);
    expect(store.persisted, isEmpty);
  });

  test('Initial load error remains an error, not empty data', () async {
    final store = _FakeEventPlanStore()
      ..loadError = Exception('plan-load-failed');
    final notifier = EventPlanNotifier(store);
    expect(await notifier.refresh(), isFalse);
    expect(notifier.state.hasError, isTrue);
    expect(notifier.state.valueOrNull, isNull);
  });

  test('Retry after load error can recover', () async {
    final store = _FakeEventPlanStore()
      ..loadError = Exception('plan-load-failed');
    final notifier = EventPlanNotifier(store);
    expect(await notifier.refresh(), isFalse);
    expect(notifier.state.hasError, isTrue);

    store.loadError = null;
    store.persisted.add(itemC);
    expect(await notifier.refresh(), isTrue);
    expect(notifier.state.hasError, isFalse);
    expect(notifier.state.valueOrNull?.map((e) => e.productCode), ['decor.A1']);
  });

  test('Refresh failure reports false and retains loaded plan data', () async {
    final store = _FakeEventPlanStore()..persisted.add(itemA);
    final notifier = EventPlanNotifier(store);
    expect(await notifier.refresh(), isTrue);

    store.loadError = Exception('plan-refresh-failed');
    expect(await notifier.refresh(), isFalse);
    expect(notifier.state.hasError, isFalse);
    expect(notifier.state.valueOrNull?.map((e) => e.productCode), ['photo.A1']);
  });

  test('Failed add restores previous items', () async {
    final store = _FakeEventPlanStore()..persisted.add(itemA);
    final notifier = EventPlanNotifier(store);
    await notifier.refresh();
    store.addError = Exception('add-failed');
    await notifier.add(itemB);
    expect(notifier.state.valueOrNull?.map((e) => e.productCode), ['photo.A1']);
  });
}
