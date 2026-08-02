class CustomerPreviewData {
  final String name;
  final String eventName;
  final String eventDate;
  final String venue;

  const CustomerPreviewData({
    required this.name,
    required this.eventName,
    required this.eventDate,
    required this.venue,
  });
}

const customerPreviewData = CustomerPreviewData(
  name: 'Ananya',
  eventName: 'Riya & Arjun Wedding',
  eventDate: '15 Feb 2025',
  venue: 'Taj Falaknuma Palace',
);
