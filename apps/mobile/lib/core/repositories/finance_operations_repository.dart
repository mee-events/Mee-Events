import 'package:mee_events/api/mobile_api.dart';
import 'package:mee_events/models/finance_ops.dart';

class FinanceOperationsRepository {
  FinanceOperationsRepository(this._api);

  final MobileApi _api;

  Future<List<FinancePaymentItem>> payments() => _api.listMyFinancePayments();

  Future<List<FinanceInvoiceItem>> invoices() => _api.listMyFinanceInvoices();

  Future<List<FinanceReceiptItem>> receipts() => _api.listMyFinanceReceipts();

  Future<EventFinanceSummaryItem> eventFinance(String eventRecordId) =>
      _api.getMyEventFinance(eventRecordId);

  Future<List<FinanceSettlementItem>> vendorSettlements() =>
      _api.listMyVendorSettlements();

  Future<List<FinanceSettlementItem>> workerPayouts() =>
      _api.listMyWorkerPayouts();
}
