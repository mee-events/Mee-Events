import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/core/providers/catalog_provider.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/customer/catalog/catalog_image_resolver.dart';
import 'package:mee_events/features/customer/catalog/customer_catalog_copy.dart';
import 'package:mee_events/features/customer/favorites/favorites_provider.dart';
import 'package:mee_events/features/customer/favorites/favorites_store.dart';
import 'package:mee_events/features/customer/plan/event_plan_provider.dart';
import 'package:mee_events/features/customer/plan/event_plan_store.dart';
import 'package:mee_events/features/customer/screens/enquiry_checkout_screen.dart';
import 'package:mee_events/features/customer/screens/product_detail_screen.dart';
import 'package:mee_events/features/customer/search/customer_search_screen.dart';
import 'package:mee_events/features/customer/widgets/service_detail/service_product_card.dart';
import 'package:mee_events/features/customer/widgets/service_detail/service_subcategory_chips.dart';
import 'package:mee_events/features/customer/widgets/sticky_enquiry_bar.dart';
import 'package:mee_events/models/catalog_product.dart';
import 'package:mee_events/models/catalog_service.dart';
import 'package:mee_events/models/catalog_subcategory.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Granular catalog service destination (not a department dump).
class ServiceDetailScreen extends ConsumerStatefulWidget {
  const ServiceDetailScreen({
    super.key,
    required this.code,
    required this.title,
    this.departmentCode,
    this.imageUrl,
    this.occasionCode,
    this.occasionTitle,
  });

  final String code;
  final String title;
  final String? departmentCode;
  final String? imageUrl;
  final String? occasionCode;
  final String? occasionTitle;

  @override
  ConsumerState<ServiceDetailScreen> createState() =>
      _ServiceDetailScreenState();
}

class _ServiceDetailScreenState extends ConsumerState<ServiceDetailScreen> {
  String? _selectedSubcategoryCode;

  Future<void> _handleRefresh() async {
    final service = catalogServiceProvider(widget.code);
    final subcategories = serviceSubcategoriesProvider(widget.code);
    final products = serviceProductsProvider(widget.code);

    ref.invalidate(service);
    ref.invalidate(subcategories);
    ref.invalidate(products);

    final serviceFuture = ref.read(service.future);
    final subcategoriesFuture = ref.read(subcategories.future);
    final productsFuture = ref.read(products.future);

    if (!mounted) return;

    // Settle every started future. Provider failures stay on AsyncError;
    // RefreshIndicator must complete normally so a real fling does not
    // become an unhandled asynchronous exception.
    await Future.wait<void>([
      _settleRefreshFuture(serviceFuture),
      _settleRefreshFuture(subcategoriesFuture),
      _settleRefreshFuture(productsFuture),
    ]);
  }

  Future<void> _settleRefreshFuture(Future<void> future) {
    return future.then<void>((_) {}, onError: (_) {});
  }

  void _openSearch() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const CustomerSearchScreen()),
    );
  }

  void _openProduct(CatalogProduct product) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ProductDetailScreen(
          code: product.code,
          title: product.displayName,
          serviceCode: product.serviceCode,
          imageUrl: product.coverImageUrl,
          occasionCode: widget.occasionCode,
          occasionTitle: widget.occasionTitle,
        ),
      ),
    );
  }

  void _addToPlan(CatalogProduct product) {
    if (!product.addToPlanAllowed || product.restricted) return;
    ref
        .read(eventPlanProvider.notifier)
        .add(
          EventPlanItem(
            productCode: product.code,
            displayName: product.displayName,
            serviceCode: product.serviceCode,
            coverImageUrl: product.coverImageUrl,
            restricted: product.restricted,
          ),
        );
  }

  void _removeFromPlan(CatalogProduct product) {
    ref.read(eventPlanProvider.notifier).remove(product.code);
  }

  void _toggleFavorite(CatalogService service) {
    final imageUrl = CatalogImageResolver.resolvedServiceImage(
      coverImageUrl: service.coverImageUrl,
      iconUrl: service.iconUrl,
    );
    ref
        .read(favoritesProvider.notifier)
        .toggle(
          FavoriteItem(
            kind: FavoriteKind.service,
            code: service.code,
            title: service.displayName,
            imageUrl: imageUrl,
            departmentCode: service.departmentCode,
          ),
        );
  }

  void _openCheckout(CatalogService service) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => EnquiryCheckoutScreen(
          initialEventTypeCode: widget.occasionCode,
          initialServiceCategoryCodes: [service.departmentCode],
          contextNotes: 'Interested in ${service.displayName}',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final serviceAsync = ref.watch(catalogServiceProvider(widget.code));
    final subcategoriesAsync = ref.watch(
      serviceSubcategoriesProvider(widget.code),
    );
    final productsAsync = ref.watch(serviceProductsProvider(widget.code));
    final planAsync = ref.watch(eventPlanProvider);

    ref.listen<AsyncValue<List<CatalogSubcategory>>>(
      serviceSubcategoriesProvider(widget.code),
      (previous, next) {
        _reconcileSubcategorySelection(next);
      },
    );

    final servicePending = serviceAsync.isLoading && !serviceAsync.hasValue;
    final serviceFailed = serviceAsync.hasError && !serviceAsync.hasValue;
    final service = serviceAsync.valueOrNull;
    final planPending = planAsync.isLoading && !planAsync.hasValue;
    final planFailed = planAsync.hasError && !planAsync.hasValue;
    final planItems = planAsync.valueOrNull;

    final saved = service != null
        ? ref
              .watch(favoritesProvider)
              .maybeWhen(
                data: (items) => items.any(
                  (e) =>
                      e.kind == FavoriteKind.service && e.code == service.code,
                ),
                orElse: () => false,
              )
        : false;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: MeAppBar(
        title: '',
        leading: MeIconButton(
          icon: Icons.arrow_back_rounded,
          color: AppColors.ink,
          onPressed: () => Navigator.pop(context),
          tooltip: 'Back',
        ),
        actions: [
          MeIconButton(
            icon: Icons.search_rounded,
            color: AppColors.ink,
            onPressed: _openSearch,
            tooltip: 'Search',
          ),
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.sm),
            child: SizedBox(
              width: 44,
              height: 44,
              child: Semantics(
                button: true,
                enabled: service != null,
                label: saved ? 'Remove from favorites' : 'Save to favorites',
                excludeSemantics: true,
                child: MeFavoriteButton(
                  active: saved,
                  size: 44,
                  onPressed: service == null
                      ? null
                      : () => _toggleFavorite(service),
                ),
              ),
            ),
          ),
        ],
      ),
      body: servicePending
          ? const _ServiceDetailSkeleton()
          : serviceFailed
          ? MeErrorState(
              kind: MeErrorKind.generic,
              title: 'Unable to load this service',
              message: 'Please try again.',
              onRetry: () =>
                  ref.invalidate(catalogServiceProvider(widget.code)),
            )
          : service == null
          ? MeErrorState(
              kind: MeErrorKind.generic,
              title: 'Unable to load this service',
              onRetry: () =>
                  ref.invalidate(catalogServiceProvider(widget.code)),
            )
          : Column(
              children: [
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _handleRefresh,
                    color: AppColors.primary,
                    backgroundColor: AppColors.canvas,
                    child: CustomScrollView(
                      physics: const AlwaysScrollableScrollPhysics(
                        parent: BouncingScrollPhysics(),
                      ),
                      slivers: [
                        SliverToBoxAdapter(
                          child: _ServiceHeader(
                            service: service,
                            occasionTitle: widget.occasionTitle,
                          ),
                        ),
                        ..._productSlivers(
                          service: service,
                          subcategoriesAsync: subcategoriesAsync,
                          productsAsync: productsAsync,
                          planItems: planItems,
                          planLocked: planPending || planFailed,
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 24)),
                      ],
                    ),
                  ),
                ),
                StickyEnquiryBar(
                  label: planPending
                      ? 'Checking Event Plan…'
                      : planFailed
                      ? 'Retry Event Plan'
                      : servicePlanCtaLabel(planItems?.length ?? 0),
                  semanticLabel: planPending
                      ? 'Checking Event Plan…'
                      : planFailed
                      ? 'Retry Event Plan'
                      : servicePlanCtaLabel(planItems?.length ?? 0),
                  onPressed: planPending
                      ? null
                      : planFailed
                      ? () {
                          ref.read(eventPlanProvider.notifier).refresh();
                        }
                      : () => _openCheckout(service),
                ),
              ],
            ),
    );
  }

  void _reconcileSubcategorySelection(
    AsyncValue<List<CatalogSubcategory>> next,
  ) {
    final selected = _selectedSubcategoryCode;
    if (selected == null) return;
    if (next.hasError && !next.hasValue) {
      if (!mounted) return;
      setState(() => _selectedSubcategoryCode = null);
      return;
    }
    final visible = ServiceSubcategoryChips.visible(
      next.valueOrNull ?? const [],
    );
    if (visible.any((item) => item.code == selected)) return;
    if (!mounted) return;
    setState(() => _selectedSubcategoryCode = null);
  }

  List<Widget> _productSlivers({
    required CatalogService service,
    required AsyncValue<List<CatalogSubcategory>> subcategoriesAsync,
    required AsyncValue<List<CatalogProduct>> productsAsync,
    required List<EventPlanItem>? planItems,
    required bool planLocked,
  }) {
    final productsPending = productsAsync.isLoading && !productsAsync.hasValue;
    final productsFailed = productsAsync.hasError && !productsAsync.hasValue;
    final products = filterServiceProducts(
      productsAsync.valueOrNull ?? const [],
      _selectedSubcategoryCode,
    );
    final subcategoryNames = {
      for (final item in subcategoriesAsync.valueOrNull ?? const [])
        item.code: item.displayName,
    };

    return [
      if (!subcategoriesAsync.hasError || subcategoriesAsync.hasValue)
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.only(top: AppSpacing.lg),
            child: ServiceSubcategoryChips(
              subcategories: subcategoriesAsync.valueOrNull ?? const [],
              selectedCode: _selectedSubcategoryCode,
              onSelected: (code) =>
                  setState(() => _selectedSubcategoryCode = code),
            ),
          ),
        ),
      SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.xl,
            AppSpacing.lg,
            AppSpacing.xl,
            AppSpacing.md,
          ),
          child: Text('Options', style: AppTypography.titleMd),
        ),
      ),
      if (productsPending)
        const SliverToBoxAdapter(child: _ProductListSkeleton())
      else if (productsFailed)
        SliverToBoxAdapter(
          child: _SectionMessage(
            title: 'Options unavailable',
            onRetry: () => ref.invalidate(serviceProductsProvider(widget.code)),
          ),
        )
      else if (products.isEmpty)
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.xl),
            child: MeEmptyState(
              kind: MeEmptyKind.generic,
              title: 'No options listed yet',
              message:
                  'Request a quote and our team will help you plan ${service.displayName} for your event.',
            ),
          ),
        )
      else
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate((context, index) {
              final product = products[index];
              final inPlan =
                  planItems?.any((item) => item.productCode == product.code) ??
                  false;
              return Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: ServiceProductCard(
                  product: product,
                  inPlan: inPlan,
                  planLocked: planLocked,
                  subcategoryLabel: subcategoryNames[product.subcategoryCode],
                  onOpen: () => _openProduct(product),
                  onAdd: planLocked ? null : () => _addToPlan(product),
                  onRemove: planLocked ? null : () => _removeFromPlan(product),
                ),
              );
            }, childCount: products.length),
          ),
        ),
    ];
  }
}

class _ServiceHeader extends StatelessWidget {
  const _ServiceHeader({required this.service, this.occasionTitle});

  final CatalogService service;
  final String? occasionTitle;

  @override
  Widget build(BuildContext context) {
    final imageUrl = CatalogImageResolver.resolvedServiceImage(
      coverImageUrl: service.coverImageUrl,
      iconUrl: service.iconUrl,
    );
    final department = customerFacingDepartmentLabel(service.departmentCode);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: AppRadius.lgAll,
            child: AspectRatio(
              aspectRatio: 16 / 9,
              child: ExcludeSemantics(
                child: HomeCatalogVisual(
                  imageUrl: imageUrl,
                  label: service.displayName,
                  borderRadius: AppRadius.lgAll,
                ),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            service.displayName,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: AppTypography.displaySm,
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            department,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: AppTypography.bodySm.copyWith(color: AppColors.muted),
          ),
          if (occasionTitle != null && occasionTitle!.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Relevant for $occasionTitle',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.captionSm.copyWith(color: AppColors.primary),
            ),
          ],
          if (service.productCount > 0 || service.subcategoryCount > 0) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              serviceCountsLabel(service),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.captionSm.copyWith(color: AppColors.muted),
            ),
          ],
        ],
      ),
    );
  }
}

class _SectionMessage extends StatelessWidget {
  const _SectionMessage({required this.title, required this.onRetry});

  final String title;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.titleSm,
            ),
          ),
          TextButton(
            onPressed: onRetry,
            style: TextButton.styleFrom(
              minimumSize: const Size(44, 44),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}

class _ServiceDetailSkeleton extends StatelessWidget {
  const _ServiceDetailSkeleton();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.all(AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MeSkeleton(height: 180, borderRadius: AppRadius.lgAll),
          SizedBox(height: AppSpacing.lg),
          MeSkeleton(width: 220, height: 22),
          SizedBox(height: AppSpacing.sm),
          MeSkeleton(height: 14),
          SizedBox(height: AppSpacing.xs),
          MeSkeleton(width: 180, height: 14),
        ],
      ),
    );
  }
}

class _ProductListSkeleton extends StatelessWidget {
  const _ProductListSkeleton();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: AppSpacing.xl),
      child: Column(
        children: [
          MeSkeleton(height: 88, borderRadius: AppRadius.mdAll),
          SizedBox(height: AppSpacing.sm),
          MeSkeleton(height: 88, borderRadius: AppRadius.mdAll),
        ],
      ),
    );
  }
}

List<CatalogProduct> filterServiceProducts(
  List<CatalogProduct> products,
  String? subcategoryCode,
) {
  if (subcategoryCode == null) return products;
  return [
    for (final product in products)
      if (product.subcategoryCode == subcategoryCode) product,
  ];
}

String serviceCountsLabel(CatalogService service) {
  final parts = <String>[];
  if (service.productCount > 0) {
    parts.add(
      service.productCount == 1
          ? '1 option'
          : '${service.productCount} options',
    );
  }
  if (service.subcategoryCount > 0) {
    parts.add(
      service.subcategoryCount == 1
          ? '1 section'
          : '${service.subcategoryCount} sections',
    );
  }
  return parts.join(' · ');
}

String servicePlanCtaLabel(int count) {
  if (count <= 0) return 'Request service quote';
  final shown = count > 99 ? '99+' : '$count';
  final noun = count == 1 ? 'item' : 'items';
  return 'Continue with Event Plan · $shown $noun';
}
