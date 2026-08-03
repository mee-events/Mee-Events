import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/screens/login_screen.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/operations/providers/operations_providers.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Today's / assigned operations tasks list.
class OperationsTasksScreen extends ConsumerWidget {
  const OperationsTasksScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    if (session == null) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: const MeAppBar(title: 'Tasks'),
        body: MeEmptyState(
          kind: MeEmptyKind.events,
          title: 'Sign in required',
          message: 'Sign in to view assigned execution tasks.',
          actionLabel: 'Sign in',
          onAction: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const LoginScreen()),
            );
          },
        ),
      );
    }

    final tasks = ref.watch(operationsTasksProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(title: 'Tasks'),
      body: tasks.when(
        loading: () => const Center(child: MeCircularLoader()),
        error: (error, _) => MeErrorState(
          title: 'Could not load tasks',
          message: error.toString(),
          onRetry: () => ref.invalidate(operationsTasksProvider),
        ),
        data: (items) {
          if (items == null) {
            return const MeEmptyState(
              kind: MeEmptyKind.events,
              title: 'No tasks session',
              message: 'Operations access required.',
            );
          }
          if (items.isEmpty) {
            return const MeEmptyState(
              kind: MeEmptyKind.events,
              title: 'No tasks',
              message: 'No assigned execution tasks right now.',
            );
          }
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Text("Today's tasks", style: AppTypography.displaySm),
              const SizedBox(height: AppSpacing.md),
              ...items.map(
                (task) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(task.title),
                  subtitle: Text(
                    '${task.eventNumber ?? task.eventRecordId} · ${task.status} · ${task.completionPercent}%'
                    '${task.isMandatory ? ' · mandatory' : ''}',
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
