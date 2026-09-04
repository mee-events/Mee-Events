import { describe, expect, it } from "vitest";
import type { UserRecord } from "../src/modules/identity/domain/user";
import { selectLastActiveRole } from "../src/modules/identity/domain/user";

const user: UserRecord = {
  id: "user-1",
  mobileNumber: "+919876543210",
  roles: [
    {
      role: "customer",
      active: true,
      scopeType: "branch",
      scopeId: "00000000-0000-4000-8000-000000000001",
    },
    {
      role: "worker",
      active: true,
      scopeType: "branch",
      scopeId: "00000000-0000-4000-8000-000000000001",
    },
    {
      role: "vendor_owner",
      active: false,
      scopeType: "branch",
      scopeId: "00000000-0000-4000-8000-000000000001",
    },
  ],
  lastActiveRole: "customer",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  version: 1,
};

describe("selectLastActiveRole", () => {
  it("switches to an active assigned role", () => {
    const changed = selectLastActiveRole(user, "worker");
    expect(changed.lastActiveRole).toBe("worker");
    expect(changed.version).toBe(2);
  });

  it("rejects inactive or missing roles", () => {
    expect(() => selectLastActiveRole(user, "vendor_owner")).toThrow(
      "Role is not active",
    );
  });

  it("rejects role switching when any stored scope combination is unsupported", () => {
    const contradictory: UserRecord = {
      ...user,
      roles: [
        ...user.roles,
        { role: "customer", active: true, scopeType: "global" },
      ],
    };

    expect(() => selectLastActiveRole(contradictory, "worker")).toThrow(
      "Role is not active",
    );
  });
});
