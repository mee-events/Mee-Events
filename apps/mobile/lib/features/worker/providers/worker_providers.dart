import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/core/repositories/worker_operations_repository.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/models/worker_ops.dart';

final workerOperationsRepositoryProvider = Provider<WorkerOperationsRepository>(
  (ref) {
    return WorkerOperationsRepository(ref.watch(mobileApiProvider));
  },
);

final workerDashboardProvider =
    FutureProvider.autoDispose<WorkerDashboardSnapshot?>((ref) async {
      if (ref.watch(sessionProvider) == null) return null;
      return ref.watch(workerOperationsRepositoryProvider).dashboard();
    });

final workerTasksProvider = FutureProvider.autoDispose<List<WorkerTaskItem>?>((
  ref,
) async {
  if (ref.watch(sessionProvider) == null) return null;
  return ref.watch(workerOperationsRepositoryProvider).tasks();
});

final workerTaskDetailProvider = FutureProvider.autoDispose
    .family<WorkerTaskDetail?, String>((ref, taskId) async {
      if (ref.watch(sessionProvider) == null) return null;
      return ref.watch(workerOperationsRepositoryProvider).taskDetail(taskId);
    });
