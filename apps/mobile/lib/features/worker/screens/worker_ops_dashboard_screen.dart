import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/role_switcher/mobile_roles.dart';
import 'package:mee_events/features/auth/role_switcher/role_switch_chip.dart';
import 'package:mee_events/features/auth/role_switcher/show_role_switcher.dart';
import 'package:mee_events/features/auth/screens/login_screen.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/operations/screens/operations_attendance_screen.dart';
import 'package:mee_events/features/operations/screens/operations_issues_screen.dart';
import 'package:mee_events/features/operations/screens/operations_tasks_screen.dart';
import 'package:mee_events/features/worker/providers/worker_providers.dart';
import 'package:mee_events/features/worker/screens/worker_task_detail_screen.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Live Worker Operations MVP dashboard.
class WorkerOpsDashboardScreen extends ConsumerWidget {
  const WorkerOpsDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    if (session == null) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: const MeAppBar(title: 'Worker'),
        body: MeEmptyState(
          kind: MeEmptyKind.workers,
          title: 'Sign in required',
          message: 'Sign in as a worker to view today\'s tasks.',
          actionLabel: 'Sign in',
          onAction: () {
            Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
          },
        ),
      );
    }

    final dashboard = ref.watch(workerDashboardProvider);
    final tasks = ref.watch(workerTasksProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: MeAppBar(
        title: 'Worker',
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.sm),
            child: RoleSwitchChip(
              roleLabel: mobileRoleLabel(session.lastActiveRole),
              onPressed: () => showRoleSwitcher(context: context, ref: ref),
            ),
          ),
        ],
      ),
      body: dashboard.when(
        loading: () => const Center(child: MeCircularLoader()),
        error: (error, _) => MeErrorState(
          title: 'Could not load worker dashboard',
          message: error.toString(),
          onRetry: () => ref.invalidate(workerDashboardProvider),
        ),
        data: (snap) {
          if (snap == null) {
            return const MeEmptyState(
              kind: MeEmptyKind.workers,
              title: 'No worker profile',
              message: 'This account is not linked to a worker profile.',
            );
          }
          final items = tasks.maybeWhen(
            data: (list) => list ?? snap.openTasks,
            orElse: () => snap.openTasks,
          );
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Text('Worker dashboard', style: AppTypography.titleLg),
              const SizedBox(height: AppSpacing.sm),
              Text(
                '${snap.activeTasks} active · ${snap.pendingAcceptances} pending · ${snap.checkedInToday} checked in · ${snap.completedTasks} completed',
                style: AppTypography.bodyMd,
              ),
              const SizedBox(height: AppSpacing.md),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text("Today's Tasks"),
                subtitle: const Text('Execution tasks for today'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const OperationsTasksScreen(),
                    ),
                  );
                },
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Check In/Out'),
                subtitle: const Text('Attendance logs and check-in'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const OperationsAttendanceScreen(),
                    ),
                  );
                },
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Issues'),
                subtitle: const Text('Report event issues'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const OperationsIssuesScreen(),
                    ),
                  );
                },
              ),
              const SizedBox(height: AppSpacing.xl),
              Text('Today\'s tasks', style: AppTypography.titleMd),
              if (items.isEmpty)
                const Text('No tasks assigned yet.')
              else
                ...items.map(
                  (item) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(item.title),
                    subtitle: Text(
                      '${item.eventNumber ?? item.eventRecordId} · ${item.status}',
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) =>
                              WorkerTaskDetailScreen(taskId: item.id),
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
