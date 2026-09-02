import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/theme/app_spacing.dart';

/// Small CUST-03-owned entry point for device and account-wide sign-out.
class SessionActions extends ConsumerStatefulWidget {
  const SessionActions({super.key});

  @override
  ConsumerState<SessionActions> createState() => _SessionActionsState();
}

class _SessionActionsState extends ConsumerState<SessionActions> {
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MeButton.outline(
          label: 'Log out from this device',
          busy: _busy,
          onPressed: _busy ? null : _logoutCurrent,
        ),
        const SizedBox(height: AppSpacing.sm),
        MeButton.text(
          label: 'Log out from all devices',
          busy: _busy,
          onPressed: _busy ? null : _confirmLogoutAll,
        ),
      ],
    );
  }

  Future<void> _logoutCurrent() async {
    setState(() => _busy = true);
    final outcome = await ref
        .read(sessionProvider.notifier)
        .logoutCurrent(ref.read(mobileApiProvider));
    if (!mounted) return;

    if (outcome == SessionLogoutOutcome.serverUnavailable) {
      setState(() => _busy = false);
      final localOnly = await showMeConfirmDialog(
        context,
        title: 'Could not confirm server logout',
        message:
            'Mee Events could not be reached. You can keep this session and try again, or remove it only from this device. Other active sessions will not be changed.',
        confirmLabel: 'Sign out on this device',
        cancelLabel: 'Keep me signed in',
        destructive: true,
      );
      if (localOnly == true) {
        await ref.read(sessionProvider.notifier).signOutLocally();
      }
      return;
    }

    if (outcome == SessionLogoutOutcome.localCleanupFailed) {
      setState(() => _busy = false);
      await showMeErrorDialog(
        context,
        title: 'Device cleanup incomplete',
        message:
            'The server session ended, but this device could not clear all local session data. Close Mee Events before signing in again.',
      );
      return;
    }
    setState(() => _busy = false);
  }

  Future<void> _confirmLogoutAll() async {
    final confirmed = await showMeConfirmDialog(
      context,
      title: 'Log out from all devices?',
      message:
          'This will end every active Mee Events session for your account, including this device.',
      confirmLabel: 'Log out everywhere',
      cancelLabel: 'Cancel',
      destructive: true,
    );
    if (confirmed != true || !mounted) return;

    setState(() => _busy = true);
    final outcome = await ref
        .read(sessionProvider.notifier)
        .logoutAll(ref.read(mobileApiProvider));
    if (!mounted) return;

    if (outcome == SessionLogoutOutcome.serverUnavailable) {
      setState(() => _busy = false);
      await showMeErrorDialog(
        context,
        title: 'Could not log out everywhere',
        message:
            'No server-side revocation was confirmed. Check your connection and try again.',
        actionLabel: 'OK',
      );
      return;
    }

    if (outcome == SessionLogoutOutcome.localCleanupFailed) {
      setState(() => _busy = false);
      await showMeErrorDialog(
        context,
        title: 'Device cleanup incomplete',
        message:
            'All server sessions ended, but this device could not clear all local session data. Close Mee Events before signing in again.',
      );
      return;
    }
    setState(() => _busy = false);
  }
}
