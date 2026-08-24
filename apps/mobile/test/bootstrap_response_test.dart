import 'package:flutter_test/flutter_test.dart';
import 'package:mee_events/models/bootstrap_response.dart';
import 'package:mee_events/models/client_surface.dart';
import 'package:mee_events/navigation/resolve_bootstrap.dart';

void main() {
  test('parses the nested platform bootstrap contract', () {
    final response = PlatformBootstrapResponse.fromJson({
      'actor': {'activeRole': 'vendor_owner'},
      'branch': {'code': 'HYD', 'name': 'Hyderabad'},
      'client': {'surface': 'vendor_mobile', 'landingModule': 'vendor_home'},
      'access': {
        'assignedActiveRoles': [
          {'role': 'customer'},
          {'role': 'vendor_owner'},
        ],
        'modules': [
          {'id': 'vendor_home', 'label': 'Vendor Home'},
          {'id': 'vendor_work_orders', 'label': 'Work Orders'},
        ],
        'capabilities': ['vendor_own.read', 'vendor_work_order.read_assigned'],
      },
    });

    expect(response.surface, ClientSurface.vendorMobile);
    expect(response.activeRole, 'vendor_owner');
    expect(response.landingModule, 'vendor_home');
    expect(response.branchCode, 'HYD');
    expect(response.assignedRoles, ['customer', 'vendor_owner']);
    expect(response.modules, ['vendor_home', 'vendor_work_orders']);
    expect(response.capabilities, [
      'vendor_own.read',
      'vendor_work_order.read_assigned',
    ]);
    expect(resolveBootstrapEntry(response).route, '/vendor');
  });
}
