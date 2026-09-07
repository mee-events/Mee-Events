import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

const kPlanningContextCity = 'Hyderabad';
const kPlanningContextAreaMaxLength = 300;
const kPlanningContextStoragePrefix = 'mee_events.customer_planning_context.v1';

final planningContextControlCharacters = RegExp(
  r'[\u0000-\u001F\u007F-\u009F]',
);

typedef PlanningContextWriter = Future<bool> Function(String key, String value);

class CustomerPlanningContext {
  const CustomerPlanningContext({this.area = '', this.eventDate});

  final String area;
  final DateTime? eventDate;

  String get checkoutLocation {
    if (area.isEmpty) return kPlanningContextCity;
    if (area.toLowerCase().contains(kPlanningContextCity.toLowerCase())) {
      return _truncateUtf16(area, kPlanningContextAreaMaxLength);
    }
    const suffix = ', $kPlanningContextCity';
    final areaLimit = kPlanningContextAreaMaxLength - suffix.length;
    return '${_truncateUtf16(area, areaLimit)}$suffix';
  }

  String get compactLocation {
    if (area.isEmpty) return kPlanningContextCity;
    final parts = area
        .split(',')
        .map((part) => part.trim())
        .where(
          (part) =>
              part.isNotEmpty &&
              part.toLowerCase() != kPlanningContextCity.toLowerCase(),
        )
        .toList();
    if (parts.isEmpty) return kPlanningContextCity;

    final candidate = parts.last;
    if (_looksLikeStreetAddress(candidate)) return kPlanningContextCity;
    final safeSummary = _truncateUtf16(candidate, 36);
    return '$safeSummary, $kPlanningContextCity';
  }

  Map<String, Object> toJson() => {
    'area': area,
    if (eventDate != null) 'eventDate': formatPlanningContextDate(eventDate!),
  };
}

String sanitizePlanningContextArea(String input) {
  final withoutControls = input.replaceAll(
    planningContextControlCharacters,
    ' ',
  );
  final normalized = withoutControls.replaceAll(RegExp(r'\s+'), ' ').trim();
  return _truncateUtf16(normalized, kPlanningContextAreaMaxLength);
}

DateTime planningContextDateOnly(DateTime value) =>
    DateTime(value.year, value.month, value.day);

bool isPastPlanningContextDate(DateTime value, DateTime today) {
  return planningContextDateOnly(
    value,
  ).isBefore(planningContextDateOnly(today));
}

String formatPlanningContextDate(DateTime value) {
  final date = planningContextDateOnly(value);
  final year = date.year.toString().padLeft(4, '0');
  final month = date.month.toString().padLeft(2, '0');
  final day = date.day.toString().padLeft(2, '0');
  return '$year-$month-$day';
}

DateTime? parsePlanningContextDate(String? raw) {
  if (raw == null || !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(raw)) {
    return null;
  }
  final parsed = DateTime.tryParse(raw);
  if (parsed == null || formatPlanningContextDate(parsed) != raw) return null;
  return planningContextDateOnly(parsed);
}

String sanitizePlanningContextAccountId(String? userId) {
  if (userId == null) return '';
  final trimmed = userId.trim();
  if (trimmed.isEmpty) return '';
  final sanitized = trimmed.replaceAll(RegExp(r'[^A-Za-z0-9._-]'), '_');
  return _truncateUtf16(sanitized, 128);
}

String planningContextStorageKey(String userId) =>
    '$kPlanningContextStoragePrefix.u.${sanitizePlanningContextAccountId(userId)}';

class PlanningContextStore {
  PlanningContextStore({
    SharedPreferences? preferences,
    this.userId,
    PlanningContextWriter? writer,
  }) : _preferencesOverride = preferences,
       _writerOverride = writer;

  final SharedPreferences? _preferencesOverride;
  final PlanningContextWriter? _writerOverride;
  final String? userId;

  String? get _scopedKey {
    final accountId = sanitizePlanningContextAccountId(userId);
    if (accountId.isEmpty) return null;
    return '$kPlanningContextStoragePrefix.u.$accountId';
  }

  bool get persistsAcrossSessions => _scopedKey != null;

  Future<SharedPreferences> _preferences() async {
    return _preferencesOverride ?? SharedPreferences.getInstance();
  }

  Future<CustomerPlanningContext> load({required DateTime today}) async {
    final key = _scopedKey;
    if (key == null) return const CustomerPlanningContext();
    final prefs = await _preferences();
    final raw = prefs.getString(key);
    if (raw == null) return const CustomerPlanningContext();

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) {
        return const CustomerPlanningContext();
      }
      final area = sanitizePlanningContextArea(
        decoded['area'] as String? ?? '',
      );
      final parsedDate = parsePlanningContextDate(
        decoded['eventDate'] as String?,
      );
      final eventDate =
          parsedDate == null || isPastPlanningContextDate(parsedDate, today)
          ? null
          : parsedDate;
      return CustomerPlanningContext(area: area, eventDate: eventDate);
    } catch (_) {
      return const CustomerPlanningContext();
    }
  }

  Future<bool> save(CustomerPlanningContext context) async {
    final key = _scopedKey;
    if (key == null) return false;
    final value = jsonEncode(context.toJson());
    final writer = _writerOverride;
    if (writer != null) return writer(key, value);
    final prefs = await _preferences();
    return prefs.setString(key, value);
  }

  Future<void> clear() async {
    final key = _scopedKey;
    if (key == null) return;
    final prefs = await _preferences();
    await prefs.remove(key);
  }
}

bool _looksLikeStreetAddress(String value) {
  final addressMarker = RegExp(
    r'\b(?:h\s*\.?\s*no\.?|hno|flat|house|plot|villa|block|floor|towers?|door|roads?|streets?|lanes?|apartments?|survey)\b',
    caseSensitive: false,
  );
  final compoundDoorNumber = RegExp(
    r'(?:^|[\s,])#?\s*\d+[a-z]?(?:\s*[-/]\s*[a-z0-9]+)+(?:$|[\s,])',
    caseSensitive: false,
  );
  final hashNumber = RegExp(r'(?:^|[\s,])#\s*[a-z0-9]', caseSensitive: false);
  final leadingDoorNumber = RegExp(
    r'^\s*\d+[a-z]?\s+[a-z]',
    caseSensitive: false,
  );
  final longNumber = RegExp(r'(?:^|\s)\d{5,}(?:$|\s)');
  return addressMarker.hasMatch(value) ||
      compoundDoorNumber.hasMatch(value) ||
      hashNumber.hasMatch(value) ||
      leadingDoorNumber.hasMatch(value) ||
      longNumber.hasMatch(value);
}

String _truncateUtf16(String value, int maxLength) {
  if (value.length <= maxLength) return value;
  var end = maxLength;
  if (end > 0 &&
      value.codeUnitAt(end - 1) >= 0xD800 &&
      value.codeUnitAt(end - 1) <= 0xDBFF) {
    end -= 1;
  }
  return value.substring(0, end);
}
