import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/screens/login_screen.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/manager/providers/manager_providers.dart';
import 'package:mee_events/features/manager/screens/manager_event_screen.dart';
import 'package:mee_events/features/manager/screens/manager_task_screen.dart';
import 'package:mee_events/features/inventory/screens/inventory_allocation_screen.dart';
import 'package:mee_events/features/finance/screens/manager_finance_screen.dart';
import 'package:mee_events/features/operations/screens/operations_dashboard_screen.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class ManagerDashboardScreen extends ConsumerWidget {
  const ManagerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    if (session == null) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: const MeAppBar(title: 'Manager'),
        body: MeEmptyState(
          kind: MeEmptyKind.events,
          title: 'Sign in required',
          message: 'Sign in as an event manager to view assigned work.',
          actionLabel: 'Sign in',
          onAction: () {
            Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
          },
        ),
      );
    }

    final dashboard = ref.watch(managerDashboardProvider);
    final today = ref.watch(managerTodayTasksProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(title: 'Manager'),
      body: dashboard.when(
        loading: () => const Center(child: MeCircularLoader()),
        error: (error, _) => MeErrorState(
          title: 'Could not load dashboard',
          message: error.toString(),
          onRetry: () => ref.invalidate(managerDashboardProvider),
        ),
        data: (snap) {
          if (snap == null) {
            return const MeEmptyState(
              kind: MeEmptyKind.events,
              title: 'No manager session',
              message: 'Sign in with a manager role to continue.',
            );
          }
          final todayTasks = today.maybeWhen(
            data: (items) => items ?? const [],
            orElse: () => snap.upcomingTasks,
          );
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Text('Operations', style: AppTypography.titleLg),
              const SizedBox(height: AppSpacing.sm),
              Text(
                '${snap.assignedEvents} events · ${snap.activeTasks} active tasks · ${snap.overdueTasks} overdue',
                style: AppTypography.bodyMd,
              ),
              const SizedBox(height: AppSpacing.md),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Event execution'),
                subtitle: const Text('Tasks, attendance, issues, progress'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const OperationsDashboardScreen(),
                    ),
                  );
                },
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Inventory allocation'),
                subtitle: const Text('Reserve, dispatch, return assets'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const InventoryAllocationScreen(),
                    ),
                  );
                },
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Event finance'),
                subtitle: const Text(
                  'Summary, vendor settlements, worker payouts',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const ManagerFinanceScreen(),
                    ),
                  );
                },
              ),
              const SizedBox(height: AppSpacing.xl),
              Text("Today's tasks", style: AppTypography.titleMd),
              const SizedBox(height: AppSpacing.sm),
              if (todayTasks.isEmpty)
                const Text('No tasks due today.')
              else
                ...todayTasks.map(
                  (task) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(task.title),
                    subtitle: Text(
                      '${task.eventNumber ?? task.eventRecordId} · ${task.status}',
                    ),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ManagerTaskScreen(taskId: task.id),
                        ),
                      );
                    },
                  ),
                ),
              const SizedBox(height: AppSpacing.xl),
              Text('My events', style: AppTypography.titleMd),
              const SizedBox(height: AppSpacing.sm),
              if (snap.myEvents.isEmpty)
                const Text('No assigned events yet.')
              else
                ...snap.myEvents.map(
                  (event) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(event.eventNumber),
                    subtitle: Text(
                      '${event.eventName} · ${event.status.replaceAll('_', ' ')}',
                    ),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ManagerEventScreen(eventId: event.id),
                        ),
                      );
                    },
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
