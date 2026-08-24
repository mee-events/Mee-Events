import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Horizontal 3-step progress chrome for the enquiry checkout flow.
///
/// Steps: Services → Details → Send. Maroon for active/completed;
/// muted for upcoming.
class EnquiryStepIndicator extends StatelessWidget {
  const EnquiryStepIndicator({super.key, required this.currentStep});

  /// 0-based step index (0 = Services, 1 = Details, 2 = Send).
  final int currentStep;

  static const List<String> labels = ['Services', 'Details', 'Send'];
  static const double _dotSize = 8;
  static const double _connectorHeight = 1.5;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.sm,
        AppSpacing.lg,
        AppSpacing.lg,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < labels.length; i++)
            Expanded(
              child: _StepSegment(
                label: labels[i],
                active: i <= currentStep,
                isCurrent: i == currentStep,
                showLeftConnector: i > 0,
                showRightConnector: i < labels.length - 1,
                leftConnectorActive: i <= currentStep,
                rightConnectorActive: i < currentStep,
              ),
            ),
        ],
      ),
    );
  }
}

class _StepSegment extends StatelessWidget {
  const _StepSegment({
    required this.label,
    required this.active,
    required this.isCurrent,
    required this.showLeftConnector,
    required this.showRightConnector,
    required this.leftConnectorActive,
    required this.rightConnectorActive,
  });

  final String label;
  final bool active;
  final bool isCurrent;
  final bool showLeftConnector;
  final bool showRightConnector;
  final bool leftConnectorActive;
  final bool rightConnectorActive;

  @override
  Widget build(BuildContext context) {
    final dotColor = active ? AppColors.primary : AppColors.surfaceStrong;
    final labelColor = active ? AppColors.primary : AppColors.muted;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          height: EnquiryStepIndicator._dotSize,
          child: Row(
            children: [
              Expanded(
                child: showLeftConnector
                    ? Container(
                        height: EnquiryStepIndicator._connectorHeight,
                        color: leftConnectorActive
                            ? AppColors.primary
                            : AppColors.surfaceStrong,
                      )
                    : const SizedBox.shrink(),
              ),
              Container(
                width: EnquiryStepIndicator._dotSize,
                height: EnquiryStepIndicator._dotSize,
                decoration: BoxDecoration(
                  color: dotColor,
                  shape: BoxShape.circle,
                  boxShadow: isCurrent
                      ? [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.28),
                            blurRadius: 4,
                            spreadRadius: 1,
                          ),
                        ]
                      : null,
                ),
              ),
              Expanded(
                child: showRightConnector
                    ? Container(
                        height: EnquiryStepIndicator._connectorHeight,
                        color: rightConnectorActive
                            ? AppColors.primary
                            : AppColors.surfaceStrong,
                      )
                    : const SizedBox.shrink(),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          label,
          textAlign: TextAlign.center,
          style: AppTypography.captionSm.copyWith(
            color: labelColor,
            fontWeight: isCurrent ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
