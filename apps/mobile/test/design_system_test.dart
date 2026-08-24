import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
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
        home: const Scaffold(body: MeEmptyState(kind: MeEmptyKind.enquiries)),
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

  testWidgets('MeMediaCard renders title and subtitle', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: MeMediaCard(
            imageUrl: '',
            title: 'Wedding Venues',
            subtitle: 'Explore curated spaces',
          ),
        ),
      ),
    );

    expect(find.text('Wedding Venues'), findsOneWidget);
    expect(find.text('Explore curated spaces'), findsOneWidget);
  });

  testWidgets('MeSegmentedControl renders labels and reports tap', (
    tester,
  ) async {
    var selected = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) {
              return MeSegmentedControl(
                labels: const ['Events', 'Services'],
                index: selected,
                onChanged: (i) => setState(() => selected = i),
              );
            },
          ),
        ),
      ),
    );

    expect(find.text('Events'), findsOneWidget);
    expect(find.text('Services'), findsOneWidget);
    await tester.tap(find.text('Services'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 250));
    expect(selected, 1);
  });

  testWidgets('MeSegmentedControl exposes selected semantics and tap action', (
    tester,
  ) async {
    var selected = 0;
    final handle = tester.ensureSemantics();
    try {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                return MeSegmentedControl(
                  labels: const ['Events', 'Services'],
                  index: selected,
                  onChanged: (i) => setState(() => selected = i),
                );
              },
            ),
          ),
        ),
      );

      final eventsFinder = find.bySemanticsLabel('Events');
      final servicesFinder = find.bySemanticsLabel('Services');
      expect(eventsFinder, findsOneWidget);
      expect(servicesFinder, findsOneWidget);

      final events = tester.getSemantics(eventsFinder);
      final services = tester.getSemantics(servicesFinder);
      expect(events.flagsCollection.isButton, isTrue);
      expect(events.flagsCollection.isEnabled.toBoolOrNull(), isTrue);
      expect(events.flagsCollection.isSelected.toBoolOrNull(), isTrue);
      expect(events.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
      expect(services.flagsCollection.isButton, isTrue);
      expect(services.flagsCollection.isEnabled.toBoolOrNull(), isTrue);
      expect(services.flagsCollection.isSelected.toBoolOrNull(), isFalse);
      expect(
        services.getSemanticsData().hasAction(SemanticsAction.tap),
        isTrue,
      );

      tester.semantics.tap(find.semantics.byLabel('Services'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 250));
      expect(selected, 1);

      final eventsAfter = tester.getSemantics(eventsFinder);
      final servicesAfter = tester.getSemantics(servicesFinder);
      expect(eventsAfter.flagsCollection.isSelected.toBoolOrNull(), isFalse);
      expect(servicesAfter.flagsCollection.isSelected.toBoolOrNull(), isTrue);
    } finally {
      handle.dispose();
    }
  });

  testWidgets('MePlatformHeader brand shows Mee Events', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: MePlatformHeader(mode: MePlatformHeaderMode.brand),
        ),
      ),
    );

    expect(find.text('Mee Events'), findsOneWidget);
    expect(find.byIcon(Icons.search_rounded), findsOneWidget);
    expect(find.byIcon(Icons.notifications_none_rounded), findsOneWidget);
  });

  testWidgets('MePlatformHeader title mode shows provided title', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: MePlatformHeader(
            mode: MePlatformHeaderMode.title,
            title: 'Your enquiries',
          ),
        ),
      ),
    );

    expect(find.text('Your enquiries'), findsOneWidget);
  });
}
