import 'package:flutter/material.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class HomeHowItWorksSection extends StatelessWidget {
  const HomeHowItWorksSection({super.key, required this.onBuildPlan});

  final VoidCallback onBuildPlan;

  static const title = 'How Mee Events works';
  static const sectionKey = Key('home-how-it-works');
  static const actionKey = Key('home-how-it-works-cta');

  static const steps = [
    (1, Icons.search_rounded, 'Discover occasions and services'),
    (2, Icons.add_box_outlined, 'Add options to your Event Plan'),
    (3, Icons.send_outlined, 'Send one enquiry and follow its updates'),
  ];

  @override
  Widget build(BuildContext context) {
    return Padding(
      key: sectionKey,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.surfaceCard,
          borderRadius: AppRadius.lgAll,
          border: Border.all(color: AppColors.hairline),
          boxShadow: [
            BoxShadow(
              color: AppColors.scrim.withValues(alpha: 0.05),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.md,
            AppSpacing.lg,
            AppSpacing.sm,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: AppTypography.titleLg),
              const SizedBox(height: AppSpacing.sm),
              for (var i = 0; i < steps.length; i++) ...[
                _HowStep(
                  number: steps[i].$1,
                  icon: steps[i].$2,
                  label: steps[i].$3,
                  isLast: i == steps.length - 1,
                ),
              ],
              Semantics(
                button: true,
                label: 'Build your plan',
                excludeSemantics: true,
                child: MePressable(
                  onTap: onBuildPlan,
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
                        'Build your plan',
                        style: AppTypography.bodySm.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HowStep extends StatelessWidget {
  const _HowStep({
    required this.number,
    required this.icon,
    required this.label,
    required this.isLast,
  });

  final int number;
  final IconData icon;
  final String label;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ExcludeSemantics(
            child: SizedBox(
              width: 28,
              child: Column(
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(icon, size: 14, color: AppColors.goldSoft),
                  ),
                  if (!isLast)
                    Expanded(
                      child: Container(
                        width: 2,
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        color: AppColors.goldAccent.withValues(alpha: 0.55),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? AppSpacing.xs : 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Step $number',
                    style: AppTypography.captionSm.copyWith(
                      color: AppColors.goldAntique,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    label,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.bodySm,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class HomeFinalPlanPanel extends StatelessWidget {
  const HomeFinalPlanPanel({
    super.key,
    required this.onExploreOccasions,
    required this.onReviewPlan,
    this.planCount = 0,
  });

  final VoidCallback onExploreOccasions;
  final VoidCallback onReviewPlan;
  final int planCount;

  static const panelKey = Key('home-final-plan-panel');
  static const exploreKey = Key('home-final-explore-occasions');
  static const planKey = Key('home-final-review-plan');

  String get _planLabel {
    if (planCount <= 0) return 'Review Event Plan';
    if (planCount == 1) return 'Review Event Plan (1 item)';
    return 'Review Event Plan ($planCount items)';
  }

  bool get _planPrimary => planCount > 0;

  @override
  Widget build(BuildContext context) {
    return Padding(
      key: panelKey,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppColors.primaryActive, AppColors.primary],
          ),
          borderRadius: AppRadius.lgAll,
          boxShadow: [
            BoxShadow(
              color: AppColors.scrim.withValues(alpha: 0.18),
              blurRadius: 18,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Ready to plan your event?',
                style: AppTypography.titleLg.copyWith(
                  color: AppColors.onPrimary,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              if (_planPrimary) ...[
                _FinalAction(
                  actionKey: planKey,
                  label: _planLabel,
                  filled: true,
                  onTap: onReviewPlan,
                ),
                const SizedBox(height: AppSpacing.sm),
                _FinalAction(
                  actionKey: exploreKey,
                  label: 'Explore occasions',
                  filled: false,
                  onTap: onExploreOccasions,
                ),
              ] else ...[
                _FinalAction(
                  actionKey: exploreKey,
                  label: 'Explore occasions',
                  filled: true,
                  onTap: onExploreOccasions,
                ),
                const SizedBox(height: AppSpacing.sm),
                _FinalAction(
                  actionKey: planKey,
                  label: _planLabel,
                  filled: false,
                  onTap: onReviewPlan,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _FinalAction extends StatelessWidget {
  const _FinalAction({
    required this.actionKey,
    required this.label,
    required this.filled,
    required this.onTap,
  });

  final Key actionKey;
  final String label;
  final bool filled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: MePressable(
        onTap: onTap,
        borderRadius: AppRadius.mdAll,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44, minWidth: 44),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: filled ? AppColors.goldSoft : Colors.transparent,
              borderRadius: AppRadius.mdAll,
              border: filled
                  ? null
                  : Border.all(
                      color: AppColors.goldAccent.withValues(alpha: 0.7),
                    ),
            ),
            child: Center(
              child: Text(
                key: actionKey,
                label,
                textAlign: TextAlign.center,
                style: (filled ? AppTypography.titleSm : AppTypography.bodySm)
                    .copyWith(
                      color: filled ? AppColors.primary : AppColors.onPrimary,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
