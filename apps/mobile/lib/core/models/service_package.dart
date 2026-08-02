class ServicePackage {
  final String id;
  final String category; // 'Decor', 'Catering', 'Photography', 'Music'
  final String title;
  final String providerName;
  final int price;
  final String priceUnit; // e.g. 'per plate', 'per event', 'per day'
  final double rating;
  final int reviewCount;
  final String imagePath;
  final String description;
  final List<String> highlights;

  const ServicePackage({
    required this.id,
    required this.category,
    required this.title,
    required this.providerName,
    required this.price,
    required this.priceUnit,
    required this.rating,
    required this.reviewCount,
    required this.imagePath,
    required this.description,
    required this.highlights,
  });

  String get formattedPrice {
    final String priceStr = price.toString();
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
