import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/core/providers/catalog_provider.dart';
import 'package:mee_events/core/widgets/image/app_image.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/customer/catalog/catalog_image_resolver.dart';
import 'package:mee_events/features/customer/favorites/favorites_provider.dart';
import 'package:mee_events/features/customer/favorites/favorites_store.dart';
import 'package:mee_events/features/customer/providers/event_record_providers.dart';
import 'package:mee_events/features/customer/screens/enquiry_checkout_screen.dart';
import 'package:mee_events/features/customer/screens/service_detail_screen.dart';
import 'package:mee_events/features/customer/search/customer_search_screen.dart';
import 'package:mee_events/features/customer/widgets/occasion_journey.dart';
import 'package:mee_events/features/customer/widgets/service_listing_card.dart';
import 'package:mee_events/features/customer/widgets/sticky_enquiry_bar.dart';
import 'package:mee_events/features/customer/workspace/event_workspace_screen.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/models/catalog_selection.dart';
import 'package:mee_events/models/catalog_service.dart';
import 'package:mee_events/models/event_record.dart';
import 'package:mee_events/models/occasion_stage.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Occasion detail (`isOccasion: true`) or service-category detail (`false`).
class CategoryDetailScreen extends ConsumerStatefulWidget {
  final String code;
  final String title;
  final bool isOccasion;

  const CategoryDetailScreen({
    super.key,
    required this.code,
    required this.title,
    required this.isOccasion,
  });

  @override
  ConsumerState<CategoryDetailScreen> createState() =>
      _CategoryDetailScreenState();
}

class _CategoryDetailScreenState extends ConsumerState<CategoryDetailScreen> {
  void _openService(CatalogService service) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ServiceDetailScreen(
          code: service.code,
          title: service.displayName,
          departmentCode: service.departmentCode,
          imageUrl: CatalogImageResolver.resolvedHomeImage(
            code: service.code,
            coverImageUrl: service.coverImageUrl,
            iconUrl: service.iconUrl,
          ),
          occasionCode: widget.isOccasion ? widget.code : null,
          occasionTitle: widget.isOccasion ? widget.title : null,
        ),
      ),
    );
  }

  void _openMappedSelection(CatalogSelection selection) {
    final serviceCode = selection.serviceCode;
    if (serviceCode == null) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ServiceDetailScreen(
          code: serviceCode,
          title: selection.serviceDisplayName ?? selection.sourceLabel,
          occasionCode: widget.code,
          occasionTitle: widget.title,
        ),
      ),
    );
  }

  void _startEnquiry() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => EnquiryCheckoutScreen(
          initialEventTypeCode: widget.isOccasion ? widget.code : null,
          initialServiceCategoryCodes: widget.isOccasion
              ? const []
              : [widget.code],
          contextNotes: widget.isOccasion
              ? 'Planning ${widget.title}'
              : 'Interested in ${widget.title}',
        ),
      ),
    );
  }

  void _continuePlanning(EventRecordSummary event) {
    if (event.bookingId.trim().isEmpty) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => EventWorkspaceScreen(bookingId: event.bookingId),
      ),
    );
  }

  void _openSearch() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => const CustomerSearchScreen()),
    );
  }

  Future<void> _handleRefresh() async {
    if (!widget.isOccasion) {
      ref.invalidate(catalogServicesProvider(widget.code));
      await ref.read(catalogServicesProvider(widget.code).future);
      return;
    }

    final stages = occasionStagesProvider(widget.code);
    final services = occasionServicesProvider(widget.code);
    final selections = eventSelectionsProvider(widget.code);

    ref.invalidate(stages);
    ref.invalidate(services);
    ref.invalidate(selections);
    ref.invalidate(eventsProvider);

    final stagesFuture = ref.read(stages.future);
    final servicesFuture = ref.read(services.future);
    final selectionsFuture = ref.read(selections.future);
    final eventsFuture = ref.read(eventsProvider.future);

    if (!mounted) return;

    await Future.wait<void>([
      stagesFuture,
      servicesFuture,
      selectionsFuture,
      eventsFuture,
    ]);
  }

  void _toggleFavorite(String imageUrl) {
    final favoriteKind = widget.isOccasion
        ? FavoriteKind.occasion
        : FavoriteKind.category;
    ref
        .read(favoritesProvider.notifier)
        .toggle(
          FavoriteItem(
            kind: favoriteKind,
            code: widget.code,
            title: widget.title,
            imageUrl: imageUrl,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return widget.isOccasion ? _buildOccasion() : _buildServiceCategory();
  }

  Widget _buildOccasion() {
    final stagesAsync = ref.watch(occasionStagesProvider(widget.code));
    final servicesAsync = ref.watch(occasionServicesProvider(widget.code));
    final selectionsAsync = ref.watch(eventSelectionsProvider(widget.code));
    final eventsAsync = ref.watch(eventsProvider);
    final eventTypesAsync = ref.watch(eventTypesProvider);

    final eventsPending = eventsAsync.isLoading && !eventsAsync.hasValue;
    final eventsFailed = eventsAsync.hasError && !eventsAsync.hasValue;
    final matchingEvent = matchBookedOccasionEvent(
      occasionCode: widget.code,
      occasionTitle: widget.title,
      events: eventsAsync.valueOrNull,
    );

    final mapped = actionableOccasionSelections(
      selectionsAsync.valueOrNull ?? const [],
    );
    final useMapped = mapped.isNotEmpty;
    final fallbackServices = sortedOccasionServices(
      servicesAsync.valueOrNull ?? const [],
    );
    final displayedCount = useMapped ? mapped.length : fallbackServices.length;

    CatalogItem? occasionItem;
    for (final item in eventTypesAsync.valueOrNull ?? const <CatalogItem>[]) {
      if (item.code == widget.code) {
        occasionItem = item;
        break;
      }
    }
    final heroImage = CatalogImageResolver.resolvedHomeImage(
      code: widget.code,
      remoteUrl: occasionItem?.coverImageUrl,
    );
    final favoriteKind = FavoriteKind.occasion;
    final saved = ref
        .watch(favoritesProvider)
        .maybeWhen(
          data: (items) =>
              items.any((e) => e.kind == favoriteKind && e.code == widget.code),
          orElse: () => false,
        );

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
                label: saved ? 'Remove from favorites' : 'Save to favorites',
                excludeSemantics: true,
                child: MeFavoriteButton(
                  active: saved,
                  size: 44,
                  onPressed: () => _toggleFavorite(heroImage ?? ''),
                ),
              ),
            ),
          ),
        ],
      ),
      body: Column(
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
                    child: _OccasionHero(
                      imageUrl: heroImage,
                      title: widget.title,
                      matchingEvent: matchingEvent,
                    ),
                  ),
                  ..._journeySlivers(stagesAsync),
                  ..._serviceSlivers(
                    selectionsAsync: selectionsAsync,
                    servicesAsync: servicesAsync,
                    mapped: mapped,
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 24)),
                ],
              ),
            ),
          ),
          StickyEnquiryBar(
            label: eventsPending
                ? 'Checking your events…'
                : eventsFailed
                ? 'Retry event status'
                : matchingEvent != null
                ? 'Continue planning'
                : 'Start planning',
            semanticLabel: eventsPending
                ? 'Checking your events…'
                : eventsFailed
                ? 'Retry event status'
                : matchingEvent != null
                ? 'Continue planning'
                : 'Start planning',
            resultCount: displayedCount > 0 ? displayedCount : null,
            onPressed: eventsPending
                ? null
                : eventsFailed
                ? () => ref.invalidate(eventsProvider)
                : matchingEvent != null
                ? () => _continuePlanning(matchingEvent)
                : _startEnquiry,
          ),
        ],
      ),
    );
  }

  List<Widget> _journeySlivers(AsyncValue<List<OccasionStage>> stagesAsync) {
    if (stagesAsync.isLoading && !stagesAsync.hasValue) {
      return const [SliverToBoxAdapter(child: _SectionSkeleton())];
    }
    if (stagesAsync.hasError && !stagesAsync.hasValue) {
      return [
        SliverToBoxAdapter(
          child: _SectionMessage(
            title: 'Journey unavailable',
            onRetry: () => ref.invalidate(occasionStagesProvider(widget.code)),
          ),
        ),
      ];
    }
    final stages = stagesAsync.valueOrNull ?? const <OccasionStage>[];
    if (stages.isEmpty) return const [];
    return [SliverToBoxAdapter(child: OccasionJourney(stages: stages))];
  }

  List<Widget> _serviceSlivers({
    required AsyncValue<List<CatalogSelection>> selectionsAsync,
    required AsyncValue<List<CatalogService>> servicesAsync,
    required List<CatalogSelection> mapped,
  }) {
    if (mapped.isNotEmpty) {
      return _mappedServiceSlivers(mapped);
    }

    final selectionsPending =
        selectionsAsync.isLoading && !selectionsAsync.hasValue;
    final servicesPending = servicesAsync.isLoading && !servicesAsync.hasValue;

    if (selectionsPending || servicesPending) {
      return [
        SliverToBoxAdapter(child: _serviceHeader(0)),
        const SliverToBoxAdapter(child: _SectionSkeleton()),
      ];
    }

    if (servicesAsync.hasError && !servicesAsync.hasValue) {
      return [
        SliverToBoxAdapter(child: _serviceHeader(0)),
        SliverToBoxAdapter(
          child: _SectionMessage(
            title: 'Services unavailable',
            onRetry: () =>
                ref.invalidate(occasionServicesProvider(widget.code)),
          ),
        ),
      ];
    }

    final services = sortedOccasionServices(
      servicesAsync.valueOrNull ?? const [],
    );
    if (services.isEmpty) {
      return [
        SliverToBoxAdapter(child: _serviceHeader(0)),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.xxl),
            child: MeEmptyState(
              kind: MeEmptyKind.generic,
              title: 'No services yet',
              message:
                  'Services for ${widget.title} will appear here once the catalog is updated.',
            ),
          ),
        ),
      ];
    }

    return [
      SliverToBoxAdapter(child: _serviceHeader(services.length)),
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
        sliver: SliverList(
          delegate: SliverChildBuilderDelegate((context, index) {
            final service = services[index];
            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: ServiceListingCard(
                title: service.displayName,
                subtitle: humanizeDepartmentCode(service.departmentCode),
                meta: occasionServiceMeta(service),
                imageUrl: CatalogImageResolver.resolvedServiceImage(
                  coverImageUrl: service.coverImageUrl,
                  iconUrl: service.iconUrl,
                ),
                onTap: () => _openService(service),
              ),
            );
          }, childCount: services.length),
        ),
      ),
    ];
  }

  List<Widget> _mappedServiceSlivers(List<CatalogSelection> mapped) {
    return [
      SliverToBoxAdapter(child: _serviceHeader(mapped.length)),
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
        sliver: SliverList(
          delegate: SliverChildBuilderDelegate((context, index) {
            final selection = mapped[index];
            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: ServiceListingCard(
                title: selection.sourceLabel,
                subtitle: selection.serviceDisplayName,
                imageUrl: CatalogImageResolver.resolvedServiceImage(),
                onTap: () => _openMappedSelection(selection),
              ),
            );
          }, childCount: mapped.length),
        ),
      ),
    ];
  }

  Widget _serviceHeader(int count) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.xl,
        AppSpacing.xxl,
        AppSpacing.xl,
        AppSpacing.md,
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              'Services for ${widget.title}',
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.displaySm,
            ),
          ),
          if (count > 0)
            Text(
              '$count ${count == 1 ? 'service' : 'services'}',
              style: AppTypography.captionSm.copyWith(color: AppColors.muted),
            ),
        ],
      ),
    );
  }

  Widget _buildServiceCategory() {
    final servicesAsync = ref.watch(catalogServicesProvider(widget.code));
    final isLoading = servicesAsync.isLoading && !servicesAsync.hasValue;
    final hasError = servicesAsync.hasError && !servicesAsync.hasValue;
    final servicesList = sortedOccasionServices(
      servicesAsync.valueOrNull ?? const [],
    );
    CatalogService? matchingService;
    for (final service in servicesList) {
      if (service.code == widget.code) {
        matchingService = service;
        break;
      }
    }
    final heroImage = CatalogImageResolver.resolvedServiceImage(
      coverImageUrl: matchingService?.coverImageUrl,
      iconUrl: matchingService?.iconUrl,
    );
    final saved = ref
        .watch(favoritesProvider)
        .maybeWhen(
          data: (items) => items.any(
            (e) => e.kind == FavoriteKind.category && e.code == widget.code,
          ),
          orElse: () => false,
        );

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: MeAppBar(
        title: widget.title,
        centerTitle: true,
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
            child: MeFavoriteButton(
              active: saved,
              size: 40,
              onPressed: () => _toggleFavorite(heroImage ?? ''),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: isLoading
                ? const _DetailSkeleton()
                : hasError
                ? MeErrorState(
                    kind: MeErrorKind.generic,
                    onRetry: _handleRefresh,
                  )
                : RefreshIndicator(
                    onRefresh: _handleRefresh,
                    color: AppColors.primary,
                    backgroundColor: AppColors.canvas,
                    child: CustomScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      slivers: [
                        SliverToBoxAdapter(
                          child: _CategoryHero(
                            imageUrl: heroImage ?? '',
                            title: widget.title,
                            onPrimary: _startEnquiry,
                          ),
                        ),
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(
                              AppSpacing.lg,
                              AppSpacing.xxl,
                              AppSpacing.lg,
                              AppSpacing.sm,
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    'Available Services',
                                    style: AppTypography.titleLg,
                                  ),
                                ),
                                Text(
                                  '${servicesList.length} ${servicesList.length == 1 ? 'service' : 'services'}',
                                  style: AppTypography.captionSm.copyWith(
                                    color: AppColors.muted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (servicesList.isEmpty)
                          const SliverToBoxAdapter(
                            child: Padding(
                              padding: EdgeInsets.all(AppSpacing.xxl),
                              child: MeEmptyState(
                                kind: MeEmptyKind.generic,
                                title: 'No services yet',
                                message: 'No services found for this category.',
                              ),
                            ),
                          )
                        else
                          SliverPadding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.lg,
                            ),
                            sliver: SliverList(
                              delegate: SliverChildBuilderDelegate((
                                context,
                                index,
                              ) {
                                final service = servicesList[index];
                                return Padding(
                                  padding: const EdgeInsets.only(
                                    bottom: AppSpacing.sm,
                                  ),
                                  child: ServiceListingCard(
                                    title: service.displayName,
                                    subtitle: humanizeDepartmentCode(
                                      service.departmentCode,
                                    ),
                                    imageUrl:
                                        CatalogImageResolver.resolvedServiceImage(
                                          coverImageUrl: service.coverImageUrl,
                                          iconUrl: service.iconUrl,
                                        ),
                                    onTap: () => _openService(service),
                                  ),
                                );
                              }, childCount: servicesList.length),
                            ),
                          ),
                        const SliverToBoxAdapter(child: SizedBox(height: 24)),
                      ],
                    ),
                  ),
          ),
          StickyEnquiryBar(
            label: 'Request Quote',
            resultCount: servicesList.isNotEmpty ? servicesList.length : null,
            onPressed: _startEnquiry,
          ),
        ],
      ),
    );
  }
}

class _OccasionHero extends StatelessWidget {
  const _OccasionHero({
    required this.imageUrl,
    required this.title,
    this.matchingEvent,
  });

  final String? imageUrl;
  final String title;
  final EventRecordSummary? matchingEvent;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
          child: ClipRRect(
            borderRadius: AppRadius.lgAll,
            child: AspectRatio(
              aspectRatio: 16 / 9,
              child: ExcludeSemantics(
                child: HomeCatalogVisual(
                  imageUrl: imageUrl,
                  label: title,
                  borderRadius: AppRadius.lgAll,
                ),
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.xl,
            AppSpacing.lg,
            AppSpacing.xl,
            0,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.displaySm,
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Services you may need for this occasion.',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.bodySm.copyWith(color: AppColors.muted),
              ),
              if (matchingEvent != null) ...[
                const SizedBox(height: AppSpacing.md),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.primarySoft,
                    borderRadius: AppRadius.mdAll,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        matchingEvent!.eventName,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.titleSm.copyWith(
                          color: AppColors.brandMark,
                        ),
                      ),
                      if (formatOccasionEventDate(matchingEvent!.eventDate) !=
                          null)
                        Text(
                          formatOccasionEventDate(matchingEvent!.eventDate)!,
                          style: AppTypography.captionSm.copyWith(
                            color: AppColors.muted,
                          ),
                        ),
                    ],
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

class _CategoryHero extends StatelessWidget {
  const _CategoryHero({
    required this.imageUrl,
    required this.title,
    required this.onPrimary,
  });

  final String imageUrl;
  final String title;
  final VoidCallback onPrimary;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AspectRatio(
          aspectRatio: 16 / 9,
          child: AppImage(imageUrl: imageUrl, fit: BoxFit.cover),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.xl,
            AppSpacing.lg,
            AppSpacing.xl,
            0,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: AppTypography.displaySm),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Choose the service that fits your event',
                style: AppTypography.bodySm.copyWith(color: AppColors.muted),
              ),
              const SizedBox(height: AppSpacing.lg),
              MeButton.primary(label: 'Request Quote', onPressed: onPrimary),
            ],
          ),
        ),
      ],
    );
  }
}

class _SectionSkeleton extends StatelessWidget {
  const _SectionSkeleton();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.xl,
        AppSpacing.lg,
        AppSpacing.xl,
        AppSpacing.sm,
      ),
      child: Column(
        children: [
          MeSkeleton(height: 56, borderRadius: AppRadius.mdAll),
          SizedBox(height: AppSpacing.sm),
          MeSkeleton(height: 56, borderRadius: AppRadius.mdAll),
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
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.xl,
        vertical: AppSpacing.md,
      ),
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
      ),
    );
  }
}

class _DetailSkeleton extends StatelessWidget {
  const _DetailSkeleton();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.xl),
      children: const [
        MeSkeleton(height: 180, borderRadius: AppRadius.lgAll),
        SizedBox(height: AppSpacing.lg),
        MeSkeleton(width: 200, height: 22),
        SizedBox(height: AppSpacing.sm),
        MeSkeleton(height: 14),
        SizedBox(height: AppSpacing.xl),
        MeSkeleton(height: 64, borderRadius: AppRadius.mdAll),
        SizedBox(height: AppSpacing.sm),
        MeSkeleton(height: 64, borderRadius: AppRadius.mdAll),
      ],
    );
  }
}

List<CatalogSelection> actionableOccasionSelections(
  List<CatalogSelection> items,
) {
  final seen = <String>{};
  final out = <CatalogSelection>[];
  for (final item in items) {
    if (!item.isMapped) continue;
    final identity = '${item.sourceOrdinal}\u0000${item.sourceLabel}';
    if (!seen.add(identity)) continue;
    out.add(item);
  }
  return out;
}

List<CatalogService> sortedOccasionServices(List<CatalogService> items) {
  final copy = [...items]
    ..sort((a, b) {
      final order = a.displayOrder.compareTo(b.displayOrder);
      if (order != 0) return order;
      return a.code.compareTo(b.code);
    });
  return copy;
}

EventRecordSummary? matchBookedOccasionEvent({
  required String occasionCode,
  required String occasionTitle,
  List<EventRecordSummary>? events,
  DateTime? now,
}) {
  if (events == null || events.isEmpty) return null;
  final code = canonicalOccasionLabel(occasionCode);
  final title = canonicalOccasionLabel(occasionTitle);
  final clock = now ?? DateTime.now();
  final today = DateTime(clock.year, clock.month, clock.day);
  EventRecordSummary? best;
  DateTime? bestDate;
  for (final event in events) {
    if (event.bookingId.trim().isEmpty) continue;
    final type = canonicalOccasionLabel(event.eventTypeName);
    if (type != code && type != title) continue;
    final parsed = DateTime.tryParse(event.eventDate ?? '');
    if (parsed == null) continue;
    final day = DateTime(parsed.year, parsed.month, parsed.day);
    if (day.isBefore(today)) continue;
    if (best == null || day.isBefore(bestDate!)) {
      best = event;
      bestDate = day;
    }
  }
  return best;
}

String canonicalOccasionLabel(String raw) {
  return raw
      .toLowerCase()
      .trim()
      .replaceAll(RegExp(r'[-_]+'), ' ')
      .replaceAll(RegExp(r'\s+'), ' ');
}

String humanizeDepartmentCode(String code) {
  final cleaned = code.replaceAll('_', ' ').trim();
  if (cleaned.isEmpty) return code;
  return cleaned
      .split(RegExp(r'\s+'))
      .map(
        (word) => word.isEmpty
            ? ''
            : '${word[0].toUpperCase()}${word.substring(1).toLowerCase()}',
      )
      .join(' ');
}

String? occasionServiceMeta(CatalogService service) {
  if (service.productCount > 0) {
    return service.productCount == 1
        ? '1 option'
        : '${service.productCount} options';
  }
  if (service.subcategoryCount > 0) {
    return service.subcategoryCount == 1
        ? '1 category'
        : '${service.subcategoryCount} categories';
  }
  return null;
}

String? formatOccasionEventDate(String? raw) {
  if (raw == null || raw.isEmpty) return null;
  final date = DateTime.tryParse(raw);
  if (date == null) return null;
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return '${date.day} ${months[date.month - 1]} ${date.year}';
}
