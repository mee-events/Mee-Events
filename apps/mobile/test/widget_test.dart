import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/theme/theme.dart';

void main() {
  testWidgets('AppTheme.light applies Mee Events brand primary', (
    tester,
  ) async {
    late ColorScheme scheme;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Builder(
          builder: (context) {
            scheme = Theme.of(context).colorScheme;
            return const SizedBox.shrink();
          },
        ),
      ),
    );

    expect(scheme.primary, AppColors.primary);
    expect(scheme.onPrimary, AppColors.onPrimary);
    expect(scheme.error, AppColors.error);
  });
}
