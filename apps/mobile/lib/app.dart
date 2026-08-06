import 'package:flutter/material.dart';
import 'package:mee_events/features/auth/app_gateway.dart';
import 'theme/app_theme.dart';

/// Root widget for the Mee Events application.
///
/// Entry is always [AppGateway] (authenticated Customer / Vendor ops / Worker ops).
/// There is no development role-preview shell.
class MeeEventsApp extends StatelessWidget {
  const MeeEventsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Mee Events',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const AppGateway(),
    );
  }
}
