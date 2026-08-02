import 'package:flutter/material.dart';
import 'theme/app_theme.dart';
import 'theme/app_colors.dart';
import 'theme/app_spacing.dart';
import 'theme/app_typography.dart';
import 'features/customer/screens/customer_dashboard_screen.dart';
import 'features/vendor/screens/vendor_dashboard_screen.dart';
import 'features/worker/screens/worker_dashboard_screen.dart';
import 'screens/splash_screen.dart';

/// Root widget for the Mee Events application.
class MeeEventsApp extends StatelessWidget {
  const MeeEventsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Mee Events',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const SplashScreen(),
    );
  }
}


/// Development preview shell with role switcher.
/// In dev mode, allows switching between Customer, Vendor, and Worker views.
class _DevPreviewShell extends StatefulWidget {
  const _DevPreviewShell();

  @override
  State<_DevPreviewShell> createState() => _DevPreviewShellState();
}

class _DevPreviewShellState extends State<_DevPreviewShell> {
  String _activeRole = 'customer';

  void _switchRole(String role) {
    setState(() => _activeRole = role);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // ─── Preview Banner with Role Switcher ───
        SafeArea(
          bottom: false,
          child: Container(
            color: AppColors.primarySoft,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.sm,
            ),
            child: Row(
              children: [
                const Icon(Icons.science, size: 16, color: AppColors.primary),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  'Preview',
                  style: AppTypography.caption.copyWith(
                    color: AppColors.primary,
                  ),
                ),
                const Spacer(),
                _RoleChip(
                  label: 'Customer',
                  isActive: _activeRole == 'customer',
                  onTap: () => _switchRole('customer'),
                ),
                const SizedBox(width: AppSpacing.xs),
                _RoleChip(
                  label: 'Vendor',
                  isActive: _activeRole == 'vendor',
                  onTap: () => _switchRole('vendor'),
                ),
                const SizedBox(width: AppSpacing.xs),
                _RoleChip(
                  label: 'Worker',
                  isActive: _activeRole == 'worker',
                  onTap: () => _switchRole('worker'),
                ),
              ],
            ),
          ),
        ),

        // ─── Active Dashboard ───
        Expanded(
          child: _buildDashboard(),
        ),
      ],
    );
  }

  Widget _buildDashboard() {
    switch (_activeRole) {
      case 'vendor':
        return const VendorDashboardScreen();
      case 'worker':
        return const WorkerDashboardScreen();
      case 'customer':
      default:
        return const CustomerDashboardScreen();
    }
  }
}

/// Small chip used in the role switcher.
class _RoleChip extends StatelessWidget {
  const _RoleChip({
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  final String label;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.xs,
        ),
        decoration: BoxDecoration(
          color: isActive ? AppColors.ink : AppColors.surfaceCard,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: isActive ? AppColors.ink : AppColors.hairlineSoft,
          ),
        ),
        child: Text(
          label,
          style: AppTypography.captionSm.copyWith(
            color: isActive ? AppColors.canvas : AppColors.muted,
            letterSpacing: 0,
          ),
        ),
      ),
    );
  }
}
