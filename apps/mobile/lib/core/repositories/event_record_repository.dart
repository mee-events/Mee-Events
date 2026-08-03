import 'package:mee_events/api/mobile_api.dart';
import 'package:mee_events/models/event_record.dart';

/// Thin repository over Event Record customer APIs.
///
/// Keeps screens and Riverpod providers decoupled from [MobileApi] so future
/// vendor/worker modules can share the same read models.
class EventRecordRepository {
  EventRecordRepository(this._api);

  final MobileApi _api;

  Future<List<EventRecordSummary>> listMine() => _api.listEvents();

  Future<EventRecordDetail> getById(String eventRecordId) =>
      _api.getEvent(eventRecordId);
}
