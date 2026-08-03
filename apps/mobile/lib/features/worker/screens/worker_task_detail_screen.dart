import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/worker/providers/worker_providers.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class WorkerTaskDetailScreen extends ConsumerStatefulWidget {
  const WorkerTaskDetailScreen({super.key, required this.taskId});

  final String taskId;

  @override
  ConsumerState<WorkerTaskDetailScreen> createState() =>
      _WorkerTaskDetailScreenState();
}

class _WorkerTaskDetailScreenState
    extends ConsumerState<WorkerTaskDetailScreen> {
  final _progressController = TextEditingController();
  final _checkoutController = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _progressController.dispose();
    _checkoutController.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _busy = true);
    try {
      await action();
      ref.invalidate(workerTaskDetailProvider(widget.taskId));
      ref.invalidate(workerDashboardProvider);
      ref.invalidate(workerTasksProvider);
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
    final detail = ref.watch(workerTaskDetailProvider(widget.taskId));
    final repo = ref.watch(workerOperationsRepositoryProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(title: 'Task'),
      body: detail.when(
        loading: () => const Center(child: MeCircularLoader()),
        error: (error, _) => MeErrorState(
          title: 'Could not load task',
          message: error.toString(),
          onRetry: () =>
              ref.invalidate(workerTaskDetailProvider(widget.taskId)),
        ),
        data: (task) {
          if (task == null) {
            return const MeEmptyState(
              kind: MeEmptyKind.generic,
              title: 'Task not found',
              message: 'This task is unavailable.',
            );
          }
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Text(task.title, style: AppTypography.titleLg),
              const SizedBox(height: AppSpacing.sm),
              Text(
                '${task.eventNumber ?? task.eventRecordId} · ${task.status}',
                style: AppTypography.bodyMd,
              ),
              if (task.description != null) ...[
                const SizedBox(height: AppSpacing.md),
                Text(task.description!, style: AppTypography.bodyMd),
              ],
              const SizedBox(height: AppSpacing.xl),
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  if (task.status == 'assigned')
                    FilledButton(
                      onPressed: _busy
                          ? null
                          : () => _run(() => repo.accept(task.id)),
                      child: const Text('Accept'),
                    ),
                  if (task.status == 'assigned')
                    OutlinedButton(
                      onPressed: _busy
                          ? null
                          : () => _run(
                                () => repo.reject(task.id, 'Unavailable'),
                              ),
                      child: const Text('Reject'),
                    ),
                  if (['accepted', 'travelling'].contains(task.status))
                    FilledButton(
                      onPressed: _busy
                          ? null
                          : () => _run(
                                () => repo.checkIn(
                                  taskId: task.id,
                                  gpsPlaceholder: '17.3850,78.4867',
                                  locationPlaceholder: 'Venue gate',
                                ),
                              ),
                      child: const Text('Check in'),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),
              Text('Progress update', style: AppTypography.titleMd),
              TextField(
                controller: _progressController,
                decoration: const InputDecoration(
                  hintText: 'What did you complete?',
                ),
                maxLines: 3,
              ),
              const SizedBox(height: AppSpacing.sm),
              FilledButton(
                onPressed: _busy || _progressController.text.trim().isEmpty
                    ? null
                    : () => _run(() async {
                          await repo.progress(
                            taskId: task.id,
                            summary: _progressController.text.trim(),
                            status: 'working',
                          );
                          _progressController.clear();
                        }),
                child: const Text('Post progress'),
              ),
              const SizedBox(height: AppSpacing.xl),
              Text('Check out', style: AppTypography.titleMd),
              TextField(
                controller: _checkoutController,
                decoration: const InputDecoration(
                  hintText: 'Completion notes',
                ),
                maxLines: 2,
              ),
              const SizedBox(height: AppSpacing.sm),
              FilledButton(
                onPressed: _busy
                    ? null
                    : () => _run(() async {
                          await repo.checkOut(
                            taskId: task.id,
                            completionNotes:
                                _checkoutController.text.trim().isEmpty
                                    ? null
                                    : _checkoutController.text.trim(),
                          );
                        }),
                child: const Text('Complete & check out'),
              ),
              const SizedBox(height: AppSpacing.xl),
              Text('Timeline', style: AppTypography.titleMd),
              if (task.timeline.isEmpty)
                const Text('No timeline entries yet.')
              else
                ...task.timeline.map(
                  (item) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(item.title),
                    subtitle: Text(item.content),
                  ),
                ),
              const SizedBox(height: AppSpacing.lg),
              Text('History', style: AppTypography.titleMd),
              ...task.history.map(
                (item) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(item.title),
                  subtitle: Text(item.content),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text('Notes', style: AppTypography.titleMd),
              if (task.notes.isEmpty)
                const Text('No notes yet.')
              else
                ...task.notes.map(
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
