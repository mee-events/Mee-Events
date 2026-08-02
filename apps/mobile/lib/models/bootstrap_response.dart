import 'package:mee_events/models/client_surface.dart';

class PlatformBootstrapResponse {
  final ClientSurface surface;
  final String branchCode;
  final String branchName;
  final List<String> modules;
  final List<String> capabilities;

  const PlatformBootstrapResponse({
    required this.surface,
    required this.branchCode,
    required this.branchName,
    required this.modules,
    required this.capabilities,
  });

  factory PlatformBootstrapResponse.fromJson(Map<String, dynamic> json) {
    return PlatformBootstrapResponse(
      surface: ClientSurface.values.firstWhere(
        (e) => e.value == json['surface'],
        orElse: () => ClientSurface.customerMobile,
      ),
      branchCode: json['branch_code'] as String,
      branchName: json['branch_name'] as String,
      modules: List<String>.from(json['modules'] ?? []),
      capabilities: List<String>.from(json['capabilities'] ?? []),
    );
  }
}
