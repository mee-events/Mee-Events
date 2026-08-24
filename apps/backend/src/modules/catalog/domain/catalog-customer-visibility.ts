export interface CustomerServiceVisibility {
  readonly active: boolean;
  readonly customerSelectable: boolean;
  readonly hyderabadAvailable: boolean;
  readonly contentStatus: string;
}

export interface CustomerProductVisibility {
  readonly active: boolean;
  readonly customerSelectable: boolean;
  readonly placeholder: boolean;
  readonly hyderabadAvailable: boolean;
  readonly contentStatus: string;
  readonly eligibilityFlags: readonly string[];
}

export interface CustomerSubcategoryVisibility {
  readonly active: boolean;
  readonly contentStatus: string;
}

export function customerVisibleServiceSql(alias: string): string {
  return [
    `${alias}.active = true`,
    `${alias}.customer_selectable = true`,
    `${alias}.hyderabad_available = true`,
    `${alias}.content_status = 'approved'`,
  ].join("\n  AND ");
}

export function customerVisibleProductSql(alias: string): string {
  return [
    `${alias}.active = true`,
    `${alias}.customer_selectable = true`,
    `${alias}.placeholder = false`,
    `${alias}.content_status = 'approved'`,
    `${alias}.hyderabad_available = true`,
  ].join("\n  AND ");
}

export function customerVisibleSubcategorySql(alias: string): string {
  return [
    `${alias}.active = true`,
    `${alias}.content_status = 'approved'`,
  ].join("\n  AND ");
}

export function isCustomerVisibleService(
  row: CustomerServiceVisibility,
): boolean {
  return (
    row.active &&
    row.customerSelectable &&
    row.hyderabadAvailable &&
    row.contentStatus === "approved"
  );
}

export function isCustomerVisibleSubcategory(
  row: CustomerSubcategoryVisibility,
): boolean {
  return row.active && row.contentStatus === "approved";
}

export function isCustomerVisibleProduct(
  product: CustomerProductVisibility,
  parentService: CustomerServiceVisibility,
): boolean {
  return (
    isCustomerVisibleService(parentService) &&
    product.active &&
    product.customerSelectable &&
    !product.placeholder &&
    product.hyderabadAvailable &&
    product.contentStatus === "approved"
  );
}

export function isRestrictedProduct(
  product: CustomerProductVisibility,
): boolean {
  return product.eligibilityFlags.length > 0;
}

export function canAddProductToPlan(
  product: CustomerProductVisibility,
  parentService: CustomerServiceVisibility,
): boolean {
  return (
    isCustomerVisibleProduct(product, parentService) &&
    !isRestrictedProduct(product)
  );
}

export function nextCustomerSelectable(input: {
  readonly contentStatus: string;
  readonly placeholder: boolean;
  readonly hyderabadAvailable: boolean;
}): boolean {
  return (
    input.contentStatus === "approved" &&
    !input.placeholder &&
    input.hyderabadAvailable
  );
}
