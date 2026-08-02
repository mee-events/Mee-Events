enum ClientSurface {
  customerMobile('customer_mobile'),
  vendorMobile('vendor_mobile'),
  workerMobile('worker_mobile'),
  employeeWeb('employee_web');

  final String value;

  const ClientSurface(this.value);
}
