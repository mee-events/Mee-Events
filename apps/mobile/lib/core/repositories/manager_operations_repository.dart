import 'package:mee_events/api/mobile_api.dart';
import 'package:mee_events/models/manager_ops.dart';

class ManagerOperationsRepository {
  ManagerOperationsRepository(this._api);

  final MobileApi _api;

  Future<ManagerDashboardSnapshot> dashboard() => _api.getManagerDashboard();

  Future<List<ManagerEventSummary>> myEvents() => _api.listManagerEvents();

  Future<ManagerEventDashboard> eventDashboard(String eventId) =>
      _api.getManagerEventDashboard(eventId);

  Future<List<ManagerTaskSummary>> todayTasks() => _api.listManagerTodayTasks();

  Future<ManagerTaskDetail> taskDetail(String taskId) =>
      _api.getManagerTask(taskId);

  Future<ManagerTaskSummary> completeTask(String taskId) =>
      _api.completeManagerTask(taskId);

  Future<void> addProgress({
    required String eventId,
    required String updateKind,
    required String summary,
  }) {
    return _api.createManagerProgress(
      eventId: eventId,
      updateKind: updateKind,
      summary: summary,
    );
  }
}
