import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/core/repositories/event_record_repository.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/models/event_record.dart';

final eventRecordRepositoryProvider = Provider<EventRecordRepository>((ref) {
  return EventRecordRepository(ref.watch(mobileApiProvider));
});

/// Live event records for the signed-in customer.
final eventsProvider = FutureProvider.autoDispose((ref) async {
  final session = ref.watch(sessionProvider);
  if (session == null) {
    return null;
  }
  return ref.watch(eventRecordRepositoryProvider).listMine();
});

final eventRecordProvider =
    FutureProvider.autoDispose.family<EventRecordDetail?, String>((
  ref,
  eventId,
) async {
  final session = ref.watch(sessionProvider);
  if (session == null) {
    return null;
  }
  return ref.watch(eventRecordRepositoryProvider).getById(eventId);
});
