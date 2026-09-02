import 'package:mee_events/features/customer/favorites/favorites_store.dart';
import 'package:mee_events/features/customer/plan/event_plan_store.dart';
import 'package:mee_events/features/customer/search/recent_searches_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

abstract class CustomerPrivateDataCleaner {
  Future<void> clearForUser(String userId);
}

/// Removes only user-scoped Customer data. Installation identity and safe,
/// non-user preferences are intentionally preserved.
class SharedPreferencesCustomerPrivateDataCleaner
    implements CustomerPrivateDataCleaner {
  SharedPreferencesCustomerPrivateDataCleaner({this.preferences});

  final SharedPreferences? preferences;

  Future<SharedPreferences> _prefs() async {
    return preferences ?? SharedPreferences.getInstance();
  }

  @override
  Future<void> clearForUser(String userId) async {
    final normalized = userId.trim();
    if (normalized.isEmpty) return;

    final prefs = await _prefs();
    await FavoritesStore(prefs: prefs, userId: normalized).clear();
    await RecentSearchesStore(prefs: prefs, userId: normalized).clear();
    await EventPlanStore(prefs: prefs, userId: normalized).clear();
  }
}

class MemoryCustomerPrivateDataCleaner implements CustomerPrivateDataCleaner {
  final List<String> clearedUserIds = [];

  @override
  Future<void> clearForUser(String userId) async {
    clearedUserIds.add(userId);
  }
}
