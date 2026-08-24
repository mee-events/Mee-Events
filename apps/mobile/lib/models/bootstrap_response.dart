import 'package:mee_events/models/client_surface.dart';

class PlatformBootstrapResponse {
  final ClientSurface surface;
  final String activeRole;
  final String landingModule;
  final String branchCode;
  final String branchName;
  final List<String> assignedRoles;
  final List<String> modules;
  final List<String> capabilities;

  const PlatformBootstrapResponse({
    required this.surface,
    required this.activeRole,
    required this.landingModule,
    required this.branchCode,
    required this.branchName,
    required this.assignedRoles,
    required this.modules,
    required this.capabilities,
  });

  factory PlatformBootstrapResponse.fromJson(Map<String, dynamic> json) {
    final actor = _jsonMap(json['actor']);
    final branch = _jsonMap(json['branch']);
    final client = _jsonMap(json['client']);
    final access = _jsonMap(json['access']);

    final rawSurface = client['surface'] ?? json['surface'];
    final rawModules = access['modules'] ?? json['modules'];
    final rawAssignments = access['assignedActiveRoles'];

    return PlatformBootstrapResponse(
      surface: ClientSurface.values.firstWhere(
        (e) => e.value == rawSurface,
        orElse: () => ClientSurface.customerMobile,
      ),
      activeRole:
          (actor['activeRole'] ?? json['activeRole'] ?? 'customer') as String,
      landingModule:
          (client['landingModule'] ?? json['landingModule'] ?? 'customer_home')
              as String,
      branchCode:
          (branch['code'] ?? json['branch_code'] ?? json['branchCode'] ?? '')
              as String,
      branchName:
          (branch['name'] ?? json['branch_name'] ?? json['branchName'] ?? '')
              as String,
      assignedRoles: _stringValues(rawAssignments, key: 'role'),
      modules: _stringValues(rawModules, key: 'id'),
      capabilities: _stringValues(
        access['capabilities'] ?? json['capabilities'],
      ),
    );
  }
}

Map<String, dynamic> _jsonMap(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return const {};
}

List<String> _stringValues(Object? value, {String? key}) {
  if (value is! List) return const [];
  return value
      .map((item) {
        if (item is String) return item;
        if (key != null && item is Map) {
          final mapped = item[key];
          if (mapped is String) return mapped;
        }
        return null;
      })
      .whereType<String>()
      .toList(growable: false);
}
