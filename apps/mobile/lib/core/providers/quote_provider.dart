import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/quote_request.dart';
import '../models/chat_message.dart';

class QuoteNotifier extends StateNotifier<List<QuoteRequest>> {
  QuoteNotifier()
    : super([
        QuoteRequest(
          id: 'Q-9481',
          vendorName: 'Paradise Royal Caterers',
          serviceTitle: 'Hyderabadi Shahi Dawat (Biryani & Haleem)',
          customerName: 'Vinay',
          eventDate: DateTime.now().add(const Duration(days: 45)),
          guestCount: 400,
          status: QuoteStatus.quoteReceived,
          totalAmount: 480000,
          breakdownItems: const [
            QuoteItem(title: 'Mutton Dum Biryani (400 Plates)', amount: 360000),
            QuoteItem(title: 'Live Haleem & Tandoor Stations', amount: 80000),
            QuoteItem(title: 'Uniformed Stewards & Cutlery', amount: 40000),
          ],
          lastMessage:
              'Aadab Vinay ji! We have sent the detailed itemized quote for 400 guests.',
        ),
        QuoteRequest(
          id: 'Q-9482',
          vendorName: 'Taj Floral & Decorators',
          serviceTitle: 'Nizami Royal Stage & Floral Entrance',
          customerName: 'Vinay',
          eventDate: DateTime.now().add(const Duration(days: 45)),
          guestCount: 400,
          status: QuoteStatus.pending,
          totalAmount: 250000,
          breakdownItems: const [],
          lastMessage:
              'Inquiry received. Our creative director is working on your customized stage rendering.',
        ),
      ]);

  void addInquiry(String serviceTitle, String vendorName) {
    final newInquiry = QuoteRequest(
      id: 'Q-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      vendorName: vendorName,
      serviceTitle: serviceTitle,
      customerName: 'Vinay',
      eventDate: DateTime.now().add(const Duration(days: 30)),
      guestCount: 300,
      status: QuoteStatus.pending,
      totalAmount: 180000,
      breakdownItems: const [
        QuoteItem(title: 'Base Package Service', amount: 150000),
        QuoteItem(title: 'Transportation & Logistics', amount: 30000),
      ],
      lastMessage: 'Your quote request has been dispatched to the vendor.',
    );

    state = [newInquiry, ...state];
  }
}

final quoteProvider = StateNotifierProvider<QuoteNotifier, List<QuoteRequest>>((
  ref,
) {
  return QuoteNotifier();
});

final chatMessagesProvider = Provider.family<List<ChatMessage>, String>((
  ref,
  quoteId,
) {
  return [
    ChatMessage(
      id: 'm1',
      senderName: 'Vinay',
      text:
          'Namaste! I am interested in booking this service for my upcoming wedding event in Hyderabad.',
      timestamp: DateTime.now().subtract(const Duration(hours: 4)),
      isVendor: false,
    ),
    ChatMessage(
      id: 'm2',
      senderName: 'Vendor Manager',
      text:
          'Aadab Vinay ji! Thank you for reaching out to Mee Events. Here is our official itemized quotation.',
      timestamp: DateTime.now().subtract(const Duration(hours: 2)),
      isVendor: true,
    ),
  ];
});
