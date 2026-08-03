import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/screens/login_screen.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/inventory/providers/inventory_providers.dart';
import 'package:mee_events/features/inventory/screens/inventory_allocation_detail_screen.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Manager ops: inventory allocation status board.
class InventoryAllocationScreen extends ConsumerWidget {
  const InventoryAllocationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    if (session == null) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: const MeAppBar(title: 'Inventory'),
        body: MeEmptyState(
          kind: MeEmptyKind.generic,
          title: 'Sign in required',
          message: 'Sign in as a manager to allocate inventory.',
          actionLabel: 'Sign in',
          onAction: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const LoginScreen()),
            );
          },
        ),
      );
    }

    final dashboard = ref.watch(inventoryDashboardProvider);
    final allocations = ref.watch(inventoryAllocationsProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(title: 'Inventory'),
      body: dashboard.when(
        loading: () => const Center(child: MeCircularLoader()),
        error: (error, _) => MeErrorState(
          title: 'Could not load inventory',
          message: error.toString(),
          onRetry: () => ref.invalidate(inventoryDashboardProvider),
        ),
        data: (snap) {
          if (snap == null) {
            return const MeEmptyState(
              kind: MeEmptyKind.generic,
              title: 'No inventory session',
              message: 'Manager inventory access required.',
            );
          }
          final items = allocations.maybeWhen(
            data: (list) => list ?? snap.allocations,
            orElse: () => snap.allocations,
          );
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Text('Inventory status', style: AppTypography.titleLg),
              const SizedBox(height: AppSpacing.sm),
              Text(
                '${snap.availableItems} available · ${snap.reservedItems} reserved · ${snap.onSiteItems} on site · ${snap.openAllocations} open',
                style: AppTypography.bodyMd,
              ),
              const SizedBox(height: AppSpacing.xl),
              Text('Allocations', style: AppTypography.titleMd),
              if (items.isEmpty)
                const Text('No open allocations.')
              else
                ...items.map(
                  (item) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(item.itemName ?? item.itemId),
                    subtitle: Text(
                      '${item.eventNumber ?? item.eventRecordId} · ${item.status}',
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => InventoryAllocationDetailScreen(
                            allocationId: item.id,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              const SizedBox(height: AppSpacing.xl),
              Text('Recent movements', style: AppTypography.titleMd),
              if (snap.recentMovements.isEmpty)
                const Text('No movements yet.')
              else
                ...snap.recentMovements.map(
                  (m) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(m.itemName ?? m.itemId),
                    subtitle: Text(
                      '${m.movementType} · ${m.fromPlace ?? ''} → ${m.toPlace ?? ''}',
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
