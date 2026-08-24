import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/core/repositories/finance_operations_repository.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/models/finance_ops.dart';

final financeOperationsRepositoryProvider =
    Provider<FinanceOperationsRepository>((ref) {
      return FinanceOperationsRepository(ref.watch(mobileApiProvider));
    });

final customerFinancePaymentsProvider =
    FutureProvider.autoDispose<List<FinancePaymentItem>?>((ref) async {
      if (ref.watch(sessionProvider) == null) return null;
      return ref.watch(financeOperationsRepositoryProvider).payments();
    });

final customerFinanceInvoicesProvider =
    FutureProvider.autoDispose<List<FinanceInvoiceItem>?>((ref) async {
      if (ref.watch(sessionProvider) == null) return null;
      return ref.watch(financeOperationsRepositoryProvider).invoices();
    });

final customerFinanceReceiptsProvider =
    FutureProvider.autoDispose<List<FinanceReceiptItem>?>((ref) async {
      if (ref.watch(sessionProvider) == null) return null;
      return ref.watch(financeOperationsRepositoryProvider).receipts();
    });

final managerEventFinanceProvider = FutureProvider.autoDispose
    .family<EventFinanceSummaryItem?, String>((ref, eventRecordId) async {
      if (ref.watch(sessionProvider) == null) return null;
      return ref
          .watch(financeOperationsRepositoryProvider)
          .eventFinance(eventRecordId);
    });

final managerVendorSettlementsProvider =
    FutureProvider.autoDispose<List<FinanceSettlementItem>?>((ref) async {
      if (ref.watch(sessionProvider) == null) return null;
      return ref.watch(financeOperationsRepositoryProvider).vendorSettlements();
    });

final managerWorkerPayoutsProvider =
    FutureProvider.autoDispose<List<FinanceSettlementItem>?>((ref) async {
      if (ref.watch(sessionProvider) == null) return null;
      return ref.watch(financeOperationsRepositoryProvider).workerPayouts();
    });
