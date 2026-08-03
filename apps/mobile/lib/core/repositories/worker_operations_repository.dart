import 'package:mee_events/api/mobile_api.dart';
import 'package:mee_events/models/worker_ops.dart';

class WorkerOperationsRepository {
  WorkerOperationsRepository(this._api);

  final MobileApi _api;

  Future<WorkerDashboardSnapshot> dashboard() => _api.getWorkerDashboard();

  Future<List<WorkerTaskItem>> tasks() => _api.listWorkerTasks();

  Future<WorkerTaskDetail> taskDetail(String id) => _api.getWorkerTask(id);

  Future<WorkerTaskItem> accept(String id) => _api.acceptWorkerTask(id);

  Future<WorkerTaskItem> reject(String id, String reason) =>
      _api.rejectWorkerTask(id, reason);

  Future<WorkerTaskItem> checkIn({
    required String taskId,
    String? gpsPlaceholder,
    String? locationPlaceholder,
  }) {
    return _api.checkInWorkerTask(
      taskId: taskId,
      gpsPlaceholder: gpsPlaceholder,
      locationPlaceholder: locationPlaceholder,
    );
  }

  Future<WorkerTaskItem> progress({
    required String taskId,
    required String summary,
    String? status,
    int? percentComplete,
  }) {
    return _api.updateWorkerProgress(
      taskId: taskId,
      summary: summary,
      status: status,
      percentComplete: percentComplete,
    );
  }

  Future<WorkerTaskItem> checkOut({
    required String taskId,
    String? completionNotes,
  }) {
    return _api.checkOutWorkerTask(
      taskId: taskId,
      completionNotes: completionNotes,
    );
  }
}
