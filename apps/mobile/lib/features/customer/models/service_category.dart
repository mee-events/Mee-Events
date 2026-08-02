class ServiceCategory {
  final String id;
  final String name;
  final String emoji;
  final String? imageUrl;
  final int? startingPrice;
  final String? priceUnit;

  const ServiceCategory({
    required this.id,
    required this.name,
    required this.emoji,
    this.imageUrl,
    this.startingPrice,
    this.priceUnit,
  });
}

class EventCategory {
  final String id;
  final String name;
  final String emoji;
  final String? imageUrl;
  final String? description;
  final List<String> subCategories;

  const EventCategory({
    required this.id,
    required this.name,
    required this.emoji,
    this.imageUrl,
    this.description,
    this.subCategories = const [],
  });
}

class CatalogPrice {
  final int amount;
  final String unit;
  final String? note;

  const CatalogPrice({
    required this.amount,
    required this.unit,
    this.note,
  });
}
