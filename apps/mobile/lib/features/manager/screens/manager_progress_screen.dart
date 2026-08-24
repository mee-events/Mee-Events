import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/manager/providers/manager_providers.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';

class ManagerProgressScreen extends ConsumerStatefulWidget {
  const ManagerProgressScreen({super.key, required this.eventId});

  final String eventId;

  @override
  ConsumerState<ManagerProgressScreen> createState() =>
      _ManagerProgressScreenState();
}

class _ManagerProgressScreenState extends ConsumerState<ManagerProgressScreen> {
  String _kind = 'morning';
  final _summary = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _summary.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_summary.text.trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(managerOperationsRepositoryProvider)
          .addProgress(
            eventId: widget.eventId,
            updateKind: _kind,
            summary: _summary.text.trim(),
          );
      ref.invalidate(managerEventDashboardProvider(widget.eventId));
      ref.invalidate(managerDashboardProvider);
      if (mounted) Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(title: 'Progress update'),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          DropdownButtonFormField<String>(
            initialValue: _kind,
            items: const [
              DropdownMenuItem(value: 'morning', child: Text('Morning')),
              DropdownMenuItem(value: 'afternoon', child: Text('Afternoon')),
              DropdownMenuItem(value: 'evening', child: Text('Evening')),
              DropdownMenuItem(
                value: 'completion_summary',
                child: Text('Completion summary'),
              ),
            ],
            onChanged: (value) {
              if (value != null) setState(() => _kind = value);
            },
            decoration: const InputDecoration(labelText: 'Update kind'),
          ),
          const SizedBox(height: AppSpacing.md),
          TextField(
            controller: _summary,
            maxLines: 5,
            decoration: const InputDecoration(
              labelText: 'Summary',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          MeButton.primary(
            label: 'Save progress',
            busy: _busy,
            onPressed: _busy ? null : _submit,
          ),
        ],
      ),
    );
  }
}
