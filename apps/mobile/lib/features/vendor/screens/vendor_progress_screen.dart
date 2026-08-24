import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/vendor/providers/vendor_providers.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';

class VendorProgressScreen extends ConsumerStatefulWidget {
  const VendorProgressScreen({super.key, required this.assignmentId});

  final String assignmentId;

  @override
  ConsumerState<VendorProgressScreen> createState() =>
      _VendorProgressScreenState();
}

class _VendorProgressScreenState extends ConsumerState<VendorProgressScreen> {
  final _summary = TextEditingController();
  String _status = 'working';
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
          .read(vendorOperationsRepositoryProvider)
          .progress(
            assignmentId: widget.assignmentId,
            summary: _summary.text.trim(),
            status: _status,
          );
      ref.invalidate(vendorAssignmentDetailProvider(widget.assignmentId));
      ref.invalidate(vendorDashboardProvider);
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
            initialValue: _status,
            items: const [
              DropdownMenuItem(value: 'planning', child: Text('Planning')),
              DropdownMenuItem(value: 'travelling', child: Text('Travelling')),
              DropdownMenuItem(value: 'on_site', child: Text('On site')),
              DropdownMenuItem(value: 'working', child: Text('Working')),
              DropdownMenuItem(value: 'completed', child: Text('Completed')),
            ],
            onChanged: (value) {
              if (value != null) setState(() => _status = value);
            },
            decoration: const InputDecoration(labelText: 'Status'),
          ),
          const SizedBox(height: AppSpacing.md),
          TextField(
            controller: _summary,
            maxLines: 5,
            decoration: const InputDecoration(
              labelText: 'Progress summary',
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
