import type { ExecutionContext } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { DeviceSession } from "@me-event/shared-types";
import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryIdentityRepository } from "../src/modules/identity/adapters/in-memory-identity.repository";
import {
  AccessTokenGuard,
  type AuthenticatedPlatformRequest,
} from "../src/modules/platform-foundation/security/access-token.guard";
import { authPrincipalCache } from "../src/modules/platform-foundation/security/auth-principal-cache";

const secret = "j".repeat(32);

describe("AccessTokenGuard", () => {
  let jwt: JwtService;
  let repository: InMemoryIdentityRepository;
  let guard: AccessTokenGuard;

  beforeEach(() => {
    authPrincipalCache.clear();
    jwt = new JwtService({ secret });
    repository = new InMemoryIdentityRepository();
    const reflector = {
      getAllAndOverride: () => undefined,
    } as unknown as import("@nestjs/core").Reflector;
    guard = new AccessTokenGuard(jwt, reflector, repository);
  });

  it("accepts a signed token only when its user, session and role are active", async () => {
    const user = await repository.createUser("+919876543210", "customer");
    const session = activeSession(user.id);
    await repository.saveSession(session, "not-used-by-access-token-check");
    const token = await jwt.signAsync({
      sub: user.id,
      sid: session.id,
      role: "customer",
    });
    const request = requestWithAuthorization(`Bearer ${token}`);

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user?.userId).toBe(user.id);
    expect(request.user?.sessionId).toBe(session.id);
    expect(request.user?.activeRole).toBe("customer");
    expect(request.user?.roleAssignments).toEqual(user.roles);
    expect(request.user?.branchId).toBeDefined();
  });

  it("reuses the short-TTL principal cache on subsequent requests", async () => {
    const user = await repository.createUser("+919876543210", "customer");
    const session = activeSession(user.id);
    await repository.saveSession(session, "not-used-by-access-token-check");
    const token = await jwt.signAsync({
      sub: user.id,
      sid: session.id,
      role: "customer",
    });
    const first = requestWithAuthorization(`Bearer ${token}`);
    const second = requestWithAuthorization(`Bearer ${token}`);

    await expect(guard.canActivate(contextFor(first))).resolves.toBe(true);
    await expect(guard.canActivate(contextFor(second))).resolves.toBe(true);
    expect(second.user?.userId).toBe(user.id);
    expect(authPrincipalCache.size).toBeGreaterThan(0);
  });

  it("rejects requests without a bearer token", async () => {
    const request = requestWithAuthorization(undefined);

    await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({
      message: "Authentication is required",
    });
  });

  it("rejects an expired device session even when the JWT signature is valid", async () => {
    const user = await repository.createUser("+919876543210", "customer");
    const session: DeviceSession = {
      ...activeSession(user.id),
      expiresAt: "2026-01-01T00:00:00.000Z",
    };
    await repository.saveSession(session, "not-used-by-access-token-check");
    const token = await jwt.signAsync({
      sub: user.id,
      sid: session.id,
      role: "customer",
    });

    await expect(
      guard.canActivate(
        contextFor(requestWithAuthorization(`Bearer ${token}`)),
      ),
    ).rejects.toThrow("Your session has ended. Please sign in again.");
  });

  it("rejects a principal that also carries an unsupported scope combination", async () => {
    const user = await repository.createUser("+919876543210", "customer");
    repository.replaceUser({
      ...user,
      roles: [
        ...user.roles,
        {
          role: "customer",
          active: true,
          scopeType: "global",
        },
      ],
    });
    const session = activeSession(user.id);
    await repository.saveSession(session, "not-used-by-access-token-check");
    const token = await jwt.signAsync({
      sub: user.id,
      sid: session.id,
      role: "customer",
    });

    await expect(
      guard.canActivate(
        contextFor(requestWithAuthorization(`Bearer ${token}`)),
      ),
    ).rejects.toThrow("Your session has ended. Please sign in again.");
  });

  it("skips authentication for public endpoints", async () => {
    const reflector = {
      getAllAndOverride: () => true,
    } as unknown as import("@nestjs/core").Reflector;
    const publicGuard = new AccessTokenGuard(jwt, reflector, repository);
    const request = requestWithAuthorization(undefined);

    await expect(publicGuard.canActivate(contextFor(request))).resolves.toBe(
      true,
    );
    expect(request.user).toBeUndefined();
  });
});

function activeSession(userId: string): DeviceSession {
  const now = new Date();
  return {
    id: "session-1",
    userId,
    deviceId: "test-device",
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 60_000).toISOString(),
  };
}

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
