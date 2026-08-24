import 'package:flutter/material.dart';
import 'package:mee_events/models/occasion_stage.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Informational occasion stage sequence. Not a service filter.
class OccasionJourney extends StatelessWidget {
  const OccasionJourney({super.key, required this.stages});

  final List<OccasionStage> stages;

  static const journeyKey = Key('occasion-journey');

  @override
  Widget build(BuildContext context) {
    final ordered = sortedOccasionStages(stages);
    if (ordered.isEmpty) return const SizedBox.shrink();

    return Padding(
      key: journeyKey,
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.xl,
        AppSpacing.xxl,
        AppSpacing.xl,
        AppSpacing.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Event Journey', style: AppTypography.displaySm),
          const SizedBox(height: AppSpacing.md),
          for (var i = 0; i < ordered.length; i++) ...[
            if (i > 0) const SizedBox(height: AppSpacing.sm),
            _JourneyStep(
              index: i + 1,
              stage: ordered[i],
              isLast: i == ordered.length - 1,
            ),
          ],
        ],
      ),
    );
  }
}

class _JourneyStep extends StatelessWidget {
  const _JourneyStep({
    required this.index,
    required this.stage,
    required this.isLast,
  });

  final int index;
  final OccasionStage stage;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final day = stage.typicalDay?.trim();
    return Semantics(
      container: true,
      label: day == null || day.isEmpty
          ? stage.displayName
          : '${stage.displayName}, $day',
      child: ExcludeSemantics(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    color: AppColors.primarySoft,
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    '$index',
                    style: AppTypography.caption.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                if (!isLast)
                  Container(
                    width: 1,
                    height: 18,
                    color: AppColors.hairlineSoft,
                  ),
              ],
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      stage.displayName,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.titleSm,
                    ),
                    if (day != null && day.isNotEmpty)
                      Text(
                        day,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppTypography.captionSm.copyWith(
                          color: AppColors.muted,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

List<OccasionStage> sortedOccasionStages(List<OccasionStage> stages) {
  final copy = [...stages]
    ..sort((a, b) {
      final order = a.displayOrder.compareTo(b.displayOrder);
      if (order != 0) return order;
      return a.code.compareTo(b.code);
    });
  return copy;
}
