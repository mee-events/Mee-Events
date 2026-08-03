import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/core/repositories/operations_repository.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/models/operations_ops.dart';

final operationsRepositoryProvider = Provider<OperationsRepository>((ref) {
  return OperationsRepository(ref.watch(mobileApiProvider));
});

final operationsDashboardProvider =
    FutureProvider.autoDispose<OperationsDashboardSnapshot?>((ref) async {
  if (ref.watch(sessionProvider) == null) return null;
  return ref.watch(operationsRepositoryProvider).dashboard();
});

final operationsEventsProvider =
    FutureProvider.autoDispose<List<OperationsProgressItem>?>((ref) async {
  if (ref.watch(sessionProvider) == null) return null;
  return ref.watch(operationsRepositoryProvider).events();
});

final operationsEventDetailProvider = FutureProvider.autoDispose
    .family<EventOperationsDetail?, String>((ref, eventRecordId) async {
  if (ref.watch(sessionProvider) == null) return null;
  return ref.watch(operationsRepositoryProvider).eventDetail(eventRecordId);
});

final operationsTasksProvider =
    FutureProvider.autoDispose<List<OperationsTaskItem>?>((ref) async {
  if (ref.watch(sessionProvider) == null) return null;
  return ref.watch(operationsRepositoryProvider).tasks();
});

final operationsAttendanceProvider =
    FutureProvider.autoDispose<List<AttendanceLogItem>?>((ref) async {
  if (ref.watch(sessionProvider) == null) return null;
  return ref.watch(operationsRepositoryProvider).attendance();
});

final operationsIssuesProvider =
    FutureProvider.autoDispose<List<EventIssueItem>?>((ref) async {
  if (ref.watch(sessionProvider) == null) return null;
  return ref.watch(operationsRepositoryProvider).issues();
});

final operationsProgressProvider =
    FutureProvider.autoDispose<List<OperationsProgressItem>?>((ref) async {
  if (ref.watch(sessionProvider) == null) return null;
  return ref.watch(operationsRepositoryProvider).progress();
});
