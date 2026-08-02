import 'dart:async';
import 'package:flutter/material.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';
import 'package:mee_events/theme/theme.dart';

class HeroItem {
  final String imagePath;
  final String title;
  final String subtitle;
  final String badge;

  const HeroItem({
    required this.imagePath,
    required this.title,
    required this.subtitle,
    required this.badge,
  });
}

const _defaultHeroItems = [
  HeroItem(
      imagePath: 'assets/images/hero/wedding.jpg',
      title: 'Grand Weddings',
      subtitle: 'Crafted with love in Hyderabad',
      badge: '✨ Featured'),
  HeroItem(
      imagePath: 'assets/images/hero/corporate.jpg',
      title: 'Corporate Events',
      subtitle: 'Professional & seamless execution',
      badge: '🏢 Trending'),
  HeroItem(
      imagePath: 'assets/images/hero/birthday.jpg',
      title: 'Birthday Celebrations',
      subtitle: 'Make every year unforgettable',
      badge: '🎂 Popular'),
  HeroItem(
      imagePath: 'assets/images/hero/sangeet.jpg',
      title: 'Sangeet & Mehndi',
      subtitle: 'Dance the night away',
      badge: '💃 Hot'),
];

class HeroCarousel extends StatefulWidget {
  final List<HeroItem>? items;

  const HeroCarousel({Key? key, this.items}) : super(key: key);

  @override
  State<HeroCarousel> createState() => _HeroCarouselState();
}

class _HeroCarouselState extends State<HeroCarousel> {
  late final PageController _pageController;
  Timer? _timer;
  int _currentPage = 0;
  bool _isAutoScrolling = true;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(viewportFraction: 1.0);
    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    if (_isAutoScrolling) {
      _timer = Timer.periodic(const Duration(seconds: 4), (timer) {
        final itemsList = widget.items ?? _defaultHeroItems;
        if (_currentPage < itemsList.length - 1) {
          _currentPage++;
        } else {
          _currentPage = 0;
        }
        if (_pageController.hasClients) {
          _pageController.animateToPage(
            _currentPage,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeInOut,
          );
        }
      });
    }
  }

  void _pauseTimer() {
    _timer?.cancel();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final itemsList = widget.items ?? _defaultHeroItems;

    return Column(
      children: [
        SizedBox(
          height: 200,
          child: GestureDetector(
            onPanDown: (_) => _pauseTimer(),
            onPanCancel: () => _startTimer(),
            onPanEnd: (_) => _startTimer(),
            child: PageView.builder(
              controller: _pageController,
              itemCount: itemsList.length,
              onPageChanged: (index) {
                setState(() {
                  _currentPage = index;
                });
              },
              itemBuilder: (context, index) {
                return AnimatedBuilder(
                  animation: _pageController,
                  builder: (context, child) {
                    double value = 1.0;
                    if (_pageController.position.haveDimensions) {
                      value = _pageController.page! - index;
                      value = (1 - (value.abs() * 0.05)).clamp(0.95, 1.0);
                    }
                    return Center(
                      child: Transform.scale(
                        scale: value,
                        child: child,
                      ),
                    );
                  },
                  child: _buildCard(itemsList[index]),
                );
              },
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        SmoothPageIndicator(
          controller: _pageController,
          count: itemsList.length,
          effect: ExpandingDotsEffect(
            activeDotColor: AppColors.primary,
            dotColor: AppColors.hairlineSoft,
            dotHeight: 6,
            dotWidth: 6,
          ),
        ),
      ],
    );
  }

  Widget _buildCard(HeroItem item) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      child: ClipRRect(
        borderRadius: AppRadius.xlAll,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.asset(
              item.imagePath,
              fit: BoxFit.cover,
            ),
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [
                    AppColors.ink.withOpacity(0.8),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
            Positioned(
              left: AppSpacing.lg,
              bottom: AppSpacing.lg,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.md, vertical: AppSpacing.xs),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: AppRadius.pillAll,
                    ),
                    child: Text(
                      item.badge,
                      style: AppTypography.captionSm.copyWith(
                        color: AppColors.ink,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    item.title,
                    style: AppTypography.displaySm.copyWith(
                      color: AppColors.canvas,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    item.subtitle,
                    style: AppTypography.bodySm.copyWith(
                      color: AppColors.canvas.withOpacity(0.7),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
