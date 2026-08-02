import 'package:flutter/material.dart';
import 'package:mee_events/core/widgets/image/app_image.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';
import 'package:mee_events/shared/section_header.dart';
import 'package:mee_events/features/customer/models/service_category.dart';
import 'package:mee_events/features/customer/data/catalog.dart';
import 'category_detail_screen.dart';

class ExploreTab extends StatefulWidget {
  const ExploreTab({super.key});

  @override
  State<ExploreTab> createState() => _ExploreTabState();
}

class _ExploreTabState extends State<ExploreTab> {
  int _activeTab = 0;
  final PageController _pageController = PageController(viewportFraction: 0.85);

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Explore', style: AppTypography.displaySm),
                const SizedBox(height: AppSpacing.lg),
                Container(
                  padding: const EdgeInsets.all(AppSpacing.xs),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceSoft,
                    borderRadius: AppRadius.pillAll,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _activeTab = 0),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                            decoration: BoxDecoration(
                              color: _activeTab == 0 ? AppColors.primary : Colors.transparent,
                              borderRadius: AppRadius.pillAll,
                            ),
                            child: Center(
                              child: Text(
                                'Events',
                                style: AppTypography.titleSm.copyWith(
                                  color: _activeTab == 0 ? AppColors.canvas : AppColors.muted,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _activeTab = 1),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                            decoration: BoxDecoration(
                              color: _activeTab == 1 ? AppColors.primary : Colors.transparent,
                              borderRadius: AppRadius.pillAll,
                            ),
                            child: Center(
                              child: Text(
                                'Services',
                                style: AppTypography.titleSm.copyWith(
                                  color: _activeTab == 1 ? AppColors.canvas : AppColors.muted,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                SectionHeader(
                  eyebrow: 'SPOTLIGHT',
                  title: _activeTab == 0 ? 'Featured events' : 'Featured services',
                ),
                const SizedBox(height: AppSpacing.md),
                SizedBox(
                  height: 220,
                  child: PageView.builder(
                    controller: _pageController,
                    itemCount: _activeTab == 0 ? eventCategories.length : serviceCategories.length,
                    itemBuilder: (context, index) {
                      final eventItem = _activeTab == 0 ? eventCategories[index] : null;
                      final serviceItem = _activeTab == 1 ? serviceCategories[index] : null;

                      final bgUrl = eventItem?.imageUrl ??
                          serviceItem?.imageUrl ??
                          'https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=800&auto=format&fit=crop';

                      return AnimatedBuilder(
                        animation: _pageController,
                        builder: (context, child) {
                          double page = 0.0;
                          if (_pageController.position.haveDimensions) {
                            page = _pageController.page ?? 0.0;
                          } else {
                            page = index.toDouble();
                          }
                          final scale = 1.0 - (0.1 * (page - index).abs()).clamp(0.0, 1.0);
                          return Transform.scale(
                            scale: scale,
                            child: child,
                          );
                        },
                        child: GestureDetector(
                          onTap: () {
                            final catName = eventItem?.name ?? serviceItem!.name;
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => CategoryDetailScreen(category: catName),
                              ),
                            );
                          },
                          child: Container(
                            margin: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                            decoration: BoxDecoration(
                              borderRadius: AppRadius.cardAll,
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.primary.withValues(alpha: 0.15),
                                  blurRadius: 20,
                                  offset: const Offset(0, 10),
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: AppRadius.cardAll,
                              child: Stack(
                                children: [
                                  AppImage(
                                    imageUrl: bgUrl,
                                    fit: BoxFit.cover,
                                    width: double.infinity,
                                    height: double.infinity,
                                    placeholder: (context, url) => Container(color: AppColors.surfaceSoft),
                                  ),
                                  Container(
                                    decoration: BoxDecoration(
                                      gradient: LinearGradient(
                                        begin: Alignment.topCenter,
                                        end: Alignment.bottomCenter,
                                        colors: [
                                          Colors.transparent,
                                          AppColors.ink.withValues(alpha: 0.9),
                                        ],
                                        stops: const [0.3, 1.0],
                                      ),
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.all(AppSpacing.lg),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      mainAxisAlignment: MainAxisAlignment.end,
                                      children: [

                                        Text(
                                          eventItem?.name ?? serviceItem!.name,
                                          style: AppTypography.displaySm.copyWith(color: AppColors.canvas),
                                        ),
                                        const SizedBox(height: AppSpacing.xs),
                                        if (serviceItem != null)
                                          Text(
                                            'Starting at ₹${serviceItem.startingPrice}',
                                            style: AppTypography.bodyMd.copyWith(color: AppColors.goldAccent),
                                          ),
                                        if (eventItem != null)
                                          Text(
                                            'Explore ${eventItem.name.toLowerCase()} services',
                                            style: AppTypography.bodySm.copyWith(color: AppColors.surfaceSoft),
                                          ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl),
                SectionHeader(
                  eyebrow: 'ALL ${_activeTab == 0 ? "EVENTS" : "SERVICES"}',
                  title: 'Browse the complete catalog',
                ),
                const SizedBox(height: AppSpacing.md),
                GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    crossAxisSpacing: AppSpacing.sm,
                    mainAxisSpacing: AppSpacing.sm,
                    childAspectRatio: 0.9,
                  ),
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _activeTab == 0 ? eventCategories.length : serviceCategories.length,
                  itemBuilder: (context, index) {
                    final item = _activeTab == 0 ? eventCategories[index] : serviceCategories[index];
                    final catName = _activeTab == 0 ? (item as EventCategory).name : (item as ServiceCategory).name;
                    final catImageUrl = _activeTab == 0 ? (item as EventCategory).imageUrl : (item as ServiceCategory).imageUrl;
                    return GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => CategoryDetailScreen(category: catName),
                          ),
                        );
                      },
                      child: Column(
                        children: [
                          Container(
                            width: 58,
                            height: 58,
                            decoration: BoxDecoration(
                              color: AppColors.surfaceSoft,
                              shape: BoxShape.circle,
                              border: Border.all(color: AppColors.goldAccent.withValues(alpha: 0.4), width: 1.5),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.goldAccent.withValues(alpha: 0.15),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: ClipOval(
                              child: Stack(
                                children: [
                                  if (catImageUrl != null)
                                    AppImage(
                                      imageUrl: catImageUrl,
                                      width: 58,
                                      height: 58,
                                      fit: BoxFit.cover,
                                      placeholder: (context, url) => Container(color: AppColors.surfaceSoft),
                                    ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            catName,
                            style: AppTypography.captionSm,
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
