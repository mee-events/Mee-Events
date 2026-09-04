import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/app_gateway.dart';
import 'package:mee_events/features/auth/role_switcher/role_switcher_sheet.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/models/auth_session.dart';

const switchedSessionSaveFailedMessage =
    'The role changed, but this device could not save it. Sign in again if the app is restarted.';
const staleRoleSwitchMessage =
    'Your account changed before the role switch finished. Please try again.';

Future<void> showRoleSwitcher({
  required BuildContext context,
  required WidgetRef ref,
}) async {
  final bootstrap = ref.read(platformBootstrapProvider).asData?.value;
  if (bootstrap == null) {
    return;
  }
  final currentSession = ref.read(sessionProvider);
  if (currentSession == null) return;
  final expectedSession = currentSession.snapshot;

  final result = await showMeBottomSheet<SwitchRoleResult>(
    context: context,
    builder: (sheetContext) {
      return RoleSwitcherSheet(
        bootstrap: bootstrap,
        onSwitch: (role) => ref.read(mobileApiProvider).switchRole(role),
      );
    },
  );

  if (result == null) {
    return;
  }

  try {
    final applied = await ref
        .read(sessionProvider.notifier)
        .applySwitchedRole(result, expectedSession: expectedSession);
    if (!applied) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text(staleRoleSwitchMessage)));
      }
      return;
    }
  } catch (_) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(switchedSessionSaveFailedMessage)),
      );
    }
    return;
  }

  ref.invalidate(platformBootstrapProvider);
}
