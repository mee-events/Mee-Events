import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/role_switcher/mobile_roles.dart';
import 'package:mee_events/features/auth/role_switcher/role_switch_chip.dart';
import 'package:mee_events/features/auth/role_switcher/show_role_switcher.dart';
import 'package:mee_events/features/auth/screens/login_screen.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/operations/screens/operations_issues_screen.dart';
import 'package:mee_events/features/operations/screens/operations_tasks_screen.dart';
import 'package:mee_events/features/vendor/providers/vendor_providers.dart';
import 'package:mee_events/features/vendor/screens/vendor_assignment_screen.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

/// Live Vendor Operations MVP dashboard (replaces preview when signed in).
class VendorOpsDashboardScreen extends ConsumerWidget {
  const VendorOpsDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    if (session == null) {
      return Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: const MeAppBar(title: 'Vendor'),
        body: MeEmptyState(
          kind: MeEmptyKind.vendors,
          title: 'Sign in required',
          message: 'Sign in as a vendor owner to view assignments.',
          actionLabel: 'Sign in',
          onAction: () {
            Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const LoginScreen()));
          },
        ),
      );
    }

    final dashboard = ref.watch(vendorDashboardProvider);
    final assignments = ref.watch(vendorAssignmentsProvider);

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: MeAppBar(
        title: 'Vendor',
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: AppSpacing.sm),
            child: RoleSwitchChip(
              roleLabel: mobileRoleLabel(session.lastActiveRole),
              onPressed: () => showRoleSwitcher(context: context, ref: ref),
            ),
          ),
        ],
      ),
      body: dashboard.when(
        loading: () => const Center(child: MeCircularLoader()),
        error: (error, _) => MeErrorState(
          title: 'Could not load vendor dashboard',
          message: error.toString(),
          onRetry: () => ref.invalidate(vendorDashboardProvider),
        ),
        data: (snap) {
          if (snap == null) {
            return const MeEmptyState(
              kind: MeEmptyKind.vendors,
              title: 'No vendor profile',
              message: 'This account is not linked to a vendor organization.',
            );
          }
          final items = assignments.maybeWhen(
            data: (list) => list ?? snap.openAssignments,
            orElse: () => snap.openAssignments,
          );
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Text('Vendor dashboard', style: AppTypography.titleLg),
              const SizedBox(height: AppSpacing.sm),
              Text(
                '${snap.activeAssignments} active · ${snap.pendingAcceptances} pending · ${snap.completedAssignments} completed',
                style: AppTypography.bodyMd,
              ),
              const SizedBox(height: AppSpacing.md),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Assigned Tasks'),
                subtitle: const Text('Event execution tasks'),
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
              Text('Assigned events', style: AppTypography.titleMd),
              if (items.isEmpty)
                const Text('No assignments yet.')
              else
                ...items.map(
                  (item) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(item.eventNumber ?? item.eventRecordId),
                    subtitle: Text(
                      '${item.eventName ?? 'Event'} · ${item.status.replaceAll('_', ' ')}',
                    ),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) =>
                              VendorAssignmentScreen(assignmentId: item.id),
                        ),
                      );
                    },
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
