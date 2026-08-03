import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/core/repositories/inventory_operations_repository.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/models/inventory_ops.dart';

final inventoryOperationsRepositoryProvider =
    Provider<InventoryOperationsRepository>((ref) {
  return InventoryOperationsRepository(ref.watch(mobileApiProvider));
});

final inventoryDashboardProvider =
    FutureProvider.autoDispose<InventoryDashboardSnapshot?>((ref) async {
  if (ref.watch(sessionProvider) == null) return null;
  return ref.watch(inventoryOperationsRepositoryProvider).dashboard();
});

final inventoryAllocationsProvider =
    FutureProvider.autoDispose<List<InventoryAllocationItem>?>((ref) async {
  if (ref.watch(sessionProvider) == null) return null;
  return ref.watch(inventoryOperationsRepositoryProvider).allocations();
});

final inventoryAllocationDetailProvider = FutureProvider.autoDispose
    .family<InventoryAllocationDetail?, String>((ref, allocationId) async {
  if (ref.watch(sessionProvider) == null) return null;
  return ref
      .watch(inventoryOperationsRepositoryProvider)
      .allocationDetail(allocationId);
});
