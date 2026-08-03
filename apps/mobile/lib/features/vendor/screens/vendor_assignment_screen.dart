import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/vendor/providers/vendor_providers.dart';
import 'package:mee_events/features/vendor/screens/vendor_progress_screen.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

class VendorAssignmentScreen extends ConsumerWidget {
  const VendorAssignmentScreen({super.key, required this.assignmentId});

  final String assignmentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(vendorAssignmentDetailProvider(assignmentId));

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(title: 'Assignment'),
      body: async.when(
        loading: () => const Center(child: MeCircularLoader()),
        error: (error, _) => MeErrorState(
          title: 'Could not load assignment',
          message: error.toString(),
          onRetry: () =>
              ref.invalidate(vendorAssignmentDetailProvider(assignmentId)),
        ),
        data: (detail) {
          if (detail == null) {
            return const MeEmptyState(
              kind: MeEmptyKind.vendors,
              title: 'Unavailable',
              message: 'Sign in to view this assignment.',
            );
          }
          final pending =
              detail.status == 'invited' || detail.status == 'assigned';
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Text(
                detail.eventNumber ?? detail.eventRecordId,
                style: AppTypography.titleLg,
              ),
              Text(
                '${detail.status.replaceAll('_', ' ')} · ${detail.eventName ?? ''}',
                style: AppTypography.bodyMd,
              ),
              if (detail.assignmentNotes != null) ...[
                const SizedBox(height: AppSpacing.md),
                Text(detail.assignmentNotes!, style: AppTypography.bodyMd),
              ],
              const SizedBox(height: AppSpacing.lg),
              if (pending) ...[
                MeButton.primary(
                  label: 'Accept assignment',
                  onPressed: () async {
                    await ref
                        .read(vendorOperationsRepositoryProvider)
                        .accept(assignmentId);
                    ref.invalidate(vendorAssignmentDetailProvider(assignmentId));
                    ref.invalidate(vendorDashboardProvider);
                  },
                ),
                const SizedBox(height: AppSpacing.sm),
                MeButton.secondary(
                  label: 'Reject assignment',
                  onPressed: () async {
                    await ref
                        .read(vendorOperationsRepositoryProvider)
                        .reject(assignmentId, 'Unable to take this job');
                    ref.invalidate(vendorAssignmentDetailProvider(assignmentId));
                    ref.invalidate(vendorDashboardProvider);
                  },
                ),
                const SizedBox(height: AppSpacing.lg),
              ],
              MeButton.primary(
                label: 'Update progress',
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => VendorProgressScreen(
                        assignmentId: assignmentId,
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: AppSpacing.xl),
              Text('Timeline', style: AppTypography.titleMd),
              ...detail.timeline.map(
                (item) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(item.title),
                  subtitle: Text(item.content),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              Text('Notes', style: AppTypography.titleMd),
              ...detail.notes.map(
                (item) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(item.title),
                  subtitle: Text(item.content),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              Text('History', style: AppTypography.titleMd),
              ...detail.history.map(
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
