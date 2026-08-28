import "reflect-metadata";
import type { VerifyOtpResponse } from "@me-event/api-contracts";
import { switchRoleSchema } from "@me-event/api-contracts";
import type { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { RoleAssignment } from "@me-event/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryIdentityRepository } from "../src/modules/identity/adapters/in-memory-identity.repository";
import { AuthService } from "../src/modules/identity/application/auth.service";
import { AuthController } from "../src/modules/identity/presentation/auth.controller";
import { IS_PUBLIC_KEY } from "../src/modules/authorization/public.decorator";
import type {
  OtpDelivery,
  OtpProvider,
} from "../src/modules/identity/ports/otp-provider";
import {
  AccessTokenGuard,
  type AuthenticatedPlatformRequest,
} from "../src/modules/platform-foundation/security/access-token.guard";
import { authPrincipalCache } from "../src/modules/platform-foundation/security/auth-principal-cache";
import type { AuthenticatedPrincipal } from "../src/modules/platform-foundation/domain/platform-foundation";
import type { ExecutionContext } from "@nestjs/common";

const OTP_HMAC_SECRET = "o".repeat(32);
const JWT_ACCESS_SECRET = "j".repeat(32);
const REFRESH_TOKEN_HMAC_SECRET = "r".repeat(32);
const secrets: Readonly<Record<string, string>> = {
  APP_ENV: "development",
  OTP_PROVIDER: "local",
  OTP_HMAC_SECRET,
  JWT_ACCESS_SECRET,
  REFRESH_TOKEN_HMAC_SECRET,
};

class CapturingOtpProvider implements OtpProvider {
  public lastCode: string | undefined;
  public async sendCode(
    _mobileNumber: string,
    code: string,
  ): Promise<OtpDelivery> {
    this.lastCode = code;
    return { providerMessageId: "test-delivery" };
  }
}

describe("AuthService switch-role", () => {
  let repository: InMemoryIdentityRepository;
  let otpProvider: CapturingOtpProvider;
  let service: AuthService;
  let jwt: JwtService;
  let guard: AccessTokenGuard;

  beforeEach(() => {
    authPrincipalCache.clear();
    repository = new InMemoryIdentityRepository();
    otpProvider = new CapturingOtpProvider();
    jwt = new JwtService({ secret: JWT_ACCESS_SECRET });
    service = new AuthService(
      repository,
      otpProvider,
      {
        getOrThrow: (key: string): string => {
          const value = secrets[key];
          if (value === undefined) {
            throw new Error(`Missing ${key}`);
          }
          return value;
        },
      } as unknown as ConfigService,
      jwt,
    );
    const reflector = {
      getAllAndOverride: () => undefined,
    } as unknown as import("@nestjs/core").Reflector;
    guard = new AccessTokenGuard(jwt, reflector, repository);
  });

  async function login(): Promise<VerifyOtpResponse> {
    const challenge = await service.requestOtp({
      mobileNumber: "+919876543210",
    });
    return service.verifyOtp({
      challengeId: challenge.challengeId,
      code: otpProvider.lastCode ?? "",
      deviceId: "device-0001",
    });
  }

  async function sessionIdOf(loginResult: VerifyOtpResponse): Promise<string> {
    const payload = await jwt.verifyAsync<{ sid: string }>(
      loginResult.accessToken,
    );
    return payload.sid;
  }

  async function assignRoles(
    userId: string,
    roles: readonly RoleAssignment[],
  ): Promise<void> {
    const user = await repository.findUserById(userId);
    if (user === undefined) {
      throw new Error("user missing");
    }
    repository.replaceUser({ ...user, roles });
  }

  it("lets a customer switch to an active worker assignment", async () => {
    const loginResult = await login();
    await assignRoles(loginResult.user.id, [
      { role: "customer", active: true },
      { role: "worker", active: true },
    ]);
    const switched = await service.switchRole(
      loginResult.user.id,
      await sessionIdOf(loginResult),
      "worker",
    );
    expect(switched.activeRole).toBe("worker");
    const user = await repository.findUserById(loginResult.user.id);
    expect(user?.lastActiveRole).toBe("worker");
  });

  it("lets a customer switch to active vendor_owner", async () => {
    const loginResult = await login();
    await assignRoles(loginResult.user.id, [
      { role: "customer", active: true },
      { role: "vendor_owner", active: true },
    ]);
    const switched = await service.switchRole(
      loginResult.user.id,
      await sessionIdOf(loginResult),
      "vendor_owner",
    );
    expect(switched.activeRole).toBe("vendor_owner");
  });

  it("supports vendor_member as a switch target", async () => {
    const loginResult = await login();
    await assignRoles(loginResult.user.id, [
      { role: "customer", active: true },
      { role: "vendor_member", active: true },
    ]);
    const switched = await service.switchRole(
      loginResult.user.id,
      await sessionIdOf(loginResult),
      "vendor_member",
    );
    expect(switched.activeRole).toBe("vendor_member");
  });

  it("rejects an inactive or unassigned target with ROLE_NOT_ASSIGNED", async () => {
    const loginResult = await login();
    await assignRoles(loginResult.user.id, [
      { role: "customer", active: true },
      { role: "worker", active: false },
    ]);
    await expect(
      service.switchRole(
        loginResult.user.id,
        await sessionIdOf(loginResult),
        "worker",
      ),
    ).rejects.toMatchObject({ code: "ROLE_NOT_ASSIGNED", status: 403 });
  });

  it("rejects employee roles in the mobile switch request schema", () => {
    expect(switchRoleSchema.safeParse({ role: "employee" }).success).toBe(
      false,
    );
    expect(switchRoleSchema.safeParse({ role: "administrator" }).success).toBe(
      false,
    );
    expect(switchRoleSchema.safeParse({ role: "manager" }).success).toBe(false);
  });

  it("is idempotent when switching to the already-active role", async () => {
    const loginResult = await login();
    const userBefore = await repository.findUserById(loginResult.user.id);
    const identityAuditCount = repository.identityAudits.length;
    const switched = await service.switchRole(
      loginResult.user.id,
      await sessionIdOf(loginResult),
      "customer",
    );
    const userAfter = await repository.findUserById(loginResult.user.id);
    expect(switched.activeRole).toBe("customer");
    expect(switched.accessToken).not.toHaveLength(0);
    expect(userAfter?.version).toBe(userBefore?.version);
    expect(
      repository.roleSwitchAudits.filter(
        (event) => event.action === "identity.role.switched",
      ),
    ).toHaveLength(0);
    expect(repository.identityAudits).toHaveLength(identityAuditCount);
  });

  it("returns 409 when the persisted version does not match", async () => {
    const loginResult = await login();
    await assignRoles(loginResult.user.id, [
      { role: "customer", active: true },
      { role: "worker", active: true },
    ]);
    vi.spyOn(repository, "persistRoleSwitch").mockResolvedValueOnce(undefined);
    await expect(
      service.switchRole(
        loginResult.user.id,
        await sessionIdOf(loginResult),
        "worker",
      ),
    ).rejects.toMatchObject({ code: "VERSION_CONFLICT", status: 409 });
  });

  it("persists lastActiveRole and increments version once on a real switch", async () => {
    const loginResult = await login();
    await assignRoles(loginResult.user.id, [
      { role: "customer", active: true },
      { role: "worker", active: true },
    ]);
    const before = await repository.findUserById(loginResult.user.id);
    await service.switchRole(
      loginResult.user.id,
      await sessionIdOf(loginResult),
      "worker",
    );
    const after = await repository.findUserById(loginResult.user.id);
    expect(after?.lastActiveRole).toBe("worker");
    expect(after?.version).toBe((before?.version ?? 0) + 1);
  });

  it("creates one audit event with from/to roles and no tokens", async () => {
    const loginResult = await login();
    await assignRoles(loginResult.user.id, [
      { role: "customer", active: true },
      { role: "worker", active: true },
    ]);
    await service.switchRole(
      loginResult.user.id,
      await sessionIdOf(loginResult),
      "worker",
    );
    const events = repository.roleSwitchAudits.filter(
      (event) => event.action === "identity.role.switched",
    );
    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event?.entityType).toBe("app_user");
    expect(event?.entityId).toBe(loginResult.user.id);
    expect(event?.actorUserId).toBe(loginResult.user.id);
    expect(event?.actorRole).toBe("customer");
    expect(event?.metadata).toEqual({ fromRole: "customer", toRole: "worker" });
    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain(loginResult.accessToken);
    expect(serialized).not.toContain(loginResult.refreshToken);
    expect(serialized).not.toContain(loginResult.user.mobileNumber);
    expect(serialized.toLowerCase()).not.toContain("accessToken".toLowerCase());
  });

  it("invalidates every cached principal for that user", async () => {
    const loginResult = await login();
    const sessionId = await sessionIdOf(loginResult);
    const principal: AuthenticatedPrincipal = {
      userId: loginResult.user.id,
      sessionId,
      activeRole: "customer",
      roleAssignments: loginResult.user.roles,
    };
    const other: AuthenticatedPrincipal = {
      userId: "other-user",
      sessionId: "other-session",
      activeRole: "customer",
      roleAssignments: [],
    };
    authPrincipalCache.set(
      sessionId,
      "customer",
      principal,
      new Date(Date.now() + 60_000).toISOString(),
    );
    authPrincipalCache.set(
      "second-session",
      "worker",
      { ...principal, sessionId: "second-session", activeRole: "worker" },
      new Date(Date.now() + 60_000).toISOString(),
    );
    authPrincipalCache.set(
      "other-session",
      "customer",
      other,
      new Date(Date.now() + 60_000).toISOString(),
    );
    await assignRoles(loginResult.user.id, [
      { role: "customer", active: true },
      { role: "worker", active: true },
    ]);
    await service.switchRole(loginResult.user.id, sessionId, "worker");
    expect(authPrincipalCache.get(sessionId, "customer")).toBeUndefined();
    expect(authPrincipalCache.get("second-session", "worker")).toBeUndefined();
    expect(authPrincipalCache.get("other-session", "customer")?.userId).toBe(
      "other-user",
    );
  });

  it("rejects the previous role token after switching and accepts the new token", async () => {
    const loginResult = await login();
    await assignRoles(loginResult.user.id, [
      { role: "customer", active: true },
      { role: "worker", active: true },
    ]);
    const sessionId = await sessionIdOf(loginResult);
    const switched = await service.switchRole(
      loginResult.user.id,
      sessionId,
      "worker",
    );
    await expect(
      guard.canActivate(
        contextFor(
          requestWithAuthorization(`Bearer ${loginResult.accessToken}`),
        ),
      ),
    ).rejects.toThrow("session is not active");
    await expect(
      guard.canActivate(
        contextFor(requestWithAuthorization(`Bearer ${switched.accessToken}`)),
      ),
    ).resolves.toBe(true);
  });

  it("returns the authoritative active role on refresh without creating a session", async () => {
    const loginResult = await login();
    await assignRoles(loginResult.user.id, [
      { role: "customer", active: true },
      { role: "worker", active: true },
    ]);
    const sessionId = await sessionIdOf(loginResult);
    const sessionsBefore = repository.sessionCount();
    await service.switchRole(loginResult.user.id, sessionId, "worker");
    const refreshed = await service.refreshSession({
      refreshToken: loginResult.refreshToken,
    });
    expect(refreshed.activeRole).toBe("worker");
    expect(repository.sessionCount()).toBe(sessionsBefore);
    const payload = await jwt.verifyAsync<{ role: string; sid: string }>(
      refreshed.accessToken,
    );
    expect(payload.role).toBe("worker");
    expect(payload.sid).toBe(sessionId);
  });

  it("keeps the current refresh token valid after a role switch", async () => {
    const loginResult = await login();
    await assignRoles(loginResult.user.id, [
      { role: "customer", active: true },
      { role: "worker", active: true },
    ]);
    await service.switchRole(
      loginResult.user.id,
      await sessionIdOf(loginResult),
      "worker",
    );
    const refreshed = await service.refreshSession({
      refreshToken: loginResult.refreshToken,
    });
    expect(refreshed.refreshToken).not.toHaveLength(0);
    expect(refreshed.activeRole).toBe("worker");
  });

  it("in-memory lastActiveRole updates fail closed on a stale version", async () => {
    const user = await repository.createUser("+919876543211", "customer");
    const input = {
      userId: user.id,
      role: "customer" as const,
      requestId: "req-stale",
      actorUserId: user.id,
      actorRole: "customer" as const,
      fromRole: "customer" as const,
      toRole: "customer" as const,
    };
    const missed = await repository.persistRoleSwitch({
      ...input,
      expectedVersion: user.version + 1,
    });
    expect(missed).toBeUndefined();
    const updated = await repository.persistRoleSwitch({
      ...input,
      expectedVersion: user.version,
    });
    expect(updated?.version).toBe(user.version + 1);
  });

  it("failed atomic persistence leaves the active role unchanged and issues no token", async () => {
    const loginResult = await login();
    await assignRoles(loginResult.user.id, [
      { role: "customer", active: true },
      { role: "worker", active: true },
    ]);
    const sessionId = await sessionIdOf(loginResult);
    authPrincipalCache.set(
      sessionId,
      "customer",
      {
        userId: loginResult.user.id,
        sessionId,
        activeRole: "customer",
        roleAssignments: loginResult.user.roles,
      },
      new Date(Date.now() + 60_000).toISOString(),
    );
    repository.failNextRoleSwitchAudit = true;
    await expect(
      service.switchRole(loginResult.user.id, sessionId, "worker"),
    ).rejects.toThrow("audit insert failed");
    const after = await repository.findUserById(loginResult.user.id);
    expect(after?.lastActiveRole).toBe("customer");
    expect(repository.roleSwitchAudits).toHaveLength(0);
    expect(authPrincipalCache.get(sessionId, "customer")?.userId).toBe(
      loginResult.user.id,
    );
  });

  it("two switches starting with the same version cannot both commit", async () => {
    const user = await repository.createUser("+919876543212", "customer");
    const input = {
      userId: user.id,
      role: "customer" as const,
      expectedVersion: user.version,
      requestId: "req-race",
      actorUserId: user.id,
      actorRole: "customer" as const,
      fromRole: "customer" as const,
      toRole: "customer" as const,
    };
    const first = await repository.persistRoleSwitch({
      ...input,
      role: "worker",
      toRole: "worker",
    });
    const second = await repository.persistRoleSwitch({
      ...input,
      role: "vendor_owner",
      toRole: "vendor_owner",
      requestId: "req-race-2",
    });
    expect(first?.version).toBe(user.version + 1);
    expect(second).toBeUndefined();
    const stored = await repository.findUserById(user.id);
    expect(stored?.lastActiveRole).toBe("worker");
    expect(repository.roleSwitchAudits).toHaveLength(1);
  });

  it("does not mark switch-role, sessions, or logout-all as public routes", () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AuthController.prototype.switchRole as object,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AuthController.prototype.listSessions as object,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AuthController.prototype.logoutAll as object,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AuthController.prototype.logout as object,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AuthController.prototype.requestOtp as object,
      ),
    ).toBe(true);
  });

  it("rejects an invalid request role", () => {
    expect(switchRoleSchema.safeParse({ role: "vendor_staff" }).success).toBe(
      false,
    );
    expect(switchRoleSchema.safeParse({ role: "not-a-role" }).success).toBe(
      false,
    );
    expect(switchRoleSchema.safeParse({}).success).toBe(false);
    expect(switchRoleSchema.safeParse({ role: "customer" }).success).toBe(true);
  });
});

function requestWithAuthorization(
  authorization: string | undefined,
): AuthenticatedPlatformRequest {
  return {
    get: (headerName: string): string | undefined =>
      headerName.toLowerCase() === "authorization" ? authorization : undefined,
  } as unknown as AuthenticatedPlatformRequest;
}

function contextFor(request: AuthenticatedPlatformRequest): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}
