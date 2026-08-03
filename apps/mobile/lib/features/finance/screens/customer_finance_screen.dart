import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/screens/login_screen.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/finance/providers/finance_providers.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Customer: payment history, invoices, and receipts (event-linked).
class CustomerFinanceScreen extends ConsumerStatefulWidget {
  const CustomerFinanceScreen({super.key, this.initialTab = 0});

  final int initialTab;

  @override
  ConsumerState<CustomerFinanceScreen> createState() =>
      _CustomerFinanceScreenState();
}

class _CustomerFinanceScreenState extends ConsumerState<CustomerFinanceScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(
      length: 3,
      vsync: this,
      initialIndex: widget.initialTab.clamp(0, 2),
    );
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    if (session == null) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: const MeAppBar(title: 'Payments'),
        body: MeEmptyState(
          kind: MeEmptyKind.generic,
          title: 'Sign in required',
          message: 'Sign in to view payment history, invoices, and receipts.',
          actionLabel: 'Sign in',
          onAction: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const LoginScreen()),
            );
          },
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        backgroundColor: AppColors.canvas,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text('Payments & billing', style: AppTypography.displaySm),
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppColors.ink,
          unselectedLabelColor: AppColors.muted,
          indicatorColor: AppColors.ink,
          tabs: const [
            Tab(text: 'Payments'),
            Tab(text: 'Invoices'),
            Tab(text: 'Receipts'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: const [
          _PaymentsTab(),
          _InvoicesTab(),
          _ReceiptsTab(),
        ],
      ),
    );
  }
}

class _PaymentsTab extends ConsumerWidget {
  const _PaymentsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(customerFinancePaymentsProvider);
    return async.when(
      loading: () => const Center(child: MeCircularLoader()),
      error: (error, _) => MeErrorState(
        title: 'Could not load payments',
        message: error.toString(),
        onRetry: () => ref.invalidate(customerFinancePaymentsProvider),
      ),
      data: (items) {
        if (items == null || items.isEmpty) {
          return const MeEmptyState(
            kind: MeEmptyKind.generic,
            title: 'No payments yet',
            message: 'Advance and balance payments for your events appear here.',
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(AppSpacing.lg),
          itemCount: items.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (context, index) {
            final item = items[index];
            return ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(
                '₹${item.amount} · ${item.paymentKind}',
                style: AppTypography.titleMd,
              ),
              subtitle: Text(
                '${item.eventNumber ?? item.eventRecordId} · ${item.status} · ${item.referenceCode}',
                style: AppTypography.bodySm,
              ),
            );
          },
        );
      },
    );
  }
}

class _InvoicesTab extends ConsumerWidget {
  const _InvoicesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(customerFinanceInvoicesProvider);
    return async.when(
      loading: () => const Center(child: MeCircularLoader()),
      error: (error, _) => MeErrorState(
        title: 'Could not load invoices',
        message: error.toString(),
        onRetry: () => ref.invalidate(customerFinanceInvoicesProvider),
      ),
      data: (items) {
        if (items == null || items.isEmpty) {
          return const MeEmptyState(
            kind: MeEmptyKind.generic,
            title: 'No invoices',
            message: 'Issued invoices for your events appear here.',
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(AppSpacing.lg),
          itemCount: items.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (context, index) {
            final item = items[index];
            return ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(item.invoiceNumber, style: AppTypography.titleMd),
              subtitle: Text(
                '${item.eventNumber ?? 'Event'} · ₹${item.amount} · ${item.status}',
                style: AppTypography.bodySm,
              ),
            );
          },
        );
      },
    );
  }
}

class _ReceiptsTab extends ConsumerWidget {
  const _ReceiptsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(customerFinanceReceiptsProvider);
    return async.when(
      loading: () => const Center(child: MeCircularLoader()),
      error: (error, _) => MeErrorState(
        title: 'Could not load receipts',
        message: error.toString(),
        onRetry: () => ref.invalidate(customerFinanceReceiptsProvider),
      ),
      data: (items) {
        if (items == null || items.isEmpty) {
          return const MeEmptyState(
            kind: MeEmptyKind.generic,
            title: 'No receipts',
            message: 'Payment receipts for your events appear here.',
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(AppSpacing.lg),
          itemCount: items.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (context, index) {
            final item = items[index];
            return ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(item.receiptNumber, style: AppTypography.titleMd),
              subtitle: Text(
                '${item.eventNumber ?? 'Event'} · ₹${item.amount} · ${item.status}',
                style: AppTypography.bodySm,
              ),
            );
          },
        );
      },
    );
  }
}
