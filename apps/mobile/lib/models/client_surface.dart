enum ClientSurface {
  customerMobile('customer_mobile'),
  vendorMobile('vendor_mobile'),
  workerMobile('worker_mobile'),
  employeeWeb('employee_web');

  final String value;

  const ClientSurface(this.value);

  static ClientSurface? tryParse(Object? value) {
    if (value is! String) return null;
    for (final surface in values) {
      if (surface.value == value) return surface;
    }
    return null;
  }
}
