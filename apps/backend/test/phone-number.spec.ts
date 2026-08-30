import { describe, expect, it } from "vitest";
import { DomainError } from "../src/common/errors/domain.error";
import { normalizeMobileNumber } from "../src/modules/identity/domain/phone-number";

describe("normalizeMobileNumber", () => {
  it("normalizes an Indian mobile number to E.164", () => {
    expect(normalizeMobileNumber("98765 43210", "IN")).toBe("+919876543210");
    expect(normalizeMobileNumber("+91 98765 43210", "IN")).toBe(
      "+919876543210",
    );
  });

  it.each(["", "123", "98765abc210", "+9198765432109"])(
    "rejects invalid mobile input %j",
    (input) => {
      expect(() => normalizeMobileNumber(input, "IN")).toThrow(DomainError);
    },
  );

  it("rejects an Indian fixed-line number", () => {
    expect(() => normalizeMobileNumber("040 2345 6789", "IN")).toThrow(
      DomainError,
    );
  });
});
