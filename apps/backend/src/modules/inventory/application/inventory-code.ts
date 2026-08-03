export function generateWarehouseCode(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `WH-HYD-${stamp}${rand}`.slice(0, 24);
}

export function generateInventoryCode(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `INV-HYD-${stamp}${rand}`.slice(0, 24);
}
