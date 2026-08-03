import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/finance/providers/finance_providers.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class ManagerEventFinanceScreen extends ConsumerWidget {
  const ManagerEventFinanceScreen({
    super.key,
    required this.eventRecordId,
    this.eventNumber,
  });

  final String eventRecordId;
  final String? eventNumber;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(managerEventFinanceProvider(eventRecordId));

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: MeAppBar(title: eventNumber ?? 'Event finance'),
      body: async.when(
        loading: () => const Center(child: MeCircularLoader()),
        error: (error, _) => MeErrorState(
          title: 'Could not load summary',
          message: error.toString(),
          onRetry: () =>
              ref.invalidate(managerEventFinanceProvider(eventRecordId)),
        ),
        data: (summary) {
          if (summary == null) {
            return const MeEmptyState(
              kind: MeEmptyKind.generic,
              title: 'No finance summary',
              message: 'Finance has not been initialized for this event.',
            );
          }
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Text('Financial summary', style: AppTypography.titleLg),
              const SizedBox(height: AppSpacing.md),
              _row('Advance received', '₹${summary.advanceReceived}'),
              _row('Balance pending', '₹${summary.balancePending}'),
              _row('Total expense', '₹${summary.totalExpense}'),
              _row('Profit', '₹${summary.profitAmount}'),
              _row('Settlement', summary.settlementStatus),
              const SizedBox(height: AppSpacing.xl),
              Text('Vendor settlements', style: AppTypography.titleMd),
              const SizedBox(height: AppSpacing.sm),
              if (summary.vendorSettlements.isEmpty)
                const Text('None yet.')
              else
                ...summary.vendorSettlements.map(
                  (item) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(item.label),
                    subtitle: Text('₹${item.amount} · ${item.status}'),
                  ),
                ),
              const SizedBox(height: AppSpacing.xl),
              Text('Worker payouts', style: AppTypography.titleMd),
              const SizedBox(height: AppSpacing.sm),
              if (summary.workerPayouts.isEmpty)
                const Text('None yet.')
              else
                ...summary.workerPayouts.map(
                  (item) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(item.label),
                    subtitle: Text('₹${item.amount} · ${item.status}'),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTypography.bodyMd),
          Text(value, style: AppTypography.titleMd),
        ],
      ),
    );
  }
}
