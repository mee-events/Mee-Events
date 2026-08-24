import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

enum MeStatusTone { neutral, brand, success, warning, error, info, premium }

Color _toneColor(MeStatusTone tone) => switch (tone) {
  MeStatusTone.brand => AppColors.primary,
  MeStatusTone.success => AppColors.success,
  MeStatusTone.warning => AppColors.warning,
  MeStatusTone.error => AppColors.error,
  MeStatusTone.info => AppColors.info,
  MeStatusTone.premium => AppColors.goldAntique,
  MeStatusTone.neutral => AppColors.muted,
};

class MeBadge extends StatelessWidget {
  const MeBadge({
    super.key,
    required this.label,
    this.tone = MeStatusTone.neutral,
    this.uppercase = true,
  });

  final String label;
  final MeStatusTone tone;
  final bool uppercase;

  @override
  Widget build(BuildContext context) {
    final color = _toneColor(tone);
    final soft = tone == MeStatusTone.premium
        ? AppColors.goldSoft
        : color.withValues(alpha: 0.1);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
      decoration: BoxDecoration(color: soft, borderRadius: AppRadius.pillAll),
      child: Text(
        uppercase ? label.toUpperCase() : label,
        style: AppTypography.badge.copyWith(color: color),
      ),
    );
  }
}

class MeChip extends StatelessWidget {
  const MeChip({
    super.key,
    required this.label,
    this.selected = false,
    this.onSelected,
  });

  final String label;
  final bool selected;
  final ValueChanged<bool>? onSelected;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: onSelected,
      selectedColor: AppColors.primarySoft,
      backgroundColor: AppColors.surfaceCard,
      checkmarkColor: AppColors.primary,
      labelStyle: AppTypography.bodySm.copyWith(
        color: selected ? AppColors.primary : AppColors.ink,
        fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
      ),
      side: BorderSide(
        color: selected ? AppColors.primary : AppColors.hairlineSoft,
        width: selected ? 1.5 : 1,
      ),
    );
  }
}

class MeTag extends StatelessWidget {
  const MeTag({
    super.key,
    required this.label,
    this.tone = MeStatusTone.neutral,
  });

  final String label;
  final MeStatusTone tone;

  @override
  Widget build(BuildContext context) {
    final color = _toneColor(tone);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        borderRadius: AppRadius.pillAll,
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(label, style: AppTypography.badge.copyWith(color: color)),
    );
  }
}

class MeProgress extends StatelessWidget {
  const MeProgress({super.key, required this.value, this.label});

  final double value;
  final String? label;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: AppTypography.captionSm.copyWith(color: AppColors.muted),
          ),
          const SizedBox(height: AppSpacing.xs),
        ],
        ClipRRect(
          borderRadius: AppRadius.pillAll,
          child: LinearProgressIndicator(
            value: value.clamp(0, 1),
            minHeight: 6,
            backgroundColor: AppColors.surfaceStrong,
            color: AppColors.primary,
          ),
        ),
      ],
    );
  }
}

class MeTimelineStep {
  const MeTimelineStep({
    required this.title,
    this.subtitle,
    this.done = false,
    this.active = false,
  });

  final String title;
  final String? subtitle;
  final bool done;
  final bool active;
}

class MeTimeline extends StatelessWidget {
  const MeTimeline({super.key, required this.steps});

  final List<MeTimelineStep> steps;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < steps.length; i++) ...[
          _TimelineRow(step: steps[i], isLast: i == steps.length - 1),
        ],
      ],
    );
  }
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({required this.step, required this.isLast});

  final MeTimelineStep step;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final color = step.active
        ? AppColors.primary
        : step.done
        ? AppColors.success
        : AppColors.mutedSoft;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            if (!isLast)
              Container(width: 2, height: 36, color: AppColors.hairlineSoft),
          ],
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  step.title,
                  style: AppTypography.titleSm.copyWith(color: color),
                ),
                if (step.subtitle != null)
                  Text(
                    step.subtitle!,
                    style: AppTypography.captionSm.copyWith(
                      color: AppColors.muted,
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
