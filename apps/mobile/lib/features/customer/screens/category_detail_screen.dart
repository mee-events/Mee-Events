import 'package:flutter/material.dart';
import 'package:mee_events/core/widgets/image/app_image.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';
import 'package:mee_events/core/models/service_package.dart';
import 'package:mee_events/core/providers/service_provider.dart';
import 'package:mee_events/core/providers/quote_provider.dart';

class CategoryDetailScreen extends ConsumerWidget {
  final String category;

  const CategoryDetailScreen({super.key, required this.category});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final packagesAsync = ref.watch(packagesByCategoryProvider(category));

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        backgroundColor: AppColors.canvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.ink),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('$category Packages', style: AppTypography.displaySm),
        centerTitle: false,
      ),
      body: packagesAsync.when(
        data: (packages) => packages.isEmpty
            ? _buildEmptyState()
            : ListView.builder(
                padding: const EdgeInsets.all(AppSpacing.lg),
                itemCount: packages.length,
                itemBuilder: (context, index) {
                  return _buildPackageCard(context, ref, packages[index]);
                },
              ),
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
        error: (err, stack) => Center(
          child: Text('Error loading $category packages', style: AppTypography.titleMd),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.inventory_2_outlined, size: 64, color: AppColors.muted),
          const SizedBox(height: AppSpacing.md),
          Text('No $category packages found', style: AppTypography.titleMd),
          const SizedBox(height: AppSpacing.xs),
          Text('Check back soon for new royal listings.', style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
        ],
      ),
    );
  }

  Widget _buildPackageCard(BuildContext context, WidgetRef ref, ServicePackage package) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: AppRadius.cardAll,
        border: Border.all(color: AppColors.hairlineSoft),
        boxShadow: [
          BoxShadow(
            color: AppColors.scrim.withValues(alpha: 0.05),
            offset: const Offset(0, 8),
            blurRadius: 16,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image Header
          ClipRRect(
            borderRadius: AppRadius.topCard,
            child: AspectRatio(
              aspectRatio: 16 / 9,
              child: Stack(
                children: [
                  AppImage(
                    imageUrl: package.imagePath,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(color: AppColors.surfaceSoft),
                    errorWidget: (context, url, error) => Container(
                      color: AppColors.surfaceStrong,
                      child: const Icon(Icons.image_not_supported, color: AppColors.muted),
                    ),
                  ),
                  Positioned(
                    top: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: AppRadius.smAll,
                      ),
                      child: Text(
                        package.category.toUpperCase(),
                        style: AppTypography.captionSm.copyWith(color: AppColors.goldAccent, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Content
          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(package.title, style: AppTypography.displaySm),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          package.formattedPrice,
                          style: AppTypography.titleMd.copyWith(color: AppColors.primary, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          package.priceUnit,
                          style: AppTypography.captionSm.copyWith(color: AppColors.muted),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Text('By ${package.providerName}', style: AppTypography.bodySm.copyWith(color: AppColors.muted)),
                const SizedBox(height: AppSpacing.md),

                // Description
                Text(package.description, style: AppTypography.bodyMd),
                const SizedBox(height: AppSpacing.md),

                // Highlights
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: package.highlights.map((h) {
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceSoft,
                        borderRadius: AppRadius.pillAll,
                        border: Border.all(color: AppColors.hairlineSoft),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.check_circle, size: 12, color: AppColors.goldAccent),
                          const SizedBox(width: 4),
                          Text(h, style: AppTypography.captionSm),
                        ],
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: AppSpacing.lg),
                const Divider(color: AppColors.hairlineSoft, height: 1),
                const SizedBox(height: AppSpacing.md),

                // Footer Row & CTA
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.star, size: 16, color: AppColors.goldAccent),
                        const SizedBox(width: 4),
                        Text(package.rating.toStringAsFixed(2), style: AppTypography.titleSm),
                        const SizedBox(width: 4),
                        Text('(${package.reviewCount})', style: AppTypography.captionSm.copyWith(color: AppColors.muted)),
                      ],
                    ),
                    ElevatedButton(
                      onPressed: () {
                        ref.read(quoteProvider.notifier).addInquiry(package.title, package.providerName);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Quote request sent to ${package.providerName}! Check Enquiries tab.'),
                            backgroundColor: AppColors.primary,
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: AppColors.canvas,
                        shape: const RoundedRectangleBorder(borderRadius: AppRadius.smAll),
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      ),
                      child: Text('Request Quote', style: AppTypography.buttonSm),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
