import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/screens/login_screen.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/operations/providers/operations_providers.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Event issues list with create form.
class OperationsIssuesScreen extends ConsumerStatefulWidget {
  const OperationsIssuesScreen({super.key});

  @override
  ConsumerState<OperationsIssuesScreen> createState() =>
      _OperationsIssuesScreenState();
}

class _OperationsIssuesScreenState
    extends ConsumerState<OperationsIssuesScreen> {
  bool _busy = false;

  Future<void> _showCreateIssueDialog() async {
    final eventController = TextEditingController();
    final descriptionController = TextEditingController();
    var issueType = 'other';
    var priority = 'normal';

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Report issue'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: eventController,
                  decoration: const InputDecoration(
                    labelText: 'Event record ID',
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                TextField(
                  controller: descriptionController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                DropdownButtonFormField<String>(
                  value: issueType,
                  decoration: const InputDecoration(labelText: 'Type'),
                  items: const [
                    DropdownMenuItem(value: 'other', child: Text('Other')),
                    DropdownMenuItem(
                      value: 'vendor_late',
                      child: Text('Vendor late'),
                    ),
                    DropdownMenuItem(
                      value: 'material_missing',
                      child: Text('Material missing'),
                    ),
                    DropdownMenuItem(
                      value: 'equipment_failure',
                      child: Text('Equipment failure'),
                    ),
                    DropdownMenuItem(value: 'rain', child: Text('Rain')),
                    DropdownMenuItem(
                      value: 'staff_absent',
                      child: Text('Staff absent'),
                    ),
                    DropdownMenuItem(
                      value: 'emergency',
                      child: Text('Emergency'),
                    ),
                  ],
                  onChanged: (value) {
                    if (value == null) return;
                    setDialogState(() => issueType = value);
                  },
                ),
                const SizedBox(height: AppSpacing.sm),
                DropdownButtonFormField<String>(
                  value: priority,
                  decoration: const InputDecoration(labelText: 'Priority'),
                  items: const [
                    DropdownMenuItem(value: 'low', child: Text('Low')),
                    DropdownMenuItem(value: 'normal', child: Text('Normal')),
                    DropdownMenuItem(value: 'high', child: Text('High')),
                    DropdownMenuItem(
                      value: 'critical',
                      child: Text('Critical'),
                    ),
                  ],
                  onChanged: (value) {
                    if (value == null) return;
                    setDialogState(() => priority = value);
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );

    if (confirmed != true) return;
    final eventRecordId = eventController.text.trim();
    final description = descriptionController.text.trim();
    if (eventRecordId.isEmpty || description.isEmpty) return;

    setState(() => _busy = true);
    try {
      await ref.read(operationsRepositoryProvider).createIssue({
        'eventRecordId': eventRecordId,
        'description': description,
        'issueType': issueType,
        'priority': priority,
      });
      ref.invalidate(operationsIssuesProvider);
      ref.invalidate(operationsDashboardProvider);
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
    final session = ref.watch(sessionProvider);
    if (session == null) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: const MeAppBar(title: 'Issues'),
        body: MeEmptyState(
          kind: MeEmptyKind.events,
          title: 'Sign in required',
          message: 'Sign in to view and report issues.',
          actionLabel: 'Sign in',
          onAction: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const LoginScreen()),
            );
          },
        ),
      );
    }

    final issues = ref.watch(operationsIssuesProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: MeAppBar(
        title: 'Issues',
        actions: [
          IconButton(
            onPressed: _busy ? null : _showCreateIssueDialog,
            icon: const Icon(Icons.add),
            tooltip: 'Report issue',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _busy ? null : _showCreateIssueDialog,
        child: const Icon(Icons.add),
      ),
      body: issues.when(
        loading: () => const Center(child: MeCircularLoader()),
        error: (error, _) => MeErrorState(
          title: 'Could not load issues',
          message: error.toString(),
          onRetry: () => ref.invalidate(operationsIssuesProvider),
        ),
        data: (items) {
          if (items == null) {
            return const MeEmptyState(
              kind: MeEmptyKind.events,
              title: 'No issues session',
              message: 'Operations access required.',
            );
          }
          if (items.isEmpty) {
            return const MeEmptyState(
              kind: MeEmptyKind.events,
              title: 'No issues',
              message: 'No open event issues reported.',
            );
          }
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Text('Event issues', style: AppTypography.displaySm),
              const SizedBox(height: AppSpacing.md),
              ...items.map(
                (issue) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(issue.description),
                  subtitle: Text(
                    '${issue.issueType} · ${issue.priority} · ${issue.status} · ${issue.createdAt}',
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
