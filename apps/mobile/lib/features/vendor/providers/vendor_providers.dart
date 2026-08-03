import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/core/repositories/vendor_operations_repository.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/models/vendor_ops.dart';

final vendorOperationsRepositoryProvider =
    Provider<VendorOperationsRepository>((ref) {
  return VendorOperationsRepository(ref.watch(mobileApiProvider));
});

final vendorDashboardProvider =
    FutureProvider.autoDispose<VendorDashboardSnapshot?>((ref) async {
  if (ref.watch(sessionProvider) == null) return null;
  return ref.watch(vendorOperationsRepositoryProvider).dashboard();
});

final vendorAssignmentsProvider =
    FutureProvider.autoDispose<List<VendorAssignmentItem>?>((ref) async {
  if (ref.watch(sessionProvider) == null) return null;
  return ref.watch(vendorOperationsRepositoryProvider).assignments();
});

final vendorAssignmentDetailProvider = FutureProvider.autoDispose
    .family<VendorAssignmentDetail?, String>((ref, assignmentId) async {
  if (ref.watch(sessionProvider) == null) return null;
  return ref
      .watch(vendorOperationsRepositoryProvider)
      .assignmentDetail(assignmentId);
});
