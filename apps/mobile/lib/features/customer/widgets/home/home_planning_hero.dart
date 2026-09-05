import 'package:flutter/material.dart';
import 'package:mee_events/core/widgets/image/app_image.dart';
import 'package:mee_events/features/customer/catalog/catalog_image_resolver.dart';
import 'package:mee_events/models/event_record.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_gradients.dart';
import 'package:mee_events/theme/app_icon_size.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

const kHomeHeroHeight = 224.0;

/// Single composed planning hero. Never uses bundled legacy photographs.
class HomePlanningHero extends StatelessWidget {
  const HomePlanningHero({
    super.key,
    this.event,
    this.completedEvent,
    this.imageUrl,
    required this.onPlan,
  }) : assert(event == null || completedEvent == null);

  final EventRecordSummary? event;
  final EventRecordSummary? completedEvent;
  final String? imageUrl;
  final VoidCallback onPlan;

  static const ctaKey = Key('home-planning-cta');
  static const surfaceKey = Key('home-planning-hero-surface');
  static const fallbackKey = Key('home-planning-hero-branded');

  bool get _hasEvent => event != null;
  bool get _hasCompletedEvent => completedEvent != null;
  EventRecordSummary? get _displayEvent => event ?? completedEvent;

  String get title {
    if (_hasCompletedEvent) return '${completedEvent!.eventName} is complete';
    return _hasEvent
        ? event!.eventName
        : 'Plan a celebration, not a spreadsheet';
  }

  String get subtitle {
    if (_hasCompletedEvent) {
      return homeCompletedEventContextLine(completedEvent!);
    }
    return _hasEvent
        ? homeEventContextLine(event!)
        : 'Start with the occasion. Mee Events helps you plan the rest.';
  }

  String get ctaLabel {
    if (_hasCompletedEvent) return 'Plan another event';
    return _hasEvent ? 'Resume plan' : 'Start planning';
  }

  String? get _usableImageUrl {
    return CatalogImageResolver.resolvedHomeImage(
      code: _displayEvent?.eventTypeName ?? '',
      remoteUrl: imageUrl,
    );
  }

  @override
  Widget build(BuildContext context) {
    final photoUrl = _usableImageUrl;
    final onPhoto = photoUrl != null;
    final width = MediaQuery.sizeOf(context).width;
    final textScale = MediaQuery.textScalerOf(context).scale(14) / 14;
    final showMotif = !onPhoto && width >= 360 && textScale < 1.3;
    final titleColor = onPhoto ? AppColors.onPrimary : AppColors.onPrimary;
    final subtitleColor = AppColors.onPrimary.withValues(alpha: 0.9);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      child: Semantics(
        container: true,
        explicitChildNodes: true,
        label: _hasCompletedEvent
            ? 'Completed event. $title'
            : 'Planning. $title',
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: AppRadius.lgAll,
            boxShadow: [
              BoxShadow(
                color: AppColors.scrim.withValues(alpha: 0.16),
                blurRadius: 22,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: ClipRRect(
            key: surfaceKey,
            borderRadius: AppRadius.lgAll,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: kHomeHeroHeight),
              child: Stack(
                children: [
                  Positioned.fill(
                    child: ExcludeSemantics(child: _background(photoUrl)),
                  ),
                  if (onPhoto)
                    const Positioned.fill(
                      child: ExcludeSemantics(child: _HeroScrim()),
                    ),
                  if (showMotif)
                    const Positioned.fill(
                      child: ExcludeSemantics(child: _HeroMotif()),
                    ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.lg,
                      AppSpacing.lg,
                      AppSpacing.lg,
                      AppSpacing.md,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ExcludeSemantics(
                          child: Text(
                            'Mee Events',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.captionSm.copyWith(
                              color: AppColors.goldAccent,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.6,
                            ),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        ExcludeSemantics(
                          child: ConstrainedBox(
                            constraints: BoxConstraints(
                              maxWidth: showMotif
                                  ? MediaQuery.sizeOf(context).width * 0.58
                                  : double.infinity,
                            ),
                            child: Text(
                              title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.displaySm.copyWith(
                                color: titleColor,
                                height: 1.12,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        ExcludeSemantics(
                          child: ConstrainedBox(
                            constraints: BoxConstraints(
                              maxWidth: showMotif
                                  ? MediaQuery.sizeOf(context).width * 0.62
                                  : double.infinity,
                            ),
                            child: Text(
                              subtitle,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.bodySm.copyWith(
                                color: subtitleColor,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Semantics(
                          button: true,
                          label: ctaLabel,
                          excludeSemantics: true,
                          child: _HeroCta(
                            ctaKey: ctaKey,
                            label: ctaLabel,
                            onPressed: onPlan,
                            inverted: true,
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
    );
  }

  Widget _background(String? photoUrl) {
    const branded = _HeroBrandedFill();
    if (photoUrl == null) {
      return const SizedBox.expand(child: branded);
    }
    return SizedBox.expand(
      child: AppImage(
        imageUrl: photoUrl,
        fit: BoxFit.cover,
        fallbackWidget: branded,
      ),
    );
  }
}

class _HeroBrandedFill extends StatelessWidget {
  const _HeroBrandedFill();

  @override
  Widget build(BuildContext context) {
    return const DecoratedBox(
      key: HomePlanningHero.fallbackKey,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primaryActive,
            AppColors.primary,
            Color(0xFF9A2244),
          ],
        ),
      ),
    );
  }
}

class _HeroMotif extends StatelessWidget {
  const _HeroMotif();

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned(
          right: -42,
          top: -48,
          child: Container(
            width: 168,
            height: 168,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.goldAccent.withValues(alpha: 0.2),
            ),
          ),
        ),
        Positioned(
          right: 28,
          bottom: -36,
          child: Container(
            width: 110,
            height: 110,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: AppColors.goldSoft.withValues(alpha: 0.35),
                width: 2,
              ),
            ),
          ),
        ),
        Positioned(
          right: 36,
          top: 40,
          child: Icon(
            Icons.calendar_month_outlined,
            size: 34,
            color: AppColors.goldSoft.withValues(alpha: 0.88),
          ),
        ),
        Positioned(
          right: 78,
          bottom: 36,
          child: Icon(
            Icons.auto_awesome,
            size: 28,
            color: AppColors.goldAccent.withValues(alpha: 0.9),
          ),
        ),
      ],
    );
  }
}

class _HeroScrim extends StatelessWidget {
  const _HeroScrim();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(gradient: AppGradients.heroScrim),
    );
  }
}

class _HeroCta extends StatelessWidget {
  const _HeroCta({
    required this.ctaKey,
    required this.label,
    required this.onPressed,
    required this.inverted,
  });

  final Key ctaKey;
  final String label;
  final VoidCallback onPressed;
  final bool inverted;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          minHeight: 44,
          minWidth: 44,
          maxWidth: MediaQuery.sizeOf(context).width - (AppSpacing.lg * 2) - 48,
        ),
        child: Material(
          key: ctaKey,
          color: inverted ? AppColors.goldSoft : AppColors.primary,
          borderRadius: AppRadius.mdAll,
          child: InkWell(
            onTap: onPressed,
            borderRadius: AppRadius.mdAll,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Flexible(
                      child: Text(
                        label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.titleSm.copyWith(
                          color: inverted
                              ? AppColors.primary
                              : AppColors.onPrimary,
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.xs),
                    Icon(
                      Icons.arrow_forward_rounded,
                      size: AppIconSize.sm,
                      color: inverted ? AppColors.primary : AppColors.onPrimary,
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

String homeEventContextLine(EventRecordSummary event) {
  final parts = <String>[];
  final formatted = formatHomeEventDate(event.eventDate);
  if (formatted != null) {
    parts.add(formatted);
  }
  if (event.eventTypeName.trim().isNotEmpty) {
    parts.add(event.eventTypeName.trim());
  }
  return parts.isEmpty ? 'Continue planning this event' : parts.join(' · ');
}

String homeCompletedEventContextLine(EventRecordSummary event) {
  final parts = <String>[];
  final formatted = formatHomeEventDate(event.eventDate);
  if (formatted != null) parts.add(formatted);
  if (event.eventTypeName.trim().isNotEmpty) {
    parts.add(event.eventTypeName.trim());
  }
  return parts.isEmpty ? 'Your event has concluded.' : parts.join(' · ');
}

String? formatHomeEventDate(String? raw) {
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
