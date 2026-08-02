import type { PlatformRole } from "@me-event/shared-types";
import { describe, expect, it } from "vitest";
import { PlatformFoundationService } from "../src/modules/platform-foundation/application/platform-foundation.service";
import {
  ROLE_CAPABILITIES,
  ROLE_MODULES,
  type AuthenticatedPrincipal,
} from "../src/modules/platform-foundation/domain/platform-foundation";

const generatedAt = new Date("2026-07-29T10:00:00.000Z");

describe("PlatformFoundationService", () => {
  const service = new PlatformFoundationService();

  it("bootstraps the customer mobile experience without exposing ERP access", () => {
    const bootstrap = service.createBootstrap(
      principal("customer", [
        { role: "customer", active: true },
        { role: "worker", active: false },
      ]),
      "request-1",
      generatedAt,
    );

    expect(bootstrap.branch).toMatchObject({
      code: "HYD",
      city: "Hyderabad",
      state: "Telangana",
      timezone: "Asia/Kolkata",
    });
    expect(bootstrap.client).toEqual({
      surface: "customer_mobile",
      landingModule: "customer_home",
    });
    expect(bootstrap.access.assignedActiveRoles).toEqual([
      {
        role: "customer",
        surface: "customer_mobile",
        scopeId: "00000000-0000-4000-8000-000000000001",
      },
    ]);
    expect(bootstrap.access.modules.map(({ id }) => id)).toContain(
      "customer_enquiries",
    );
    expect(bootstrap.access.modules.map(({ id }) => id)).not.toContain(
      "erp_events",
    );
    expect(bootstrap.access.capabilities).not.toContain("erp_event.read");
    expect(bootstrap.controls.mutationAudit).toBe("required");
  });

  it("gives an administrator the employee CRM and ERP surface", () => {
    const bootstrap = service.createBootstrap(
      principal("administrator", [
        {
          role: "administrator",
          active: true,
          scopeId: "00000000-0000-4000-8000-000000000001",
        },
      ]),
      "request-2",
      generatedAt,
    );
    const modules = bootstrap.access.modules.map(({ id }) => id);

    expect(bootstrap.client.surface).toBe("employee_web");
    expect(modules).toEqual(
      expect.arrayContaining([
        "crm_leads",
        "crm_quotations",
        "erp_events",
        "erp_vendors",
        "erp_workers",
        "erp_warehouse",
        "erp_finance",
        "erp_approvals",
        "platform_administration",
        "audit_log",
      ]),
    );
    expect(bootstrap.access.capabilities).toContain("erp_vendor_price.approve");
    expect(bootstrap.access.capabilities).toContain("platform_user.manage");
  });

  it("has an explicit capability and navigation policy for every shared role", () => {
    const roles: readonly PlatformRole[] = [
      "customer",
      "vendor_owner",
      "vendor_member",
      "worker",
      "employee",
      "support",
      "finance",
      "manager",
      "administrator",
      "auditor",
    ];

    for (const role of roles) {
      expect(ROLE_CAPABILITIES[role].length).toBeGreaterThan(0);
      expect(ROLE_MODULES[role].length).toBeGreaterThan(0);
    }
  });
});

function principal(
  activeRole: PlatformRole,
  roleAssignments: AuthenticatedPrincipal["roleAssignments"],
): AuthenticatedPrincipal {
  return {
    userId: "user-1",
    sessionId: "session-1",
    activeRole,
    roleAssignments,
  };
}
