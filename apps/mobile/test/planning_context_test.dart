import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/planning_context/planning_context_provider.dart';
import 'package:mee_events/features/customer/planning_context/planning_context_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

final _activePlanningContextUserProvider = StateProvider<String?>(
  (ref) => null,
);

class _DelayedPlanningContextStore extends PlanningContextStore {
  _DelayedPlanningContextStore({
    required this.loadResult,
    required PlanningContextWriter writer,
  }) : super(userId: 'delayed-customer', writer: writer);

  final Future<CustomerPlanningContext> loadResult;

  @override
  Future<CustomerPlanningContext> load({required DateTime today}) => loadResult;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('defaults to Hyderabad without an event date', () async {
    final store = PlanningContextStore();

    final context = await store.load(today: DateTime(2026, 9, 7));

    expect(context.area, isEmpty);
    expect(context.checkoutLocation, 'Hyderabad');
    expect(context.compactLocation, 'Hyderabad');
    expect(context.eventDate, isNull);
  });

  test('ready waits for loading then returns the latest live state', () async {
    final delayedLoad = Completer<CustomerPlanningContext>();
    var writeCount = 0;
    final notifier = PlanningContextNotifier(
      _DelayedPlanningContextStore(
        loadResult: delayedLoad.future,
        writer: (_, _) async {
          writeCount += 1;
          return writeCount == 1;
        },
      ),
      clock: () => DateTime(2026, 9, 7),
    );
    addTearDown(notifier.dispose);

    var initialReadyCompleted = false;
    final initialReady = notifier.ready.then((context) {
      initialReadyCompleted = true;
      return context;
    });
    await Future<void>.value();
    expect(initialReadyCompleted, isFalse);

    delayedLoad.complete(const CustomerPlanningContext());
    expect((await initialReady).area, isEmpty);

    expect(
      await notifier.save(
        area: 'Gachibowli',
        eventDate: DateTime(2026, 11, 15),
      ),
      PlanningContextSaveResult.persisted,
    );
    final afterPersistedSave = await notifier.ready;
    expect(afterPersistedSave.area, 'Gachibowli');
    expect(afterPersistedSave.eventDate, DateTime(2026, 11, 15));

    expect(
      await notifier.save(area: 'Kondapur', eventDate: DateTime(2026, 12, 20)),
      PlanningContextSaveResult.persistenceFailed,
    );
    final afterFailedSave = await notifier.ready;
    expect(afterFailedSave.area, 'Kondapur');
    expect(afterFailedSave.eventDate, DateTime(2026, 12, 20));
  });

  test('malformed stored JSON fails closed to the default context', () async {
    final prefs = await SharedPreferences.getInstance();
    const userId = 'malformed-customer';
    await prefs.setString(planningContextStorageKey(userId), '{not-json');

    final context = await PlanningContextStore(
      preferences: prefs,
      userId: userId,
    ).load(today: DateTime(2026, 9, 7));

    expect(context.area, isEmpty);
    expect(context.eventDate, isNull);
  });

  test('wrong stored JSON field types fail closed', () async {
    final prefs = await SharedPreferences.getInstance();
    const userId = 'wrong-types-customer';
    await prefs.setString(
      planningContextStorageKey(userId),
      '{"area":42,"eventDate":[]}',
    );

    final context = await PlanningContextStore(
      preferences: prefs,
      userId: userId,
    ).load(today: DateTime(2026, 9, 7));

    expect(context.area, isEmpty);
    expect(context.eventDate, isNull);
  });

  test('stored past date is removed while the safe area remains', () async {
    final prefs = await SharedPreferences.getInstance();
    const userId = 'past-date-customer';
    await prefs.setString(
      planningContextStorageKey(userId),
      '{"area":"Gachibowli","eventDate":"2026-09-06"}',
    );

    final context = await PlanningContextStore(
      preferences: prefs,
      userId: userId,
    ).load(today: DateTime(2026, 9, 7));

    expect(context.area, 'Gachibowli');
    expect(context.eventDate, isNull);
  });

  test('sanitizes control characters and limits area to 300 characters', () {
    final overlong = '${List.filled(299, 'a').join()}\u0000\nBBBB';

    final sanitized = sanitizePlanningContextArea(overlong);

    expect(sanitized.length, 300);
    expect(sanitized, isNot(contains('\u0000')));
    expect(sanitized, isNot(contains('\n')));
  });

  test('accepts an exact future date and rejects a past date', () async {
    final notifier = PlanningContextNotifier(
      PlanningContextStore(),
      clock: () => DateTime(2026, 9, 7, 18),
    );
    addTearDown(notifier.dispose);

    expect(
      await notifier.save(
        area: 'Gachibowli',
        eventDate: DateTime(2026, 11, 15, 20),
      ),
      PlanningContextSaveResult.sessionOnly,
    );
    expect(notifier.state.eventDate, DateTime(2026, 11, 15));

    expect(
      await notifier.save(
        area: 'Jubilee Hills',
        eventDate: DateTime(2026, 9, 6),
      ),
      PlanningContextSaveResult.rejectedPastDate,
    );
    expect(notifier.state.area, 'Gachibowli');
    expect(notifier.state.eventDate, DateTime(2026, 11, 15));
  });

  test('today is accepted', () async {
    final notifier = PlanningContextNotifier(
      PlanningContextStore(),
      clock: () => DateTime(2026, 9, 7, 23, 59),
    );
    addTearDown(notifier.dispose);

    final result = await notifier.save(
      area: 'Gachibowli',
      eventDate: DateTime(2026, 9, 7, 0, 1),
    );

    expect(result, PlanningContextSaveResult.sessionOnly);
    expect(notifier.state.eventDate, DateTime(2026, 9, 7));
  });

  test('area and date can be cleared independently', () async {
    final notifier = PlanningContextNotifier(
      PlanningContextStore(),
      clock: () => DateTime(2026, 9, 7),
    );
    addTearDown(notifier.dispose);
    await notifier.save(area: 'Gachibowli', eventDate: DateTime(2026, 11, 15));

    await notifier.clearArea();
    expect(notifier.state.area, isEmpty);
    expect(notifier.state.eventDate, DateTime(2026, 11, 15));

    await notifier.clearDate();
    expect(notifier.state.area, isEmpty);
    expect(notifier.state.eventDate, isNull);
  });

  test('signed-out context stays in memory and is not restored', () async {
    final prefs = await SharedPreferences.getInstance();
    final notifier = PlanningContextNotifier(
      PlanningContextStore(preferences: prefs),
      clock: () => DateTime(2026, 9, 7),
    );
    addTearDown(notifier.dispose);

    final result = await notifier.save(
      area: 'Kondapur',
      eventDate: DateTime(2026, 12, 1),
    );
    expect(result, PlanningContextSaveResult.sessionOnly);
    expect(notifier.state.area, 'Kondapur');
    expect(
      prefs.getKeys().where(
        (key) => key.startsWith(kPlanningContextStoragePrefix),
      ),
      isEmpty,
    );

    final restarted = PlanningContextNotifier(
      PlanningContextStore(preferences: prefs),
      clock: () => DateTime(2026, 9, 7),
    );
    addTearDown(restarted.dispose);
    expect((await restarted.ready).area, isEmpty);
    expect(restarted.state.eventDate, isNull);
  });

  test('signed-in persistence is account-scoped and cannot leak', () async {
    final prefs = await SharedPreferences.getInstance();
    final accountA = PlanningContextStore(
      preferences: prefs,
      userId: 'customer-a',
    );
    final accountB = PlanningContextStore(
      preferences: prefs,
      userId: 'customer-b',
    );
    await accountA.save(
      CustomerPlanningContext(
        area: 'Banjara Hills',
        eventDate: DateTime(2026, 11, 15),
      ),
    );

    final restoredA = await accountA.load(today: DateTime(2026, 9, 7));
    final restoredB = await accountB.load(today: DateTime(2026, 9, 7));

    expect(restoredA.area, 'Banjara Hills');
    expect(restoredA.eventDate, DateTime(2026, 11, 15));
    expect(restoredB.area, isEmpty);
    expect(restoredB.eventDate, isNull);
    expect(prefs.containsKey(planningContextStorageKey('customer-a')), isTrue);
    expect(prefs.containsKey(planningContextStorageKey('customer-b')), isFalse);
  });

  test('provider-level account switching cannot leak context', () async {
    final prefs = await SharedPreferences.getInstance();
    final container = ProviderContainer(
      overrides: [
        sessionUserIdProvider.overrideWith(
          (ref) => ref.watch(_activePlanningContextUserProvider),
        ),
        planningContextStoreProvider.overrideWith((ref) {
          return PlanningContextStore(
            preferences: prefs,
            userId: ref.watch(sessionUserIdProvider),
          );
        }),
        planningContextClockProvider.overrideWithValue(
          () => DateTime(2026, 9, 7),
        ),
      ],
    );
    addTearDown(container.dispose);
    container.read(_activePlanningContextUserProvider.notifier).state =
        'customer-a';
    final accountA = container.read(planningContextProvider.notifier);
    await accountA.ready;
    expect(
      await accountA.save(
        area: 'Gachibowli',
        eventDate: DateTime(2026, 11, 15),
      ),
      PlanningContextSaveResult.persisted,
    );

    container.read(_activePlanningContextUserProvider.notifier).state =
        'customer-b';
    final accountB = container.read(planningContextProvider.notifier);
    final restoredB = await accountB.ready;

    expect(restoredB.area, isEmpty);
    expect(restoredB.eventDate, isNull);
    expect(container.read(planningContextProvider).area, isEmpty);
  });

  test(
    'setString false reports persistence failure and keeps memory',
    () async {
      final store = PlanningContextStore(
        userId: 'customer-false',
        writer: (_, _) async => false,
      );
      final notifier = PlanningContextNotifier(
        store,
        clock: () => DateTime(2026, 9, 7),
      );
      addTearDown(notifier.dispose);

      final result = await notifier.save(
        area: 'Gachibowli',
        eventDate: DateTime(2026, 11, 15),
      );

      expect(result, PlanningContextSaveResult.persistenceFailed);
      expect(notifier.state.area, 'Gachibowli');
      expect(notifier.state.eventDate, DateTime(2026, 11, 15));
    },
  );

  test('thrown storage failure is captured without exposing it', () async {
    final store = PlanningContextStore(
      userId: 'customer-throw',
      writer: (_, _) => throw StateError('private storage path'),
    );
    final notifier = PlanningContextNotifier(
      store,
      clock: () => DateTime(2026, 9, 7),
    );
    addTearDown(notifier.dispose);

    final result = await notifier.save(area: 'Kondapur');

    expect(result, PlanningContextSaveResult.persistenceFailed);
    expect(notifier.state.area, 'Kondapur');
  });

  test('successful signed-in save is persisted', () async {
    final prefs = await SharedPreferences.getInstance();
    final store = PlanningContextStore(
      preferences: prefs,
      userId: 'persisted-customer',
    );
    final notifier = PlanningContextNotifier(
      store,
      clock: () => DateTime(2026, 9, 7),
    );
    addTearDown(notifier.dispose);

    final result = await notifier.save(
      area: 'Banjara Hills',
      eventDate: DateTime(2026, 12, 20),
    );
    final restored = await store.load(today: DateTime(2026, 9, 7));

    expect(result, PlanningContextSaveResult.persisted);
    expect(restored.area, 'Banjara Hills');
    expect(restored.eventDate, DateTime(2026, 12, 20));
  });

  test('overlapping saves persist the newest value last', () async {
    final firstWrite = Completer<bool>();
    final secondWrite = Completer<bool>();
    final firstStarted = Completer<void>();
    final secondStarted = Completer<void>();
    final values = <String>[];
    var calls = 0;
    final store = PlanningContextStore(
      userId: 'overlap-customer',
      writer: (_, value) {
        values.add(value);
        calls += 1;
        if (calls == 1) {
          firstStarted.complete();
          return firstWrite.future;
        }
        secondStarted.complete();
        return secondWrite.future;
      },
    );
    final notifier = PlanningContextNotifier(
      store,
      clock: () => DateTime(2026, 9, 7),
    );
    addTearDown(notifier.dispose);
    await notifier.ready;

    final older = notifier.save(area: 'Older area');
    await firstStarted.future;
    final newer = notifier.save(area: 'Newest area');
    await Future<void>.value();
    expect(notifier.state.area, 'Newest area');
    expect(calls, 1);

    firstWrite.complete(true);
    expect(await older, PlanningContextSaveResult.persisted);
    await secondStarted.future;
    secondWrite.complete(true);
    expect(await newer, PlanningContextSaveResult.persisted);

    expect(jsonDecode(values.first)['area'], 'Older area');
    expect(jsonDecode(values.last)['area'], 'Newest area');
    expect(notifier.state.area, 'Newest area');
  });

  test('compact display does not expose a street-style address', () {
    const context = CustomerPlanningContext(area: 'Flat 12, Plot 4 Road 9');

    expect(context.compactLocation, 'Hyderabad');
    expect(context.checkoutLocation, contains('Flat 12'));
  });

  test('compact address privacy is fail-safe for door formats', () {
    const cases = <String, String>{
      '8-2-120/113 Kamala Nagar': 'Hyderabad',
      'H No 12-3-45/A Sainikpuri': 'Hyderabad',
      'Banjara Hills, 8-2-120/113': 'Hyderabad',
      '12/A Vinayak Nagar': 'Hyderabad',
      '#12 Vinayak Nagar': 'Hyderabad',
      'H.No 4-5-6 Jubilee Hills': 'Hyderabad',
      'HNO 7/A Kondapur': 'Hyderabad',
      'Gachibowli': 'Gachibowli, Hyderabad',
      'Banjara Hills': 'Banjara Hills, Hyderabad',
      'Flat 302, Sunrise Towers, Jubilee Hills': 'Jubilee Hills, Hyderabad',
    };

    for (final MapEntry(key: area, value: expected) in cases.entries) {
      expect(
        CustomerPlanningContext(area: area).compactLocation,
        expected,
        reason: area,
      );
    }
  });

  test('generated checkout location stays within the contract limit', () {
    final context = CustomerPlanningContext(
      area: List.filled(kPlanningContextAreaMaxLength, 'a').join(),
    );

    expect(context.area.length, kPlanningContextAreaMaxLength);
    expect(context.checkoutLocation.length, kPlanningContextAreaMaxLength);
    expect(context.checkoutLocation, endsWith(', Hyderabad'));
  });

  test('truncation never leaves half of a UTF-16 surrogate pair', () {
    final input = '${List.filled(299, 'a').join()}😀';

    final sanitized = sanitizePlanningContextArea(input);

    expect(sanitized, List.filled(299, 'a').join());
    expect(sanitized.runes.length, 299);
  });
}
