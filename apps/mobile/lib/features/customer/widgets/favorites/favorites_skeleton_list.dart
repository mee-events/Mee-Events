import 'package:flutter/material.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/theme/app_spacing.dart';

class FavoritesSkeletonList extends StatelessWidget {
  const FavoritesSkeletonList({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.md,
        AppSpacing.lg,
        AppSpacing.xxxl,
      ),
      children: const [
        MeSkeleton(height: 22, width: 160),
        SizedBox(height: AppSpacing.sm),
        MeSkeleton(height: 16, width: 80),
        SizedBox(height: AppSpacing.lg),
        MeSkeleton(height: 44),
        SizedBox(height: AppSpacing.md),
        MeSkeleton(height: 96),
        SizedBox(height: AppSpacing.sm),
        MeSkeleton(height: 96),
        SizedBox(height: AppSpacing.sm),
        MeSkeleton(height: 96),
      ],
    );
  }
}
