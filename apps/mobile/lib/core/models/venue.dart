class EventVenue {
  final String id;
  final String title;
  final String location;
  final int price;
  final double rating;
  final int reviewCount;
  final String imagePath;
  final List<String> features;
  final String description;

  const EventVenue({
    required this.id,
    required this.title,
    required this.location,
    required this.price,
    required this.rating,
    required this.reviewCount,
    required this.imagePath,
    required this.features,
    required this.description,
  });

  String get formattedPrice {
    // Simple Indian Rupee formatting for display
    final String priceStr = price.toString();
    if (priceStr.length <= 3) return '₹$priceStr';
    
    // For lakhs and crores, formatting like 15,00,000
    // A quick robust formatting method:
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
