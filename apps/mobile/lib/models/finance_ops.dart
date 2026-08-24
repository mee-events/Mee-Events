class FinancePaymentItem {
  final String id;
  final String eventRecordId;
  final String paymentKind;
  final String amount;
  final String status;
  final String referenceCode;
  final String createdAt;
  final String? eventNumber;

  const FinancePaymentItem({
    required this.id,
    required this.eventRecordId,
    required this.paymentKind,
    required this.amount,
    required this.status,
    required this.referenceCode,
    required this.createdAt,
    this.eventNumber,
  });

  factory FinancePaymentItem.fromJson(Map<String, dynamic> json) {
    return FinancePaymentItem(
      id: json['id'] as String,
      eventRecordId: json['eventRecordId'] as String,
      paymentKind: json['paymentKind'] as String? ?? '',
      amount: json['amount'] as String? ?? '0',
      status: json['status'] as String? ?? '',
      referenceCode: json['referenceCode'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
      eventNumber: json['eventNumber'] as String?,
    );
  }
}

class FinanceInvoiceItem {
  final String id;
  final String invoiceNumber;
  final String amount;
  final String status;
  final String? eventNumber;

  const FinanceInvoiceItem({
    required this.id,
    required this.invoiceNumber,
    required this.amount,
    required this.status,
    this.eventNumber,
  });

  factory FinanceInvoiceItem.fromJson(Map<String, dynamic> json) {
    return FinanceInvoiceItem(
      id: json['id'] as String,
      invoiceNumber: json['invoiceNumber'] as String? ?? '',
      amount: json['amount'] as String? ?? '0',
      status: json['status'] as String? ?? '',
      eventNumber: json['eventNumber'] as String?,
    );
  }
}

class FinanceReceiptItem {
  final String id;
  final String receiptNumber;
  final String amount;
  final String status;
  final String? eventNumber;

  const FinanceReceiptItem({
    required this.id,
    required this.receiptNumber,
    required this.amount,
    required this.status,
    this.eventNumber,
  });

  factory FinanceReceiptItem.fromJson(Map<String, dynamic> json) {
    return FinanceReceiptItem(
      id: json['id'] as String,
      receiptNumber: json['receiptNumber'] as String? ?? '',
      amount: json['amount'] as String? ?? '0',
      status: json['status'] as String? ?? '',
      eventNumber: json['eventNumber'] as String?,
    );
  }
}

class EventFinanceSummaryItem {
  final String eventRecordId;
  final String? eventNumber;
  final String advanceReceived;
  final String balancePending;
  final String totalExpense;
  final String profitAmount;
  final String settlementStatus;
  final List<FinanceSettlementItem> vendorSettlements;
  final List<FinanceSettlementItem> workerPayouts;

  const EventFinanceSummaryItem({
    required this.eventRecordId,
    required this.advanceReceived,
    required this.balancePending,
    required this.totalExpense,
    required this.profitAmount,
    required this.settlementStatus,
    required this.vendorSettlements,
    required this.workerPayouts,
    this.eventNumber,
  });

  factory EventFinanceSummaryItem.fromJson(Map<String, dynamic> json) {
    return EventFinanceSummaryItem(
      eventRecordId: json['eventRecordId'] as String,
      eventNumber: json['eventNumber'] as String?,
      advanceReceived: json['advanceReceived'] as String? ?? '0',
      balancePending: json['balancePending'] as String? ?? '0',
      totalExpense: json['totalExpense'] as String? ?? '0',
      profitAmount: json['profitAmount'] as String? ?? '0',
      settlementStatus: json['settlementStatus'] as String? ?? 'open',
      vendorSettlements: ((json['vendorSettlements'] as List<dynamic>?) ?? [])
          .map(
            (item) => FinanceSettlementItem(
              id: (item as Map<String, dynamic>)['id'] as String? ?? '',
              label:
                  item['vendorBusinessName'] as String? ??
                  item['vendorId'] as String? ??
                  '',
              amount: item['amount'] as String? ?? '0',
              status: item['status'] as String? ?? '',
            ),
          )
          .toList(),
      workerPayouts: ((json['workerPayouts'] as List<dynamic>?) ?? [])
          .map(
            (item) => FinanceSettlementItem(
              id: (item as Map<String, dynamic>)['id'] as String? ?? '',
              label:
                  item['workerDisplayName'] as String? ??
                  item['workerId'] as String? ??
                  '',
              amount: item['amount'] as String? ?? '0',
              status: item['status'] as String? ?? '',
            ),
          )
          .toList(),
    );
  }
}

class FinanceSettlementItem {
  final String id;
  final String label;
  final String amount;
  final String status;

  const FinanceSettlementItem({
    required this.id,
    required this.label,
    required this.amount,
    required this.status,
  });
}
