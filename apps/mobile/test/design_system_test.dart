import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/theme/theme.dart';

void main() {
  testWidgets('MeButton.primary renders label and handles tap', (tester) async {
    var tapped = false;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: MeButton.primary(
            label: 'Send code',
            onPressed: () => tapped = true,
          ),
        ),
      ),
    );

    expect(find.text('Send code'), findsOneWidget);
    await tester.tap(find.text('Send code'));
    expect(tapped, isTrue);
  });

  testWidgets('MeEmptyState shows enquiry copy', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: MeEmptyState(kind: MeEmptyKind.enquiries),
        ),
      ),
    );

    expect(find.text('No enquiries yet'), findsOneWidget);
  });

  testWidgets('MeBadge renders status label', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: MeBadge(label: 'Submitted', tone: MeStatusTone.success),
        ),
      ),
    );

    expect(find.text('SUBMITTED'), findsOneWidget);
  });
}
