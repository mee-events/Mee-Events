import { describe, expect, it } from "vitest";
import { DomainError } from "../src/common/errors/domain.error";
import { normalizeMobileNumber } from "../src/modules/identity/domain/phone-number";

describe("normalizeMobileNumber", () => {
  it("normalizes an Indian mobile number to E.164", () => {
    expect(normalizeMobileNumber("98765 43210", "IN")).toBe("+919876543210");
  });

  it("rejects invalid numbers", () => {
    expect(() => normalizeMobileNumber("123", "IN")).toThrow(DomainError);
  });
});
