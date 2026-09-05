/// Lifecycle meaning applied to the raw Event Record status received over the
/// wire. Unknown additive values stay parseable but fail closed until the
/// mobile policy is deliberately updated.
enum EventRecordLifecycle { active, concluded, cancelled, unknown }

const activeEventRecordStatuses = <String>{
  'created',
  'planning',
  'requirements_confirmed',
  'quotation_approved',
  'booking_confirmed',
  'manager_assigned',
  'vendor_assigned',
  'worker_assigned',
  'preparation',
  'ready',
  'event_running',
};

const concludedEventRecordStatuses = <String>{
  'completed',
  'settlement_pending',
  'closed',
};

const cancelledEventRecordStatuses = <String>{'cancelled'};

EventRecordLifecycle classifyEventRecordLifecycle(String status) {
  if (activeEventRecordStatuses.contains(status)) {
    return EventRecordLifecycle.active;
  }
  if (concludedEventRecordStatuses.contains(status)) {
    return EventRecordLifecycle.concluded;
  }
  if (cancelledEventRecordStatuses.contains(status)) {
    return EventRecordLifecycle.cancelled;
  }
  return EventRecordLifecycle.unknown;
}

/// Event Record models returned by the events API.
class EventRecordSummary {
  final String id;
  final String eventNumber;
  final String bookingId;
  final String? bookingNumber;
  final String quotationId;
  final String leadId;
  final String enquiryId;
  final String customerId;
  final String eventTypeName;
  final String eventName;
  final String? eventDate;
  final String? startTime;
  final String? endTime;
  final String? venueName;
  final String? venueAddress;
  final String? mapsLocationPlaceholder;
  final int? guestCount;
  final String budgetAmount;
  final String advancePaid;
  final String pendingAmount;
  final String status;
  final String priority;
  final String? generalNotes;
  final String createdAt;
  final String updatedAt;

  const EventRecordSummary({
    required this.id,
    required this.eventNumber,
    required this.bookingId,
    required this.quotationId,
    required this.leadId,
    required this.enquiryId,
    required this.customerId,
    required this.eventTypeName,
    required this.eventName,
    required this.budgetAmount,
    required this.advancePaid,
    required this.pendingAmount,
    required this.status,
    required this.priority,
    required this.createdAt,
    required this.updatedAt,
    this.bookingNumber,
    this.eventDate,
    this.startTime,
    this.endTime,
    this.venueName,
    this.venueAddress,
    this.mapsLocationPlaceholder,
    this.guestCount,
    this.generalNotes,
  });

  factory EventRecordSummary.fromJson(Map<String, dynamic> json) {
    return EventRecordSummary(
      id: json['id'] as String,
      eventNumber: json['eventNumber'] as String,
      bookingId: json['bookingId'] as String,
      quotationId: json['quotationId'] as String,
      leadId: json['leadId'] as String,
      enquiryId: json['enquiryId'] as String,
      customerId: json['customerId'] as String,
      eventTypeName: json['eventTypeName'] as String,
      eventName: json['eventName'] as String,
      budgetAmount: json['budgetAmount'].toString(),
      advancePaid: json['advancePaid'].toString(),
      pendingAmount: json['pendingAmount'].toString(),
      status: json['status'] as String,
      priority: json['priority'] as String,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
      bookingNumber: json['bookingNumber'] as String?,
      eventDate: json['eventDate'] as String?,
      startTime: json['startTime'] as String?,
      endTime: json['endTime'] as String?,
      venueName: json['venueName'] as String?,
      venueAddress: json['venueAddress'] as String?,
      mapsLocationPlaceholder: json['mapsLocationPlaceholder'] as String?,
      guestCount: json['guestCount'] as int?,
      generalNotes: json['notes'] as String?,
    );
  }

  String get statusLabel => status.replaceAll('_', ' ');

  EventRecordLifecycle get lifecycle => classifyEventRecordLifecycle(status);
}

class EventTimelineEntry {
  final String id;
  final String entryType;
  final String title;
  final String? content;
  final bool customerVisible;
  final String? actorUserId;
  final String occurredAt;

  const EventTimelineEntry({
    required this.id,
    required this.entryType,
    required this.title,
    required this.customerVisible,
    required this.occurredAt,
    this.content,
    this.actorUserId,
  });

  factory EventTimelineEntry.fromJson(Map<String, dynamic> json) {
    return EventTimelineEntry(
      id: json['id'] as String,
      entryType: json['entryType'] as String,
      title: json['title'] as String,
      customerVisible: json['customerVisible'] as bool? ?? true,
      occurredAt: json['occurredAt'] as String,
      content: json['content'] as String?,
      actorUserId: json['actorUserId'] as String?,
    );
  }
}

class EventNoteSummary {
  final String id;
  final String visibility;
  final String content;
  final String createdAt;
  final String updatedAt;

  const EventNoteSummary({
    required this.id,
    required this.visibility,
    required this.content,
    required this.createdAt,
    required this.updatedAt,
  });

  factory EventNoteSummary.fromJson(Map<String, dynamic> json) {
    return EventNoteSummary(
      id: json['id'] as String,
      visibility: json['visibility'] as String,
      content: json['content'] as String,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
    );
  }
}

class EventRecordDetail extends EventRecordSummary {
  final List<EventTimelineEntry> timeline;
  final List<EventNoteSummary> noteEntries;
  final List<String> upcomingActions;

  const EventRecordDetail({
    required super.id,
    required super.eventNumber,
    required super.bookingId,
    required super.quotationId,
    required super.leadId,
    required super.enquiryId,
    required super.customerId,
    required super.eventTypeName,
    required super.eventName,
    required super.budgetAmount,
    required super.advancePaid,
    required super.pendingAmount,
    required super.status,
    required super.priority,
    required super.createdAt,
    required super.updatedAt,
    required this.timeline,
    required this.noteEntries,
    required this.upcomingActions,
    super.bookingNumber,
    super.eventDate,
    super.startTime,
    super.endTime,
    super.venueName,
    super.venueAddress,
    super.mapsLocationPlaceholder,
    super.guestCount,
    super.generalNotes,
  });

  factory EventRecordDetail.fromJson(Map<String, dynamic> json) {
    final summary = EventRecordSummary.fromJson(json);
    return EventRecordDetail(
      id: summary.id,
      eventNumber: summary.eventNumber,
      bookingId: summary.bookingId,
      quotationId: summary.quotationId,
      leadId: summary.leadId,
      enquiryId: summary.enquiryId,
      customerId: summary.customerId,
      eventTypeName: summary.eventTypeName,
      eventName: summary.eventName,
      budgetAmount: summary.budgetAmount,
      advancePaid: summary.advancePaid,
      pendingAmount: summary.pendingAmount,
      status: summary.status,
      priority: summary.priority,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
      bookingNumber: summary.bookingNumber,
      eventDate: summary.eventDate,
      startTime: summary.startTime,
      endTime: summary.endTime,
      venueName: summary.venueName,
      venueAddress: summary.venueAddress,
      mapsLocationPlaceholder: summary.mapsLocationPlaceholder,
      guestCount: summary.guestCount,
      generalNotes: summary.generalNotes,
      timeline: ((json['timeline'] as List<dynamic>?) ?? [])
          .map(
            (item) => EventTimelineEntry.fromJson(item as Map<String, dynamic>),
          )
          .toList(),
      noteEntries: ((json['notes'] as List<dynamic>?) ?? [])
          .map(
            (item) => EventNoteSummary.fromJson(item as Map<String, dynamic>),
          )
          .toList(),
      upcomingActions: ((json['upcomingActions'] as List<dynamic>?) ?? [])
          .map((item) => item.toString())
          .toList(),
    );
  }
}
