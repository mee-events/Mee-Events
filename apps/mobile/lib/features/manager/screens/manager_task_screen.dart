import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/manager/providers/manager_providers.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class ManagerTaskScreen extends ConsumerWidget {
  const ManagerTaskScreen({super.key, required this.taskId});

  final String taskId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(managerTaskDetailProvider(taskId));

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(title: 'Task'),
      body: async.when(
        loading: () => const Center(child: MeCircularLoader()),
        error: (error, _) => MeErrorState(
          title: 'Could not load task',
          message: error.toString(),
          onRetry: () => ref.invalidate(managerTaskDetailProvider(taskId)),
        ),
        data: (task) {
          if (task == null) {
            return const MeEmptyState(
              kind: MeEmptyKind.events,
              title: 'Task unavailable',
              message: 'Sign in to view this task.',
            );
          }
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Text(task.title, style: AppTypography.titleLg),
              Text(
                '${task.status.replaceAll('_', ' ')} · ${task.priority}',
                style: AppTypography.bodyMd,
              ),
              if (task.description != null) ...[
                const SizedBox(height: AppSpacing.md),
                Text(task.description!, style: AppTypography.bodyMd),
              ],
              const SizedBox(height: AppSpacing.lg),
              if (task.status != 'completed')
                MeButton.primary(
                  label: 'Mark completed',
                  onPressed: () async {
                    await ref
                        .read(managerOperationsRepositoryProvider)
                        .completeTask(taskId);
                    ref.invalidate(managerTaskDetailProvider(taskId));
                    ref.invalidate(managerDashboardProvider);
                  },
                ),
              const SizedBox(height: AppSpacing.xl),
              Text('Comments', style: AppTypography.titleMd),
              ...task.comments.map(
                (item) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(item.content),
                  subtitle: Text(item.occurredAt),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              Text('History', style: AppTypography.titleMd),
              ...task.history.map(
                (item) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(item.title),
                  subtitle: Text(item.content),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
