import '../models/venue.dart';

class VenueRepository {
  Future<List<EventVenue>> fetchPremiumVenues() async {
    // Simulate network delay to show off beautiful loading states
    await Future.delayed(const Duration(milliseconds: 1500));

    return const [
      EventVenue(
        id: 'v_1',
        title: 'Taj Falaknuma Grand Palace',
        location: 'Engine Bowli, Hyderabad',
        price: 1500000,
        rating: 4.98,
        reviewCount: 128,
        imagePath: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop', // Royal heritage palace architecture
        features: [
          'Nizami Royal Experience',
          'Verified Premium Venue',
          'Accommodates 800+ guests'
        ],
        description: 'Experience a royal wedding celebration at the iconic Falaknuma Palace. This all-inclusive package covers venue, premium catering, traditional decor, and live music for up to 500 guests.',
      ),
      EventVenue(
        id: 'v_2',
        title: 'HITEX Convention Center',
        location: 'Madhapur, Hyderabad',
        price: 500000,
        rating: 4.85,
        reviewCount: 96,
        imagePath: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=2070&auto=format&fit=crop', // Massive convention center hall
        features: [
          'Massive 10,000 sq.ft hall',
          'Tech-enabled staging',
          'Corporate Catering Options'
        ],
        description: 'The premier destination for large-scale corporate summits, trade shows, and massive conventions in the heart of HITEC City.',
      ),
      EventVenue(
        id: 'v_3',
        title: 'Jubilee Hills Club',
        location: 'Jubilee Hills, Hyderabad',
        price: 250000,
        rating: 5.0,
        reviewCount: 45,
        imagePath: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=2069&auto=format&fit=crop', // Lush green lawn & luxury resort celebration
        features: [
          'Elite Member Access',
          'Lush Green Lawns',
          'In-house premium dining'
        ],
        description: 'An exclusive oasis in Jubilee Hills perfect for elegant birthday celebrations, private galas, and high-profile gatherings.',
      ),
      EventVenue(
        id: 'v_4',
        title: 'Chowmahalla Palace',
        location: 'Motigalli, Hyderabad',
        price: 1200000,
        rating: 4.9,
        reviewCount: 210,
        imagePath: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=2069&auto=format&fit=crop', // Grand Indian royal palace wedding reception & mandap
        features: [
          'Historical Monument Status',
          'Grand Courtyards',
          'Perfect for Sangeet & Mehndi'
        ],
        description: 'Host your Sangeet under the grand chandeliers of the Chowmahalla Palace, where the Nizams once entertained their royal guests.',
      ),
    ];
  }
}
