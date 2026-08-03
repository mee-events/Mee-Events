import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/inventory/providers/inventory_providers.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class InventoryAllocationDetailScreen extends ConsumerStatefulWidget {
  const InventoryAllocationDetailScreen({
    super.key,
    required this.allocationId,
  });

  final String allocationId;

  @override
  ConsumerState<InventoryAllocationDetailScreen> createState() =>
      _InventoryAllocationDetailScreenState();
}

class _InventoryAllocationDetailScreenState
    extends ConsumerState<InventoryAllocationDetailScreen> {
  bool _busy = false;

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _busy = true);
    try {
      await action();
      ref.invalidate(inventoryAllocationDetailProvider(widget.allocationId));
      ref.invalidate(inventoryDashboardProvider);
      ref.invalidate(inventoryAllocationsProvider);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final detail =
        ref.watch(inventoryAllocationDetailProvider(widget.allocationId));
    final repo = ref.watch(inventoryOperationsRepositoryProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(title: 'Allocation'),
      body: detail.when(
        loading: () => const Center(child: MeCircularLoader()),
        error: (error, _) => MeErrorState(
          title: 'Could not load allocation',
          message: error.toString(),
          onRetry: () => ref.invalidate(
            inventoryAllocationDetailProvider(widget.allocationId),
          ),
        ),
        data: (row) {
          if (row == null) {
            return const MeEmptyState(
              kind: MeEmptyKind.generic,
              title: 'Not found',
              message: 'Allocation unavailable.',
            );
          }
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Text(row.itemName ?? row.itemId, style: AppTypography.titleLg),
              const SizedBox(height: AppSpacing.sm),
              Text(
                '${row.eventNumber ?? row.eventRecordId} · ${row.status}',
                style: AppTypography.bodyMd,
              ),
              const SizedBox(height: AppSpacing.xl),
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  if (row.status == 'reserved')
                    FilledButton(
                      onPressed: _busy
                          ? null
                          : () => _run(
                                () => repo.updateStatus(
                                  allocationId: row.id,
                                  status: 'allocated',
                                ),
                              ),
                      child: const Text('Allocate'),
                    ),
                  if (row.status == 'allocated')
                    FilledButton(
                      onPressed: _busy
                          ? null
                          : () => _run(
                                () => repo.updateStatus(
                                  allocationId: row.id,
                                  status: 'dispatched',
                                  vehiclePlaceholder: 'Vehicle-01',
                                ),
                              ),
                      child: const Text('Dispatch'),
                    ),
                  if (row.status == 'dispatched')
                    FilledButton(
                      onPressed: _busy
                          ? null
                          : () => _run(
                                () => repo.updateStatus(
                                  allocationId: row.id,
                                  status: 'on_site',
                                  venuePlaceholder: 'Venue',
                                ),
                              ),
                      child: const Text('Mark on site'),
                    ),
                  if (['allocated', 'dispatched', 'on_site']
                      .contains(row.status))
                    OutlinedButton(
                      onPressed: _busy
                          ? null
                          : () => _run(() => repo.returnAllocation(row.id)),
                      child: const Text('Return'),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),
              Text('Movement timeline', style: AppTypography.titleMd),
              if (row.movements.isEmpty)
                const Text('No movements yet.')
              else
                ...row.movements.map(
                  (m) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(m.title),
                    subtitle: Text(m.content),
                  ),
                ),
              const SizedBox(height: AppSpacing.lg),
              Text('Event timeline', style: AppTypography.titleMd),
              if (row.timeline.isEmpty)
                const Text('No timeline entries.')
              else
                ...row.timeline.map(
                  (t) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(t.title),
                    subtitle: Text(t.content),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
