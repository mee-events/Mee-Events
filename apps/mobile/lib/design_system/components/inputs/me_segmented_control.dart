import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_motion.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Premium pill-shaped segment switcher (e.g. Events / Services).
///
/// Controlled: parent owns [index] and handles [onChanged].
class MeSegmentedControl extends StatelessWidget {
  const MeSegmentedControl({
    super.key,
    required this.labels,
    required this.index,
    required this.onChanged,
  }) : assert(
         labels.length >= 2,
         'MeSegmentedControl requires at least 2 labels',
       );

  final List<String> labels;
  final int index;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final safeIndex = index.clamp(0, labels.length - 1);
    final count = labels.length;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.xs),
      decoration: const BoxDecoration(
        color: AppColors.surfaceSoft,
        borderRadius: AppRadius.pillAll,
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final segmentWidth = constraints.maxWidth / count;
          return Stack(
            children: [
              AnimatedPositioned(
                duration: AppMotion.fast,
                curve: AppMotion.enter,
                left: segmentWidth * safeIndex,
                top: 0,
                bottom: 0,
                width: segmentWidth,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: AppRadius.pillAll,
                  ),
                ),
              ),
              Row(
                children: [
                  for (var i = 0; i < count; i++)
                    Expanded(
                      child: Semantics(
                        button: true,
                        enabled: true,
                        selected: i == safeIndex,
                        label: labels[i],
                        onTap: () => onChanged(i),
                        excludeSemantics: true,
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () => onChanged(i),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              vertical: AppSpacing.sm,
                              horizontal: AppSpacing.sm,
                            ),
                            child: AnimatedDefaultTextStyle(
                              duration: AppMotion.fast,
                              curve: AppMotion.enter,
                              style: AppTypography.titleSm.copyWith(
                                color: i == safeIndex
                                    ? AppColors.onPrimary
                                    : AppColors.muted,
                              ),
                              child: Text(
                                labels[i],
                                textAlign: TextAlign.center,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}
