import type { VerifyOtpResponse } from "@me-event/api-contracts";
import type { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHmac, randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryIdentityRepository } from "../src/modules/identity/adapters/in-memory-identity.repository";
import { AuthService } from "../src/modules/identity/application/auth.service";
import type { AuditEvent, AuditSink } from "../src/modules/audit/audit-event";
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

class RecordingAuditSink implements AuditSink {
  public readonly events: AuditEvent[] = [];

  public async append(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }
}

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
  let audit: RecordingAuditSink;
  let service: AuthService;

  beforeEach(() => {
    repository = new InMemoryIdentityRepository();
    otpProvider = new CapturingOtpProvider();
    audit = new RecordingAuditSink();
    service = new AuthService(
      repository,
      otpProvider,
      audit,
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
    expect(audit.events.map((event) => event.action)).toEqual([
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
      audit.events.filter(
        (event) => event.action === "identity.session.rotated",
      ),
    ).toHaveLength(1);
    expect(
      audit.events.filter(
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

    const revocation = audit.events.find(
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
    ).rejects.toThrow("not active");
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
