import '../models/super_app_models.dart';

class SuperAppDummyData {
  static List<BannerModel> getBanners() {
    return [
      BannerModel(
        id: '1',
        title: 'Grand Weddings',
        subtitle: 'Up to 30% off on complete packages',
        image: 'assets/images/home/banners/wedding_package.jpg',
        buttonText: 'Book Now',
        buttonLink: '/category/wedding',
        priority: 1,
        status: 'active',
      ),
      BannerModel(
        id: '2',
        title: 'Corporate Galas',
        subtitle: 'Premium venues & high-end catering',
        image: 'assets/images/home/banners/corporate_gala.jpg',
        buttonText: 'Explore',
        buttonLink: '/category/corporate',
        priority: 2,
        status: 'active',
      ),
      BannerModel(
        id: '3',
        title: 'Epic Concerts',
        subtitle: 'Sound, lights & stage setup',
        image: 'assets/images/home/banners/concert.jpg',
        buttonText: 'View Services',
        buttonLink: '/category/concerts',
        priority: 3,
        status: 'active',
      ),
    ];
  }

  static List<AnnouncementModel> getAnnouncements() {
    return [
      AnnouncementModel(
        id: '1',
        title: '🎉 Festival Offers Live!',
        description:
            'Book your event this weekend and get a free photography session.',
        type: 'offer',
        priority: 1,
        status: 'active',
        createdAt: DateTime.now(),
      ),
      AnnouncementModel(
        id: '2',
        title: '💼 Hiring Event Crews',
        description:
            'Earn up to ₹3,500/day. Join our premium vendor network now.',
        type: 'job',
        priority: 2,
        status: 'active',
        createdAt: DateTime.now(),
      ),
    ];
  }

  static List<CategoryModel> getTopEvents() {
    return [
      CategoryModel(
        id: 'e1',
        name: 'Engagement Ceremony',
        image: 'assets/images/categories/engagement.jpg',
        icon: 'favorite',
        priority: 1,
        status: 'active',
      ),
      CategoryModel(
        id: 'e2',
        name: 'Pre-Wedding Ceremony',
        image: 'assets/images/categories/pre_wedding.jpg',
        icon: 'camera_alt',
        priority: 2,
        status: 'active',
      ),
      CategoryModel(
        id: 'e3',
        name: 'Mehndi Events',
        image: 'assets/images/categories/mehndi.jpg',
        icon: 'brush',
        priority: 3,
        status: 'active',
      ),
      CategoryModel(
        id: 'e4',
        name: 'Sangeet Events',
        image: 'assets/images/categories/sangeet.jpg',
        icon: 'music_note',
        priority: 4,
        status: 'active',
      ),
      CategoryModel(
        id: 'e5',
        name: 'Wedding Events',
        image: 'assets/images/categories/wedding.jpg',
        icon: 'celebration',
        priority: 5,
        status: 'active',
      ),
    ];
  }

  static List<SubcategoryModel> getSubcategories() {
    return [];
  }

  static List<VendorModel> getRecommendedVendors() {
    return [
      VendorModel(
        id: 'v1',
        name: 'Royal Decorators',
        image: 'assets/images/vendors/royal_decorators.jpg',
        rating: 4.9,
        location: 'Jubilee Hills',
        startingPrice: '₹50,000',
        isVerified: true,
      ),
      VendorModel(
        id: 'v2',
        name: 'Elite Catering',
        image: 'assets/images/vendors/elite_catering.jpg',
        rating: 4.8,
        location: 'Banjara Hills',
        startingPrice: '₹1,200/plate',
        isVerified: true,
      ),
      VendorModel(
        id: 'v3',
        name: 'Capture Moments',
        image: 'assets/images/vendors/capture_moments.jpg',
        rating: 4.7,
        location: 'Madhapur',
        startingPrice: '₹30,000',
        isVerified: true,
      ),
    ];
  }

  static List<TrendingServiceModel> getTrendingServices() {
    return [
      TrendingServiceModel(
        id: 'ts1',
        name: 'Premium Mandap Setup',
        image: 'assets/images/home/trending/premium_mandap.jpg',
        rating: 4.9,
        price: '₹85,000',
      ),
      TrendingServiceModel(
        id: 'ts2',
        name: 'Corporate LED Stage',
        image: 'assets/images/home/trending/corporate_stage.jpg',
        rating: 4.8,
        price: '₹1,50,000',
      ),
    ];
  }

  static List<ReviewModel> getReviews() {
    return [
      ReviewModel(
        id: 'r1',
        customerName: 'Aarti Sharma',
        customerPhoto: 'assets/images/vendors/vendor_user_1.jpg',
        rating: 5.0,
        reviewText: 'Mee Events made my wedding a dream come true! Highly recommend their premium decorators.',
      ),
      ReviewModel(
        id: 'r2',
        customerName: 'Rahul Verma',
        customerPhoto: 'assets/images/vendors/vendor_user_2.jpg',
        rating: 4.8,
        reviewText: 'Booked them for a corporate gala. Flawless execution and great vendor network.',
      ),
    ];
  }

  static List<ServiceModel> getServicesForEvent(String eventName) {
    final lower = eventName.toLowerCase();
    
    if (lower.contains('engagement')) {
      return [
        ServiceModel(id: 'eng_1', name: 'House Decor', description: 'Premium House Decor', image: 'assets/images/subcategory/engagement/house_decoration/house_decoration.jpg'),
        ServiceModel(id: 'eng_2', name: 'Wedding Items & Gifts', description: 'Premium Wedding Items & Gifts', image: 'assets/images/subcategory/engagement/wedding_gifts/wedding_gifts.jpg'),
        ServiceModel(id: 'eng_3', name: 'Flower Garlands', description: 'Premium Flower Garlands', image: 'assets/images/subcategory/engagement/flower_garlands/flower_garlands.jpg'),
        ServiceModel(id: 'eng_4', name: 'Mehndi & Makeup', description: 'Premium Mehndi & Makeup', image: 'assets/images/subcategory/engagement/mehndi_makeup/mehndi_makeup.jpg'),
        ServiceModel(id: 'eng_5', name: 'Couple Grand Entry', description: 'Premium Couple Grand Entry', image: 'assets/images/subcategory/engagement/grand_entry/grand_entry.jpg'),
        ServiceModel(id: 'eng_6', name: 'Event Special Effects', description: 'Premium Event Special Effects', image: 'assets/images/subcategory/engagement/special_effects/special_effects.jpg'),
        ServiceModel(id: 'eng_7', name: 'Event Entertainment', description: 'Premium Event Entertainment', image: 'assets/images/subcategory/engagement/entertainment/entertainment.jpg'),
        ServiceModel(id: 'eng_8', name: 'DJ Sound & Lighting', description: 'Premium DJ Sound & Lighting', image: 'assets/images/subcategory/engagement/dj_lighting/dj_lighting.jpg'),
        ServiceModel(id: 'eng_9', name: 'Catering & Food Counters', description: 'Premium Catering & Food Counters', image: 'assets/images/subcategory/engagement/catering/catering.jpg'),
        ServiceModel(id: 'eng_10', name: 'Stage Decoration', description: 'Premium Stage Decoration', image: 'assets/images/subcategory/engagement/stage_decoration/stage_decoration.jpg'),
        ServiceModel(id: 'eng_11', name: 'Photography & Videography', description: 'Premium Photography & Videography', image: 'assets/images/subcategory/engagement/photography/photography.jpg'),
      ];
    } else if (lower.contains('pre-wedding') || lower.contains('pre wedding')) {
      return [
        ServiceModel(id: 'pre_1', name: 'House Decoration', description: 'Premium House Decoration', image: 'assets/images/subcategory/pre_wedding/house_decoration/house_decoration.jpg'),
        ServiceModel(id: 'pre_2', name: 'Haldi Event', description: 'Premium Haldi Event', image: 'assets/images/subcategory/pre_wedding/haldi/haldi.jpg'),
        ServiceModel(id: 'pre_3', name: 'Mangalasnanam Event', description: 'Premium Mangalasnanam Event', image: 'assets/images/subcategory/pre_wedding/mangalasnanam/mangalasnanam.jpg'),
        ServiceModel(id: 'pre_4', name: 'Backdrops', description: 'Premium Backdrops', image: 'assets/images/subcategory/pre_wedding/backdrops/backdrops.jpg'),
        ServiceModel(id: 'pre_5', name: 'Wedding Items & Gifts', description: 'Premium Wedding Items & Gifts', image: 'assets/images/subcategory/pre_wedding/wedding_gifts/wedding_gifts.jpg'),
        ServiceModel(id: 'pre_6', name: 'Pandit & Puja Items', description: 'Premium Pandit & Puja Items', image: 'assets/images/subcategory/pre_wedding/puja_items/puja_items.jpg'),
        ServiceModel(id: 'pre_7', name: 'Flower Garlands', description: 'Premium Flower Garlands', image: 'assets/images/subcategory/pre_wedding/flower_garlands/flower_garlands.jpg'),
        ServiceModel(id: 'pre_8', name: 'Makeup & Mehndi', description: 'Premium Makeup & Mehndi', image: 'assets/images/subcategory/pre_wedding/mehndi_makeup/mehndi_makeup.jpg'),
        ServiceModel(id: 'pre_9', name: 'Photography & Videography', description: 'Premium Photography & Videography', image: 'assets/images/subcategory/pre_wedding/photography/photography.jpg'),
        ServiceModel(id: 'pre_10', name: 'Bride To Be / Bachelor Party', description: 'Premium Bride To Be / Bachelor Party', image: 'assets/images/subcategory/pre_wedding/bachelor_party/bachelor_party.jpg'),
      ];
    } else if (lower.contains('mehndi')) {
      return [
        ServiceModel(id: 'meh_1', name: 'Mehndi Artist', description: 'Premium Mehndi Artist', image: 'assets/images/subcategory/mehndi/mehndi_makeup/mehndi_makeup.jpg'),
        ServiceModel(id: 'meh_2', name: 'Backdrops', description: 'Premium Backdrops', image: 'assets/images/subcategory/mehndi/backdrops/backdrops.jpg'),
        ServiceModel(id: 'meh_3', name: 'Events Special Effects', description: 'Premium Events Special Effects', image: 'assets/images/subcategory/mehndi/special_effects/special_effects.jpg'),
        ServiceModel(id: 'meh_4', name: 'Event Entertainment', description: 'Premium Event Entertainment', image: 'assets/images/subcategory/mehndi/entertainment/entertainment.jpg'),
        ServiceModel(id: 'meh_5', name: 'DJ Sound & Lighting', description: 'Premium DJ Sound & Lighting', image: 'assets/images/subcategory/mehndi/dj_lighting/dj_lighting.jpg'),
        ServiceModel(id: 'meh_6', name: 'Catering & Food Counters', description: 'Premium Catering & Food Counters', image: 'assets/images/subcategory/mehndi/catering/catering.jpg'),
        ServiceModel(id: 'meh_7', name: 'Photography & Videography', description: 'Premium Photography & Videography', image: 'assets/images/subcategory/mehndi/photography/photography.jpg'),
        ServiceModel(id: 'meh_8', name: 'Tent House', description: 'Premium Tent House', image: 'assets/images/subcategory/mehndi/tent_house/tent_house.jpg'),
      ];
    } else if (lower.contains('sangeet')) {
      return [
        ServiceModel(id: 'san_1', name: 'Couple Grand Entry', description: 'Premium Couple Grand Entry', image: 'assets/images/subcategory/sangeet/grand_entry/grand_entry.jpg'),
        ServiceModel(id: 'san_2', name: 'Events Special Effects', description: 'Premium Events Special Effects', image: 'assets/images/subcategory/sangeet/special_effects/special_effects.jpg'),
        ServiceModel(id: 'san_3', name: 'Event Entertainment', description: 'Premium Event Entertainment', image: 'assets/images/subcategory/sangeet/entertainment/entertainment.jpg'),
        ServiceModel(id: 'san_4', name: 'Sound & Lighting', description: 'Premium Sound & Lighting', image: 'assets/images/subcategory/sangeet/dj_lighting/dj_lighting.jpg'),
        ServiceModel(id: 'san_5', name: 'Band & Bharat/Baggi', description: 'Premium Band & Bharat/Baggi', image: 'assets/images/subcategory/sangeet/band_bharat/band_bharat.jpg'),
        ServiceModel(id: 'san_6', name: 'Stage Decoration', description: 'Premium Stage Decoration', image: 'assets/images/subcategory/sangeet/stage_decoration/stage_decoration.jpg'),
        ServiceModel(id: 'san_7', name: 'Catering & Food Counters', description: 'Premium Catering & Food Counters', image: 'assets/images/subcategory/sangeet/catering/catering.jpg'),
        ServiceModel(id: 'san_8', name: 'Photography & Videography', description: 'Premium Photography & Videography', image: 'assets/images/subcategory/sangeet/photography/photography.jpg'),
        ServiceModel(id: 'san_9', name: 'Makeup & Mehndi', description: 'Premium Makeup & Mehndi', image: 'assets/images/subcategory/sangeet/mehndi_makeup/mehndi_makeup.jpg'),
        ServiceModel(id: 'san_10', name: 'Flower Garlands', description: 'Premium Flower Garlands', image: 'assets/images/subcategory/sangeet/flower_garlands/flower_garlands.jpg'),
        ServiceModel(id: 'san_11', name: 'Tent House', description: 'Premium Tent House', image: 'assets/images/subcategory/sangeet/tent_house/tent_house.jpg'),
      ];
    } else if (lower.contains('wedding')) {
      return [
        ServiceModel(id: 'wed_1', name: 'Bride & Groom Entry', description: 'Premium Bride & Groom Entry', image: 'assets/images/subcategory/wedding/grand_entry/grand_entry.jpg'),
        ServiceModel(id: 'wed_2', name: 'Event Special Effects', description: 'Premium Event Special Effects', image: 'assets/images/subcategory/wedding/special_effects/special_effects.jpg'),
        ServiceModel(id: 'wed_3', name: 'Event Entertainment', description: 'Premium Event Entertainment', image: 'assets/images/subcategory/wedding/entertainment/entertainment.jpg'),
        ServiceModel(id: 'wed_4', name: 'Wedding Concepts', description: 'Premium Wedding Concepts', image: 'assets/images/subcategory/wedding/wedding_concepts/wedding_concepts.jpg'),
        ServiceModel(id: 'wed_5', name: 'DJ Sound & Lighting', description: 'Premium DJ Sound & Lighting', image: 'assets/images/subcategory/wedding/dj_lighting/dj_lighting.jpg'),
        ServiceModel(id: 'wed_6', name: 'Band Bharat/Baggi', description: 'Premium Band Bharat/Baggi', image: 'assets/images/subcategory/wedding/band_bharat/band_bharat.jpg'),
        ServiceModel(id: 'wed_7', name: 'Catering & Food Counters', description: 'Premium Catering & Food Counters', image: 'assets/images/subcategory/wedding/catering/catering.jpg'),
        ServiceModel(id: 'wed_8', name: 'Mandapam Decoration', description: 'Premium Mandapam Decoration', image: 'assets/images/subcategory/wedding/mandapam/mandapam.jpg'),
        ServiceModel(id: 'wed_9', name: 'Photography & Videography', description: 'Premium Photography & Videography', image: 'assets/images/subcategory/wedding/photography/photography.jpg'),
        ServiceModel(id: 'wed_10', name: 'Wedding Items & Gifts', description: 'Premium Wedding Items & Gifts', image: 'assets/images/subcategory/wedding/wedding_gifts/wedding_gifts.jpg'),
        ServiceModel(id: 'wed_11', name: 'Makeup & Mehndi', description: 'Premium Makeup & Mehndi', image: 'assets/images/subcategory/wedding/mehndi_makeup/mehndi_makeup.jpg'),
        ServiceModel(id: 'wed_12', name: 'Flower Garlands', description: 'Premium Flower Garlands', image: 'assets/images/subcategory/wedding/flower_garlands/flower_garlands.jpg'),
        ServiceModel(id: 'wed_13', name: 'Puja Items & Pandit', description: 'Premium Puja Items & Pandit', image: 'assets/images/subcategory/wedding/puja_items/puja_items.jpg'),
      ];
    } else {
      // Default fallback
      return [
        ServiceModel(id: 'def_1', name: 'Photography & Videography', description: 'Premium Photography & Videography', image: 'assets/images/subcategory/wedding/photography/photography.jpg'),
        ServiceModel(id: 'def_2', name: 'Stage Decoration', description: 'Premium Stage Decoration', image: 'assets/images/subcategory/engagement/stage_decoration/stage_decoration.jpg'),
        ServiceModel(id: 'def_3', name: 'Catering & Food Counters', description: 'Premium Catering & Food Counters', image: 'assets/images/subcategory/engagement/catering/catering.jpg'),
      ];
    }
  }
}
