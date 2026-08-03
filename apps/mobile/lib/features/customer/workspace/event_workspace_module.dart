import 'package:flutter/material.dart';
import 'package:mee_events/features/customer/workspace/event_workspace_snapshot.dart';

/// Plug-in slot for future Event Record / Vendor / Worker workspace modules.
///
/// Implement this interface and register the module on
/// [EventWorkspaceScreen.modules] without changing the core layout.
abstract class EventWorkspaceModule {
  String get id;

  String get title;

  /// Return null to hide the section for the current snapshot.
  Widget? buildSection(BuildContext context, EventWorkspaceSnapshot snapshot);
}
