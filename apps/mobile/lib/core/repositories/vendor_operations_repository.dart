import 'package:mee_events/api/mobile_api.dart';
import 'package:mee_events/models/vendor_ops.dart';

class VendorOperationsRepository {
  VendorOperationsRepository(this._api);

  final MobileApi _api;

  Future<VendorDashboardSnapshot> dashboard() => _api.getVendorDashboard();

  Future<List<VendorAssignmentItem>> assignments() =>
      _api.listVendorAssignments();

  Future<VendorAssignmentDetail> assignmentDetail(String id) =>
      _api.getVendorAssignment(id);

  Future<VendorAssignmentItem> accept(String id) =>
      _api.acceptVendorAssignment(id);

  Future<VendorAssignmentItem> reject(String id, String reason) =>
      _api.rejectVendorAssignment(id, reason);

  Future<VendorAssignmentItem> progress({
    required String assignmentId,
    required String summary,
    String? status,
  }) {
    return _api.updateVendorProgress(
      assignmentId: assignmentId,
      summary: summary,
      status: status,
    );
  }
}
