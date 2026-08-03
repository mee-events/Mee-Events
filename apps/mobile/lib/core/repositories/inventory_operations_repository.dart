import 'package:mee_events/api/mobile_api.dart';
import 'package:mee_events/models/inventory_ops.dart';

class InventoryOperationsRepository {
  InventoryOperationsRepository(this._api);

  final MobileApi _api;

  Future<InventoryDashboardSnapshot> dashboard() =>
      _api.getInventoryDashboard();

  Future<List<InventoryAllocationItem>> allocations({String? eventRecordId}) =>
      _api.listInventoryAllocations(eventRecordId: eventRecordId);

  Future<InventoryAllocationDetail> allocationDetail(String id) =>
      _api.getInventoryAllocation(id);

  Future<InventoryAllocationItem> updateStatus({
    required String allocationId,
    required String status,
    String? vehiclePlaceholder,
    String? venuePlaceholder,
  }) {
    return _api.updateInventoryAllocation(
      allocationId: allocationId,
      status: status,
      vehiclePlaceholder: vehiclePlaceholder,
      venuePlaceholder: venuePlaceholder,
    );
  }

  Future<InventoryAllocationItem> returnAllocation(String allocationId) {
    return _api.returnInventoryAllocation(allocationId);
  }

  Future<List<InventoryMovementItem>> movements({String? eventRecordId}) =>
      _api.listInventoryMovements(eventRecordId: eventRecordId);
}
