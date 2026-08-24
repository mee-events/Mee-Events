import 'package:mee_events/api/mobile_api.dart';
import 'package:mee_events/models/operations_ops.dart';

class OperationsRepository {
  OperationsRepository(this._api);

  final MobileApi _api;

  Future<OperationsDashboardSnapshot> dashboard() =>
      _api.getOperationsDashboard();

  Future<List<OperationsProgressItem>> events() => _api.listOperationsEvents();

  Future<EventOperationsDetail> eventDetail(String eventRecordId) =>
      _api.getOperationsEvent(eventRecordId);

  Future<List<OperationsTaskItem>> tasks({String? eventRecordId}) =>
      _api.listOperationsTasks(eventRecordId: eventRecordId);

  Future<AttendanceLogItem> checkIn(Map<String, dynamic> body) =>
      _api.checkInOperationsAttendance(body);

  Future<AttendanceLogItem> checkOut(Map<String, dynamic> body) =>
      _api.checkOutOperationsAttendance(body);

  Future<List<AttendanceLogItem>> attendance({String? eventRecordId}) =>
      _api.listOperationsAttendance(eventRecordId: eventRecordId);

  Future<EventIssueItem> createIssue(Map<String, dynamic> body) =>
      _api.createOperationsIssue(body);

  Future<List<EventIssueItem>> issues({String? eventRecordId}) =>
      _api.listOperationsIssues(eventRecordId: eventRecordId);

  Future<EventPhotoItem> uploadPhoto(Map<String, dynamic> body) =>
      _api.uploadOperationsPhoto(body);

  Future<List<OperationsProgressItem>> progress() =>
      _api.listOperationsProgress();
}
