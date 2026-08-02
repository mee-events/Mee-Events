import 'package:flutter/material.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_typography.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/features/auth/screens/login_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentIndex = 0;

  final List<Map<String, String>> _onboardingData = [
    {
      'image': 'assets/images/onboarding/discover.jpg',
      'title': 'Discover Events',
      'subtitle': 'Find the perfect venues, caterers, and decorators for your celebrations in Hyderabad',
    },
    {
      'image': 'assets/images/onboarding/plan.jpg',
      'title': 'Plan Effortlessly',
      'subtitle': 'From weddings to corporate events, plan every detail with our expert guidance',
    },
    {
      'image': 'assets/images/onboarding/experience.jpg',
      'title': 'Experience Magic',
      'subtitle': 'Create unforgettable memories with Hyderabad\'s most trusted event partners',
    },
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _navigateToDashboard() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (context) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.ink,
      body: Stack(
        children: [
          PageView.builder(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() {
                _currentIndex = index;
              });
            },
            itemCount: _onboardingData.length,
            itemBuilder: (context, index) {
              final data = _onboardingData[index];
              return Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(
                    data['image']!,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      color: AppColors.inkLight,
                      child: const Center(
                        child: Icon(Icons.image, color: AppColors.muted, size: 60),
                      ),
                    ),
                  ),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        stops: const [0.4, 1.0],
                        colors: [
                          Colors.transparent,
                          AppColors.ink.withOpacity(0.85),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
          SafeArea(
            child: Column(
              children: [
                Align(
                  alignment: Alignment.topRight,
                  child: Padding(
                    padding: const EdgeInsets.only(right: 16.0, top: 8.0),
                    child: TextButton(
                      onPressed: _navigateToDashboard,
                      child: Text(
                        'Skip',
                        style: AppTypography.bodyMd.copyWith(
                          color: AppColors.canvas.withOpacity(0.7),
                        ),
                      ),
                    ),
                  ),
                ),
                const Spacer(),
                Container(
                  height: MediaQuery.of(context).size.height * 0.35,
                  padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 300),
                        child: Text(
                          _onboardingData[_currentIndex]['title']!,
                          key: ValueKey<String>(_onboardingData[_currentIndex]['title']!),
                          textAlign: TextAlign.center,
                          style: AppTypography.displayLg.copyWith(
                            color: AppColors.canvas,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 300),
                        child: Text(
                          _onboardingData[_currentIndex]['subtitle']!,
                          key: ValueKey<String>(_onboardingData[_currentIndex]['subtitle']!),
                          textAlign: TextAlign.center,
                          style: AppTypography.titleMd.copyWith(
                            color: AppColors.canvas.withOpacity(0.7),
                          ),
                        ),
                      ),
                      const SizedBox(height: 40),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          SmoothPageIndicator(
                            controller: _pageController,
                            count: _onboardingData.length,
                            effect: ExpandingDotsEffect(
                              activeDotColor: AppColors.primary,
                              dotColor: AppColors.canvas.withOpacity(0.3),
                              dotHeight: 8,
                              dotWidth: 8,
                              expansionFactor: 3,
                            ),
                          ),
                          ElevatedButton(
                            onPressed: () {
                              if (_currentIndex == _onboardingData.length - 1) {
                                _navigateToDashboard();
                              } else {
                                _pageController.nextPage(
                                  duration: const Duration(milliseconds: 500),
                                  curve: Curves.easeInOut,
                                );
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: AppColors.ink,
                              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: AppRadius.pillAll,
                              ),
                            ),
                            child: AnimatedSwitcher(
                              duration: const Duration(milliseconds: 300),
                              child: Text(
                                _currentIndex == _onboardingData.length - 1 ? 'Get Started' : 'Next',
                                key: ValueKey<bool>(_currentIndex == _onboardingData.length - 1),
                                style: AppTypography.titleSm.copyWith(
                                  color: AppColors.ink,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
