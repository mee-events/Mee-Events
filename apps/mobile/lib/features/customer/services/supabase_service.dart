import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/super_app_models.dart';

class SupabaseService {
  final SupabaseClient _db = Supabase.instance.client;

  /// Fetches the dynamically mapped services (subcategories) for a given Event.
  /// Table: event_services (or subcategories)
  Future<List<ServiceModel>> getServicesForEvent(String eventId) async {
    try {
      final response = await _db
          .from('event_services')
          .select()
          .eq('event_id', eventId)
          .order('display_order', ascending: true);

      final List<dynamic> data = response as List<dynamic>;
      
      return data.map((row) {
        return ServiceModel.fromJson(row, row['id'].toString());
      }).toList();
    } catch (e) {
      print('Error fetching services for event $eventId: $e');
      return [];
    }
  }

  /// Streams the dynamically mapped services (subcategories) for a given Event.
  /// Useful for real-time updates.
  Stream<List<ServiceModel>> streamServicesForEvent(String eventId) {
    return _db
        .from('event_services')
        .stream(primaryKey: ['id'])
        .eq('event_id', eventId)
        .order('display_order', ascending: true)
        .map((data) => data.map((row) {
              return ServiceModel.fromJson(row, row['id'].toString());
            }).toList());
  }
}
