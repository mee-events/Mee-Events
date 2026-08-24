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
        appBar: MeAppBar(
          title: 'Payments',
          leading: MeIconButton(
            icon: Icons.arrow_back_rounded,
            color: AppColors.ink,
            onPressed: () => Navigator.pop(context),
            tooltip: 'Back',
          ),
        ),
        body: MeEmptyState(
          kind: MeEmptyKind.generic,
          title: 'Sign in required',
          message: 'Sign in to view payment history, invoices, and receipts.',
          actionLabel: 'Sign in',
          onAction: () {
            Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
          },
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: MeAppBar(
        title: 'Payments & billing',
        leading: MeIconButton(
          icon: Icons.arrow_back_rounded,
          color: AppColors.ink,
          onPressed: () => Navigator.pop(context),
          tooltip: 'Back',
        ),
        bottom: TabBar(
          controller: _tabs,
          labelColor: AppColors.ink,
          unselectedLabelColor: AppColors.muted,
          indicatorColor: AppColors.ink,
          labelStyle: AppTypography.titleSm,
          unselectedLabelStyle: AppTypography.titleSm,
          tabs: const [
            Tab(text: 'Payments'),
            Tab(text: 'Invoices'),
            Tab(text: 'Receipts'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: const [_PaymentsTab(), _InvoicesTab(), _ReceiptsTab()],
      ),
    );
  }
}

MeStatusTone _financeStatusTone(String status) {
  final normalized = status.toLowerCase();
  if (normalized.contains('paid') ||
      normalized.contains('confirmed') ||
      normalized.contains('success') ||
      normalized.contains('issued') ||
      normalized == 'complete' ||
      normalized == 'completed') {
    return MeStatusTone.success;
  }
  if (normalized.contains('pending') ||
      normalized.contains('await') ||
      normalized.contains('due')) {
    return MeStatusTone.warning;
  }
  if (normalized.contains('fail') ||
      normalized.contains('cancel') ||
      normalized.contains('overdue') ||
      normalized.contains('reject')) {
    return MeStatusTone.error;
  }
  return MeStatusTone.neutral;
}

String _statusLabel(String status) {
  final trimmed = status.trim();
  if (trimmed.isEmpty) return 'Unknown';
  return trimmed[0].toUpperCase() + trimmed.substring(1);
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
            message:
                'Advance and balance payments for your events appear here.',
          );
        }
        return ListView.separated(
          padding: const EdgeInsets.all(AppSpacing.lg),
          itemCount: items.length,
          separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
          itemBuilder: (context, index) {
            final item = items[index];
            return MeOrderCard(
              reference: item.referenceCode,
              title: '₹${item.amount} · ${item.paymentKind}',
              subtitle: item.eventNumber ?? item.eventRecordId,
              status: MeBadge(
                label: _statusLabel(item.status),
                tone: _financeStatusTone(item.status),
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
          separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
          itemBuilder: (context, index) {
            final item = items[index];
            return MeOrderCard(
              reference: item.invoiceNumber,
              title: '₹${item.amount}',
              subtitle: item.eventNumber ?? 'Event',
              status: MeBadge(
                label: _statusLabel(item.status),
                tone: _financeStatusTone(item.status),
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
          separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
          itemBuilder: (context, index) {
            final item = items[index];
            return MeOrderCard(
              reference: item.receiptNumber,
              title: '₹${item.amount}',
              subtitle: item.eventNumber ?? 'Event',
              status: MeBadge(
                label: _statusLabel(item.status),
                tone: _financeStatusTone(item.status),
              ),
            );
          },
        );
      },
    );
  }
}
