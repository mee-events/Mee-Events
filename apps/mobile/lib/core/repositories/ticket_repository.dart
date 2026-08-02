import '../models/ticket.dart';
import '../models/venue.dart';

class TicketRepository {
  Future<Ticket> bookVenue(EventVenue venue) async {
    // Simulate payment/booking processing delay
    await Future.delayed(const Duration(seconds: 2));

    // Return a confirmed ticket
    return Ticket(
      id: 'TKT-${DateTime.now().millisecondsSinceEpoch}',
      venue: venue,
      bookingDate: DateTime.now().add(const Duration(days: 30)), // Mock future date
      status: TicketStatus.confirmed,
    );
  }
}
