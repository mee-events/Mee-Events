import type { RoleAssignment } from "@me-event/shared-types";
import { describe, expect, it } from "vitest";
import { resolveBranchId } from "../src/common/branch/branch-context";
import {
  PHASE_ONE_BRANCH_ID,
  activeSupportedAssignments,
  hasActiveVendorResourceGrant,
  hasSupportedActiveRoleAssignment,
  isSupportedPhaseOneRoleAssignment,
} from "../src/common/branch/role-scope-policy";

const VENDOR_A = "00000000-0000-4000-8000-000000000101";
const VENDOR_B = "00000000-0000-4000-8000-000000000102";

describe("Phase 1 role scope policy", () => {
  it("accepts Hyderabad branch, administrator global, and vendor resource grants", () => {
    expect(isSupportedPhaseOneRoleAssignment(branch("customer"))).toBe(true);
    expect(
      isSupportedPhaseOneRoleAssignment({
        role: "administrator",
        active: true,
        scopeType: "global",
      }),
    ).toBe(true);
    expect(
      isSupportedPhaseOneRoleAssignment(vendor("vendor_owner", VENDOR_A)),
    ).toBe(true);
    expect(
      isSupportedPhaseOneRoleAssignment(vendor("vendor_member", VENDOR_B)),
    ).toBe(true);
  });

  it("rejects unsupported global, vendor, and wrong-branch combinations", () => {
    expect(
      isSupportedPhaseOneRoleAssignment({
        role: "customer",
        active: true,
        scopeType: "global",
      }),
    ).toBe(false);
    expect(isSupportedPhaseOneRoleAssignment(vendor("worker", VENDOR_A))).toBe(
      false,
    );
    expect(
      isSupportedPhaseOneRoleAssignment({
        role: "customer",
        active: true,
        scopeType: "branch",
        scopeId: "00000000-0000-4000-8000-000000000199",
      }),
    ).toBe(false);
  });

  it("accepts distinct multiple grants and rejects an exact duplicate", () => {
    expect(
      activeSupportedAssignments([
        branch("vendor_owner"),
        vendor("vendor_owner", VENDOR_A),
        vendor("vendor_owner", VENDOR_B),
      ]),
    ).toHaveLength(3);
    expect(
      activeSupportedAssignments([
        vendor("vendor_owner", VENDOR_A),
        vendor("vendor_owner", VENDOR_A),
      ]),
    ).toBeUndefined();
    expect(
      activeSupportedAssignments([
        branch("customer"),
        branch("customer", false),
      ]),
    ).toBeUndefined();
  });

  it("does not let an inactive grant authorize a role", () => {
    expect(
      hasSupportedActiveRoleAssignment([branch("customer", false)], "customer"),
    ).toBe(false);
    expect(activeSupportedAssignments([branch("customer", false)])).toEqual([]);
  });

  it("never interprets vendor resource UUIDs as operational branch UUIDs", () => {
    expect(
      resolveBranchId({
        userId: "00000000-0000-4000-8000-000000000201",
        sessionId: "00000000-0000-4000-8000-000000000301",
        activeRole: "vendor_owner",
        roleAssignments: [vendor("vendor_owner", VENDOR_A)],
      }),
    ).toBe(PHASE_ONE_BRANCH_ID);
  });

  it("intersects the active vendor role with exact vendor or branch scope", () => {
    expect(
      hasActiveVendorResourceGrant(
        [vendor("vendor_owner", VENDOR_A)],
        "vendor_owner",
        VENDOR_A,
        PHASE_ONE_BRANCH_ID,
      ),
    ).toBe(true);
    expect(
      hasActiveVendorResourceGrant(
        [vendor("vendor_owner", VENDOR_A)],
        "vendor_owner",
        VENDOR_B,
        PHASE_ONE_BRANCH_ID,
      ),
    ).toBe(false);
    expect(
      hasActiveVendorResourceGrant(
        [branch("vendor_member")],
        "vendor_member",
        VENDOR_B,
        PHASE_ONE_BRANCH_ID,
      ),
    ).toBe(true);
    expect(
      hasActiveVendorResourceGrant(
        [vendor("vendor_owner", VENDOR_A)],
        "customer",
        VENDOR_A,
        PHASE_ONE_BRANCH_ID,
      ),
    ).toBe(false);
  });
});

function branch(role: RoleAssignment["role"], active = true): RoleAssignment {
  return {
    role,
    active,
    scopeType: "branch",
    scopeId: PHASE_ONE_BRANCH_ID,
  };
}

function vendor(role: RoleAssignment["role"], scopeId: string): RoleAssignment {
  return { role, active: true, scopeType: "vendor", scopeId };
}
