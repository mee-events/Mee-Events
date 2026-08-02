import 'package:flutter/material.dart';
import 'package:mee_events/features/customer/models/service_category.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';
import 'package:mee_events/shared/glass_container.dart';

class ServiceDetailOverlay extends StatelessWidget {
  final ServiceCategory service;

  const ServiceDetailOverlay({Key? key, required this.service}) : super(key: key);

  static void show(BuildContext context, ServiceCategory service) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => ServiceDetailOverlay(service: service),
    );
  }

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 1.0, end: 0.0),
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        return Transform.translate(
          offset: Offset(0, value * MediaQuery.of(context).size.height * 0.5),
          child: child,
        );
      },
      child: GlassContainer(
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(AppRadius.xl),
          topRight: Radius.circular(AppRadius.xl),
        ),
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
        children: [
          Center(
            child: Text(
              service.emoji,
              style: const TextStyle(fontSize: 64),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Center(
            child: Text(
              service.name,
              style: AppTypography.displayMd,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Center(
            child: Text(
              'Starting at ₹${service.startingPrice} / ${service.priceUnit}',
              style: AppTypography.bodyMd.copyWith(color: AppColors.primary),
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
          Container(
            decoration: BoxDecoration(
              color: AppColors.mutedSoft,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('About this service', style: AppTypography.titleSm),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Professional ${service.name.toLowerCase()} services for your event in Hyderabad. Our verified partners ensure quality and timely delivery.',
                  style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.add),
              label: const Text('Add to Plan'),
              onPressed: () => Navigator.pop(context),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ),
        ],
      ),
      ),
    );
  }
}
