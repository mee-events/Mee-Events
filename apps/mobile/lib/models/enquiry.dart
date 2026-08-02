/// Customer enquiry returned by the enquiries API.
class Enquiry {
  final String id;
  final String referenceCode;
  final String eventTypeCode;
  final String eventTypeName;
  final String? eventDate;
  final String? location;
  final int? guestCount;
  final String status;
  final String? submittedAt;
  final String createdAt;

  const Enquiry({
    required this.id,
    required this.referenceCode,
    required this.eventTypeCode,
    required this.eventTypeName,
    required this.status,
    required this.createdAt,
    this.eventDate,
    this.location,
    this.guestCount,
    this.submittedAt,
  });

  factory Enquiry.fromJson(Map<String, dynamic> json) {
    return Enquiry(
      id: json['id'] as String,
      referenceCode: json['referenceCode'] as String,
      eventTypeCode: json['eventTypeCode'] as String,
      eventTypeName: json['eventTypeName'] as String,
      status: json['status'] as String,
      createdAt: json['createdAt'] as String,
      eventDate: json['eventDate'] as String?,
      location: json['location'] as String?,
      guestCount: json['guestCount'] as int?,
      submittedAt: json['submittedAt'] as String?,
    );
  }

  /// Human-readable label for a customer-visible status.
  String get statusLabel {
    switch (status) {
      case 'submitted':
        return 'Submitted';
      case 'received':
        return 'Received';
      case 'contact_pending':
        return 'We will contact you';
      case 'in_discussion':
        return 'In discussion';
      case 'proposal_expected':
        return 'Proposal on the way';
      case 'closed':
        return 'Closed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }
}
