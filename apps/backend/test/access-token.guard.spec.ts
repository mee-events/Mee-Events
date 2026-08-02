import type { ExecutionContext } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { DeviceSession } from "@me-event/shared-types";
import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryIdentityRepository } from "../src/modules/identity/adapters/in-memory-identity.repository";
import {
  AccessTokenGuard,
  type AuthenticatedPlatformRequest,
} from "../src/modules/platform-foundation/security/access-token.guard";

const secret = "j".repeat(32);

describe("AccessTokenGuard", () => {
  let jwt: JwtService;
  let repository: InMemoryIdentityRepository;
  let guard: AccessTokenGuard;

  beforeEach(() => {
    jwt = new JwtService({ secret });
    repository = new InMemoryIdentityRepository();
    guard = new AccessTokenGuard(jwt, repository);
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
    expect(request.user).toEqual({
      userId: user.id,
      sessionId: session.id,
      activeRole: "customer",
      roleAssignments: user.roles,
    });
  });

  it("rejects requests without a bearer token", async () => {
    const request = requestWithAuthorization(undefined);

    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
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
    ).rejects.toThrow("session is not active");
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
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}
