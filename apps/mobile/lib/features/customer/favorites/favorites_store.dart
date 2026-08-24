import 'dart:async';
import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

enum FavoriteKind { occasion, category, service, product }

class FavoriteItem {
  const FavoriteItem({
    required this.kind,
    required this.code,
    required this.title,
    this.imageUrl,
    this.departmentCode,
    this.savedAt,
  });

  final FavoriteKind kind;
  final String code;
  final String title;
  final String? imageUrl;
  final String? departmentCode;
  final DateTime? savedAt;

  String get key => '${kind.name}:$code';

  Map<String, dynamic> toJson() => {
    'kind': kind.name,
    'code': code,
    'title': title,
    if (imageUrl != null) 'imageUrl': imageUrl,
    if (departmentCode != null) 'departmentCode': departmentCode,
    if (savedAt != null) 'savedAt': savedAt!.toIso8601String(),
  };

  factory FavoriteItem.fromJson(Map<String, dynamic> json) {
    final code = json['code'];
    final title = json['title'];
    if (code is! String || code.isEmpty || title is! String || title.isEmpty) {
      throw const FormatException('invalid favorite row');
    }
    final kindRaw = json['kind'];
    if (kindRaw is! String) {
      throw const FormatException('invalid favorite kind');
    }
    FavoriteKind? kind;
    for (final value in FavoriteKind.values) {
      if (value.name == kindRaw) {
        kind = value;
        break;
      }
    }
    if (kind == null) {
      throw const FormatException('unsupported favorite kind');
    }
    final imageUrl = json['imageUrl'];
    final departmentCode = json['departmentCode'];
    final savedAtRaw = json['savedAt'];
    return FavoriteItem(
      kind: kind,
      code: code,
      title: title,
      imageUrl: imageUrl is String ? imageUrl : null,
      departmentCode: departmentCode is String ? departmentCode : null,
      savedAt: savedAtRaw is String ? DateTime.tryParse(savedAtRaw) : null,
    );
  }
}

String sanitizeAccountStorageId(String? userId) {
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

const kLegacyFavoritesKey = 'mee_events.favorites.v1';

String favoritesStorageKey(String userId) =>
    '$kLegacyFavoritesKey.u.${sanitizeAccountStorageId(userId)}';

String favoriteKindLabel(FavoriteKind kind) => switch (kind) {
  FavoriteKind.occasion => 'Occasion',
  FavoriteKind.category => 'Service category',
  FavoriteKind.service => 'Service',
  FavoriteKind.product => 'Option',
};

const _kFavoritesPersistenceFailed = 'Could not update saved items.';

/// Local favorites cache (newest first). No backend favorites API yet.
class FavoritesStore {
  FavoritesStore({SharedPreferences? prefs, this.userId})
    : _prefsOverride = prefs;

  final SharedPreferences? _prefsOverride;
  final String? userId;
  Future<void> _queue = Future<void>.value();

  Future<SharedPreferences> _prefs() async {
    return _prefsOverride ?? SharedPreferences.getInstance();
  }

  String? get _scopedKey {
    final id = sanitizeAccountStorageId(userId);
    if (id.isEmpty) {
      return null;
    }
    return '$kLegacyFavoritesKey.u.$id';
  }

  Future<T> _serialized<T>(Future<T> Function() op) {
    final gate = Completer<T>();
    _queue = _queue
        .then((_) async {
          try {
            gate.complete(await op());
          } catch (error, stack) {
            gate.completeError(error, stack);
          }
        })
        .then((_) {}, onError: (_) {});
    return gate.future;
  }

  Future<void> _dropLegacy(SharedPreferences prefs) async {
    if (!prefs.containsKey(kLegacyFavoritesKey)) {
      return;
    }
    final removed = await prefs.remove(kLegacyFavoritesKey);
    if (!removed) {
      await prefs.reload();
      throw StateError(_kFavoritesPersistenceFailed);
    }
  }

  List<FavoriteItem> _decodeRows(List<String> raw) {
    return raw
        .map((row) {
          try {
            return FavoriteItem.fromJson(
              jsonDecode(row) as Map<String, dynamic>,
            );
          } catch (_) {
            return null;
          }
        })
        .whereType<FavoriteItem>()
        .toList();
  }

  Future<List<FavoriteItem>> _read(SharedPreferences prefs) async {
    await _dropLegacy(prefs);
    final key = _scopedKey;
    if (key == null) {
      return const [];
    }
    return _decodeRows(prefs.getStringList(key) ?? const []);
  }

  Future<List<FavoriteItem>> _write(
    SharedPreferences prefs,
    List<FavoriteItem> items,
  ) async {
    final key = _scopedKey;
    if (key == null) {
      return const [];
    }
    final saved = await prefs.setStringList(
      key,
      items.map((e) => jsonEncode(e.toJson())).toList(),
    );
    if (!saved) {
      await prefs.reload();
      throw StateError(_kFavoritesPersistenceFailed);
    }
    return items;
  }

  Future<List<FavoriteItem>> load() {
    return _serialized(() async {
      final prefs = await _prefs();
      return _read(prefs);
    });
  }

  Future<List<FavoriteItem>> toggle(FavoriteItem item) {
    return _serialized(() async {
      final prefs = await _prefs();
      final current = [...await _read(prefs)];
      final exists = current.any((e) => e.key == item.key);
      if (exists) {
        current.removeWhere((e) => e.key == item.key);
      } else {
        current.insert(
          0,
          FavoriteItem(
            kind: item.kind,
            code: item.code,
            title: item.title,
            imageUrl: item.imageUrl,
            departmentCode: item.departmentCode,
            savedAt: DateTime.now(),
          ),
        );
      }
      return _write(prefs, current);
    });
  }

  Future<List<FavoriteItem>> remove(FavoriteItem item) {
    return _serialized(() async {
      final prefs = await _prefs();
      final current = [...await _read(prefs)];
      current.removeWhere((e) => e.key == item.key);
      return _write(prefs, current);
    });
  }

  Future<List<FavoriteItem>> restore(FavoriteItem item) {
    return _serialized(() async {
      final prefs = await _prefs();
      final current = [...await _read(prefs)];
      if (current.any((e) => e.key == item.key)) {
        return current;
      }
      current.add(item);
      current.sort(_newestFirst);
      return _write(prefs, current);
    });
  }

  Future<List<FavoriteItem>> clear() {
    return _serialized(() async {
      final prefs = await _prefs();
      await _dropLegacy(prefs);
      final key = _scopedKey;
      if (key == null) {
        return const [];
      }
      if (!prefs.containsKey(key)) {
        return const [];
      }
      final removed = await prefs.remove(key);
      if (!removed) {
        await prefs.reload();
        throw StateError(_kFavoritesPersistenceFailed);
      }
      return const [];
    });
  }
}

int _newestFirst(FavoriteItem a, FavoriteItem b) {
  final at = a.savedAt;
  final bt = b.savedAt;
  if (at == null && bt == null) {
    return 0;
  }
  if (at == null) {
    return 1;
  }
  if (bt == null) {
    return -1;
  }
  return bt.compareTo(at);
}
