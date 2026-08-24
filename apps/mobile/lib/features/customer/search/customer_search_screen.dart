import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/customer/navigation/customer_tab.dart';
import 'package:mee_events/features/customer/providers/explore_intent_provider.dart';
import 'package:mee_events/features/customer/screens/category_detail_screen.dart';
import 'package:mee_events/features/customer/screens/product_detail_screen.dart';
import 'package:mee_events/features/customer/screens/service_detail_screen.dart';
import 'package:mee_events/features/customer/search/search_models.dart';
import 'package:mee_events/features/customer/search/search_provider.dart';
import 'package:mee_events/features/customer/search/widgets/search_idle_panel.dart';
import 'package:mee_events/features/customer/search/widgets/search_result_tile.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_icon_size.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Full-screen platform search — not an expanding app-bar field.
class CustomerSearchScreen extends ConsumerStatefulWidget {
  const CustomerSearchScreen({super.key, this.onNavigateTab});

  /// Switch customer dashboard tab after popping (empty-state CTAs).
  final ValueChanged<CustomerTab>? onNavigateTab;

  @override
  ConsumerState<CustomerSearchScreen> createState() =>
      _CustomerSearchScreenState();
}

class _CustomerSearchScreenState extends ConsumerState<CustomerSearchScreen> {
  late final TextEditingController _controller;
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController();
    _controller.addListener(() {
      if (mounted) setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _focusNode.requestFocus();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    ref.read(searchQueryProvider.notifier).setQuery(value);
  }

  Future<void> _submit([String? override]) async {
    final term = (override ?? _controller.text).trim();
    if (override != null) {
      _controller.text = term;
      _controller.selection = TextSelection.collapsed(offset: term.length);
    }
    await ref.read(searchQueryProvider.notifier).submit(term);
  }

  void _clear() {
    _controller.clear();
    ref.read(searchQueryProvider.notifier).clear();
  }

  void _openHit(SearchHit hit) {
    switch (hit.type) {
      case 'occasion':
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => CategoryDetailScreen(
              code: hit.code,
              title: hit.name,
              isOccasion: true,
            ),
          ),
        );
        return;
      case 'stage':
        if (!hit.hasStructuredParentOccasion) return;
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => CategoryDetailScreen(
              code: hit.parentOccasionCode!.trim(),
              title: hit.parentOccasionName!.trim(),
              isOccasion: true,
            ),
          ),
        );
        return;
      case 'service':
      case 'venue':
      case 'other':
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => ServiceDetailScreen(
              code: hit.code,
              title: hit.name,
              imageUrl: hit.imageUrl,
            ),
          ),
        );
        return;
      case 'product':
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => ProductDetailScreen(
              code: hit.code,
              title: hit.name,
              imageUrl: hit.imageUrl,
            ),
          ),
        );
        return;
      case 'category':
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => CategoryDetailScreen(
              code: hit.code,
              title: hit.name,
              isOccasion: false,
            ),
          ),
        );
        return;
      default:
        return;
    }
  }

  void _browseTab(CustomerTab tab, {required int exploreIntent}) {
    ref.read(exploreIntentProvider.notifier).state = exploreIntent;
    if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
    widget.onNavigateTab?.call(tab);
  }

  @override
  Widget build(BuildContext context) {
    final search = ref.watch(searchQueryProvider);
    final recent = ref.watch(recentSearchesProvider);
    final trendingAsync = ref.watch(trendingSearchesProvider);
    final showIdle = search.isIdle;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: MeAppBar(
        title: 'Search',
        leading: MeIconButton(
          icon: Icons.arrow_back_rounded,
          color: AppColors.ink,
          onPressed: () => Navigator.pop(context),
          tooltip: 'Back',
        ),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.sm,
              AppSpacing.lg,
              AppSpacing.md,
            ),
            child: Semantics(
              textField: true,
              label: 'Search occasions, functions and services',
              value: _controller.text,
              child: _SearchField(
                controller: _controller,
                focusNode: _focusNode,
                onChanged: _onChanged,
                onSubmitted: _submit,
                onClear: _controller.text.isEmpty ? null : _clear,
              ),
            ),
          ),
          Expanded(
            child: showIdle
                ? SearchIdlePanel(
                    recent: recent,
                    trendingAsync: trendingAsync.when(
                      data: (data) =>
                          AsyncSnapshot.withData(ConnectionState.done, data),
                      error: (error, _) =>
                          AsyncSnapshot.withError(ConnectionState.done, error),
                      loading: () => const AsyncSnapshot.waiting(),
                    ),
                    onRecentTap: _submit,
                    onRecentRemove: (term) {
                      unawaited(
                        ref
                            .read(recentSearchesProvider.notifier)
                            .remove(term)
                            .then((_) {}, onError: (_) {}),
                      );
                    },
                    onClearRecent: () {
                      unawaited(
                        ref
                            .read(recentSearchesProvider.notifier)
                            .clear()
                            .then((_) {}, onError: (_) {}),
                      );
                    },
                    onTrendingTap: _submit,
                    onRetryTrending: () =>
                        ref.invalidate(trendingSearchesProvider),
                    onBrowseOccasions: () =>
                        _browseTab(CustomerTab.explore, exploreIntent: 0),
                    onBrowseServices: () =>
                        _browseTab(CustomerTab.explore, exploreIntent: 1),
                  )
                : _ResultsBody(
                    state: search,
                    onRetry: () =>
                        ref.read(searchQueryProvider.notifier).retry(),
                    onHit: _openHit,
                    onLoadMore: () =>
                        ref.read(searchQueryProvider.notifier).loadMore(),
                    onBrowseServices: () =>
                        _browseTab(CustomerTab.explore, exploreIntent: 1),
                    onBrowseOccasions: () =>
                        _browseTab(CustomerTab.explore, exploreIntent: 0),
                  ),
          ),
        ],
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({
    required this.controller,
    required this.focusNode,
    required this.onChanged,
    required this.onSubmitted,
    this.onClear,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;
  final ValueChanged<String> onSubmitted;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      focusNode: focusNode,
      onChanged: onChanged,
      onSubmitted: onSubmitted,
      autofocus: true,
      textInputAction: TextInputAction.search,
      style: AppTypography.bodyMd,
      decoration: meInputDecoration(
        hint: 'Search occasions, functions, services...',
        prefixIcon: const Icon(
          Icons.search,
          size: AppIconSize.md,
          color: AppColors.muted,
        ),
        suffixIcon: onClear == null
            ? null
            : Semantics(
                button: true,
                enabled: true,
                label: 'Clear search',
                onTap: onClear,
                excludeSemantics: true,
                child: IconButton(
                  onPressed: onClear,
                  tooltip: 'Clear search',
                  style: IconButton.styleFrom(minimumSize: const Size(44, 44)),
                  icon: const Icon(Icons.close, size: AppIconSize.md),
                ),
              ),
      ),
    );
  }
}

class _ResultsBody extends StatelessWidget {
  const _ResultsBody({
    required this.state,
    required this.onRetry,
    required this.onHit,
    required this.onLoadMore,
    required this.onBrowseServices,
    required this.onBrowseOccasions,
  });

  final SearchQueryState state;
  final VoidCallback onRetry;
  final ValueChanged<SearchHit> onHit;
  final VoidCallback onLoadMore;
  final VoidCallback onBrowseServices;
  final VoidCallback onBrowseOccasions;

  @override
  Widget build(BuildContext context) {
    if (state.isLoading && state.results.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(AppSpacing.lg),
        child: Column(
          children: [
            MeSkeleton(height: 22, width: 180),
            SizedBox(height: AppSpacing.lg),
            MeSkeleton(height: 64),
            SizedBox(height: AppSpacing.sm),
            MeSkeleton(height: 64),
            SizedBox(height: AppSpacing.sm),
            MeSkeleton(height: 64),
          ],
        ),
      );
    }

    if (state.error != null && state.results.isEmpty) {
      return MeErrorState(
        kind: MeErrorKind.generic,
        title: 'Search unavailable',
        message: 'Please try again.',
        onRetry: onRetry,
      );
    }

    if (state.hasSearched && state.results.isEmpty && !state.isLoading) {
      if (state.nextCursor != null || state.loadMoreError != null) {
        return _MoreMatchesAvailable(
          onLoadMore: onLoadMore,
          isLoadingMore: state.isLoadingMore,
          loadMoreError: state.loadMoreError,
        );
      }
      return _EmptySearch(
        query: state.query,
        onBrowseServices: onBrowseServices,
        onBrowseOccasions: onBrowseOccasions,
      );
    }

    final sections = groupSearchHits(state.results);
    return ListView(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        0,
        AppSpacing.lg,
        AppSpacing.xxxl,
      ),
      children: [
        Semantics(
          liveRegion: true,
          child: Text(
            searchResultSummary(
              query: state.debouncedQuery,
              loadedCount: state.results.length,
              hasMore: state.nextCursor != null,
            ),
            style: AppTypography.captionSm.copyWith(color: AppColors.muted),
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        for (final section in sections) ...[
          Semantics(
            header: true,
            child: Text(
              searchGroupHeading(section.group),
              style: AppTypography.titleMd,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          for (final hit in section.hits) ...[
            SearchResultTile(hit: hit, onTap: () => onHit(hit)),
            const SizedBox(height: AppSpacing.sm),
          ],
          const SizedBox(height: AppSpacing.md),
        ],
        if (state.loadMoreError != null) ...[
          MeErrorState(
            kind: MeErrorKind.generic,
            title: 'Could not load more results',
            message: 'Please try again.',
            onRetry: onLoadMore,
          ),
        ] else if (state.isLoadingMore)
          const Padding(
            padding: EdgeInsets.all(AppSpacing.lg),
            child: Center(child: MeCircularLoader()),
          )
        else if (state.nextCursor != null)
          Semantics(
            button: true,
            enabled: true,
            label: 'Load more results',
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: onLoadMore,
                child: const Text(
                  'Load more results',
                  textAlign: TextAlign.center,
                  maxLines: 2,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _MoreMatchesAvailable extends StatelessWidget {
  const _MoreMatchesAvailable({
    required this.onLoadMore,
    required this.isLoadingMore,
    required this.loadMoreError,
  });

  final VoidCallback onLoadMore;
  final bool isLoadingMore;
  final Object? loadMoreError;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'More matches are available',
            style: AppTypography.titleLg,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.xl),
          if (loadMoreError != null)
            MeErrorState(
              kind: MeErrorKind.generic,
              title: 'Could not load more results',
              message: 'Please try again.',
              onRetry: onLoadMore,
            )
          else if (isLoadingMore)
            const Center(child: MeCircularLoader())
          else
            Semantics(
              button: true,
              enabled: true,
              label: 'Load more results',
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: onLoadMore,
                  child: const Text(
                    'Load more results',
                    textAlign: TextAlign.center,
                    maxLines: 2,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _EmptySearch extends StatelessWidget {
  const _EmptySearch({
    required this.query,
    required this.onBrowseServices,
    required this.onBrowseOccasions,
  });

  final String query;
  final VoidCallback onBrowseServices;
  final VoidCallback onBrowseOccasions;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: AppSpacing.xxxl),
          Text(
            'No results for “$query”',
            style: AppTypography.titleLg,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Try another keyword, or browse the catalogue.',
            style: AppTypography.bodyMd.copyWith(color: AppColors.muted),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.xxl),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
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
      ),
    );
  }
}
