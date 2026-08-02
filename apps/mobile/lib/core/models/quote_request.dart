enum QuoteStatus { pending, quoteReceived, accepted, rejected }

class QuoteItem {
  final String title;
  final int amount;

  const QuoteItem({required this.title, required this.amount});
}

class QuoteRequest {
  final String id;
  final String vendorName;
  final String serviceTitle;
  final String customerName;
  final DateTime eventDate;
  final int guestCount;
  final QuoteStatus status;
  final int totalAmount;
  final List<QuoteItem> breakdownItems;
  final String lastMessage;

  const QuoteRequest({
    required this.id,
    required this.vendorName,
    required this.serviceTitle,
    required this.customerName,
    required this.eventDate,
    required this.guestCount,
    required this.status,
    required this.totalAmount,
    required this.breakdownItems,
    required this.lastMessage,
  });

  String get formattedTotal {
    final String priceStr = totalAmount.toString();
    if (priceStr.length <= 3) return '₹$priceStr';
    
    String result = priceStr.substring(priceStr.length - 3);
    String remaining = priceStr.substring(0, priceStr.length - 3);
    while (remaining.length > 2) {
      result = '${remaining.substring(remaining.length - 2)},$result';
      remaining = remaining.substring(0, remaining.length - 2);
    }
    if (remaining.isNotEmpty) {
      result = '$remaining,$result';
    }
    return '₹$result';
  }
}
