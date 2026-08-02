import 'venue.dart';

enum TicketStatus { pending, confirmed, cancelled }

class Ticket {
  final String id;
  final EventVenue venue;
  final DateTime bookingDate;
  final TicketStatus status;

  const Ticket({
    required this.id,
    required this.venue,
    required this.bookingDate,
    required this.status,
  });
}
