import 'package:mee_events/models/bootstrap_response.dart';
import 'package:mee_events/models/client_surface.dart';

class BootstrapEntry {
  final String route;
  final String roleName;

  const BootstrapEntry({required this.route, required this.roleName});
}

BootstrapEntry resolveBootstrapEntry(PlatformBootstrapResponse response) {
  if (response.branchCode != 'HYD') {
    return const BootstrapEntry(
      route: '/unsupported',
      roleName: 'Unsupported Branch',
    );
  }

  switch (response.surface) {
    case ClientSurface.customerMobile:
      return const BootstrapEntry(route: '/customer', roleName: 'Customer');
    case ClientSurface.vendorMobile:
      return const BootstrapEntry(route: '/vendor', roleName: 'Vendor');
    case ClientSurface.workerMobile:
      return const BootstrapEntry(route: '/worker', roleName: 'Worker');
    case ClientSurface.employeeWeb:
      return const BootstrapEntry(route: '/employee-web', roleName: 'Employee');
  }
}
