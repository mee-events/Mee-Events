import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/core/providers/catalog_provider.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/customer/catalog/catalog_image_resolver.dart';
import 'package:mee_events/features/customer/navigation/customer_tab.dart';
import 'package:mee_events/features/customer/providers/explore_intent_provider.dart';
import 'package:mee_events/features/customer/screens/category_detail_screen.dart';
import 'package:mee_events/features/customer/screens/service_detail_screen.dart';
import 'package:mee_events/features/customer/search/customer_search_screen.dart';
import 'package:mee_events/features/customer/widgets/explore/explore_cards.dart';
import 'package:mee_events/features/customer/widgets/home/home_search_bar.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/models/catalog_service.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

List<CatalogItem> visibleExploreOccasions(List<CatalogItem> items) {
  final visible = [
    for (final item in items)
      if (!item.isServiceEntry) item,
  ];
  visible.sort((a, b) {
    final order = a.displayOrder.compareTo(b.displayOrder);
    if (order != 0) return order;
    return a.code.compareTo(b.code);
  });
  return visible;
}

List<CatalogService> orderedExploreServices(List<CatalogService> items) {
  final next = [...items];
  next.sort((a, b) {
    final order = a.displayOrder.compareTo(b.displayOrder);
    if (order != 0) return order;
    return a.code.compareTo(b.code);
  });
  return next;
}

String exploreResultCountLabel({required bool occasions, required int count}) {
  if (occasions) {
    return count == 1 ? '1 occasion' : '$count occasions';
  }
  return count == 1 ? '1 service' : '$count services';
}

/// Explore — complete discovery engine (Occasions | Services).
class ExploreTab extends ConsumerStatefulWidget {
  const ExploreTab({super.key, this.onNavigate});

  final ValueChanged<CustomerTab>? onNavigate;

  @override
  ConsumerState<ExploreTab> createState() => _ExploreTabState();
}

class _ExploreTabState extends ConsumerState<ExploreTab> {
  void _openSearch() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CustomerSearchScreen(onNavigateTab: widget.onNavigate),
      ),
    );
  }

  void _openOccasion(CatalogItem item) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CategoryDetailScreen(
          code: item.code,
          title: item.displayName,
          isOccasion: true,
        ),
      ),
    );
  }

  void _openService(CatalogService service) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ServiceDetailScreen(
          code: service.code,
          title: service.displayName,
          imageUrl: CatalogImageResolver.resolvedServiceImage(
            coverImageUrl: service.coverImageUrl,
            iconUrl: service.iconUrl,
          ),
        ),
      ),
    );
  }

  Future<void> _handleRefresh() async {
    ref.invalidate(eventTypesProvider);
    ref.invalidate(catalogServicesProvider(null));
    final occasionsFuture = ref.read(eventTypesProvider.future);
    final servicesFuture = ref.read(catalogServicesProvider(null).future);
    if (!mounted) return;
    // Settle both started futures. Provider failures stay on AsyncError;
    // RefreshIndicator must complete normally.
    await Future.wait<void>([
      _settleRefreshFuture(occasionsFuture),
      _settleRefreshFuture(servicesFuture),
    ]);
  }

  Future<void> _settleRefreshFuture(Future<void> future) {
    return future.then<void>((_) {}, onError: (_) {});
  }

  @override
  Widget build(BuildContext context) {
    final intent = ref.watch(exploreIntentProvider).clamp(0, 1);
    final eventTypesAsync = ref.watch(eventTypesProvider);
    final servicesAsync = ref.watch(catalogServicesProvider(null));
    final browsingOccasions = intent == 0;
    final occasions = visibleExploreOccasions(
      eventTypesAsync.valueOrNull ?? const [],
    );
    final services = orderedExploreServices(
      servicesAsync.valueOrNull ?? const [],
    );
    final count = browsingOccasions
        ? (eventTypesAsync.hasValue ? occasions.length : null)
        : (servicesAsync.hasValue ? services.length : null);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        top: false,
        child: RefreshIndicator(
          onRefresh: _handleRefresh,
          color: AppColors.primary,
          backgroundColor: AppColors.canvas,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(
              parent: BouncingScrollPhysics(),
            ),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.xl,
                  AppSpacing.sm,
                  AppSpacing.xl,
                  0,
                ),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    Text('Explore', style: AppTypography.displayMd),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      browsingOccasions
                          ? 'Find the right celebration to start planning.'
                          : 'Browse Mee Events offerings for your celebration.',
                      style: AppTypography.bodySm.copyWith(
                        color: AppColors.muted,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    HomeSearchBar(
                      onTap: _openSearch,
                      padded: false,
                      semanticLabel: 'Search occasions, services and options',
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    ConstrainedBox(
                      constraints: const BoxConstraints(minHeight: 44),
                      child: MeSegmentedControl(
                        labels: const ['Occasions', 'Services'],
                        index: intent,
                        onChanged: (i) {
                          ref.read(exploreIntentProvider.notifier).state = i;
                        },
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    if (count != null)
                      Semantics(
                        label: exploreResultCountLabel(
                          occasions: browsingOccasions,
                          count: count,
                        ),
                        excludeSemantics: true,
                        child: Text(
                          exploreResultCountLabel(
                            occasions: browsingOccasions,
                            count: count,
                          ),
                          style: AppTypography.captionSm.copyWith(
                            color: AppColors.muted,
                          ),
                        ),
                      ),
                    const SizedBox(height: AppSpacing.lg),
                  ]),
                ),
              ),
              if (browsingOccasions)
                ..._occasionSlivers(eventTypesAsync, occasions)
              else
                ..._serviceSlivers(servicesAsync, services),
              const SliverToBoxAdapter(child: SizedBox(height: 96)),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _occasionSlivers(
    AsyncValue<List<CatalogItem>> async,
    List<CatalogItem> occasions,
  ) {
    if (async.isLoading && !async.hasValue) {
      return [
        const SliverPadding(
          padding: EdgeInsets.symmetric(horizontal: AppSpacing.xl),
          sliver: SliverToBoxAdapter(child: ExploreOccasionGridSkeleton()),
        ),
      ];
    }
    if (async.hasError && !async.hasValue) {
      return [
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
          sliver: SliverToBoxAdapter(
            child: MeErrorState(
              kind: MeErrorKind.generic,
              title: 'Occasions unavailable',
              message: 'Please try again.',
              onRetry: () => ref.invalidate(eventTypesProvider),
            ),
          ),
        ),
      ];
    }
    if (occasions.isEmpty) {
      return [
        const SliverPadding(
          padding: EdgeInsets.symmetric(horizontal: AppSpacing.xl),
          sliver: SliverToBoxAdapter(
            child: MeEmptyState(
              kind: MeEmptyKind.generic,
              title: 'No occasions available',
              message: 'There are no event occasions to browse right now.',
            ),
          ),
        ),
      ];
    }
    return [
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
        sliver: SliverGrid(
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: AppSpacing.md,
            mainAxisSpacing: AppSpacing.md,
            childAspectRatio: 0.78,
          ),
          delegate: SliverChildBuilderDelegate((context, index) {
            final item = occasions[index];
            return ExploreOccasionCard(
              code: item.code,
              title: item.displayName,
              coverImageUrl: item.coverImageUrl,
              thumbnailUrl: item.thumbnailUrl,
              onTap: () => _openOccasion(item),
            );
          }, childCount: occasions.length),
        ),
      ),
    ];
  }

  List<Widget> _serviceSlivers(
    AsyncValue<List<CatalogService>> async,
    List<CatalogService> services,
  ) {
    if (async.isLoading && !async.hasValue) {
      return [
        const SliverPadding(
          padding: EdgeInsets.symmetric(horizontal: AppSpacing.xl),
          sliver: SliverToBoxAdapter(child: ExploreServiceListSkeleton()),
        ),
      ];
    }
    if (async.hasError && !async.hasValue) {
      return [
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
          sliver: SliverToBoxAdapter(
            child: MeErrorState(
              kind: MeErrorKind.generic,
              title: 'Services unavailable',
              message: 'Please try again.',
              onRetry: () => ref.invalidate(catalogServicesProvider(null)),
            ),
          ),
        ),
      ];
    }
    if (services.isEmpty) {
      return [
        const SliverPadding(
          padding: EdgeInsets.symmetric(horizontal: AppSpacing.xl),
          sliver: SliverToBoxAdapter(
            child: MeEmptyState(
              kind: MeEmptyKind.generic,
              title: 'No services available',
              message: 'There are no services to browse right now.',
            ),
          ),
        ),
      ];
    }
    return [
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
        sliver: SliverList(
          delegate: SliverChildBuilderDelegate((context, index) {
            final service = services[index];
            return Padding(
              padding: EdgeInsets.only(
                bottom: index == services.length - 1 ? 0 : AppSpacing.sm,
              ),
              child: ExploreServiceCard(
                title: service.displayName,
                coverImageUrl: service.coverImageUrl,
                iconUrl: service.iconUrl,
                onTap: () => _openService(service),
              ),
            );
          }, childCount: services.length),
        ),
      ),
    ];
  }
}
