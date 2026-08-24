import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/auth/app_gateway.dart';
import 'package:mee_events/features/auth/role_switcher/role_switcher_sheet.dart';
import 'package:mee_events/features/auth/session_provider.dart';
import 'package:mee_events/models/auth_session.dart';

const switchedSessionSaveFailedMessage =
    'Could not save the switched session on this device. Retry Switch role to apply it here.';

Future<void> showRoleSwitcher({
  required BuildContext context,
  required WidgetRef ref,
}) async {
  final bootstrap = ref.read(platformBootstrapProvider).asData?.value;
  if (bootstrap == null) {
    return;
  }

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
    await ref.read(sessionProvider.notifier).applySwitchedRole(result);
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
