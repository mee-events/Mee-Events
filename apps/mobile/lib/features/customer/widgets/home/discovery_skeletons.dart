import 'package:flutter/material.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/customer/widgets/home/occasion_section.dart';
import 'package:mee_events/features/customer/widgets/home/popular_services_section.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Progressive loading placeholders that roughly match Home section layouts.
class HomeSectionSkeleton extends StatelessWidget {
  const HomeSectionSkeleton({
    super.key,
    this.height = 120,
    this.horizontal = true,
  });

  final double height;
  final bool horizontal;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const MeSkeleton(width: 160, height: 18),
          const SizedBox(height: AppSpacing.md),
          if (horizontal)
            SizedBox(
              height: height,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: 4,
                separatorBuilder: (_, _) =>
                    const SizedBox(width: AppSpacing.md),
                itemBuilder: (_, _) => MeSkeleton(
                  width: height * 0.85,
                  height: height,
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            )
          else
            MeSkeleton(
              width: double.infinity,
              height: height,
              borderRadius: BorderRadius.circular(12),
            ),
        ],
      ),
    );
  }
}

class HomeHeroSkeleton extends StatelessWidget {
  const HomeHeroSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      child: MeSkeleton(
        width: double.infinity,
        height: 224,
        borderRadius: AppRadius.lgAll,
      ),
    );
  }
}

class HomeOccasionRailSkeleton extends StatelessWidget {
  const HomeOccasionRailSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final cardWidth = OccasionSection.columnWidth(constraints.maxWidth);
        final imageSize = OccasionSection.tileImageSize(cardWidth);
        final tileHeight = imageSize + AppSpacing.xs + 32;
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const MeSkeleton(width: 180, height: 18),
              const SizedBox(height: AppSpacing.sm),
              SizedBox(
                height: tileHeight,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: 3,
                  separatorBuilder: (_, _) =>
                      const SizedBox(width: AppSpacing.md),
                  itemBuilder: (_, _) => Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      MeSkeleton(
                        width: cardWidth,
                        height: imageSize,
                        borderRadius: AppRadius.mdAll,
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      MeSkeleton(width: cardWidth * 0.7, height: 10),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class HomeServiceRailSkeleton extends StatelessWidget {
  const HomeServiceRailSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = EventServicesSection.cardWidth(constraints.maxWidth);
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const MeSkeleton(width: 140, height: 18),
              const SizedBox(height: AppSpacing.sm),
              SizedBox(
                height: EventServicesSection.imageHeight + 64,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: 3,
                  separatorBuilder: (_, _) =>
                      const SizedBox(width: AppSpacing.md),
                  itemBuilder: (_, _) => Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      MeSkeleton(
                        width: width,
                        height: EventServicesSection.imageHeight,
                        borderRadius: AppRadius.mdAll,
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      MeSkeleton(width: width * 0.7, height: 12),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class HomeSectionError extends StatelessWidget {
  const HomeSectionError({
    super.key,
    required this.title,
    required this.onRetry,
  });

  final String title;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.md,
        ),
        decoration: BoxDecoration(
          color: AppColors.surfaceCard,
          borderRadius: AppRadius.mdAll,
          border: Border.all(color: AppColors.hairlineSoft),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.bodySm.copyWith(color: AppColors.ink),
              ),
            ),
            Semantics(
              button: true,
              label: 'Retry',
              excludeSemantics: true,
              child: TextButton(
                onPressed: onRetry,
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  minimumSize: const Size(44, 44),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text('Retry'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class HomeResumeSkeleton extends StatelessWidget {
  const HomeResumeSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MeSkeleton(width: 200, height: 18),
          SizedBox(height: AppSpacing.sm),
          MeSkeleton(
            width: double.infinity,
            height: 64,
            borderRadius: AppRadius.mdAll,
          ),
        ],
      ),
    );
  }
}

class ExploreGridSkeleton extends StatelessWidget {
  const ExploreGridSkeleton({super.key, this.count = 8});

  final int count;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: count,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: AppSpacing.md,
        mainAxisSpacing: AppSpacing.md,
        childAspectRatio: 1.05,
      ),
      itemBuilder: (_, _) => const MeSkeleton(
        width: double.infinity,
        height: double.infinity,
        borderRadius: BorderRadius.all(Radius.circular(12)),
      ),
    );
  }
}
