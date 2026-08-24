import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/manager/providers/manager_providers.dart';
import 'package:mee_events/features/manager/screens/manager_progress_screen.dart';
import 'package:mee_events/features/manager/screens/manager_task_screen.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class ManagerEventScreen extends ConsumerWidget {
  const ManagerEventScreen({super.key, required this.eventId});

  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(managerEventDashboardProvider(eventId));

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(title: 'Event ops'),
      body: async.when(
        loading: () => const Center(child: MeCircularLoader()),
        error: (error, _) => MeErrorState(
          title: 'Could not load event',
          message: error.toString(),
          onRetry: () => ref.invalidate(managerEventDashboardProvider(eventId)),
        ),
        data: (data) {
          if (data == null) {
            return const MeEmptyState(
              kind: MeEmptyKind.events,
              title: 'Unavailable',
              message: 'This event is not assigned to you.',
            );
          }
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Text(data.event.eventNumber, style: AppTypography.titleLg),
              Text(data.event.eventName, style: AppTypography.bodyMd),
              Text(
                '${data.event.venueName ?? 'Venue TBD'} · ${data.event.eventDate ?? 'Date TBD'}',
                style: AppTypography.caption,
              ),
              const SizedBox(height: AppSpacing.lg),
              MeButton.primary(
                label: 'Add progress update',
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => ManagerProgressScreen(eventId: eventId),
                    ),
                  );
                },
              ),
              const SizedBox(height: AppSpacing.xl),
              Text('Tasks', style: AppTypography.titleMd),
              ...data.tasks.map(
                (task) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(task.title),
                  subtitle: Text(task.status.replaceAll('_', ' ')),
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
              Text('Timeline', style: AppTypography.titleMd),
              ...data.timeline.map(
                (item) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(item.title),
                  subtitle: Text(item.content),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              Text('Activity', style: AppTypography.titleMd),
              ...data.activities.map(
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
