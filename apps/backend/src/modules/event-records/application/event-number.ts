import { randomUUID } from "node:crypto";

export function generateEventNumber(): string {
  const token = randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `EV-${token}`;
}
