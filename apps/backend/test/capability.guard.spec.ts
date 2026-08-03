import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";
import { CapabilityGuard } from "../src/modules/authorization/capability.guard";
import type { AuthenticatedPlatformRequest } from "../src/modules/platform-foundation/security/access-token.guard";
import type {
  AuthenticatedPrincipal,
  CapabilityId,
} from "../src/modules/platform-foundation/domain/platform-foundation";

function guardRequiring(capability: CapabilityId | undefined): CapabilityGuard {
  const reflector = {
    getAllAndOverride: () => capability,
  } as unknown as Reflector;
  return new CapabilityGuard(reflector);
}

function contextWithPrincipal(
  principal: AuthenticatedPrincipal | undefined,
): ExecutionContext {
  const request = { user: principal } as AuthenticatedPlatformRequest;
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function principalWithRole(
  role: AuthenticatedPrincipal["activeRole"],
): AuthenticatedPrincipal {
  return {
    userId: "user-1",
    sessionId: "session-1",
    activeRole: role,
    roleAssignments: [{ role, active: true }],
  };
}

describe("CapabilityGuard", () => {
  it("denies endpoints without a capability requirement", () => {
    const guard = guardRequiring(undefined);
    expect(() =>
      guard.canActivate(contextWithPrincipal(principalWithRole("employee"))),
    ).toThrow(ForbiddenException);
  });

  it("allows a role that holds the required capability", () => {
    const guard = guardRequiring("crm_lead.read");
    expect(
      guard.canActivate(contextWithPrincipal(principalWithRole("employee"))),
    ).toBe(true);
  });

  it("rejects a role without the required capability", () => {
    const guard = guardRequiring("crm_lead.read");
    expect(() =>
      guard.canActivate(contextWithPrincipal(principalWithRole("customer"))),
    ).toThrow(ForbiddenException);
  });

  it("rejects requests without an authenticated principal", () => {
    const guard = guardRequiring("crm_lead.read");
    expect(() => guard.canActivate(contextWithPrincipal(undefined))).toThrow(
      UnauthorizedException,
    );
  });
});
