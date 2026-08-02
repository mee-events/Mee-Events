import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class SectionHeader extends StatelessWidget {
  final String eyebrow;
  final String title;

  const SectionHeader({
    super.key,
    required this.eyebrow,
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          eyebrow.toUpperCase(),
          style: AppTypography.eyebrow,
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          title,
          style: AppTypography.displaySm,
        ),
      ],
    );
  }
}
