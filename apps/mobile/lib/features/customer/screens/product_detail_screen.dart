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
import 'package:mee_events/features/customer/search/customer_search_screen.dart';
import 'package:mee_events/features/customer/widgets/product_detail/product_gallery.dart';
import 'package:mee_events/features/customer/widgets/sticky_enquiry_bar.dart';
import 'package:mee_events/models/catalog_product.dart';
import 'package:mee_events/models/catalog_service.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class ProductDetailScreen extends ConsumerStatefulWidget {
  const ProductDetailScreen({
    super.key,
    required this.code,
    required this.title,
    this.serviceCode,
    this.imageUrl,
    this.occasionCode,
    this.occasionTitle,
  });

  final String code;
  final String title;
  final String? serviceCode;
  final String? imageUrl;
  final String? occasionCode;
  final String? occasionTitle;

  @override
  ConsumerState<ProductDetailScreen> createState() =>
      _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  Future<void> _handleRefresh() async {
    final productKey = catalogProductProvider(widget.code);
    ref.invalidate(productKey);
    final productFuture = ref.read(productKey.future);

    final liveCode =
        ref.read(productKey).valueOrNull?.serviceCode ??
        ref.read(productKey).asData?.value.serviceCode;
    Future<void>? serviceFuture;
    if (liveCode != null && liveCode.isNotEmpty) {
      final serviceKey = catalogServiceProvider(liveCode);
      ref.invalidate(serviceKey);
      serviceFuture = ref.read(serviceKey.future);
    }

    if (!mounted) return;

    // Settle started futures so RefreshIndicator completes normally.
    // Riverpod retains AsyncError for visible product/service state.
    await Future.wait<void>([
      _settleRefreshFuture(productFuture),
      if (serviceFuture != null) _settleRefreshFuture(serviceFuture),
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

  void _toggleFavorite(CatalogProduct product) {
    final imageUrl = CatalogImageResolver.resolvedServiceImage(
      coverImageUrl: product.coverImageUrl,
    );
    ref
        .read(favoritesProvider.notifier)
        .toggle(
          FavoriteItem(
            kind: FavoriteKind.product,
            code: product.code,
            title: product.displayName,
            imageUrl: imageUrl,
            departmentCode: product.serviceCode,
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

  void _openCheckout({
    required CatalogProduct product,
    CatalogService? service,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => EnquiryCheckoutScreen(
          initialEventTypeCode: widget.occasionCode,
          initialServiceCategoryCodes: service == null
              ? const []
              : [service.departmentCode],
          contextNotes: productEnquiryContextNotes(
            productName: product.displayName,
            serviceName: service?.displayName,
            occasionTitle: widget.occasionTitle,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final productAsync = ref.watch(catalogProductProvider(widget.code));
    final productPending = productAsync.isLoading && !productAsync.hasValue;
    final productFailed = productAsync.hasError && !productAsync.hasValue;
    final product = productAsync.valueOrNull;

    final serviceAsync = product == null
        ? null
        : ref.watch(catalogServiceProvider(product.serviceCode));
    final servicePending =
        serviceAsync != null &&
        serviceAsync.isLoading &&
        !serviceAsync.hasValue;
    final serviceFailed =
        serviceAsync != null && serviceAsync.hasError && !serviceAsync.hasValue;
    final service = serviceAsync?.valueOrNull;

    final planAsync = ref.watch(eventPlanProvider);
    final planPending = planAsync.isLoading && !planAsync.hasValue;
    final planFailed = planAsync.hasError && !planAsync.hasValue;
    final planItems = planAsync.valueOrNull;
    final inPlan =
        planItems?.any((item) => item.productCode == product?.code) ?? false;

    final saved = product == null
        ? false
        : ref
              .watch(favoritesProvider)
              .maybeWhen(
                data: (items) => items.any(
                  (e) =>
                      e.kind == FavoriteKind.product && e.code == product.code,
                ),
                orElse: () => false,
              );

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: MeAppBar(
        title: '',
        leading: SizedBox(
          width: 44,
          height: 44,
          child: MeIconButton(
            icon: Icons.arrow_back_rounded,
            color: AppColors.ink,
            onPressed: () => Navigator.pop(context),
            tooltip: 'Back',
          ),
        ),
        actions: [
          SizedBox(
            width: 44,
            height: 44,
            child: MeIconButton(
              icon: Icons.search_rounded,
              color: AppColors.ink,
              onPressed: _openSearch,
              tooltip: 'Search',
            ),
          ),
          if (product != null)
            Padding(
              padding: const EdgeInsets.only(right: AppSpacing.sm),
              child: SizedBox(
                width: 44,
                height: 44,
                child: Semantics(
                  button: true,
                  enabled: true,
                  label: saved ? 'Remove from favorites' : 'Save to favorites',
                  excludeSemantics: true,
                  child: MeFavoriteButton(
                    active: saved,
                    size: 44,
                    onPressed: () => _toggleFavorite(product),
                  ),
                ),
              ),
            ),
        ],
      ),
      body: productPending
          ? const _ProductDetailSkeleton()
          : productFailed || product == null
          ? MeErrorState(
              kind: MeErrorKind.generic,
              title: 'Unable to load this offering',
              message: 'Please try again.',
              onRetry: () =>
                  ref.invalidate(catalogProductProvider(widget.code)),
            )
          : Column(
              children: [
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _handleRefresh,
                    color: AppColors.primary,
                    child: CustomScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      slivers: [
                        SliverToBoxAdapter(
                          child: _VerifiedProductBody(
                            product: product,
                            service: service,
                            occasionTitle: widget.occasionTitle,
                            servicePending: servicePending,
                            serviceFailed: serviceFailed,
                            inPlan: inPlan,
                            planLocked: planPending || planFailed,
                            onRetryService: () => ref.invalidate(
                              catalogServiceProvider(product.serviceCode),
                            ),
                            onRemove: inPlan && !planPending && !planFailed
                                ? () => _removeFromPlan(product)
                                : null,
                          ),
                        ),
                        const SliverToBoxAdapter(child: SizedBox(height: 24)),
                      ],
                    ),
                  ),
                ),
                if (_ctaLabel(
                      product: product,
                      planPending: planPending,
                      planFailed: planFailed,
                      inPlan: inPlan,
                      planReady: planItems != null,
                    ) !=
                    null)
                  StickyEnquiryBar(
                    label: _ctaLabel(
                      product: product,
                      planPending: planPending,
                      planFailed: planFailed,
                      inPlan: inPlan,
                      planReady: planItems != null,
                    )!,
                    semanticLabel: _ctaLabel(
                      product: product,
                      planPending: planPending,
                      planFailed: planFailed,
                      inPlan: inPlan,
                      planReady: planItems != null,
                    ),
                    onPressed: _ctaAction(
                      product: product,
                      service: service,
                      planPending: planPending,
                      planFailed: planFailed,
                      inPlan: inPlan,
                      planReady: planItems != null,
                    ),
                  ),
              ],
            ),
    );
  }

  String? _ctaLabel({
    required CatalogProduct product,
    required bool planPending,
    required bool planFailed,
    required bool inPlan,
    required bool planReady,
  }) {
    if (!planReady && planPending) return 'Checking Event Plan…';
    if (!planReady && planFailed) return 'Retry Event Plan';
    if (!planReady) return 'Checking Event Plan…';
    if (product.restricted || !product.addToPlanAllowed) {
      return 'Request Quote';
    }
    if (inPlan) return 'Continue with Event Plan';
    return 'Add to Event Plan';
  }

  VoidCallback? _ctaAction({
    required CatalogProduct product,
    required CatalogService? service,
    required bool planPending,
    required bool planFailed,
    required bool inPlan,
    required bool planReady,
  }) {
    if (!planReady && planPending) return null;
    if (!planReady && planFailed) {
      return () => ref.read(eventPlanProvider.notifier).refresh();
    }
    if (!planReady) return null;
    if (product.restricted || !product.addToPlanAllowed) {
      return () => _openCheckout(product: product, service: service);
    }
    if (inPlan) {
      return () => _openCheckout(product: product, service: service);
    }
    return () => _addToPlan(product);
  }
}

class _VerifiedProductBody extends StatelessWidget {
  const _VerifiedProductBody({
    required this.product,
    required this.service,
    required this.occasionTitle,
    required this.servicePending,
    required this.serviceFailed,
    required this.inPlan,
    required this.planLocked,
    required this.onRetryService,
    required this.onRemove,
  });

  final CatalogProduct product;
  final CatalogService? service;
  final String? occasionTitle;
  final bool servicePending;
  final bool serviceFailed;
  final bool inPlan;
  final bool planLocked;
  final VoidCallback onRetryService;
  final VoidCallback? onRemove;

  bool get _restricted => product.restricted || !product.addToPlanAllowed;

  @override
  Widget build(BuildContext context) {
    final description = product.description?.trim();
    final department = service == null
        ? null
        : customerFacingDepartmentLabel(service!.departmentCode);
    final urls = productGalleryUrls(product);
    final occasion = customerFacingOccasionTitle(occasionTitle);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ProductGallery(urls: urls, productName: product.displayName),
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.xl,
            AppSpacing.lg,
            AppSpacing.xl,
            AppSpacing.xl,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                header: true,
                label: product.displayName,
                excludeSemantics: true,
                child: Text(product.displayName, style: AppTypography.titleLg),
              ),
              if (occasion != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Semantics(
                  label: relevantForOccasionLabel(occasion),
                  excludeSemantics: true,
                  child: Text(
                    relevantForOccasionLabel(occasion),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.captionSm.copyWith(
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
              if (service != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(
                  service!.displayName,
                  style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
                ),
                if (department != null && department.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.xs),
                    child: Text(
                      department,
                      style: AppTypography.captionSm.copyWith(
                        color: AppColors.muted,
                      ),
                    ),
                  ),
              ] else if (servicePending) ...[
                const SizedBox(height: AppSpacing.sm),
                const MeSkeleton(width: 160, height: 14),
              ] else if (serviceFailed) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Service details unavailable',
                  style: AppTypography.captionSm.copyWith(
                    color: AppColors.muted,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                MeRetry(onRetry: onRetryService, label: 'Retry service'),
              ],
              if (_restricted) ...[
                const SizedBox(height: AppSpacing.md),
                Semantics(
                  label: 'Eligibility review',
                  excludeSemantics: true,
                  child: Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: AppSpacing.sm,
                    children: const [
                      Icon(
                        Icons.policy_outlined,
                        size: 18,
                        color: AppColors.warning,
                      ),
                      MeBadge(
                        label: 'Eligibility review',
                        tone: MeStatusTone.warning,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Mee Events must review this requirement before it can be added to your Event Plan. Approval is not guaranteed.',
                  style: AppTypography.bodySm.copyWith(color: AppColors.muted),
                ),
              ],
              const SizedBox(height: AppSpacing.lg),
              Text(
                (description != null && description.isNotEmpty)
                    ? description
                    : 'Details will be confirmed for your event requirements.',
                style: AppTypography.bodyMd.copyWith(color: AppColors.inkLight),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text('Fulfilled by Mee Events', style: AppTypography.titleSm),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Final availability and price are confirmed after we understand your event requirements.',
                style: AppTypography.bodySm.copyWith(color: AppColors.muted),
              ),
              if (onRemove != null) ...[
                const SizedBox(height: AppSpacing.lg),
                Semantics(
                  button: true,
                  enabled: !planLocked,
                  label: 'Remove ${product.displayName} from Event Plan',
                  excludeSemantics: true,
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: planLocked ? null : onRemove,
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(
                          minHeight: 44,
                          minWidth: 44,
                        ),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            'Remove from Event Plan',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.bodyMd.copyWith(
                              color: planLocked
                                  ? AppColors.disabledText
                                  : AppColors.primary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _ProductDetailSkeleton extends StatelessWidget {
  const _ProductDetailSkeleton();

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
          MeSkeleton(width: 140, height: 14),
        ],
      ),
    );
  }
}
