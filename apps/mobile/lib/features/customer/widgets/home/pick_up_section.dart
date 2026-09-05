import 'package:flutter/material.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/customer/favorites/favorites_store.dart';
import 'package:mee_events/features/customer/catalog/catalog_image_resolver.dart';
import 'package:mee_events/features/customer/plan/event_plan_store.dart';
import 'package:mee_events/features/customer/widgets/home/home_planning_hero.dart';
import 'package:mee_events/features/customer/widgets/home/occasion_section.dart';
import 'package:mee_events/models/enquiry.dart';
import 'package:mee_events/models/event_record.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

enum HomeResumeKind { upcoming, completed, plan, saved, enquiry }

class HomeResumeCardData {
  const HomeResumeCardData({
    required this.kind,
    required this.title,
    required this.subtitle,
    required this.actionLabel,
    required this.semanticLabel,
    this.previews = const [],
    this.imageUrls = const [],
  });

  final HomeResumeKind kind;
  final String title;
  final String subtitle;
  final String actionLabel;
  final String semanticLabel;
  final List<String> previews;
  final List<String> imageUrls;

  Key get cardKey => Key('home-resume-${kind.name}');
}

Enquiry? pickHomeResumeEnquiry(List<Enquiry>? items) {
  if (items == null || items.isEmpty) return null;
  Enquiry? best;
  DateTime? bestDate;
  for (final enquiry in items) {
    if (enquiry.status == 'closed' || enquiry.status == 'cancelled') {
      continue;
    }
    final date =
        DateTime.tryParse(enquiry.submittedAt ?? '') ??
        DateTime.tryParse(enquiry.createdAt);
    if (best == null) {
      best = enquiry;
      bestDate = date;
      continue;
    }
    if (date == null) continue;
    if (bestDate == null || date.isAfter(bestDate)) {
      best = enquiry;
      bestDate = date;
    }
  }
  return best;
}

String homeEnquiryStatusLabel(Enquiry enquiry) {
  const known = {
    'submitted',
    'received',
    'contact_pending',
    'in_discussion',
    'proposal_expected',
    'closed',
    'cancelled',
  };
  if (!known.contains(enquiry.status)) return 'Update available';
  return enquiry.statusLabel;
}

HomeResumeCardData? homeUpcomingResumeCard(
  EventRecordSummary? event, {
  DateTime? now,
}) {
  if (event == null) return null;
  return HomeResumeCardData(
    kind: HomeResumeKind.upcoming,
    title: homeActiveEventResumeTitle(event, now: now),
    subtitle: 'Review checklist & journey',
    actionLabel: 'Continue',
    semanticLabel: '${event.eventName}. Continue planning',
  );
}

String homeActiveEventResumeTitle(EventRecordSummary event, {DateTime? now}) {
  final rawEventDate = event.eventDate?.trim();
  final eventDate = rawEventDate == null || rawEventDate.isEmpty
      ? null
      : DateTime.tryParse(rawEventDate);
  if (eventDate == null) return 'Continue your event';

  final referenceDate = now ?? DateTime.now();
  final eventDay = DateTime.utc(eventDate.year, eventDate.month, eventDate.day);
  final currentDay = DateTime.utc(
    referenceDate.year,
    referenceDate.month,
    referenceDate.day,
  );
  if (eventDay.isAfter(currentDay)) return 'Upcoming celebration';
  if (eventDay == currentDay) return 'Today’s celebration';
  return 'Continue your event';
}

HomeResumeCardData? homeCompletedResumeCard(EventRecordSummary? event) {
  if (event == null || event.bookingId.trim().isEmpty) return null;
  final date = formatHomeEventDate(event.eventDate);
  return HomeResumeCardData(
    kind: HomeResumeKind.completed,
    title: event.eventName,
    subtitle: date ?? 'Completed event',
    actionLabel: 'View event',
    semanticLabel: '${event.eventName}. Completed event. Open event workspace',
  );
}

HomeResumeCardData? homePlanResumeCard(List<EventPlanItem>? items) {
  if (items == null || items.isEmpty) return null;
  final count = items.length;
  final names = items.take(3).map((item) => item.displayName).toList();
  final images = items
      .map((item) => item.coverImageUrl?.trim() ?? '')
      .where((url) => url.isNotEmpty)
      .take(3)
      .toList();
  final countLabel = count == 1 ? '1 item' : '$count items';
  return HomeResumeCardData(
    kind: HomeResumeKind.plan,
    title: 'Event Plan',
    subtitle: countLabel,
    actionLabel: 'Review plan',
    semanticLabel: 'Event Plan, $countLabel. Review plan',
    previews: names,
    imageUrls: images,
  );
}

HomeResumeCardData? homeSavedResumeCard(List<FavoriteItem>? items) {
  if (items == null || items.isEmpty) return null;
  final newest = [...items]
    ..sort((a, b) {
      final at = a.savedAt;
      final bt = b.savedAt;
      if (at == null && bt == null) return 0;
      if (at == null) return 1;
      if (bt == null) return -1;
      return bt.compareTo(at);
    });
  final count = newest.length;
  final names = newest.take(3).map((item) => item.title).toList();
  final images = newest
      .map((item) => item.imageUrl?.trim() ?? '')
      .where((url) => url.isNotEmpty)
      .take(3)
      .toList();
  final countLabel = count == 1 ? '1 saved item' : '$count saved items';
  return HomeResumeCardData(
    kind: HomeResumeKind.saved,
    title: 'Saved',
    subtitle: countLabel,
    actionLabel: 'View saved',
    semanticLabel: 'Saved, $countLabel. View saved',
    previews: names,
    imageUrls: images,
  );
}

HomeResumeCardData homeEnquiryResumeCard(Enquiry enquiry) {
  final status = homeEnquiryStatusLabel(enquiry);
  final date = formatHomeEventDate(enquiry.eventDate);
  final parts = [enquiry.referenceCode, status, ?date];
  return HomeResumeCardData(
    kind: HomeResumeKind.enquiry,
    title: enquiry.eventTypeName,
    subtitle: parts.join(' · '),
    actionLabel: 'Track enquiry',
    semanticLabel:
        '${enquiry.eventTypeName}, ${enquiry.referenceCode}, $status. Track enquiry',
  );
}

class HomeResumeSection extends StatelessWidget {
  const HomeResumeSection({
    super.key,
    required this.cards,
    required this.onSelect,
  });

  final List<HomeResumeCardData> cards;
  final ValueChanged<HomeResumeKind> onSelect;

  static const title = 'Pick up where you left off';
  static const sectionKey = Key('home-resume-section');

  static double cardWidth(double maxWidth, {required int count}) {
    final inner = (maxWidth - AppSpacing.lg * 2).clamp(0.0, double.infinity);
    if (count <= 1) return inner;
    return (inner - AppSpacing.md) / 1.35;
  }

  @override
  Widget build(BuildContext context) {
    if (cards.isEmpty) return const SizedBox.shrink();
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = cardWidth(constraints.maxWidth, count: cards.length);
        return Padding(
          key: sectionKey,
          padding: EdgeInsets.zero,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                child: Text(title, style: AppTypography.titleLg),
              ),
              const SizedBox(height: AppSpacing.sm),
              if (cards.length == 1)
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                  ),
                  child: _ResumeCard(
                    data: cards.first,
                    width: width,
                    onTap: () => onSelect(cards.first.kind),
                  ),
                )
              else
                Semantics(
                  container: true,
                  explicitChildNodes: true,
                  label: 'Pick up where you left off cards',
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(
                      parent: AlwaysScrollableScrollPhysics(),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.lg,
                    ),
                    child: Row(
                      children: [
                        for (var i = 0; i < cards.length; i++) ...[
                          if (i > 0) const SizedBox(width: AppSpacing.md),
                          _ResumeCard(
                            data: cards[i],
                            width: width,
                            onTap: () => onSelect(cards[i].kind),
                          ),
                        ],
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

class _ResumeCard extends StatelessWidget {
  const _ResumeCard({
    required this.data,
    required this.width,
    required this.onTap,
  });

  final HomeResumeCardData data;
  final double width;
  final VoidCallback onTap;

  IconData get _icon {
    switch (data.kind) {
      case HomeResumeKind.upcoming:
        return Icons.celebration_outlined;
      case HomeResumeKind.completed:
        return Icons.event_available_outlined;
      case HomeResumeKind.plan:
        return Icons.event_note_outlined;
      case HomeResumeKind.saved:
        return Icons.favorite_border;
      case HomeResumeKind.enquiry:
        return Icons.mail_outline_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: data.semanticLabel,
      excludeSemantics: true,
      child: MePressable(
        onTap: onTap,
        borderRadius: AppRadius.mdAll,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
          child: SizedBox(
            key: data.cardKey,
            width: width,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: AppColors.surfaceCard,
                borderRadius: AppRadius.mdAll,
                border: Border.all(color: AppColors.hairline),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.scrim.withValues(alpha: 0.06),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      alignment: Alignment.center,
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(_icon, color: AppColors.goldSoft, size: 20),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            data.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.titleSm,
                          ),
                          Text(
                            data.subtitle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.captionSm.copyWith(
                              color: AppColors.muted,
                            ),
                          ),
                          if (data.kind != HomeResumeKind.plan &&
                              data.previews.isNotEmpty)
                            Text(
                              data.previews.join(' · '),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.captionSm.copyWith(
                                color: AppColors.inkLight,
                              ),
                            ),
                          Text(
                            data.actionLabel,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.caption.copyWith(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class HomePlanPreviewSection extends StatelessWidget {
  const HomePlanPreviewSection({
    super.key,
    required this.items,
    required this.onReviewPlan,
  });

  final List<EventPlanItem> items;
  final VoidCallback onReviewPlan;

  static const sectionKey = Key('home-plan-preview');
  static const actionKey = Key('home-plan-preview-review');

  static double cardWidth(double maxWidth) {
    final inner = (maxWidth - AppSpacing.lg * 2).clamp(0.0, double.infinity);
    return inner / 2.2;
  }

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = cardWidth(constraints.maxWidth);
        return Column(
          key: sectionKey,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            HomeSectionHeader(title: 'Your Event Plan'),
            const SizedBox(height: AppSpacing.sm),
            Semantics(
              container: true,
              explicitChildNodes: true,
              label: 'Event Plan items, horizontal list',
              child: SizedBox(
                height: 168,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(
                    parent: AlwaysScrollableScrollPhysics(),
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                  ),
                  itemCount: items.length,
                  separatorBuilder: (_, _) =>
                      const SizedBox(width: AppSpacing.md),
                  itemBuilder: (context, index) {
                    return _PlanPreviewCard(
                      item: items[index],
                      width: width,
                      onTap: onReviewPlan,
                    );
                  },
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.lg,
                AppSpacing.sm,
                AppSpacing.lg,
                0,
              ),
              child: Semantics(
                button: true,
                label: 'Review Event Plan',
                excludeSemantics: true,
                child: MePressable(
                  onTap: onReviewPlan,
                  borderRadius: AppRadius.mdAll,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(
                      minHeight: 44,
                      minWidth: 44,
                    ),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        key: actionKey,
                        'Review Event Plan',
                        style: AppTypography.bodySm.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _PlanPreviewCard extends StatelessWidget {
  const _PlanPreviewCard({
    required this.item,
    required this.width,
    required this.onTap,
  });

  final EventPlanItem item;
  final double width;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final imageUrl = CatalogImageResolver.resolvedHomeImage(
      code: item.productCode,
      remoteUrl: item.coverImageUrl,
    );
    return Semantics(
      button: true,
      label: item.restricted
          ? '${item.displayName}, restricted'
          : item.displayName,
      excludeSemantics: true,
      child: MePressable(
        onTap: onTap,
        borderRadius: AppRadius.mdAll,
        child: SizedBox(
          width: width,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: AppColors.surfaceCard,
              borderRadius: AppRadius.mdAll,
              border: Border.all(color: AppColors.hairline),
              boxShadow: [
                BoxShadow(
                  color: AppColors.scrim.withValues(alpha: 0.06),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(AppRadius.md),
                  ),
                  child: SizedBox(
                    width: width,
                    height: 96,
                    child: imageUrl == null
                        ? HomeIconFallback(
                            icon: Icons.inventory_2_outlined,
                            tone: HomeDiscoveryTone.forCode(item.productCode),
                          )
                        : HomeCatalogVisual(
                            imageUrl: imageUrl,
                            label: item.displayName,
                            borderRadius: BorderRadius.zero,
                          ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.sm,
                    AppSpacing.sm,
                    AppSpacing.sm,
                    AppSpacing.sm,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.displayName,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.titleSm,
                      ),
                      if (item.restricted)
                        Text(
                          'Restricted',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTypography.captionSm.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
