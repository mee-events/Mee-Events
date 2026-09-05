import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/core/providers/catalog_provider.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/catalog/catalog_image_resolver.dart';
import 'package:mee_events/features/customer/favorites/favorites_provider.dart';
import 'package:mee_events/features/customer/navigation/customer_tab.dart';
import 'package:mee_events/features/customer/plan/event_plan_provider.dart';
import 'package:mee_events/features/customer/plan/event_plan_store.dart';
import 'package:mee_events/features/customer/providers/event_record_providers.dart';
import 'package:mee_events/features/customer/providers/explore_intent_provider.dart';
import 'package:mee_events/features/customer/screens/category_detail_screen.dart';
import 'package:mee_events/features/customer/screens/favorites_screen.dart';
import 'package:mee_events/features/customer/screens/service_detail_screen.dart';
import 'package:mee_events/features/customer/search/customer_search_screen.dart';
import 'package:mee_events/features/customer/workspace/event_workspace_screen.dart';
import 'package:mee_events/features/customer/widgets/home/discovery_skeletons.dart';
import 'package:mee_events/features/customer/widgets/home/home_planning_guidance.dart';
import 'package:mee_events/features/customer/widgets/home/home_planning_hero.dart';
import 'package:mee_events/features/customer/widgets/home/home_search_bar.dart';
import 'package:mee_events/features/customer/widgets/home/occasion_section.dart';
import 'package:mee_events/features/customer/widgets/home/pick_up_section.dart';
import 'package:mee_events/features/customer/widgets/home/popular_services_section.dart';
import 'package:mee_events/models/catalog_item.dart';
import 'package:mee_events/models/catalog_service.dart';
import 'package:mee_events/models/enquiry.dart';
import 'package:mee_events/models/event_record.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

const kHomeOccasionLimit = 8;
const kHomeServiceLimit = 10;

/// Customer Home — search-first discovery that stays premium without photography.
class CustomerHomeTab extends ConsumerStatefulWidget {
  const CustomerHomeTab({super.key, this.onNavigate});

  final ValueChanged<CustomerTab>? onNavigate;

  @override
  ConsumerState<CustomerHomeTab> createState() => _CustomerHomeTabState();
}

class _CustomerHomeTabState extends ConsumerState<CustomerHomeTab> {
  Future<void> _handleRefresh() async {
    final cachedTypes = ref.read(eventTypesProvider).valueOrNull;
    final cachedEvents = ref.read(eventsProvider).valueOrNull;
    final cachedOccasion = matchLiveOccasionCode(
      pickHomeUpcomingEvent(cachedEvents)?.eventTypeName,
      cachedTypes,
    );

    ref.invalidate(eventTypesProvider);
    ref.invalidate(serviceCategoriesProvider);
    ref.invalidate(eventsProvider);
    ref.invalidate(catalogServicesProvider(null));
    ref.invalidate(enquiriesProvider);

    final typesFuture = ref.read(eventTypesProvider.future);
    final categoriesFuture = ref.read(serviceCategoriesProvider.future);
    final eventsFuture = ref.read(eventsProvider.future);
    final servicesFuture = ref.read(catalogServicesProvider(null).future);
    final enquiriesFuture = ref.read(enquiriesProvider.future);
    final planFuture = ref.read(eventPlanProvider.notifier).refresh();
    final favoritesFuture = ref.read(favoritesProvider.notifier).refresh();

    Future<void> occasionFuture = Future.value();
    if (cachedOccasion != null) {
      ref.invalidate(occasionServicesProvider(cachedOccasion));
      occasionFuture = ref
          .read(occasionServicesProvider(cachedOccasion).future)
          .then<void>((_) {}, onError: (_) {});
    }

    await Future.wait<void>([
      typesFuture.then<void>((_) {}, onError: (_) {}),
      categoriesFuture.then<void>((_) {}, onError: (_) {}),
      eventsFuture.then<void>((_) {}, onError: (_) {}),
      servicesFuture.then<void>((_) {}, onError: (_) {}),
      enquiriesFuture.then<void>((_) {}, onError: (_) {}),
      planFuture.then<void>((_) {}, onError: (_) {}),
      favoritesFuture.then<void>((_) {}, onError: (_) {}),
      occasionFuture,
    ]);
    if (!mounted) return;

    final types = ref.read(eventTypesProvider).valueOrNull;
    final events = ref.read(eventsProvider).valueOrNull;
    final occasionCode = matchLiveOccasionCode(
      pickHomeUpcomingEvent(events)?.eventTypeName,
      types,
    );
    if (occasionCode == null || occasionCode == cachedOccasion) return;

    ref.invalidate(occasionServicesProvider(occasionCode));
    try {
      await ref.read(occasionServicesProvider(occasionCode).future);
    } catch (_) {}
  }

  void _openFavorites() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => FavoritesScreen(onNavigateTab: widget.onNavigate),
      ),
    );
  }

  void _onResumeSelect(HomeResumeKind kind, EventRecordSummary? completed) {
    switch (kind) {
      case HomeResumeKind.upcoming:
      case HomeResumeKind.plan:
        widget.onNavigate?.call(CustomerTab.plan);
        return;
      case HomeResumeKind.completed:
        final bookingId = completed?.bookingId.trim();
        if (bookingId == null || bookingId.isEmpty) return;
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => EventWorkspaceScreen(bookingId: bookingId),
          ),
        );
        return;
      case HomeResumeKind.saved:
        _openFavorites();
        return;
      case HomeResumeKind.enquiry:
        widget.onNavigate?.call(CustomerTab.enquiries);
        return;
    }
  }

  void _openSearch() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CustomerSearchScreen(onNavigateTab: widget.onNavigate),
      ),
    );
  }

  void _openCategory(String code, String title, {required bool isOccasion}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => CategoryDetailScreen(
          code: code,
          title: title,
          isOccasion: isOccasion,
        ),
      ),
    );
  }

  void _openService(
    CatalogService service, {
    String? occasionCode,
    String? occasionTitle,
  }) {
    Navigator.of(context).push(
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
          occasionCode: occasionCode,
          occasionTitle: occasionTitle,
        ),
      ),
    );
  }

  void _goExplore({required int intent}) {
    ref.read(exploreIntentProvider.notifier).state = intent;
    widget.onNavigate?.call(CustomerTab.explore);
  }

  void _goPlan() => widget.onNavigate?.call(CustomerTab.plan);

  @override
  Widget build(BuildContext context) {
    final eventTypesAsync = ref.watch(eventTypesProvider);
    final categoriesAsync = ref.watch(serviceCategoriesProvider);
    final servicesAsync = ref.watch(catalogServicesProvider(null));
    final eventsAsync = ref.watch(eventsProvider);
    final planAsync = ref.watch(eventPlanProvider);

    final events = eventsAsync.valueOrNull;
    final upcoming = pickHomeUpcomingEvent(events);
    final completed = upcoming == null ? pickHomeCompletedEvent(events) : null;
    final heroEvent = upcoming ?? completed;
    final occasionCode = matchLiveOccasionCode(
      upcoming?.eventTypeName,
      eventTypesAsync.valueOrNull,
    );
    final planItems = planAsync.valueOrNull ?? const <EventPlanItem>[];
    final planCount = planItems.length;
    final contextualCodes = <String>{};
    if (upcoming != null && occasionCode != null) {
      final contextual =
          ref.watch(occasionServicesProvider(occasionCode)).valueOrNull ??
          const [];
      contextualCodes.addAll(contextual.map((item) => item.code));
    }

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: RefreshIndicator(
        onRefresh: _handleRefresh,
        color: AppColors.primary,
        backgroundColor: AppColors.canvas,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(
            parent: AlwaysScrollableScrollPhysics(),
          ),
          slivers: [
            SliverToBoxAdapter(
              child: Semantics(
                sortKey: const OrdinalSortKey(1),
                explicitChildNodes: true,
                child: HomeSearchBar(
                  hint: kHomeSearchHint,
                  semanticLabel: kHomeSearchHint,
                  onTap: _openSearch,
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Semantics(
                sortKey: const OrdinalSortKey(2),
                explicitChildNodes: true,
                child: _buildHero(
                  eventsAsync,
                  upcoming,
                  completed,
                  matchLiveOccasion(
                    heroEvent?.eventTypeName,
                    eventTypesAsync.valueOrNull,
                  ),
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xl)),
            ..._buildResumeSlivers(upcoming, completed),
            if (planItems.isNotEmpty) ...[
              SliverToBoxAdapter(
                child: HomePlanPreviewSection(
                  items: planItems,
                  onReviewPlan: _goPlan,
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.lg)),
            ],
            ..._buildOccasionsSlivers(eventTypesAsync),
            if (upcoming != null && occasionCode != null)
              ..._buildContinuePlanningSlivers(occasionCode, upcoming),
            ..._buildDepartmentSlivers(
              servicesAsync,
              categoriesAsync,
              excludeCodes: contextualCodes,
            ),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xxxl)),
            SliverToBoxAdapter(
              child: HomeHowItWorksSection(onBuildPlan: _goPlan),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.md)),
            const SliverToBoxAdapter(child: HomeConfidenceStrip()),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.lg)),
            SliverToBoxAdapter(
              child: HomeFinalPlanPanel(
                onExploreOccasions: () => _goExplore(intent: 0),
                onReviewPlan: _goPlan,
                planCount: planCount,
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xxxl)),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildResumeSlivers(
    EventRecordSummary? upcoming,
    EventRecordSummary? completed,
  ) {
    final planAsync = ref.watch(eventPlanProvider);
    final savedAsync = ref.watch(favoritesProvider);
    final session = ref.watch(sessionProvider);
    final enquiriesAsync = session == null
        ? const AsyncValue<List<Enquiry>?>.data(null)
        : ref.watch(enquiriesProvider);

    final enquiry = session == null
        ? null
        : pickHomeResumeEnquiry(enquiriesAsync.valueOrNull);
    final cards = <HomeResumeCardData>[
      ?homeUpcomingResumeCard(upcoming),
      ?homeCompletedResumeCard(completed),
      ?homePlanResumeCard(planAsync.valueOrNull),
      ?homeSavedResumeCard(savedAsync.valueOrNull),
      if (enquiry != null) homeEnquiryResumeCard(enquiry),
    ];

    final waiting =
        (planAsync.isLoading && !planAsync.hasValue) ||
        (savedAsync.isLoading && !savedAsync.hasValue) ||
        (session != null &&
            enquiriesAsync.isLoading &&
            !enquiriesAsync.hasValue);

    if (cards.isEmpty) {
      if (waiting) {
        return const [
          SliverToBoxAdapter(child: HomeResumeSkeleton()),
          SliverToBoxAdapter(child: SizedBox(height: AppSpacing.lg)),
        ];
      }
      return const [];
    }

    return [
      SliverToBoxAdapter(
        child: HomeResumeSection(
          cards: cards,
          onSelect: (kind) => _onResumeSelect(kind, completed),
        ),
      ),
      const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.lg)),
    ];
  }

  Widget _buildHero(
    AsyncValue<List<EventRecordSummary>?> eventsAsync,
    EventRecordSummary? upcoming,
    EventRecordSummary? completed,
    CatalogItem? matchedOccasion,
  ) {
    if (eventsAsync.isLoading && !eventsAsync.hasValue) {
      return const HomeHeroSkeleton();
    }
    return HomePlanningHero(
      event: upcoming,
      completedEvent: completed,
      imageUrl: CatalogImageResolver.resolvedHomeImage(
        code: matchedOccasion?.code ?? '',
        remoteUrl: matchedOccasion?.coverImageUrl,
      ),
      onPlan: _goPlan,
    );
  }

  List<Widget> _buildOccasionsSlivers(
    AsyncValue<List<CatalogItem>> eventTypesAsync,
  ) {
    if (eventTypesAsync.isLoading && !eventTypesAsync.hasValue) {
      return const [
        SliverToBoxAdapter(child: HomeOccasionRailSkeleton()),
        SliverToBoxAdapter(child: SizedBox(height: AppSpacing.lg)),
      ];
    }
    if (eventTypesAsync.hasError && !eventTypesAsync.hasValue) {
      return [
        SliverToBoxAdapter(
          child: HomeSectionError(
            title: 'Occasions unavailable',
            onRetry: () => ref.invalidate(eventTypesProvider),
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.lg)),
      ];
    }
    final items = homeOccasionSubset(eventTypesAsync.valueOrNull ?? const []);
    if (items.isEmpty) return const [];
    return [
      SliverToBoxAdapter(
        child: OccasionSection(
          title: 'What are you planning?',
          items: items,
          onTileTap: (item) =>
              _openCategory(item.code, item.displayName, isOccasion: true),
          onViewAll: () => _goExplore(intent: 0),
        ),
      ),
      const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xxxl)),
    ];
  }

  List<Widget> _buildContinuePlanningSlivers(
    String occasionCode,
    EventRecordSummary upcoming,
  ) {
    final servicesAsync = ref.watch(occasionServicesProvider(occasionCode));
    if (servicesAsync.isLoading && !servicesAsync.hasValue) {
      return const [
        SliverToBoxAdapter(child: HomeServiceRailSkeleton()),
        SliverToBoxAdapter(child: SizedBox(height: AppSpacing.lg)),
      ];
    }
    if (servicesAsync.hasError && !servicesAsync.hasValue) {
      return const [];
    }
    final services = sortedCatalogServices(
      servicesAsync.valueOrNull ?? const [],
    );
    if (services.isEmpty) return const [];
    final visible = services.take(kHomeServiceLimit).toList();
    final typeName = upcoming.eventTypeName.trim();
    final title = typeName.isEmpty ? 'Continue Planning' : 'For Your $typeName';
    return [
      SliverToBoxAdapter(
        child: EventServicesSection(
          title: title,
          services: visible,
          viewAllSemanticLabel: 'View all $typeName services',
          onTap: (service) => _openService(
            service,
            occasionCode: occasionCode,
            occasionTitle: upcoming.eventTypeName,
          ),
          onViewAll: () => _openCategory(
            occasionCode,
            upcoming.eventTypeName,
            isOccasion: true,
          ),
        ),
      ),
      const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xl)),
    ];
  }

  List<Widget> _buildDepartmentSlivers(
    AsyncValue<List<CatalogService>> servicesAsync,
    AsyncValue<List<CatalogItem>> categoriesAsync, {
    required Set<String> excludeCodes,
  }) {
    if (servicesAsync.isLoading && !servicesAsync.hasValue) {
      return const [SliverToBoxAdapter(child: HomeServiceRailSkeleton())];
    }
    if (servicesAsync.hasError && !servicesAsync.hasValue) {
      return [
        SliverToBoxAdapter(
          child: HomeSectionError(
            title: 'Services unavailable',
            onRetry: () => ref.invalidate(catalogServicesProvider(null)),
          ),
        ),
      ];
    }
    final departments = categoriesAsync.hasValue
        ? categoriesAsync.valueOrNull ?? const <CatalogItem>[]
        : const <CatalogItem>[];
    final rails = groupHomeDepartmentRails(
      services: servicesAsync.valueOrNull ?? const [],
      departments: departments,
      excludeCodes: excludeCodes,
    );
    if (rails.isEmpty) return const [];
    return [
      for (var i = 0; i < rails.length; i++) ...[
        SliverToBoxAdapter(
          child: ColoredBox(
            color: i.isOdd
                ? AppColors.goldSoft.withValues(alpha: 0.35)
                : AppColors.canvas,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.xl),
              child: EventServicesSection(
                title: rails[i].title,
                services: rails[i].services,
                onTap: _openService,
                onViewAll: () => _goExplore(intent: 1),
                viewAllSemanticLabel: 'View all services',
              ),
            ),
          ),
        ),
      ],
    ];
  }
}

class HomeConfidenceStrip extends StatelessWidget {
  const HomeConfidenceStrip({super.key});

  static const items = [
    (Icons.event_available_outlined, 'Plan in one place'),
    (Icons.verified_outlined, 'Managed by Mee Events'),
    (Icons.request_quote_outlined, 'Quote before booking'),
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      child: Semantics(
        container: true,
        label: items.map((item) => item.$2).join('. '),
        child: ExcludeSemantics(
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(
              vertical: AppSpacing.md,
              horizontal: AppSpacing.md,
            ),
            decoration: BoxDecoration(
              color: AppColors.goldSoft,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(
                color: AppColors.goldAccent.withValues(alpha: 0.35),
              ),
            ),
            child: Column(
              children: [
                for (var i = 0; i < items.length; i++) ...[
                  if (i > 0)
                    Divider(
                      height: AppSpacing.md,
                      color: AppColors.goldAccent.withValues(alpha: 0.28),
                    ),
                  Row(
                    children: [
                      Icon(items[i].$1, size: 20, color: AppColors.primary),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          items[i].$2,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.caption.copyWith(
                            color: AppColors.inkLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

List<CatalogItem> homeOccasionSubset(List<CatalogItem> items) {
  final filtered = items.where((item) => !item.isServiceEntry).toList()
    ..sort(_compareDisplayOrder);
  return filtered;
}

class HomeServiceRail {
  const HomeServiceRail({
    required this.id,
    required this.title,
    required this.services,
  });

  final String id;
  final String title;
  final List<CatalogService> services;
}

List<HomeServiceRail> groupHomeDepartmentRails({
  required List<CatalogService> services,
  required List<CatalogItem> departments,
  Iterable<String> excludeCodes = const [],
}) {
  final excluded = {for (final code in excludeCodes) code};
  final seen = <String>{};
  final remaining = <CatalogService>[];
  for (final service in sortedCatalogServices(services)) {
    if (excluded.contains(service.code) || !seen.add(service.code)) {
      continue;
    }
    remaining.add(service);
  }

  final orderedDepartments =
      departments.where((item) => !item.isServiceEntry).toList()
        ..sort(_compareDisplayOrder);

  final assigned = <String>{};
  final rails = <HomeServiceRail>[];
  for (final department in orderedDepartments) {
    final group = remaining
        .where((service) => service.departmentCode == department.code)
        .toList();
    if (group.isEmpty) continue;
    assigned.addAll(group.map((service) => service.code));
    rails.add(
      HomeServiceRail(
        id: department.code,
        title: department.displayName,
        services: group,
      ),
    );
  }

  final more = remaining
      .where((service) => !assigned.contains(service.code))
      .toList();
  if (more.isNotEmpty) {
    rails.add(
      HomeServiceRail(id: 'more', title: 'More services', services: more),
    );
  }
  return rails;
}

List<CatalogService> homeServiceSubset(List<CatalogService> items) {
  return sortedCatalogServices(items);
}

List<CatalogService> sortedCatalogServices(List<CatalogService> items) {
  final copy = [...items]
    ..sort((a, b) {
      final order = a.displayOrder.compareTo(b.displayOrder);
      if (order != 0) return order;
      return a.code.compareTo(b.code);
    });
  return copy;
}

int _compareDisplayOrder(CatalogItem a, CatalogItem b) {
  final order = a.displayOrder.compareTo(b.displayOrder);
  if (order != 0) return order;
  return a.code.compareTo(b.code);
}

/// Selects the primary active event. Status controls eligibility; the one-day
/// relevance cutoff only preserves the existing preference for current/future
/// work before older active history.
EventRecordSummary? pickHomeUpcomingEvent(
  List<EventRecordSummary>? events, {
  DateTime? now,
}) {
  if (events == null || events.isEmpty) return null;
  final relevanceCutoff = (now ?? DateTime.now()).subtract(
    const Duration(days: 1),
  );
  EventRecordSummary? best;
  for (final event in events) {
    if (!isHomeActiveEvent(event)) continue;
    if (best == null ||
        _compareActiveEventPriority(event, best, relevanceCutoff) > 0) {
      best = event;
    }
  }
  return best;
}

const homeActiveEventStatuses = {
  'created',
  'planning',
  'requirements_confirmed',
  'quotation_approved',
  'booking_confirmed',
  'manager_assigned',
  'vendor_assigned',
  'worker_assigned',
  'preparation',
  'ready',
  'event_running',
};

const homeConcludedEventStatuses = {
  'completed',
  'settlement_pending',
  'closed',
};

bool isHomeActiveEvent(EventRecordSummary event) {
  return homeActiveEventStatuses.contains(event.status);
}

bool isHomeConcludedEvent(EventRecordSummary event) {
  return homeConcludedEventStatuses.contains(event.status);
}

int _compareActiveEventPriority(
  EventRecordSummary left,
  EventRecordSummary right,
  DateTime relevanceCutoff,
) {
  final leftDate = DateTime.tryParse(left.eventDate ?? '');
  final rightDate = DateTime.tryParse(right.eventDate ?? '');
  final leftGroup = _activeDateGroup(leftDate, relevanceCutoff);
  final rightGroup = _activeDateGroup(rightDate, relevanceCutoff);
  final groupOrder = leftGroup.compareTo(rightGroup);
  if (groupOrder != 0) return groupOrder;

  if (leftDate != null && rightDate != null) {
    final dateOrder = leftGroup == 2
        ? rightDate.compareTo(leftDate)
        : leftDate.compareTo(rightDate);
    if (dateOrder != 0) return dateOrder;
  }

  return _compareEventServerRecency(left, right);
}

int _activeDateGroup(DateTime? date, DateTime relevanceCutoff) {
  if (date == null) return 0;
  return date.isBefore(relevanceCutoff) ? 1 : 2;
}

/// Selects the most recent concluded event without inferring lifecycle from
/// the event date. Valid event dates sort newest first; updated/created
/// timestamps and the stable event ID make missing or tied dates deterministic.
EventRecordSummary? pickHomeCompletedEvent(List<EventRecordSummary>? events) {
  if (events == null || events.isEmpty) return null;
  EventRecordSummary? best;
  for (final event in events) {
    if (!isHomeConcludedEvent(event)) continue;
    if (best == null || _compareCompletedEventRecency(event, best) > 0) {
      best = event;
    }
  }
  return best;
}

int _compareCompletedEventRecency(
  EventRecordSummary left,
  EventRecordSummary right,
) {
  final leftEventDate = DateTime.tryParse(left.eventDate ?? '');
  final rightEventDate = DateTime.tryParse(right.eventDate ?? '');
  if (leftEventDate != null || rightEventDate != null) {
    if (leftEventDate == null) return -1;
    if (rightEventDate == null) return 1;
    final eventDateOrder = leftEventDate.compareTo(rightEventDate);
    if (eventDateOrder != 0) return eventDateOrder;
  }

  return _compareEventServerRecency(left, right);
}

int _compareEventServerRecency(
  EventRecordSummary left,
  EventRecordSummary right,
) {
  for (final timestamps in [
    (left.updatedAt, right.updatedAt),
    (left.createdAt, right.createdAt),
  ]) {
    final leftTimestamp = DateTime.tryParse(timestamps.$1);
    final rightTimestamp = DateTime.tryParse(timestamps.$2);
    if (leftTimestamp == null && rightTimestamp == null) continue;
    if (leftTimestamp == null) return -1;
    if (rightTimestamp == null) return 1;
    final timestampOrder = leftTimestamp.compareTo(rightTimestamp);
    if (timestampOrder != 0) return timestampOrder;
  }

  return left.id.compareTo(right.id);
}

CatalogItem? matchLiveOccasion(
  String? eventTypeName,
  List<CatalogItem>? occasions,
) {
  if (eventTypeName == null || eventTypeName.isEmpty || occasions == null) {
    return null;
  }
  final needle = _canonicalLabel(eventTypeName);
  if (needle.isEmpty) return null;
  for (final item in occasions) {
    if (item.isServiceEntry) continue;
    if (_canonicalLabel(item.code) == needle ||
        _canonicalLabel(item.displayName) == needle) {
      return item;
    }
  }
  return null;
}

String? matchLiveOccasionCode(
  String? eventTypeName,
  List<CatalogItem>? occasions,
) {
  return matchLiveOccasion(eventTypeName, occasions)?.code;
}

String _canonicalLabel(String raw) {
  return raw
      .toLowerCase()
      .trim()
      .replaceAll(RegExp(r'[-_]+'), ' ')
      .replaceAll(RegExp(r'\s+'), ' ');
}
