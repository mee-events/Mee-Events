import 'dart:ui' show Tristate;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/design_system/design_system.dart';
import 'package:mee_events/features/customer/search/recent_searches_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AppHeader', () {
    testWidgets(
      'shows search, favorites, and role avatar without fake identity',
      (tester) async {
        await tester.pumpWidget(
          const MaterialApp(
            home: Scaffold(body: AppHeader(brandLabel: 'Mee Events')),
          ),
        );

        expect(find.text('Mee Events'), findsOneWidget);
        expect(find.text('PS'), findsNothing);
        expect(find.byIcon(Icons.search_rounded), findsOneWidget);
        expect(find.byIcon(Icons.favorite_border_rounded), findsOneWidget);
        expect(find.byIcon(Icons.person_rounded), findsOneWidget);
        expect(find.byTooltip('Account'), findsNothing);
        expect(find.byIcon(Icons.notifications_none_rounded), findsOneWidget);
      },
    );

    testWidgets('hides search when showSearch is false', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: Scaffold(body: AppHeader(showSearch: false))),
      );

      expect(find.byIcon(Icons.search_rounded), findsNothing);
    });

    testWidgets('notification icon is visible and disabled by default', (
      tester,
    ) async {
      final semantics = tester.ensureSemantics();
      try {
        await tester.pumpWidget(
          const MaterialApp(home: Scaffold(body: AppHeader())),
        );

        expect(find.byIcon(Icons.notifications_none_rounded), findsOneWidget);
        expect(find.byTooltip('Notifications unavailable'), findsOneWidget);
        expect(find.byType(Badge), findsNothing);
        final node = tester.getSemantics(
          find.bySemanticsLabel('Notifications unavailable'),
        );
        expect(node.flagsCollection.isEnabled, Tristate.isFalse);
      } finally {
        semantics.dispose();
      }
    });
  });

  group('RecentSearchesStore', () {
    test('keeps newest first and max 10', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final store = RecentSearchesStore(prefs: prefs, userId: 'user-a');

      for (var i = 0; i < 12; i++) {
        await store.add('term-$i');
      }
      final items = await store.load();
      expect(items.length, 10);
      expect(items.first, 'term-11');
      expect(items.last, 'term-2');
    });

    test('clear individual and clear all', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final store = RecentSearchesStore(prefs: prefs, userId: 'user-a');

      await store.add('Birthday');
      await store.add('Wedding');
      await store.remove('Birthday');
      expect(await store.load(), ['Wedding']);
      await store.clear();
      expect(await store.load(), isEmpty);
    });
  });
}
