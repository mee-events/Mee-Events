import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/customer/favorites/favorites_provider.dart';
import 'package:mee_events/features/customer/favorites/favorites_store.dart';
import 'package:mee_events/features/customer/navigation/customer_tab.dart';
import 'package:mee_events/features/customer/providers/explore_intent_provider.dart';
import 'package:mee_events/features/customer/screens/category_detail_screen.dart';
import 'package:mee_events/features/customer/screens/product_detail_screen.dart';
import 'package:mee_events/features/customer/screens/service_detail_screen.dart';
import 'package:mee_events/features/customer/widgets/favorites/favorite_card.dart';
import 'package:mee_events/features/customer/widgets/favorites/favorites_filter_bar.dart';
import 'package:mee_events/features/customer/widgets/favorites/favorites_skeleton_list.dart';
import 'package:mee_events/features/customer/widgets/favorites/saved_filter.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class FavoritesScreen extends ConsumerStatefulWidget {
  const FavoritesScreen({super.key, this.onNavigateTab});

  /// Switch the customer shell to a destination after pop (empty-state CTA).
  final ValueChanged<CustomerTab>? onNavigateTab;

  @override
  ConsumerState<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends ConsumerState<FavoritesScreen> {
  SavedFilter _filter = SavedFilter.all;

  void _browse(int exploreIntent) {
    ref.read(exploreIntentProvider.notifier).state = exploreIntent;
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
    widget.onNavigateTab?.call(CustomerTab.explore);
  }

  Future<void> _remove(FavoriteItem item) async {
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    final ok = await ref.read(favoritesProvider.notifier).remove(item);
    if (!mounted) return;
    if (!ok) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Couldn’t update Saved. Try again.')),
      );
      return;
    }
    messenger.showSnackBar(
      SnackBar(
        content: Text('Removed ${item.title}'),
        action: SnackBarAction(
          label: 'Undo',
          onPressed: () {
            unawaited(
              ref.read(favoritesProvider.notifier).restore(item).then((ok) {
                if (!ok && mounted) {
                  messenger.showSnackBar(
                    const SnackBar(
                      content: Text('Couldn’t update Saved. Try again.'),
                    ),
                  );
                }
              }),
            );
          },
        ),
      ),
    );
  }

  void _open(FavoriteItem item) {
    switch (item.kind) {
      case FavoriteKind.occasion:
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => CategoryDetailScreen(
              code: item.code,
              title: item.title,
              isOccasion: true,
            ),
          ),
        );
      case FavoriteKind.category:
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => CategoryDetailScreen(
              code: item.code,
              title: item.title,
              isOccasion: false,
            ),
          ),
        );
      case FavoriteKind.service:
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => ServiceDetailScreen(
              code: item.code,
              title: item.title,
              departmentCode: item.departmentCode,
              imageUrl: item.imageUrl,
            ),
          ),
        );
      case FavoriteKind.product:
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => ProductDetailScreen(
              code: item.code,
              title: item.title,
              serviceCode: item.departmentCode,
              imageUrl: item.imageUrl,
            ),
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final favoritesAsync = ref.watch(favoritesProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: MeAppBar(
        title: 'Saved',
        leading: MeIconButton(
          icon: Icons.arrow_back_rounded,
          color: AppColors.ink,
          onPressed: () => Navigator.pop(context),
          tooltip: 'Back',
        ),
      ),
      body: favoritesAsync.when(
        skipLoadingOnReload: true,
        skipLoadingOnRefresh: true,
        loading: () => const FavoritesSkeletonList(),
        error: (_, _) => MeErrorState(
          kind: MeErrorKind.generic,
          title: 'Saved unavailable',
          message: 'Please try again.',
          onRetry: () => ref.read(favoritesProvider.notifier).refresh(),
        ),
        data: (items) {
          if (items.isEmpty) {
            return _GlobalEmpty(
              onBrowseOccasions: () => _browse(0),
              onBrowseServices: () => _browse(1),
            );
          }
          final visible = applySavedFilter(items, _filter);
          return ListView(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.md,
              AppSpacing.lg,
              AppSpacing.xxxl,
            ),
            children: [
              Semantics(
                header: true,
                child: Text('Your saved ideas', style: AppTypography.titleMd),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                '${items.length} saved',
                style: AppTypography.captionSm.copyWith(color: AppColors.muted),
              ),
              const SizedBox(height: AppSpacing.lg),
              FavoritesFilterBar(
                selected: _filter,
                onSelected: (filter) => setState(() => _filter = filter),
              ),
              const SizedBox(height: AppSpacing.lg),
              if (visible.isEmpty)
                _FilteredEmpty(
                  filter: _filter,
                  onShowAll: () => setState(() => _filter = SavedFilter.all),
                )
              else
                for (final item in visible) ...[
                  FavoriteCard(
                    item: item,
                    onOpen: () => _open(item),
                    onRemove: () => _remove(item),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                ],
            ],
          );
        },
      ),
    );
  }
}

class _GlobalEmpty extends StatelessWidget {
  const _GlobalEmpty({
    required this.onBrowseOccasions,
    required this.onBrowseServices,
  });

  final VoidCallback onBrowseOccasions;
  final VoidCallback onBrowseServices;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Column(
        children: [
          const SizedBox(height: AppSpacing.xxl),
          Icon(
            Icons.favorite_border_rounded,
            size: 56,
            color: AppColors.mutedSoft,
          ),
          const SizedBox(height: AppSpacing.lg),
          Text('Nothing saved yet', style: AppTypography.titleLg),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Tap the heart on occasions, services and options to keep ideas here.',
            style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.xxl),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: onBrowseOccasions,
              child: const Text(
                'Browse occasions',
                textAlign: TextAlign.center,
                maxLines: 2,
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: onBrowseServices,
              child: const Text(
                'Browse services',
                textAlign: TextAlign.center,
                maxLines: 2,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FilteredEmpty extends StatelessWidget {
  const _FilteredEmpty({required this.filter, required this.onShowAll});

  final SavedFilter filter;
  final VoidCallback onShowAll;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: AppSpacing.xl),
        Text(
          filter.emptyTitle,
          style: AppTypography.titleMd,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: AppSpacing.lg),
        ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44),
          child: OutlinedButton(
            onPressed: onShowAll,
            child: const Text('Show all'),
          ),
        ),
      ],
    );
  }
}
