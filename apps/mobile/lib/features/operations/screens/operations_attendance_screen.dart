import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/screens/login_screen.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/operations/providers/operations_providers.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Attendance logs with simple check-in / check-out dialogs.
class OperationsAttendanceScreen extends ConsumerStatefulWidget {
  const OperationsAttendanceScreen({super.key});

  @override
  ConsumerState<OperationsAttendanceScreen> createState() =>
      _OperationsAttendanceScreenState();
}

class _OperationsAttendanceScreenState
    extends ConsumerState<OperationsAttendanceScreen> {
  bool _busy = false;

  Future<void> _run(Future<void> Function() action) async {
    setState(() => _busy = true);
    try {
      await action();
      ref.invalidate(operationsAttendanceProvider);
      ref.invalidate(operationsDashboardProvider);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.toString())));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _showCheckInDialog() async {
    final eventController = TextEditingController();
    final workerController = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Check in'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: eventController,
              decoration: const InputDecoration(labelText: 'Event record ID'),
            ),
            const SizedBox(height: AppSpacing.sm),
            TextField(
              controller: workerController,
              decoration: const InputDecoration(labelText: 'Worker ID'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Check in'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final eventRecordId = eventController.text.trim();
    final workerId = workerController.text.trim();
    if (eventRecordId.isEmpty || workerId.isEmpty) return;
    await _run(
      () => ref.read(operationsRepositoryProvider).checkIn({
        'eventRecordId': eventRecordId,
        'workerId': workerId,
      }),
    );
  }

  Future<void> _showCheckOutDialog() async {
    final logController = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Check out'),
        content: TextField(
          controller: logController,
          decoration: const InputDecoration(labelText: 'Attendance log ID'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Check out'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final attendanceLogId = logController.text.trim();
    if (attendanceLogId.isEmpty) return;
    await _run(
      () => ref.read(operationsRepositoryProvider).checkOut({
        'attendanceLogId': attendanceLogId,
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    if (session == null) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: const MeAppBar(title: 'Attendance'),
        body: MeEmptyState(
          kind: MeEmptyKind.workers,
          title: 'Sign in required',
          message: 'Sign in to manage attendance.',
          actionLabel: 'Sign in',
          onAction: () {
            Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
          },
        ),
      );
    }

    final logs = ref.watch(operationsAttendanceProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(title: 'Attendance'),
      body: logs.when(
        loading: () => const Center(child: MeCircularLoader()),
        error: (error, _) => MeErrorState(
          title: 'Could not load attendance',
          message: error.toString(),
          onRetry: () => ref.invalidate(operationsAttendanceProvider),
        ),
        data: (items) {
          if (items == null) {
            return const MeEmptyState(
              kind: MeEmptyKind.workers,
              title: 'No attendance session',
              message: 'Operations access required.',
            );
          }
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Text('Attendance', style: AppTypography.displaySm),
              const SizedBox(height: AppSpacing.md),
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  FilledButton(
                    onPressed: _busy ? null : _showCheckInDialog,
                    child: const Text('Check in'),
                  ),
                  OutlinedButton(
                    onPressed: _busy ? null : _showCheckOutDialog,
                    child: const Text('Check out'),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),
              Text('Logs', style: AppTypography.titleMd),
              const SizedBox(height: AppSpacing.sm),
              if (items.isEmpty)
                const Text('No attendance logs yet.')
              else
                ...items.map(
                  (log) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(log.workerName ?? log.workerId),
                    subtitle: Text(
                      '${log.eventRecordId} · ${log.status}'
                      '${log.checkInAt != null ? ' · in ${log.checkInAt}' : ''}'
                      '${log.workingMinutes != null ? ' · ${log.workingMinutes}m' : ''}',
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
