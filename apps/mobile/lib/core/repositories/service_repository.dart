import '../models/service_package.dart';

class ServiceRepository {
  Future<List<ServicePackage>> fetchPackagesByCategory(String category) async {
    await Future.delayed(const Duration(milliseconds: 600));

    final allPackages = <ServicePackage>[
      // DECOR
      const ServicePackage(
        id: 'dec_1',
        category: 'Decor',
        title: 'Nizami Royal Stage & Floral Entrance',
        providerName: 'Taj Floral & Decorators',
        price: 250000,
        priceUnit: 'per event',
        rating: 4.95,
        reviewCount: 84,
        imagePath:
            'https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=1000&auto=format&fit=crop',
        description:
            'Authentic royal stage setup with imported fresh jasmine, Marigold, crystal chandeliers, and traditional Nizami arches.',
        highlights: [
          'Fresh Exotic Flowers',
          'Custom Lighting Rig',
          '3D Stage Rendering Included',
        ],
      ),
      const ServicePackage(
        id: 'dec_2',
        category: 'Decor',
        title: 'Crystal Chandelier Mandap & Canopy',
        providerName: 'Deccan Royal Luxury Sets',
        price: 180000,
        priceUnit: 'per event',
        rating: 4.88,
        reviewCount: 62,
        imagePath:
            'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=1000&auto=format&fit=crop',
        description:
            'Elegantly lit mandap surrounded by crystal drapes and velvet seating designed for high-profile Hyderabadi weddings.',
        highlights: [
          'Velvet Cushioning',
          'LED Ambient Wall',
          'Dedicated On-site Stylist',
        ],
      ),

      // CATERING
      const ServicePackage(
        id: 'cat_1',
        category: 'Catering',
        title: 'Hyderabadi Shahi Dawat (Biryani & Haleem)',
        providerName: 'Paradise Royal Caterers',
        price: 1200,
        priceUnit: 'per plate',
        rating: 4.98,
        reviewCount: 310,
        imagePath:
            'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?q=80&w=1000&auto=format&fit=crop',
        description:
            'World-famous Dum Biryani, Mutton Haleem, Qubani ka Meetha, Double ka Meetha, and live tandoor stations served by uniformed stewards.',
        highlights: [
          'Live Cooking Counters',
          'Traditional Copper Handis',
          'Silverware Service',
        ],
      ),
      const ServicePackage(
        id: 'cat_2',
        category: 'Catering',
        title: 'Imperial Gourmet Continental Buffet',
        providerName: 'Flavors of Jubilee Caterers',
        price: 1500,
        priceUnit: 'per plate',
        rating: 4.90,
        reviewCount: 142,
        imagePath:
            'https://images.unsplash.com/photo-1555244162-803834f70033?q=80&w=1000&auto=format&fit=crop',
        description:
            'Sophisticated 5-course international cuisine featuring live pasta bars, sushi counters, and artisan dessert stations.',
        highlights: [
          '5-Star Executive Chefs',
          'Custom Dietary Menus',
          'Mocktail Bar Included',
        ],
      ),

      // PHOTOGRAPHY
      const ServicePackage(
        id: 'pho_1',
        category: 'Photography',
        title: 'Cinematic 4K Wedding Film & Heritage Shoot',
        providerName: 'Charminar Stories Cinema',
        price: 150000,
        priceUnit: 'per event',
        rating: 4.96,
        reviewCount: 118,
        imagePath:
            'https://images.unsplash.com/photo-1606800052052-a08af7148866?q=80&w=1000&auto=format&fit=crop',
        description:
            'Complete 3-day coverage including pre-wedding heritage shoot at Falaknuma/Chowmahalla, 4K cinematic teaser, and hardcover album.',
        highlights: [
          '2x Drone Operators',
          'Same-Day Teaser Edit',
          'Premium Leather Album',
        ],
      ),

      // MUSIC
      const ServicePackage(
        id: 'mus_1',
        category: 'Music',
        title: 'Live Sufi & Qawwali Ensemble',
        providerName: 'Nizamia Qawwal Troupe',
        price: 80000,
        priceUnit: 'per event',
        rating: 4.92,
        reviewCount: 76,
        imagePath:
            'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000&auto=format&fit=crop',
        description:
            'Mesmerizing 8-piece live Sufi and traditional Hyderabadi Qawwali performance for Sangeet and Mehendi nights.',
        highlights: [
          '8-Piece Musicians',
          'Bose Concert Sound System',
          'Custom Song Requests',
        ],
      ),
    ];

    if (category.isEmpty || category == 'All') {
      return allPackages;
    }

    return allPackages
        .where((p) => p.category.toLowerCase() == category.toLowerCase())
        .toList();
  }
}
