import 'package:flutter/material.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_icon_size.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class SearchIdlePanel extends StatelessWidget {
  const SearchIdlePanel({
    super.key,
    required this.recent,
    required this.trendingAsync,
    required this.onRecentTap,
    required this.onRecentRemove,
    required this.onClearRecent,
    required this.onTrendingTap,
    required this.onRetryTrending,
    required this.onBrowseOccasions,
    required this.onBrowseServices,
  });

  final List<String> recent;
  final AsyncSnapshot<List<String>> trendingAsync;
  final ValueChanged<String> onRecentTap;
  final ValueChanged<String> onRecentRemove;
  final VoidCallback onClearRecent;
  final ValueChanged<String> onTrendingTap;
  final VoidCallback onRetryTrending;
  final VoidCallback onBrowseOccasions;
  final VoidCallback onBrowseServices;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        0,
        AppSpacing.lg,
        AppSpacing.xxxl,
      ),
      children: [
        if (recent.isNotEmpty) ...[
          Row(
            children: [
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text('Recent searches', style: AppTypography.titleMd),
                ),
              ),
              Semantics(
                button: true,
                label: 'Clear all recent searches',
                child: TextButton(
                  onPressed: onClearRecent,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 44),
                    child: Center(
                      child: Text(
                        'Clear all',
                        style: AppTypography.bodySm.copyWith(
                          color: AppColors.muted,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          ...recent.map(
            (term) => _RecentRow(
              term: term,
              onTap: () => onRecentTap(term),
              onRemove: () => onRecentRemove(term),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
        ],
        Semantics(
          header: true,
          child: Text('Trending searches', style: AppTypography.titleMd),
        ),
        const SizedBox(height: AppSpacing.md),
        _TrendingBlock(
          snapshot: trendingAsync,
          onTap: onTrendingTap,
          onRetry: onRetryTrending,
        ),
        const SizedBox(height: AppSpacing.xxl),
        Semantics(
          header: true,
          child: Text('Browse catalogue', style: AppTypography.titleMd),
        ),
        const SizedBox(height: AppSpacing.md),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            onPressed: onBrowseOccasions,
            child: const Text(
              'Browse Occasions',
              textAlign: TextAlign.center,
              maxLines: 2,
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            onPressed: onBrowseServices,
            child: const Text(
              'Browse Services',
              textAlign: TextAlign.center,
              maxLines: 2,
            ),
          ),
        ),
      ],
    );
  }
}

class _RecentRow extends StatelessWidget {
  const _RecentRow({
    required this.term,
    required this.onTap,
    required this.onRemove,
  });

  final String term;
  final VoidCallback onTap;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Semantics(
            button: true,
            enabled: true,
            label: '$term, recent search',
            onTap: onTap,
            excludeSemantics: true,
            child: InkWell(
              onTap: onTap,
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 44),
                child: Row(
                  children: [
                    const Icon(Icons.history_rounded, color: AppColors.muted),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Text(
                        term,
                        style: AppTypography.bodyMd,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        Semantics(
          button: true,
          enabled: true,
          label: 'Remove $term',
          onTap: onRemove,
          excludeSemantics: true,
          child: IconButton(
            onPressed: onRemove,
            icon: const Icon(Icons.close, size: AppIconSize.sm),
            tooltip: 'Remove $term',
          ),
        ),
      ],
    );
  }
}

class _TrendingBlock extends StatelessWidget {
  const _TrendingBlock({
    required this.snapshot,
    required this.onTap,
    required this.onRetry,
  });

  final AsyncSnapshot<List<String>> snapshot;
  final ValueChanged<String> onTap;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    if (snapshot.connectionState == ConnectionState.waiting &&
        !snapshot.hasData) {
      return const Column(
        children: [
          MeSkeleton(height: 36, width: 120),
          SizedBox(height: AppSpacing.sm),
          MeSkeleton(height: 36, width: 160),
        ],
      );
    }
    if (snapshot.hasError && !snapshot.hasData) {
      return Align(
        alignment: Alignment.centerLeft,
        child: Semantics(
          button: true,
          label: 'Retry trending searches',
          child: TextButton(
            onPressed: onRetry,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 44),
              child: const Center(child: Text('Retry')),
            ),
          ),
        ),
      );
    }
    final terms = snapshot.data ?? const <String>[];
    if (terms.isEmpty) {
      return const SizedBox.shrink();
    }
    return Wrap(
      spacing: AppSpacing.sm,
      runSpacing: AppSpacing.sm,
      children: [
        for (final term in terms)
          Semantics(
            button: true,
            enabled: true,
            label: '$term, trending search',
            onTap: () => onTap(term),
            excludeSemantics: true,
            child: ActionChip(
              label: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 32),
                child: Text(
                  term,
                  style: AppTypography.bodySm.copyWith(
                    color: AppColors.primary,
                  ),
                ),
              ),
              onPressed: () => onTap(term),
              backgroundColor: AppColors.primarySoft,
              side: const BorderSide(color: AppColors.primary, width: 1.5),
            ),
          ),
      ],
    );
  }
}
