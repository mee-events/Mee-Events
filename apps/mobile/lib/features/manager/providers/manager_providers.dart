import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/core/repositories/manager_operations_repository.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/models/manager_ops.dart';

final managerOperationsRepositoryProvider =
    Provider<ManagerOperationsRepository>((ref) {
  return ManagerOperationsRepository(ref.watch(mobileApiProvider));
});

final managerDashboardProvider =
    FutureProvider.autoDispose<ManagerDashboardSnapshot?>((ref) async {
  if (ref.watch(sessionProvider) == null) return null;
  return ref.watch(managerOperationsRepositoryProvider).dashboard();
});

final managerTodayTasksProvider =
    FutureProvider.autoDispose<List<ManagerTaskSummary>?>((ref) async {
  if (ref.watch(sessionProvider) == null) return null;
  return ref.watch(managerOperationsRepositoryProvider).todayTasks();
});

final managerEventsProvider =
    FutureProvider.autoDispose<List<ManagerEventSummary>?>((ref) async {
  if (ref.watch(sessionProvider) == null) return null;
  return ref.watch(managerOperationsRepositoryProvider).myEvents();
});

final managerEventDashboardProvider = FutureProvider.autoDispose
    .family<ManagerEventDashboard?, String>((ref, eventId) async {
  if (ref.watch(sessionProvider) == null) return null;
  return ref
      .watch(managerOperationsRepositoryProvider)
      .eventDashboard(eventId);
});

final managerTaskDetailProvider = FutureProvider.autoDispose
    .family<ManagerTaskDetail?, String>((ref, taskId) async {
  if (ref.watch(sessionProvider) == null) return null;
  return ref.watch(managerOperationsRepositoryProvider).taskDetail(taskId);
});
