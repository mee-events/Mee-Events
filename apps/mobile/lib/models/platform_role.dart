enum PlatformRole {
  customer('customer'),
  vendorOwner('vendor_owner'),
  vendorStaff('vendor_staff'),
  worker('worker'),
  marketingManager('marketing_manager'),
  operationsManager('operations_manager'),
  financeManager('finance_manager'),
  warehouseManager('warehouse_manager'),
  seniorManager('senior_manager'),
  superAdmin('super_admin');

  final String value;

  const PlatformRole(this.value);
}
