import 'package:mee_events/models/enquiry.dart';
import 'package:mee_events/models/event_record.dart';
import 'package:mee_events/models/quotation.dart';

/// Aggregated customer workspace view built from existing APIs.
///
/// Prefer Event Record fields when present; otherwise fall back to booking +
/// quotation + enquiry so the workspace works before Event Record enrichment.
class EventWorkspaceSnapshot {
  final BookingDetail booking;
  final QuotationDetail quotation;
  final Enquiry? enquiry;
  final EventRecordDetail? eventRecord;

  const EventWorkspaceSnapshot({
    required this.booking,
    required this.quotation,
    this.enquiry,
    this.eventRecord,
  });

  String get eventNumber =>
      eventRecord?.eventNumber ?? booking.eventNumber ?? 'Pending assignment';

  String get bookingNumber => booking.bookingNumber;

  String get eventName =>
      eventRecord?.eventName ??
      enquiry?.eventTypeName ??
      quotation.enquiryReferenceCode ??
      'Your event';

  String get eventDate =>
      eventRecord?.eventDate ?? enquiry?.eventDate ?? 'To be confirmed';

  String get venue =>
      eventRecord?.venueName ??
      eventRecord?.venueAddress ??
      enquiry?.location ??
      'To be confirmed';

  String get guestCountLabel {
    final count = eventRecord?.guestCount ?? enquiry?.guestCount;
    if (count == null) return 'To be confirmed';
    return '$count guests';
  }

  String get bookingStatus => eventRecord?.statusLabel ?? booking.statusLabel;

  String get totalAmount => eventRecord?.budgetAmount ?? booking.finalAmount;

  String get advancePaid => eventRecord?.advancePaid ?? booking.advancePaid;

  String get remainingBalance {
    if (eventRecord != null) return eventRecord!.pendingAmount;
    return booking.remainingBalance;
  }

  List<EventWorkspaceTimelineItem> get timeline {
    final eventTimeline = eventRecord?.timeline ?? const <EventTimelineEntry>[];
    if (eventTimeline.isNotEmpty) {
      return eventTimeline
          .map(
            (entry) => EventWorkspaceTimelineItem(
              id: entry.id,
              title: entry.title,
              subtitle: entry.content,
              occurredAt: entry.occurredAt,
              done: true,
            ),
          )
          .toList();
    }

    final items = <EventWorkspaceTimelineItem>[
      ...booking.activities.map(
        (activity) => EventWorkspaceTimelineItem(
          id: activity.id,
          title: _humanize(activity.activityType),
          subtitle: activity.content,
          occurredAt: activity.occurredAt,
          done: true,
        ),
      ),
      ...quotation.activities.map(
        (activity) => EventWorkspaceTimelineItem(
          id: activity.id,
          title: _humanize(activity.activityType),
          subtitle: activity.content,
          occurredAt: activity.occurredAt,
          done: true,
        ),
      ),
    ];
    items.sort((a, b) => b.occurredAt.compareTo(a.occurredAt));
    return items;
  }

  static String _humanize(String raw) {
    return raw.replaceAll('_', ' ');
  }
}

class EventWorkspaceTimelineItem {
  final String id;
  final String title;
  final String? subtitle;
  final String occurredAt;
  final bool done;

  const EventWorkspaceTimelineItem({
    required this.id,
    required this.title,
    required this.occurredAt,
    this.subtitle,
    this.done = false,
  });
}
