import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/ticket.dart';
import '../models/venue.dart';
import '../repositories/ticket_repository.dart';

final ticketRepositoryProvider = Provider<TicketRepository>((ref) {
  return TicketRepository();
});

class BookingNotifier extends StateNotifier<AsyncValue<Ticket?>> {
  final TicketRepository _repository;

  BookingNotifier(this._repository) : super(const AsyncValue.data(null));

  Future<bool> bookVenue(EventVenue venue) async {
    state = const AsyncValue.loading();
    try {
      final ticket = await _repository.bookVenue(venue);
      state = AsyncValue.data(ticket);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  void reset() {
    state = const AsyncValue.data(null);
  }
}

final bookingProvider = StateNotifierProvider<BookingNotifier, AsyncValue<Ticket?>>((ref) {
  final repository = ref.watch(ticketRepositoryProvider);
  return BookingNotifier(repository);
});
