import 'dart:async';

import 'package:shared_preferences/shared_preferences.dart';

const kLegacyRecentSearchesKey = 'mee_events.recent_searches.v1';
const _maxRecent = 10;

String sanitizeSearchAccountId(String? userId) {
  if (userId == null) {
    return '';
  }
  final trimmed = userId.trim();
  if (trimmed.isEmpty) {
    return '';
  }
  final sanitized = trimmed.replaceAll(RegExp(r'[^A-Za-z0-9._-]'), '_');
  if (sanitized.length <= 128) {
    return sanitized;
  }
  return sanitized.substring(0, 128);
}

String recentSearchesStorageKey(String userId) =>
    '$kLegacyRecentSearchesKey.u.${sanitizeSearchAccountId(userId)}';

/// Local recent-search cache (newest first, max 10).
class RecentSearchesStore {
  RecentSearchesStore({SharedPreferences? prefs, this.userId})
    : _prefsOverride = prefs;

  final SharedPreferences? _prefsOverride;
  final String? userId;
  Future<void> _queue = Future<void>.value();

  Future<SharedPreferences> _prefs() async {
    return _prefsOverride ?? SharedPreferences.getInstance();
  }

  String? get _scopedKey {
    final id = sanitizeSearchAccountId(userId);
    if (id.isEmpty) {
      return null;
    }
    return '$kLegacyRecentSearchesKey.u.$id';
  }

  Future<T> _serialized<T>(Future<T> Function() op) {
    final gate = Completer<T>();
    _queue = _queue.then((_) async {
      try {
        gate.complete(await op());
      } catch (error, stack) {
        gate.completeError(error, stack);
      }
    });
    return gate.future;
  }

  Future<void> _dropLegacy(SharedPreferences prefs) async {
    if (prefs.containsKey(kLegacyRecentSearchesKey)) {
      await prefs.remove(kLegacyRecentSearchesKey);
    }
  }

  Future<List<String>> load() {
    return _serialized(() async {
      final prefs = await _prefs();
      await _dropLegacy(prefs);
      final key = _scopedKey;
      if (key == null) {
        return const [];
      }
      return List<String>.from(prefs.getStringList(key) ?? const []);
    });
  }

  Future<List<String>> add(String raw) {
    return _serialized(() async {
      final term = raw.trim();
      final prefs = await _prefs();
      await _dropLegacy(prefs);
      final key = _scopedKey;
      if (key == null) {
        return const [];
      }
      if (term.isEmpty) {
        return List<String>.from(prefs.getStringList(key) ?? const []);
      }
      final current = List<String>.from(prefs.getStringList(key) ?? const []);
      current.removeWhere((item) => item.toLowerCase() == term.toLowerCase());
      current.insert(0, term);
      final next = current.take(_maxRecent).toList();
      await prefs.setStringList(key, next);
      return next;
    });
  }

  Future<List<String>> remove(String term) {
    return _serialized(() async {
      final prefs = await _prefs();
      await _dropLegacy(prefs);
      final key = _scopedKey;
      if (key == null) {
        return const [];
      }
      final current = List<String>.from(prefs.getStringList(key) ?? const []);
      current.removeWhere(
        (item) => item.toLowerCase() == term.trim().toLowerCase(),
      );
      await prefs.setStringList(key, current);
      return current;
    });
  }

  Future<List<String>> clear() {
    return _serialized(() async {
      final prefs = await _prefs();
      await _dropLegacy(prefs);
      final key = _scopedKey;
      if (key == null) {
        return const [];
      }
      await prefs.remove(key);
      return const [];
    });
  }
}
