import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class EventPlanItem {
  const EventPlanItem({
    required this.productCode,
    required this.displayName,
    required this.serviceCode,
    this.coverImageUrl,
    this.restricted = false,
  });

  final String productCode;
  final String displayName;
  final String serviceCode;
  final String? coverImageUrl;
  final bool restricted;

  Map<String, dynamic> toJson() => {
    'productCode': productCode,
    'displayName': displayName,
    'serviceCode': serviceCode,
    if (coverImageUrl != null) 'coverImageUrl': coverImageUrl,
    'restricted': restricted,
  };

  Map<String, dynamic> toApiJson() => {
    'productCode': productCode,
    'displayName': displayName,
    'serviceCode': serviceCode,
  };

  factory EventPlanItem.fromJson(Map<String, dynamic> json) {
    return EventPlanItem(
      productCode: json['productCode'] as String,
      displayName: json['displayName'] as String,
      serviceCode: json['serviceCode'] as String,
      coverImageUrl: json['coverImageUrl'] as String?,
      restricted: json['restricted'] as bool? ?? false,
    );
  }
}

const kLegacyEventPlanKey = 'mee_events.event_plan.v1';

String sanitizePlanAccountId(String? userId) {
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

String eventPlanStorageKey(String userId) =>
    '$kLegacyEventPlanKey.u.${sanitizePlanAccountId(userId)}';

/// Local Event Plan draft (Swiggy-cart analogue). Snapshot is sent on enquiry.
class EventPlanStore {
  EventPlanStore({SharedPreferences? prefs, this.userId})
    : _prefsOverride = prefs;

  final SharedPreferences? _prefsOverride;
  final String? userId;

  Future<SharedPreferences> _prefs() async {
    return _prefsOverride ?? SharedPreferences.getInstance();
  }

  String? get _scopedKey {
    final id = sanitizePlanAccountId(userId);
    if (id.isEmpty) {
      return null;
    }
    return '$kLegacyEventPlanKey.u.$id';
  }

  Future<void> _dropLegacy(SharedPreferences prefs) async {
    if (prefs.containsKey(kLegacyEventPlanKey)) {
      await prefs.remove(kLegacyEventPlanKey);
    }
  }

  Future<List<EventPlanItem>> load() async {
    final prefs = await _prefs();
    await _dropLegacy(prefs);
    final key = _scopedKey;
    if (key == null) {
      return const [];
    }
    final raw = prefs.getStringList(key) ?? const [];
    return raw
        .map((row) {
          try {
            return EventPlanItem.fromJson(
              jsonDecode(row) as Map<String, dynamic>,
            );
          } catch (_) {
            return null;
          }
        })
        .whereType<EventPlanItem>()
        .toList();
  }

  Future<List<EventPlanItem>> add(EventPlanItem item) async {
    if (item.restricted) return load();
    final prefs = await _prefs();
    await _dropLegacy(prefs);
    final key = _scopedKey;
    if (key == null) {
      return const [];
    }
    final current = await load();
    current.removeWhere((e) => e.productCode == item.productCode);
    current.insert(0, item);
    await prefs.setStringList(
      key,
      current.map((e) => jsonEncode(e.toJson())).toList(),
    );
    return current;
  }

  Future<List<EventPlanItem>> remove(String productCode) async {
    final prefs = await _prefs();
    await _dropLegacy(prefs);
    final key = _scopedKey;
    if (key == null) {
      return const [];
    }
    final current = await load();
    current.removeWhere((e) => e.productCode == productCode);
    await prefs.setStringList(
      key,
      current.map((e) => jsonEncode(e.toJson())).toList(),
    );
    return current;
  }

  Future<List<EventPlanItem>> clear() async {
    final prefs = await _prefs();
    await _dropLegacy(prefs);
    final key = _scopedKey;
    if (key == null) {
      return const [];
    }
    await prefs.remove(key);
    return const [];
  }
}
