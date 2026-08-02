import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import '../models/super_app_models.dart';
import '../data/super_app_dummy_data.dart';

import '../widgets/home/home_app_bar.dart';
import '../widgets/home/hero_banner_carousel.dart';
import '../widgets/home/announcement_card.dart';
import '../widgets/home/category_section.dart';
import '../widgets/home/event_service_section.dart';
import '../widgets/home/recommended_vendors.dart';
import '../widgets/home/trending_services.dart';
import '../widgets/home/customer_reviews.dart';

class CustomerHomeTab extends StatefulWidget {
  const CustomerHomeTab({super.key});

  @override
  State<CustomerHomeTab> createState() => _CustomerHomeTabState();
}

class _CustomerHomeTabState extends State<CustomerHomeTab> {
  bool _isLoading = false;

  late List<BannerModel> _banners;
  late List<AnnouncementModel> _announcements;
  late List<CategoryModel> _topEvents;
  late List<VendorModel> _recommendedVendors;
  late List<TrendingServiceModel> _trendingServices;
  late List<ReviewModel> _reviews;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    _banners = SuperAppDummyData.getBanners();
    _announcements = SuperAppDummyData.getAnnouncements();
    _topEvents = SuperAppDummyData.getTopEvents();
    _recommendedVendors = SuperAppDummyData.getRecommendedVendors();
    _trendingServices = SuperAppDummyData.getTrendingServices();
    _reviews = SuperAppDummyData.getReviews();
  }

  Future<void> _handleRefresh() async {
    setState(() => _isLoading = true);
    await Future.delayed(const Duration(seconds: 1)); // Simulate network request
    setState(() {
      _loadData();
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: RefreshIndicator(
        onRefresh: _handleRefresh,
        color: AppColors.primary,
        backgroundColor: AppColors.canvas,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
          slivers: [
            const HomeAppBar(),
            if (_isLoading)
              const SliverToBoxAdapter(
                child: SizedBox(
                  height: 300, 
                  child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                ),
              )
            else ...[
              SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    HeroBannerCarousel(banners: _banners),
                    const SizedBox(height: 16),
                    AnnouncementCard(announcements: _announcements),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
              
              // Dynamically render each Top Event as its own Section
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final event = _topEvents[index];
                    final eventServices = SuperAppDummyData.getServicesForEvent(event.name);
                    
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 24.0),
                      child: EventServiceSection(
                        eventId: event.id,
                        eventName: event.name,
                        subcategories: eventServices,
                        onShowAll: () {
                          // TODO: Navigate to event specific all services page
                        },
                      ),
                    );
                  },
                  childCount: _topEvents.length,
                ),
              ),

              SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    RecommendedVendorsSection(vendors: _recommendedVendors),
                    const SizedBox(height: 32),
                    TrendingServicesSection(services: _trendingServices),
                    const SizedBox(height: 32),
                    CustomerReviewsSection(reviews: _reviews),
                    const SizedBox(height: 80), // Footer Space for Bottom Navigation
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
