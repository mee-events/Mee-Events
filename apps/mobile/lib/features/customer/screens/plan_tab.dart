import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/screens/login_screen.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/catalog/catalog_image_resolver.dart';
import 'package:mee_events/features/customer/navigation/customer_tab.dart';
import 'package:mee_events/features/customer/plan/event_plan_provider.dart';
import 'package:mee_events/features/customer/plan/event_plan_store.dart';
import 'package:mee_events/features/customer/providers/explore_intent_provider.dart';
import 'package:mee_events/features/customer/screens/enquiry_checkout_screen.dart';
import 'package:mee_events/features/customer/screens/product_detail_screen.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_elevation.dart';
import 'package:mee_events/theme/app_icon_size.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Customer Plan Tab (UI-C04A) — dedicated Event Plan draft manager.
class PlanTab extends ConsumerWidget {
  const PlanTab({super.key, this.onNavigate});

  final ValueChanged<CustomerTab>? onNavigate;

  void _browse(BuildContext context, WidgetRef ref, {required int intent}) {
    ref.read(exploreIntentProvider.notifier).state = intent;
    onNavigate?.call(CustomerTab.explore);
  }

  void _openProduct(BuildContext context, EventPlanItem item) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ProductDetailScreen(
          code: item.productCode,
          title: item.displayName,
          serviceCode: item.serviceCode,
          imageUrl: item.coverImageUrl,
        ),
      ),
    );
  }

  Future<void> _confirmClear(BuildContext context, WidgetRef ref) async {
    final confirmed = await showMeConfirmDialog(
      context,
      title: 'Clear Event Plan?',
      message: 'This will remove all items from your plan.',
      confirmLabel: 'Clear plan',
      cancelLabel: 'Keep plan',
      destructive: true,
    );
    if (confirmed == true) {
      await ref.read(eventPlanProvider.notifier).clear();
    }
  }

  Future<void> _removeItem(WidgetRef ref, String productCode) async {
    await ref.read(eventPlanProvider.notifier).remove(productCode);
  }

  void _continueToEnquiry(BuildContext context, WidgetRef ref) {
    final session = ref.read(sessionProvider);
    final loggedIn = session != null;
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            loggedIn ? const EnquiryCheckoutScreen() : const LoginScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final planAsync = ref.watch(eventPlanProvider);

    if (planAsync.isLoading && !planAsync.hasValue) {
      return const Scaffold(
        backgroundColor: AppColors.canvas,
        body: _PlanSkeletonList(),
      );
    }

    if (planAsync.hasError && !planAsync.hasValue) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        body: MeErrorState(
          kind: MeErrorKind.generic,
          title: 'Event Plan unavailable',
          message: 'Please try again.',
          onRetry: () => ref.read(eventPlanProvider.notifier).refresh(),
        ),
      );
    }

    final items = planAsync.valueOrNull ?? const <EventPlanItem>[];

    if (items.isEmpty) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        body: _EmptyPlanView(
          onBrowseServices: () => _browse(context, ref, intent: 1),
          onBrowseOccasions: () => _browse(context, ref, intent: 0),
        ),
      );
    }

    final countLabel = items.length == 1
        ? '1 item in your plan'
        : '${items.length} items in your plan';

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.lg,
                AppSpacing.lg,
                AppSpacing.lg,
                AppSpacing.xl,
              ),
              children: [
                Text('Event Plan', style: AppTypography.displaySm),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  countLabel,
                  style: AppTypography.bodySm.copyWith(color: AppColors.muted),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'Review your selected options and continue to enquiry when you\'re ready.',
                  style: AppTypography.captionSm.copyWith(
                    color: AppColors.muted,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                for (final item in items) ...[
                  _PlanItemCard(
                    item: item,
                    onOpen: () => _openProduct(context, item),
                    onRemove: (code) => _removeItem(ref, code),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                ],
                const SizedBox(height: AppSpacing.md),
                OutlinedButton.icon(
                  onPressed: () => _browse(context, ref, intent: 1),
                  icon: const Icon(Icons.add_rounded, size: AppIconSize.md),
                  label: const Text(
                    'Add more services',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md,
                      vertical: AppSpacing.md,
                    ),
                    shape: const RoundedRectangleBorder(
                      borderRadius: AppRadius.mdAll,
                    ),
                    textStyle: AppTypography.titleSm,
                    minimumSize: const Size.fromHeight(44),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Center(
                  child: MeButton.text(
                    label: 'Clear plan',
                    onPressed: () => _confirmClear(context, ref),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
              ],
            ),
          ),
          _PlanStickyBar(
            itemCount: items.length,
            onContinue: () => _continueToEnquiry(context, ref),
          ),
        ],
      ),
    );
  }
}

class _PlanItemCard extends StatelessWidget {
  const _PlanItemCard({
    required this.item,
    required this.onOpen,
    required this.onRemove,
  });

  final EventPlanItem item;
  final VoidCallback onOpen;
  final ValueChanged<String> onRemove;

  @override
  Widget build(BuildContext context) {
    return MeSurfaceCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              button: true,
              enabled: true,
              label: item.displayName,
              onTap: onOpen,
              excludeSemantics: true,
              child: InkWell(
                onTap: onOpen,
                borderRadius: AppRadius.mdAll,
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: AppRadius.mdAll,
                      child: SizedBox(
                        width: 56,
                        height: 56,
                        child: HomeCatalogVisual(
                          imageUrl: item.coverImageUrl,
                          label: item.displayName,
                          borderRadius: AppRadius.mdAll,
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Text(
                        item.displayName,
                        style: AppTypography.titleSm,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Semantics(
            button: true,
            enabled: true,
            label: 'Remove ${item.displayName} from Event Plan',
            onTap: () => onRemove(item.productCode),
            excludeSemantics: true,
            child: MeIconButton(
              icon: Icons.close_rounded,
              color: AppColors.muted,
              tooltip: 'Remove ${item.displayName} from Event Plan',
              onPressed: () => onRemove(item.productCode),
            ),
          ),
        ],
      ),
    );
  }
}

class _PlanStickyBar extends StatelessWidget {
  const _PlanStickyBar({required this.itemCount, required this.onContinue});

  final int itemCount;
  final VoidCallback onContinue;

  static const ctaKey = Key('plan-continue-cta');

  @override
  Widget build(BuildContext context) {
    final countLabel = itemCount == 1 ? '1 item' : '$itemCount items';
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        border: const Border(top: BorderSide(color: AppColors.hairlineSoft)),
        boxShadow: AppElevation.mediumShadow,
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              flex: 4,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Event Plan draft',
                    style: AppTypography.captionSm.copyWith(
                      color: AppColors.muted,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    countLabel,
                    style: AppTypography.titleSm.copyWith(
                      color: AppColors.ink,
                      fontWeight: FontWeight.w700,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              flex: 6,
              child: Semantics(
                button: true,
                label: 'Continue to enquiry',
                excludeSemantics: true,
                child: Material(
                  key: ctaKey,
                  color: AppColors.primary,
                  borderRadius: AppRadius.pillAll,
                  child: InkWell(
                    onTap: onContinue,
                    borderRadius: AppRadius.pillAll,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(
                        minHeight: 44,
                        minWidth: 44,
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.sm,
                          vertical: AppSpacing.sm,
                        ),
                        child: Center(
                          child: Text(
                            'Continue to enquiry',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                            style: AppTypography.titleSm.copyWith(
                              color: AppColors.onPrimary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyPlanView extends StatelessWidget {
  const _EmptyPlanView({
    required this.onBrowseServices,
    required this.onBrowseOccasions,
  });

  final VoidCallback onBrowseServices;
  final VoidCallback onBrowseOccasions;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.assignment_outlined,
              size: AppIconSize.hero,
              color: AppColors.mutedSoft,
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Your Event Plan is empty',
              style: AppTypography.titleLg,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Browse services and add options to your plan before sending a single enquiry.',
              style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xxl),
            ConstrainedBox(
              constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
              child: MeButton.primary(
                label: 'Browse services',
                onPressed: onBrowseServices,
                expand: true,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            ConstrainedBox(
              constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
              child: MeButton.outline(
                label: 'Browse occasions',
                onPressed: onBrowseOccasions,
                expand: true,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PlanSkeletonList extends StatelessWidget {
  const _PlanSkeletonList();

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        const MeSkeleton(width: 140, height: 28),
        const SizedBox(height: AppSpacing.xs),
        const MeSkeleton(width: 100, height: 16),
        const SizedBox(height: AppSpacing.xl),
        for (var i = 0; i < 4; i++) ...[
          const MeSkeleton(
            width: double.infinity,
            height: 72,
            borderRadius: AppRadius.cardAll,
          ),
          if (i < 3) const SizedBox(height: AppSpacing.sm),
        ],
      ],
    );
  }
}
