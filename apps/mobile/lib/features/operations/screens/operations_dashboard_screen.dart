import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/screens/login_screen.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/operations/providers/operations_providers.dart';
import 'package:mee_events/features/operations/screens/operations_attendance_screen.dart';
import 'package:mee_events/features/operations/screens/operations_issues_screen.dart';
import 'package:mee_events/features/operations/screens/operations_tasks_screen.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Manager-focused event execution dashboard.
class OperationsDashboardScreen extends ConsumerWidget {
  const OperationsDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    if (session == null) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: const MeAppBar(title: 'Event execution'),
        body: MeEmptyState(
          kind: MeEmptyKind.events,
          title: 'Sign in required',
          message: 'Sign in to view event execution operations.',
          actionLabel: 'Sign in',
          onAction: () {
            Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
          },
        ),
      );
    }

    final dashboard = ref.watch(operationsDashboardProvider);
    final progress = ref.watch(operationsProgressProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(title: 'Event execution'),
      body: dashboard.when(
        loading: () => const Center(child: MeCircularLoader()),
        error: (error, _) => MeErrorState(
          title: 'Could not load operations',
          message: error.toString(),
          onRetry: () => ref.invalidate(operationsDashboardProvider),
        ),
        data: (snap) {
          if (snap == null) {
            return const MeEmptyState(
              kind: MeEmptyKind.events,
              title: 'No operations session',
              message: 'Sign in with an operations role to continue.',
            );
          }
          final progressItems = progress.maybeWhen(
            data: (list) => list ?? const [],
            orElse: () => const [],
          );
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Text('Operations overview', style: AppTypography.displaySm),
              const SizedBox(height: AppSpacing.sm),
              Text(
                '${snap.totalEvents} events · ${snap.inProgressEvents} in progress · ${snap.completedEvents} completed',
                style: AppTypography.bodyMd,
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                '${snap.pendingTasks} pending tasks · ${snap.openIssues} open issues · ${snap.checkedInWorkers} checked in',
                style: AppTypography.bodySm,
              ),
              const SizedBox(height: AppSpacing.md),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Tasks'),
                subtitle: const Text("Today's and assigned execution tasks"),
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
                title: const Text('Attendance'),
                subtitle: const Text('Check-in / check-out logs'),
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
                subtitle: const Text('Report and track event issues'),
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
              Text('Event progress', style: AppTypography.titleMd),
              const SizedBox(height: AppSpacing.sm),
              if (progressItems.isEmpty)
                const Text('No progress snapshots yet.')
              else
                ...progressItems.map(
                  (item) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      item.eventNumber ?? item.eventName ?? item.eventRecordId,
                    ),
                    subtitle: Text(
                      '${item.overallCompletionPercent}% · ${item.completedTasks}/${item.totalTasks} tasks · ${item.status.replaceAll('_', ' ')}',
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
