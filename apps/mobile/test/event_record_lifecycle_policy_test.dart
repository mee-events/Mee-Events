import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/models/event_record.dart';

void main() {
  const publishedClassifications = <String, EventRecordLifecycle>{
    'created': EventRecordLifecycle.active,
    'planning': EventRecordLifecycle.active,
    'requirements_confirmed': EventRecordLifecycle.active,
    'quotation_approved': EventRecordLifecycle.active,
    'booking_confirmed': EventRecordLifecycle.active,
    'manager_assigned': EventRecordLifecycle.active,
    'vendor_assigned': EventRecordLifecycle.active,
    'worker_assigned': EventRecordLifecycle.active,
    'preparation': EventRecordLifecycle.active,
    'ready': EventRecordLifecycle.active,
    'event_running': EventRecordLifecycle.active,
    'completed': EventRecordLifecycle.concluded,
    'settlement_pending': EventRecordLifecycle.concluded,
    'closed': EventRecordLifecycle.concluded,
    'cancelled': EventRecordLifecycle.cancelled,
  };

  test('classifies all 15 published statuses exactly once', () {
    expect(publishedClassifications, hasLength(15));

    final policyStatuses = {
      ...activeEventRecordStatuses,
      ...concludedEventRecordStatuses,
      ...cancelledEventRecordStatuses,
    };
    expect(policyStatuses, publishedClassifications.keys.toSet());
    expect(
      activeEventRecordStatuses.intersection(concludedEventRecordStatuses),
      isEmpty,
    );
    expect(
      activeEventRecordStatuses.intersection(cancelledEventRecordStatuses),
      isEmpty,
    );
    expect(
      concludedEventRecordStatuses.intersection(cancelledEventRecordStatuses),
      isEmpty,
    );

    for (final entry in publishedClassifications.entries) {
      expect(
        classifyEventRecordLifecycle(entry.key),
        entry.value,
        reason: entry.key,
      );
    }
  });

  test('unknown additive status remains raw and fails closed', () {
    final event = EventRecordSummary.fromJson({
      'id': 'event-unknown',
      'eventNumber': 'EVT-UNKNOWN',
      'bookingId': 'booking-unknown',
      'quotationId': 'quotation-unknown',
      'leadId': 'lead-unknown',
      'enquiryId': 'enquiry-unknown',
      'customerId': 'customer-unknown',
      'eventTypeName': 'Wedding',
      'eventName': 'Unknown lifecycle event',
      'budgetAmount': '0',
      'advancePaid': '0',
      'pendingAmount': '0',
      'status': 'future_additive_status',
      'priority': 'normal',
      'createdAt': '2026-09-01T00:00:00.000Z',
      'updatedAt': '2026-09-01T00:00:00.000Z',
    });

    expect(event.status, 'future_additive_status');
    expect(event.lifecycle, EventRecordLifecycle.unknown);
    expect(activeEventRecordStatuses, isNot(contains(event.status)));
    expect(concludedEventRecordStatuses, isNot(contains(event.status)));
    expect(cancelledEventRecordStatuses, isNot(contains(event.status)));
  });
}
