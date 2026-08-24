import type { PlatformRole } from "@me-event/shared-types";
import { describe, expect, it } from "vitest";
import { PlatformFoundationService } from "../src/modules/platform-foundation/application/platform-foundation.service";
import {
  ROLE_CAPABILITIES,
  ROLE_MODULES,
  capabilityIds,
  type AuthenticatedPrincipal,
} from "../src/modules/platform-foundation/domain/platform-foundation";
import { capabilityIds as contractCapabilityIds } from "@me-event/api-contracts";

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

  it("keeps CRM capabilities off mobile vendor and worker roles", () => {
    for (const role of ["vendor_owner", "vendor_member", "worker"] as const) {
      expect(
        ROLE_CAPABILITIES[role].some((capability) =>
          capability.startsWith("crm_"),
        ),
      ).toBe(false);
    }
    expect(ROLE_CAPABILITIES.vendor_owner).toEqual(
      expect.arrayContaining(["vendor_own.read", "vendor_own.update"]),
    );
    expect(ROLE_CAPABILITIES.worker).toEqual(
      expect.arrayContaining(["worker_own.read", "worker_own.update"]),
    );
  });

  it("keeps api-contracts and platform-foundation capability catalogs synchronized", () => {
    expect([...capabilityIds]).toEqual([...contractCapabilityIds]);
  });

  it("gives administrators both catalogue-review capabilities", () => {
    expect(ROLE_CAPABILITIES.administrator).toEqual(capabilityIds);
    expect(ROLE_CAPABILITIES.administrator).toEqual(
      expect.arrayContaining(["catalog_review.read", "catalog_review.update"]),
    );
  });

  it("does not grant catalogue-review capabilities to CRM or other non-admin roles", () => {
    const deniedRoles = [
      "customer",
      "vendor_owner",
      "vendor_member",
      "worker",
      "employee",
      "support",
      "finance",
      "manager",
    ] as const;
    for (const role of deniedRoles) {
      expect(ROLE_CAPABILITIES[role]).not.toContain("catalog_review.read");
      expect(ROLE_CAPABILITIES[role]).not.toContain("catalog_review.update");
    }
    expect(ROLE_CAPABILITIES.auditor).toContain("catalog_review.read");
    expect(ROLE_CAPABILITIES.auditor).not.toContain("catalog_review.update");
    expect(ROLE_CAPABILITIES.employee).toEqual(
      expect.arrayContaining(["crm_lead.read", "crm_lead.update"]),
    );
  });

  it("keeps customer vendor and worker bootstrap capabilities unchanged", () => {
    expect([...ROLE_CAPABILITIES.customer]).toEqual([
      "enquiry.create_own",
      "enquiry.read_own",
      "quotation.read_own",
      "quotation.approve_own",
      "quotation.reject_own",
      "quotation.request_revision_own",
      "booking.read_own",
      "payment.submit_own",
      "payment.read_own",
      "event.track_own",
      "change_request.create_own",
      "support.contact_assigned_manager",
    ]);
    expect([...ROLE_CAPABILITIES.vendor_owner]).toEqual([
      "vendor_profile.manage_own",
      "vendor_availability.manage_own",
      "vendor_proposal.submit_own",
      "vendor_work_order.read_assigned",
      "vendor_work_order.update_assigned",
      "vendor_evidence.submit_assigned",
      "vendor_invoice.submit_own",
      "vendor_payment.read_own",
      "vendor_own.read",
      "vendor_own.update",
      "operations_assigned.read",
      "operations_assigned.update",
      "operations.issue.manage",
      "operations.photo.upload",
    ]);
    expect([...ROLE_CAPABILITIES.vendor_member]).toEqual([
      "vendor_availability.manage_own",
      "vendor_work_order.read_assigned",
      "vendor_work_order.update_assigned",
      "vendor_evidence.submit_assigned",
      "vendor_own.read",
      "vendor_own.update",
      "operations_assigned.read",
      "operations_assigned.update",
      "operations.issue.manage",
      "operations.photo.upload",
    ]);
    expect([...ROLE_CAPABILITIES.worker]).toEqual([
      "worker_assignment.read_own",
      "worker_assignment.respond_own",
      "worker_attendance.check_in_own",
      "worker_duty.update_own",
      "worker_payment.read_own",
      "worker_own.read",
      "worker_own.update",
      "operations_assigned.read",
      "operations_assigned.update",
      "operations.issue.manage",
      "operations.photo.upload",
      "operations.task.manage",
    ]);
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
