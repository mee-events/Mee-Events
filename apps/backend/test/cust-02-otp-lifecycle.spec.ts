import type { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHmac, randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { ExotelHttpTransport } from "../src/modules/identity/adapters/exotel-http.transport";
import { ExotelOtpProvider } from "../src/modules/identity/adapters/exotel-otp.provider";
import { InMemoryIdentityRepository } from "../src/modules/identity/adapters/in-memory-identity.repository";
import { AuthService } from "../src/modules/identity/application/auth.service";
import type {
  OtpDelivery,
  OtpProvider,
} from "../src/modules/identity/ports/otp-provider";

const OTP_HMAC_SECRET = "o".repeat(32);
const JWT_ACCESS_SECRET = "j".repeat(32);
const configValues: Readonly<Record<string, string>> = {
  APP_ENV: "test",
  OTP_PROVIDER: "local",
  OTP_HMAC_SECRET,
  JWT_ACCESS_SECRET,
  REFRESH_TOKEN_HMAC_SECRET: "r".repeat(32),
};

class ScriptedOtpProvider implements OtpProvider {
  public readonly deliveries: Array<{
    readonly mobileNumber: string;
    readonly code: string;
  }> = [];

  public failuresRemaining = 0;

  public async sendCode(
    mobileNumber: string,
    code: string,
  ): Promise<OtpDelivery> {
    if (this.failuresRemaining > 0) {
      this.failuresRemaining -= 1;
      throw new Error("raw provider credential and endpoint detail");
    }
    this.deliveries.push({ mobileNumber, code });
    return { providerMessageId: "synthetic-delivery" };
  }
}

class CleanupFailingRepository extends InMemoryIdentityRepository {
  public override async invalidateChallenge(): Promise<boolean> {
    throw new Error("raw persistence cleanup detail");
  }
}

function createService(
  repository: InMemoryIdentityRepository,
  provider: OtpProvider,
): AuthService {
  return new AuthService(
    repository,
    provider,
    {
      getOrThrow: (key: string): string => {
        const value = configValues[key];
        if (value === undefined) throw new Error(`Missing ${key}`);
        return value;
      },
    } as unknown as ConfigService,
    new JwtService({ secret: JWT_ACCESS_SECRET }),
  );
}

function digest(challengeId: string, code: string): string {
  return createHmac("sha256", OTP_HMAC_SECRET)
    .update(`${challengeId}:${code}`)
    .digest("hex");
}

function differentCode(code: string): string {
  return code === "000000" ? "111111" : "000000";
}

describe("CUST-02 OTP lifecycle", () => {
  it("keeps the approved Exotel adapter fail-closed without configuration", async () => {
    const transport: ExotelHttpTransport = { post: vi.fn() };
    const provider = new ExotelOtpProvider(
      {
        get: () => undefined,
      } as unknown as ConfigService,
      transport,
    );

    await expect(
      provider.sendCode("+919876543210", "123456"),
    ).rejects.toMatchObject({ code: "OTP_PROVIDER_UNCONFIGURED", status: 503 });
    expect(transport.post).not.toHaveBeenCalled();
  });

  it("supersedes an earlier challenge before delivering a resend", async () => {
    const repository = new InMemoryIdentityRepository();
    const provider = new ScriptedOtpProvider();
    const service = createService(repository, provider);
    const mobileNumber = "+919876543210";
    const oldChallengeId = randomUUID();
    const oldCode = "123456";
    const now = Date.now();
    await repository.saveChallenge({
      id: oldChallengeId,
      mobileNumber,
      codeDigest: digest(oldChallengeId, oldCode),
      createdAt: new Date(now - 61_000),
      expiresAt: new Date(now + 120_000),
      resendAfter: new Date(now - 1_000),
      attemptsRemaining: 5,
    });

    const replacement = await service.requestOtp({ mobileNumber });

    expect(
      (await repository.findChallenge(oldChallengeId))?.consumedAt,
    ).toBeDefined();
    await expect(
      service.verifyOtp({
        challengeId: oldChallengeId,
        code: oldCode,
        deviceId: "synthetic-device-old",
      }),
    ).rejects.toMatchObject({ code: "OTP_CHALLENGE_INVALID", status: 401 });
    const replacementCode = provider.deliveries[0]?.code ?? "";
    await expect(
      service.verifyOtp({
        challengeId: replacement.challengeId,
        code: replacementCode,
        deviceId: "synthetic-device-new",
      }),
    ).resolves.toMatchObject({ user: { lastActiveRole: "customer" } });
  });

  it("returns incorrect for attempts one to four and exhausted on five", async () => {
    const repository = new InMemoryIdentityRepository();
    const provider = new ScriptedOtpProvider();
    const service = createService(repository, provider);
    const challenge = await service.requestOtp({
      mobileNumber: "+919876543210",
    });
    const deliveredCode = provider.deliveries[0]?.code ?? "";
    const wrongCode = differentCode(deliveredCode);

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await expect(
        service.verifyOtp({
          challengeId: challenge.challengeId,
          code: wrongCode,
          deviceId: "synthetic-device-attempts",
        }),
      ).rejects.toMatchObject({ code: "OTP_INCORRECT", status: 401 });
    }
    await expect(
      service.verifyOtp({
        challengeId: challenge.challengeId,
        code: wrongCode,
        deviceId: "synthetic-device-attempts",
      }),
    ).rejects.toMatchObject({ code: "OTP_ATTEMPTS_EXHAUSTED", status: 429 });
    await expect(
      service.verifyOtp({
        challengeId: challenge.challengeId,
        code: deliveredCode,
        deviceId: "synthetic-device-attempts",
      }),
    ).rejects.toMatchObject({ code: "OTP_ATTEMPTS_EXHAUSTED", status: 429 });
  });

  it("rejects expired, consumed, and unknown challenges safely", async () => {
    const repository = new InMemoryIdentityRepository();
    const provider = new ScriptedOtpProvider();
    const service = createService(repository, provider);
    const expiredId = randomUUID();
    const consumedId = randomUUID();
    const now = Date.now();
    await repository.saveChallenge({
      id: expiredId,
      mobileNumber: "+919876543210",
      codeDigest: digest(expiredId, "123456"),
      createdAt: new Date(now - 120_000),
      expiresAt: new Date(now - 1_000),
      resendAfter: new Date(now - 60_000),
      attemptsRemaining: 5,
    });
    await repository.saveChallenge({
      id: consumedId,
      mobileNumber: "+919876543211",
      codeDigest: digest(consumedId, "123456"),
      createdAt: new Date(now - 10_000),
      expiresAt: new Date(now + 60_000),
      resendAfter: new Date(now - 1_000),
      attemptsRemaining: 5,
      consumedAt: new Date(now - 500),
    });

    await expect(
      service.verifyOtp({
        challengeId: expiredId,
        code: "123456",
        deviceId: "synthetic-device-expired",
      }),
    ).rejects.toMatchObject({ code: "OTP_EXPIRED", status: 401 });
    for (const challengeId of [consumedId, randomUUID()]) {
      await expect(
        service.verifyOtp({
          challengeId,
          code: "123456",
          deviceId: "synthetic-device-invalid",
        }),
      ).rejects.toMatchObject({ code: "OTP_CHALLENGE_INVALID", status: 401 });
    }
  });

  it("permits exactly one successful use of a valid OTP", async () => {
    const repository = new InMemoryIdentityRepository();
    const provider = new ScriptedOtpProvider();
    const service = createService(repository, provider);
    const challenge = await service.requestOtp({
      mobileNumber: "+919876543210",
    });
    const code = provider.deliveries[0]?.code ?? "";

    await expect(
      service.verifyOtp({
        challengeId: challenge.challengeId,
        code,
        deviceId: "synthetic-device-once",
      }),
    ).resolves.toMatchObject({ user: { lastActiveRole: "customer" } });
    await expect(
      service.verifyOtp({
        challengeId: challenge.challengeId,
        code,
        deviceId: "synthetic-device-twice",
      }),
    ).rejects.toMatchObject({ code: "OTP_CHALLENGE_INVALID", status: 401 });
  });

  it("invalidates an undelivered challenge and allows immediate retry", async () => {
    const repository = new InMemoryIdentityRepository();
    const provider = new ScriptedOtpProvider();
    provider.failuresRemaining = 1;
    const service = createService(repository, provider);
    const mobileNumber = "+919876543210";

    await expect(service.requestOtp({ mobileNumber })).rejects.toMatchObject({
      code: "OTP_DELIVERY_UNAVAILABLE",
      message: "We could not send a code right now. Try again later",
      status: 503,
    });
    await expect(service.requestOtp({ mobileNumber })).resolves.toMatchObject({
      expiresInSeconds: 300,
      resendAfterSeconds: 60,
    });
    expect(provider.deliveries).toHaveLength(1);
  });

  it("counts failed deliveries toward the hourly abuse limit", async () => {
    const repository = new InMemoryIdentityRepository();
    const provider = new ScriptedOtpProvider();
    provider.failuresRemaining = 6;
    const service = createService(repository, provider);
    const mobileNumber = "+919876543210";

    for (let request = 1; request <= 5; request += 1) {
      await expect(service.requestOtp({ mobileNumber })).rejects.toMatchObject({
        code: "OTP_DELIVERY_UNAVAILABLE",
        status: 503,
      });
    }
    await expect(service.requestOtp({ mobileNumber })).rejects.toMatchObject({
      code: "OTP_REQUEST_LIMIT",
      status: 429,
    });
  });

  it("keeps provider and cleanup details private when cleanup fails", async () => {
    const repository = new CleanupFailingRepository();
    const provider = new ScriptedOtpProvider();
    provider.failuresRemaining = 1;
    const service = createService(repository, provider);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(
      service.requestOtp({ mobileNumber: "+919876543210" }),
    ).rejects.toMatchObject({
      code: "OTP_DELIVERY_UNAVAILABLE",
      message: "We could not send a code right now. Try again later",
      status: 503,
    });
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();

    log.mockRestore();
    warn.mockRestore();
  });

  it("serializes replacement across service instances sharing storage", async () => {
    const repository = new InMemoryIdentityRepository();
    const firstProvider = new ScriptedOtpProvider();
    const secondProvider = new ScriptedOtpProvider();
    const firstService = createService(repository, firstProvider);
    const secondService = createService(repository, secondProvider);
    const mobileNumber = "+919876543210";

    const results = await Promise.allSettled([
      firstService.requestOtp({ mobileNumber }),
      secondService.requestOtp({ mobileNumber }),
    ]);

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results
        .filter((result) => result.status === "rejected")
        .map((result) => (result.reason as { code?: string }).code),
    ).toEqual(["OTP_RESEND_COOLDOWN"]);
    expect(
      firstProvider.deliveries.length + secondProvider.deliveries.length,
    ).toBe(1);
  });
});
