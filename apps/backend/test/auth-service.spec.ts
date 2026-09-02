import type {
  ListSessionsResponse,
  LogoutAllResponse,
  VerifyOtpResponse,
} from "@me-event/api-contracts";
import type { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHmac, randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryIdentityRepository } from "../src/modules/identity/adapters/in-memory-identity.repository";
import { AuthService } from "../src/modules/identity/application/auth.service";
import type {
  OtpDelivery,
  OtpProvider,
} from "../src/modules/identity/ports/otp-provider";

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

describe("AuthService sessions", () => {
  let repository: InMemoryIdentityRepository;
  let otpProvider: CapturingOtpProvider;
  let service: AuthService;

  beforeEach(() => {
    repository = new InMemoryIdentityRepository();
    otpProvider = new CapturingOtpProvider();
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
      new JwtService({ secret: JWT_ACCESS_SECRET }),
    );
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

  it("returns a development debugCode for the local OTP provider", async () => {
    const challenge = await service.requestOtp({
      mobileNumber: "+919876543210",
    });

    expect(challenge.debugCode).toBe(otpProvider.lastCode);
    expect(challenge.debugCode).toMatch(/^\d{6}$/);
  });

  it("enforces OTP resend cooldown for the same mobile", async () => {
    await service.requestOtp({
      mobileNumber: "+919876543210",
    });

    await expect(
      service.requestOtp({
        mobileNumber: "+919876543210",
      }),
    ).rejects.toMatchObject({
      code: "OTP_RESEND_COOLDOWN",
      status: 429,
    });
  });

  it("limits OTP requests per mobile across a shared time window", async () => {
    const mobileNumber = "+919876543210";
    const now = Date.now();
    for (let index = 0; index < 5; index += 1) {
      await repository.saveChallenge({
        id: randomUUID(),
        mobileNumber,
        codeDigest: "digest",
        createdAt: new Date(now - index * 1000),
        expiresAt: new Date(now - 1000),
        resendAfter: new Date(now - 1000),
        attemptsRemaining: 5,
        consumedAt: new Date(now - 1000),
      });
    }

    await expect(service.requestOtp({ mobileNumber })).rejects.toMatchObject({
      code: "OTP_REQUEST_LIMIT",
      status: 429,
    });
  });

  it("creates a user, session, and audit trail on first login", async () => {
    const result = await login();

    expect(result.user.mobileNumber).toBe("+919876543210");
    expect(result.user.lastActiveRole).toBe("customer");
    expect(result.accessToken).not.toHaveLength(0);
    expect(result.refreshToken).not.toHaveLength(0);
    expect(repository.identityAudits.map((event) => event.action)).toEqual([
      "identity.user.created",
      "identity.session.created",
    ]);
  });

  it("rotates the refresh token and keeps the session usable", async () => {
    const login1 = await login();

    const rotated = await service.refreshSession({
      refreshToken: login1.refreshToken,
    });

    expect(rotated.refreshToken).not.toBe(login1.refreshToken);
    expect(rotated.accessToken).not.toHaveLength(0);
    expect(rotated.activeRole).toBe("customer");

    const rotatedAgain = await service.refreshSession({
      refreshToken: rotated.refreshToken,
    });
    expect(rotatedAgain.refreshToken).not.toBe(rotated.refreshToken);
  });

  it("uses process-local in-flight protection without revoking the winner", async () => {
    const login1 = await login();
    const results = await Promise.allSettled([
      service.refreshSession({ refreshToken: login1.refreshToken }),
      service.refreshSession({ refreshToken: login1.refreshToken }),
    ]);
    const fulfilled = results.filter(
      (
        result,
      ): result is PromiseFulfilledResult<
        Awaited<ReturnType<AuthService["refreshSession"]>>
      > => result.status === "fulfilled",
    );
    expect(fulfilled).toHaveLength(1);
    expect(
      results
        .filter((result) => result.status === "rejected")
        .map((result) => errorCode(result.reason)),
    ).toEqual(["SESSION_REFRESH_CONFLICT"]);

    const winner = await repository.findSessionByRefreshDigest(
      digestOf(fulfilled[0]?.value.refreshToken ?? ""),
    );
    expect(winner?.match).toBe("current");
    expect(winner?.record.session.revokedAt).toBeUndefined();
    expect(
      repository.identityAudits.filter(
        (event) => event.action === "identity.session.rotated",
      ),
    ).toHaveLength(1);
    expect(
      repository.identityAudits.filter(
        (event) => event.action === "identity.session.revoked",
      ),
    ).toHaveLength(0);
  });

  it("revokes the session when a rotated refresh token is reused", async () => {
    const login1 = await login();
    const rotated = await service.refreshSession({
      refreshToken: login1.refreshToken,
    });

    await expect(
      service.refreshSession({ refreshToken: login1.refreshToken }),
    ).rejects.toMatchObject({ code: "SESSION_REFRESH_REUSED", status: 401 });
    await expect(
      service.refreshSession({ refreshToken: rotated.refreshToken }),
    ).rejects.toMatchObject({ code: "SESSION_NOT_ACTIVE", status: 401 });

    const revocation = repository.identityAudits.find(
      (event) =>
        event.action === "identity.session.revoked" &&
        event.reason === "refresh-token-reuse",
    );
    expect(revocation).toBeDefined();
    const session = await repository.findSessionById(
      revocation?.entityId ?? "",
    );
    expect(session?.revokedAt).toBeDefined();
  });

  it("rejects unknown refresh tokens", async () => {
    const request = { refreshToken: "x".repeat(64) };
    await expect(service.refreshSession(request)).rejects.toMatchObject({
      code: "SESSION_REFRESH_INVALID",
      message: "Your session has ended. Please sign in again.",
      status: 401,
    });
    await expect(service.refreshSession(request)).rejects.toMatchObject({
      code: "SESSION_REFRESH_INVALID",
      status: 401,
    });
  });

  it("rejects an expired session", async () => {
    const user = await repository.createUser("+919876543211", "customer");
    const refreshToken = "expired-refresh-token";
    const now = new Date();
    await repository.saveSession(
      {
        id: randomUUID(),
        userId: user.id,
        deviceId: "expired-device",
        createdAt: new Date(now.getTime() - 2_000).toISOString(),
        lastSeenAt: new Date(now.getTime() - 2_000).toISOString(),
        expiresAt: new Date(now.getTime() - 1_000).toISOString(),
      },
      digestOf(refreshToken),
    );

    await expect(
      service.refreshSession({ refreshToken }),
    ).rejects.toMatchObject({ code: "SESSION_NOT_ACTIVE", status: 401 });
  });

  it("revokes the device session on logout", async () => {
    const result = await login();
    const match = await repository.findSessionByRefreshDigest(
      digestOf(result.refreshToken),
    );
    const sessionId = match?.record.session.id ?? "";

    const logout = await service.logout(result.user.id, sessionId, "customer");

    expect(logout.revoked).toBe(true);
    const session = await repository.findSessionById(sessionId);
    expect(session?.revokedAt).toBeDefined();

    await expect(
      service.refreshSession({ refreshToken: result.refreshToken }),
    ).rejects.toThrow("Your session has ended. Please sign in again.");
    expect(
      repository.identityAudits.some(
        (event) =>
          event.action === "identity.session.revoked" &&
          event.reason === "logout",
      ),
    ).toBe(true);
  });

  it("makes repeated current-session logout idempotent", async () => {
    const result = await login();
    const match = await repository.findSessionByRefreshDigest(
      digestOf(result.refreshToken),
    );
    const sessionId = match?.record.session.id ?? "";

    await expect(
      service.logout(result.user.id, sessionId, "customer"),
    ).resolves.toEqual({ revoked: true });
    await expect(
      service.logout(result.user.id, sessionId, "customer"),
    ).resolves.toEqual({ revoked: true });

    expect(
      repository.identityAudits.filter(
        (event) =>
          event.action === "identity.session.revoked" &&
          event.entityId === sessionId,
      ),
    ).toHaveLength(1);
  });

  it("cannot revoke a session owned by a different authenticated user", async () => {
    const owner = await login();
    const ownerMatch = await repository.findSessionByRefreshDigest(
      digestOf(owner.refreshToken),
    );
    const otherChallenge = await service.requestOtp({
      mobileNumber: "+919876543219",
    });
    const other = await service.verifyOtp({
      challengeId: otherChallenge.challengeId,
      code: otpProvider.lastCode ?? "",
      deviceId: "device-other-user",
    });

    await service.logout(
      other.user.id,
      ownerMatch?.record.session.id ?? "",
      "customer",
    );

    await expect(
      service.refreshSession({ refreshToken: owner.refreshToken }),
    ).resolves.toMatchObject({ activeRole: "customer" });
  });

  it("allows exactly one concurrent OTP verification from one challenge", async () => {
    const challenge = await service.requestOtp({
      mobileNumber: "+919876543210",
    });
    const code = otpProvider.lastCode ?? "";
    const results = await Promise.allSettled([
      service.verifyOtp({
        challengeId: challenge.challengeId,
        code,
        deviceId: "device-concurrent-a",
      }),
      service.verifyOtp({
        challengeId: challenge.challengeId,
        code,
        deviceId: "device-concurrent-b",
      }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results
        .filter((result) => result.status === "rejected")
        .map((result) => errorCode(result.reason)),
    ).toEqual(["OTP_CHALLENGE_INVALID"]);
    const user = await repository.findUserByMobile("+919876543210");
    expect(user).toBeDefined();
    expect(await repository.listSessionsForUser(user?.id ?? "")).toHaveLength(
      1,
    );
    expect(
      (await repository.findChallenge(challenge.challengeId))?.consumedAt,
    ).toBeDefined();
  });

  it("lists sessions without refresh tokens and marks the current device", async () => {
    const result = await login();
    const match = await repository.findSessionByRefreshDigest(
      digestOf(result.refreshToken),
    );
    const listed: ListSessionsResponse = await service.listSessions(
      result.user.id,
      match?.record.session.id ?? "",
    );
    expect(listed.sessions).toHaveLength(1);
    expect(listed.sessions[0]?.current).toBe(true);
    expect(listed.sessions[0]?.deviceId).toBe("device-0001");
    expect(JSON.stringify(listed)).not.toMatch(/refresh/i);
    expect(JSON.stringify(listed)).not.toContain(result.refreshToken);
    expect(JSON.stringify(listed)).not.toContain(result.accessToken);
  });

  it("logout of the current session leaves another device usable", async () => {
    const first = await login();
    const firstMatch = await repository.findSessionByRefreshDigest(
      digestOf(first.refreshToken),
    );
    const otherRefresh = "other-device-refresh-token-000000000000";
    const now = new Date();
    await repository.saveSession(
      {
        id: randomUUID(),
        userId: first.user.id,
        deviceId: "device-other",
        createdAt: now.toISOString(),
        lastSeenAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 60_000).toISOString(),
      },
      digestOf(otherRefresh),
    );

    await service.logout(
      first.user.id,
      firstMatch?.record.session.id ?? "",
      "customer",
    );
    await expect(
      service.refreshSession({ refreshToken: first.refreshToken }),
    ).rejects.toMatchObject({ code: "SESSION_NOT_ACTIVE", status: 401 });
    const rotated = await service.refreshSession({
      refreshToken: otherRefresh,
    });
    expect(rotated.refreshToken).not.toHaveLength(0);
  });

  it("revoke-all ends every session for the user and not another user", async () => {
    const first = await login();
    const otherChallenge = await service.requestOtp({
      mobileNumber: "+919876543219",
    });
    const other = await service.verifyOtp({
      challengeId: otherChallenge.challengeId,
      code: otpProvider.lastCode ?? "",
      deviceId: "device-other-user",
    });
    const now = new Date();
    await repository.saveSession(
      {
        id: randomUUID(),
        userId: first.user.id,
        deviceId: "device-second",
        createdAt: now.toISOString(),
        lastSeenAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 60_000).toISOString(),
      },
      digestOf("second-device-refresh-token-0000000000"),
    );

    const revoked: LogoutAllResponse = await service.logoutAll(
      first.user.id,
      "customer",
    );
    expect(revoked).toEqual({ revoked: true, revokedCount: 2 });
    expect(await service.listSessions(first.user.id, randomUUID())).toEqual({
      sessions: [],
    });
    await expect(
      service.refreshSession({ refreshToken: first.refreshToken }),
    ).rejects.toMatchObject({ code: "SESSION_NOT_ACTIVE", status: 401 });
    const otherRotated = await service.refreshSession({
      refreshToken: other.refreshToken,
    });
    expect(otherRotated.refreshToken).not.toHaveLength(0);
  });

  it("a new device id does not steal an existing session", async () => {
    const original = await login();
    const challengeId = randomUUID();
    await repository.saveChallenge({
      id: challengeId,
      mobileNumber: "+919876543210",
      codeDigest: createHmac("sha256", OTP_HMAC_SECRET)
        .update(`${challengeId}:123456`)
        .digest("hex"),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      resendAfter: new Date(Date.now() + 1_000),
      attemptsRemaining: 5,
    });
    const reinstall = await service.verifyOtp({
      challengeId,
      code: "123456",
      deviceId: "device-reinstall",
    });
    expect(reinstall.refreshToken).not.toBe(original.refreshToken);
    const listed: ListSessionsResponse = await service.listSessions(
      original.user.id,
      randomUUID(),
    );
    expect(listed.sessions.map((session) => session.deviceId).sort()).toEqual([
      "device-0001",
      "device-reinstall",
    ]);
    const rotated = await service.refreshSession({
      refreshToken: original.refreshToken,
    });
    expect(rotated.refreshToken).not.toHaveLength(0);
  });

  it("rolls back OTP consume when session audit cannot be written", async () => {
    const challenge = await service.requestOtp({
      mobileNumber: "+919876543210",
    });
    repository.failNextSessionAudit = true;
    await expect(
      service.verifyOtp({
        challengeId: challenge.challengeId,
        code: otpProvider.lastCode ?? "",
        deviceId: "device-0001",
      }),
    ).rejects.toThrow("audit insert failed");
    expect(
      (await repository.findChallenge(challenge.challengeId))?.consumedAt,
    ).toBeUndefined();
    expect(await repository.findUserByMobile("+919876543210")).toBeUndefined();
    expect(repository.sessionCount()).toBe(0);
  });
});

function digestOf(refreshToken: string): string {
  return createHmac("sha256", REFRESH_TOKEN_HMAC_SECRET)
    .update(refreshToken)
    .digest("hex");
}

function errorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== "object" || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}
