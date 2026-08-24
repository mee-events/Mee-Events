/// Quotation models returned by the quotations API.
class QuotationSummary {
  final String id;
  final String referenceCode;
  final String leadId;
  final String enquiryId;
  final String? enquiryReferenceCode;
  final String customerId;
  final String status;
  final String? currentRevisionId;
  final String? finalAmount;
  final String? advanceAmount;
  final String? validUntil;
  final String createdAt;
  final String updatedAt;
  final String? paymentPlanId;
  final String? bookingId;

  const QuotationSummary({
    required this.id,
    required this.referenceCode,
    required this.leadId,
    required this.enquiryId,
    required this.customerId,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.enquiryReferenceCode,
    this.currentRevisionId,
    this.finalAmount,
    this.advanceAmount,
    this.validUntil,
    this.paymentPlanId,
    this.bookingId,
  });

  factory QuotationSummary.fromJson(Map<String, dynamic> json) {
    return QuotationSummary(
      id: json['id'] as String,
      referenceCode: json['referenceCode'] as String,
      leadId: json['leadId'] as String,
      enquiryId: json['enquiryId'] as String,
      customerId: json['customerId'] as String,
      status: json['status'] as String,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
      enquiryReferenceCode: json['enquiryReferenceCode'] as String?,
      currentRevisionId: json['currentRevisionId'] as String?,
      finalAmount: json['finalAmount']?.toString(),
      advanceAmount: json['advanceAmount']?.toString(),
      validUntil: json['validUntil'] as String?,
      paymentPlanId: json['paymentPlanId'] as String?,
      bookingId: json['bookingId'] as String?,
    );
  }

  String get statusLabel {
    switch (status) {
      case 'sent':
        return 'Awaiting your decision';
      case 'revision_requested':
        return 'Revision requested';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  }
}

class QuotationItem {
  final String id;
  final String itemType;
  final String title;
  final String? description;
  final String quantity;
  final String unitPrice;
  final String lineTotal;
  final int sortOrder;

  const QuotationItem({
    required this.id,
    required this.itemType,
    required this.title,
    required this.quantity,
    required this.unitPrice,
    required this.lineTotal,
    required this.sortOrder,
    this.description,
  });

  factory QuotationItem.fromJson(Map<String, dynamic> json) {
    return QuotationItem(
      id: json['id'] as String,
      itemType: json['itemType'] as String,
      title: json['title'] as String,
      quantity: json['quantity'].toString(),
      unitPrice: json['unitPrice'].toString(),
      lineTotal: json['lineTotal'].toString(),
      sortOrder: json['sortOrder'] as int? ?? 0,
      description: json['description'] as String?,
    );
  }
}

class QuotationRevision {
  final String id;
  final int revisionNumber;
  final String reason;
  final String subtotal;
  final String discountAmount;
  final String discountPercent;
  final String gstPercent;
  final String gstAmount;
  final String finalAmount;
  final String advancePercent;
  final String advanceAmount;
  final String? validUntil;
  final String? terms;
  final String? customerNotes;
  final String? sentAt;
  final String createdAt;

  const QuotationRevision({
    required this.id,
    required this.revisionNumber,
    required this.reason,
    required this.subtotal,
    required this.discountAmount,
    required this.discountPercent,
    required this.gstPercent,
    required this.gstAmount,
    required this.finalAmount,
    required this.advancePercent,
    required this.advanceAmount,
    required this.createdAt,
    this.validUntil,
    this.terms,
    this.customerNotes,
    this.sentAt,
  });

  factory QuotationRevision.fromJson(Map<String, dynamic> json) {
    return QuotationRevision(
      id: json['id'] as String,
      revisionNumber: json['revisionNumber'] as int,
      reason: json['reason'] as String,
      subtotal: json['subtotal'].toString(),
      discountAmount: json['discountAmount'].toString(),
      discountPercent: json['discountPercent'].toString(),
      gstPercent: json['gstPercent'].toString(),
      gstAmount: json['gstAmount'].toString(),
      finalAmount: json['finalAmount'].toString(),
      advancePercent: json['advancePercent'].toString(),
      advanceAmount: json['advanceAmount'].toString(),
      createdAt: json['createdAt'] as String,
      validUntil: json['validUntil'] as String?,
      terms: json['terms'] as String?,
      customerNotes: json['customerNotes'] as String?,
      sentAt: json['sentAt'] as String?,
    );
  }
}

class QuotationActivity {
  final String id;
  final String activityType;
  final String? content;
  final String? actorUserId;
  final String occurredAt;

  const QuotationActivity({
    required this.id,
    required this.activityType,
    required this.occurredAt,
    this.content,
    this.actorUserId,
  });

  factory QuotationActivity.fromJson(Map<String, dynamic> json) {
    return QuotationActivity(
      id: json['id'] as String,
      activityType: json['activityType'] as String,
      occurredAt: json['occurredAt'] as String,
      content: json['content'] as String?,
      actorUserId: json['actorUserId'] as String?,
    );
  }
}

class QuotationDetail extends QuotationSummary {
  final QuotationRevision? revision;
  final List<QuotationItem> items;
  final List<QuotationActivity> activities;

  const QuotationDetail({
    required super.id,
    required super.referenceCode,
    required super.leadId,
    required super.enquiryId,
    required super.customerId,
    required super.status,
    required super.createdAt,
    required super.updatedAt,
    required this.items,
    required this.activities,
    super.enquiryReferenceCode,
    super.currentRevisionId,
    super.finalAmount,
    super.advanceAmount,
    super.validUntil,
    super.paymentPlanId,
    super.bookingId,
    this.revision,
  });

  factory QuotationDetail.fromJson(Map<String, dynamic> json) {
    final summary = QuotationSummary.fromJson(json);
    return QuotationDetail(
      id: summary.id,
      referenceCode: summary.referenceCode,
      leadId: summary.leadId,
      enquiryId: summary.enquiryId,
      customerId: summary.customerId,
      status: summary.status,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
      enquiryReferenceCode: summary.enquiryReferenceCode,
      currentRevisionId: summary.currentRevisionId,
      finalAmount: summary.finalAmount,
      advanceAmount: summary.advanceAmount,
      validUntil: summary.validUntil,
      paymentPlanId: summary.paymentPlanId,
      bookingId: summary.bookingId,
      revision: json['revision'] == null
          ? null
          : QuotationRevision.fromJson(
              json['revision'] as Map<String, dynamic>,
            ),
      items: ((json['items'] as List<dynamic>?) ?? [])
          .map((item) => QuotationItem.fromJson(item as Map<String, dynamic>))
          .toList(),
      activities: ((json['activities'] as List<dynamic>?) ?? [])
          .map(
            (item) => QuotationActivity.fromJson(item as Map<String, dynamic>),
          )
          .toList(),
    );
  }
}

class PaymentRecord {
  final String id;
  final String paymentPlanId;
  final String quotationId;
  final String kind;
  final String method;
  final String amount;
  final String status;
  final String referenceCode;
  final String? notes;
  final String? confirmedAt;
  final String createdAt;

  const PaymentRecord({
    required this.id,
    required this.paymentPlanId,
    required this.quotationId,
    required this.kind,
    required this.method,
    required this.amount,
    required this.status,
    required this.referenceCode,
    required this.createdAt,
    this.notes,
    this.confirmedAt,
  });

  factory PaymentRecord.fromJson(Map<String, dynamic> json) {
    return PaymentRecord(
      id: json['id'] as String,
      paymentPlanId: json['paymentPlanId'] as String,
      quotationId: json['quotationId'] as String,
      kind: json['kind'] as String,
      method: json['method'] as String,
      amount: json['amount'].toString(),
      status: json['status'] as String,
      referenceCode: json['referenceCode'] as String,
      createdAt: json['createdAt'] as String,
      notes: json['notes'] as String?,
      confirmedAt: json['confirmedAt'] as String?,
    );
  }
}

class BookingSummary {
  final String id;
  final String bookingNumber;
  final String quotationId;
  final String? quotationReferenceCode;
  final String leadId;
  final String enquiryId;
  final String status;
  final String finalAmount;
  final String advancePaid;
  final String? confirmedAt;
  final String createdAt;
  final String? eventRecordId;
  final String? eventNumber;

  const BookingSummary({
    required this.id,
    required this.bookingNumber,
    required this.quotationId,
    required this.leadId,
    required this.enquiryId,
    required this.status,
    required this.finalAmount,
    required this.advancePaid,
    required this.createdAt,
    this.quotationReferenceCode,
    this.confirmedAt,
    this.eventRecordId,
    this.eventNumber,
  });

  factory BookingSummary.fromJson(Map<String, dynamic> json) {
    return BookingSummary(
      id: json['id'] as String,
      bookingNumber: json['bookingNumber'] as String,
      quotationId: json['quotationId'] as String,
      leadId: json['leadId'] as String,
      enquiryId: json['enquiryId'] as String,
      status: json['status'] as String,
      finalAmount: json['finalAmount'].toString(),
      advancePaid: json['advancePaid'].toString(),
      createdAt: json['createdAt'] as String,
      quotationReferenceCode: json['quotationReferenceCode'] as String?,
      confirmedAt: json['confirmedAt'] as String?,
      eventRecordId: json['eventRecordId'] as String?,
      eventNumber: json['eventNumber'] as String?,
    );
  }

  String get statusLabel {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  String get remainingBalance {
    final total = double.tryParse(finalAmount) ?? 0;
    final advance = double.tryParse(advancePaid) ?? 0;
    final remaining = (total - advance).clamp(0, double.infinity);
    return remaining.toStringAsFixed(2);
  }
}

class BookingActivity {
  final String id;
  final String activityType;
  final String? content;
  final String? actorUserId;
  final String occurredAt;

  const BookingActivity({
    required this.id,
    required this.activityType,
    required this.occurredAt,
    this.content,
    this.actorUserId,
  });

  factory BookingActivity.fromJson(Map<String, dynamic> json) {
    return BookingActivity(
      id: json['id'] as String,
      activityType: json['activityType'] as String,
      occurredAt: json['occurredAt'] as String,
      content: json['content'] as String?,
      actorUserId: json['actorUserId'] as String?,
    );
  }
}

class BookingDetail extends BookingSummary {
  final List<BookingActivity> activities;

  const BookingDetail({
    required super.id,
    required super.bookingNumber,
    required super.quotationId,
    required super.leadId,
    required super.enquiryId,
    required super.status,
    required super.finalAmount,
    required super.advancePaid,
    required super.createdAt,
    required this.activities,
    super.quotationReferenceCode,
    super.confirmedAt,
    super.eventRecordId,
    super.eventNumber,
  });

  factory BookingDetail.fromJson(Map<String, dynamic> json) {
    final summary = BookingSummary.fromJson(json);
    return BookingDetail(
      id: summary.id,
      bookingNumber: summary.bookingNumber,
      quotationId: summary.quotationId,
      leadId: summary.leadId,
      enquiryId: summary.enquiryId,
      status: summary.status,
      finalAmount: summary.finalAmount,
      advancePaid: summary.advancePaid,
      createdAt: summary.createdAt,
      quotationReferenceCode: summary.quotationReferenceCode,
      confirmedAt: summary.confirmedAt,
      eventRecordId: summary.eventRecordId,
      eventNumber: summary.eventNumber,
      activities: ((json['activities'] as List<dynamic>?) ?? [])
          .map((item) => BookingActivity.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }
}
