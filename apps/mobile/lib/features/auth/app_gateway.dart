import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/features/customer/screens/customer_dashboard_screen.dart';
import 'package:mee_events/features/vendor/screens/vendor_ops_dashboard_screen.dart';
import 'package:mee_events/features/worker/screens/worker_ops_dashboard_screen.dart';
import 'package:mee_events/models/bootstrap_response.dart';
import 'package:mee_events/navigation/resolve_bootstrap.dart';
import 'package:mee_events/screens/onboarding_screen.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_gradients.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_typography.dart';

final platformBootstrapProvider =
    FutureProvider.autoDispose<PlatformBootstrapResponse?>((ref) async {
      final session = ref.watch(sessionProvider);
      if (session == null) return null;
      return ref.watch(mobileApiProvider).getPlatformBootstrap();
    });

/// Server-authoritative entry point for every mobile role.
///
/// Secure storage decides whether a session exists; the platform bootstrap
/// decides which role surface that session is allowed to open.
class AppGateway extends ConsumerStatefulWidget {
  const AppGateway({
    super.key,
    this.launchDelay = const Duration(milliseconds: 900),
  });

  final Duration launchDelay;

  @override
  ConsumerState<AppGateway> createState() => _AppGatewayState();
}

class _AppGatewayState extends ConsumerState<AppGateway> {
  late final Future<void> _launchReady;

  @override
  void initState() {
    super.initState();
    _launchReady = Future.wait<void>([
      ref.read(sessionProvider.notifier).restored,
      Future<void>.delayed(widget.launchDelay),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(sessionProvider, (previous, next) {
      final signedOut = previous != null && next == null;
      final roleChanged =
          previous != null &&
          next != null &&
          previous.lastActiveRole != next.lastActiveRole;
      if (signedOut || roleChanged) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          Navigator.of(context).popUntil((route) => route.isFirst);
        });
      }
    });

    return FutureBuilder<void>(
      future: _launchReady,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const _LaunchScreen();
        }

        final session = ref.watch(sessionProvider);
        if (session == null) {
          return const OnboardingScreen();
        }

        final bootstrap = ref.watch(platformBootstrapProvider);
        return bootstrap.when(
          loading: () => const _LaunchScreen(),
          error: (error, _) => _BootstrapErrorScreen(error: error),
          data: (response) {
            if (response == null) return const OnboardingScreen();
            return _surfaceFor(response);
          },
        );
      },
    );
  }

  Widget _surfaceFor(PlatformBootstrapResponse response) {
    final entry = resolveBootstrapEntry(response);
    switch (entry.route) {
      case '/customer':
        return CustomerDashboardScreen(
          branchCode: response.branchCode,
          branchName: response.branchName,
        );
      case '/vendor':
        return const VendorOpsDashboardScreen();
      case '/worker':
        return const WorkerOpsDashboardScreen();
      case '/employee-web':
        return const _UnavailableSurfaceScreen(
          title: 'Use Mee Events ERP',
          message:
              'Employee and manager accounts continue in the ERP web app. This mobile app is for customers, vendors, and workers.',
        );
      default:
        return _UnavailableSurfaceScreen(
          title: entry.roleName,
          message:
              'This account is not available for the Hyderabad mobile experience.',
        );
    }
  }
}

class _LaunchScreen extends StatelessWidget {
  const _LaunchScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: AppGradients.brandPremium),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ClipOval(
                child: Image.asset(
                  'assets/images/logo/mee_events_logo.jpg',
                  width: 104,
                  height: 104,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => Container(
                    width: 104,
                    height: 104,
                    color: AppColors.primary,
                    alignment: Alignment.center,
                    child: const Icon(
                      Icons.celebration_outlined,
                      color: AppColors.onPrimary,
                      size: 48,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              Text(
                'Mee Events',
                style: AppTypography.displayLg.copyWith(
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Celebrate every moment',
                style: AppTypography.bodyMd.copyWith(
                  color: AppColors.canvas.withValues(alpha: 0.72),
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BootstrapErrorScreen extends ConsumerWidget {
  const _BootstrapErrorScreen({required this.error});

  final Object error;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(title: 'Mee Events'),
      body: MeErrorState(
        title: 'Could not open your workspace',
        message: error.toString(),
        onRetry: () => ref.invalidate(platformBootstrapProvider),
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.all(AppSpacing.lg),
        child: MeButton.text(
          label: 'Sign out',
          onPressed: () => ref.read(sessionProvider.notifier).signOut(),
        ),
      ),
    );
  }
}

class _UnavailableSurfaceScreen extends ConsumerWidget {
  const _UnavailableSurfaceScreen({required this.title, required this.message});

  final String title;
  final String message;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: const MeAppBar(title: 'Mee Events'),
      body: MeEmptyState(
        kind: MeEmptyKind.events,
        title: title,
        message: message,
        actionLabel: 'Sign out',
        onAction: () => ref.read(sessionProvider.notifier).signOut(),
      ),
    );
  }
}
