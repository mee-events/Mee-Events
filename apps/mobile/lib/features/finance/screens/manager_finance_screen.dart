import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/screens/login_screen.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/finance/providers/finance_providers.dart';
import 'package:mee_events/features/finance/screens/manager_event_finance_screen.dart';
import 'package:mee_events/features/manager/providers/manager_providers.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Manager: event finance summaries, vendor settlements, worker payouts.
class ManagerFinanceScreen extends ConsumerWidget {
  const ManagerFinanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    if (session == null) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: const MeAppBar(title: 'Event finance'),
        body: MeEmptyState(
          kind: MeEmptyKind.events,
          title: 'Sign in required',
          message: 'Sign in as a manager to view event finance.',
          actionLabel: 'Sign in',
          onAction: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const LoginScreen()),
            );
          },
        ),
      );
    }

    final dashboard = ref.watch(managerDashboardProvider);
    final vendors = ref.watch(managerVendorSettlementsProvider);
    final workers = ref.watch(managerWorkerPayoutsProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(title: 'Event finance'),
      body: dashboard.when(
        loading: () => const Center(child: MeCircularLoader()),
        error: (error, _) => MeErrorState(
          title: 'Could not load finance',
          message: error.toString(),
          onRetry: () => ref.invalidate(managerDashboardProvider),
        ),
        data: (snap) {
          if (snap == null) {
            return const MeEmptyState(
              kind: MeEmptyKind.events,
              title: 'No manager session',
              message: 'Manager finance access required.',
            );
          }
          final vendorItems = vendors.maybeWhen(
            data: (list) => list ?? const [],
            orElse: () => const [],
          );
          final workerItems = workers.maybeWhen(
            data: (list) => list ?? const [],
            orElse: () => const [],
          );
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Text('Assigned events', style: AppTypography.titleLg),
              const SizedBox(height: AppSpacing.sm),
              if (snap.myEvents.isEmpty)
                const Text('No assigned events.')
              else
                ...snap.myEvents.map(
                  (event) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(event.eventNumber),
                    subtitle: Text(
                      '${event.eventName} · finance summary',
                      style: AppTypography.bodySm,
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ManagerEventFinanceScreen(
                            eventRecordId: event.id,
                            eventNumber: event.eventNumber,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              const SizedBox(height: AppSpacing.xl),
              Text('Vendor settlements', style: AppTypography.titleMd),
              const SizedBox(height: AppSpacing.sm),
              if (vendorItems.isEmpty)
                const Text('No vendor settlements.')
              else
                ...vendorItems.map(
                  (item) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(item.label),
                    subtitle: Text(
                      '₹${item.amount} · ${item.status}',
                      style: AppTypography.bodySm,
                    ),
                  ),
                ),
              const SizedBox(height: AppSpacing.xl),
              Text('Worker payouts', style: AppTypography.titleMd),
              const SizedBox(height: AppSpacing.sm),
              if (workerItems.isEmpty)
                const Text('No worker payouts.')
              else
                ...workerItems.map(
                  (item) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(item.label),
                    subtitle: Text(
                      '₹${item.amount} · ${item.status}',
                      style: AppTypography.bodySm,
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
