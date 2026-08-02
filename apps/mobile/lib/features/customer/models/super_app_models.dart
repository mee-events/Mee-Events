class BannerModel {
  final String id;
  final String title;
  final String subtitle;
  final String image;
  final String buttonText;
  final String buttonLink;
  final int priority;
  final String status;

  BannerModel({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.image,
    required this.buttonText,
    required this.buttonLink,
    required this.priority,
    required this.status,
  });
}

class CategoryModel {
  final String id;
  final String name;
  final String image;
  final String icon;
  final int priority;
  final String status;

  CategoryModel({
    required this.id,
    required this.name,
    required this.image,
    required this.icon,
    required this.priority,
    required this.status,
  });
}

class SubcategoryModel {
  final String id;
  final String categoryId;
  final String name;
  final String image;
  final String description;
  final int priority;
  final String status;
  final List<String> subCategories;

  SubcategoryModel({
    required this.id,
    required this.categoryId,
    required this.name,
    required this.image,
    required this.description,
    required this.priority,
    required this.status,
    this.subCategories = const [],
  });
}

class AnnouncementModel {
  final String id;
  final String title;
  final String description;
  final String type;
  final int priority;
  final String status;
  final DateTime createdAt;

  AnnouncementModel({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.priority,
    required this.status,
    required this.createdAt,
  });
}

class VendorModel {
  final String id;
  final String name;
  final String image;
  final double rating;
  final String location;
  final String startingPrice;
  final bool isVerified;

  VendorModel({
    required this.id,
    required this.name,
    required this.image,
    required this.rating,
    required this.location,
    required this.startingPrice,
    required this.isVerified,
  });
}

class TrendingServiceModel {
  final String id;
  final String name;
  final String image;
  final double rating;
  final String price;

  TrendingServiceModel({
    required this.id,
    required this.name,
    required this.image,
    required this.rating,
    required this.price,
  });
}

class ReviewModel {
  final String id;
  final String customerName;
  final String customerPhoto;
  final double rating;
  final String reviewText;

  ReviewModel({
    required this.id,
    required this.customerName,
    required this.customerPhoto,
    required this.rating,
    required this.reviewText,
  });
}

class ServiceModel {
  final String id;
  final String name;
  final String image;
  final String description;

  ServiceModel({
    required this.id,
    required this.name,
    required this.image,
    required this.description,
  });

  factory ServiceModel.fromJson(Map<String, dynamic> json, String documentId) {
    return ServiceModel(
      id: documentId,
      name: json['name'] as String? ?? '',
      image: json['image'] as String? ?? '',
      description: json['shortDescription'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'image': image,
      'shortDescription': description,
    };
  }
}
