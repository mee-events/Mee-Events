import type { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { describe, expect, it, vi } from "vitest";
import { IS_PUBLIC_KEY } from "../src/modules/authorization/public.decorator";
import { InMemoryIdentityRepository } from "../src/modules/identity/adapters/in-memory-identity.repository";
import { AuthService } from "../src/modules/identity/application/auth.service";
import { AuthController } from "../src/modules/identity/presentation/auth.controller";
import type {
  OtpDelivery,
  OtpProvider,
} from "../src/modules/identity/ports/otp-provider";

const JWT_ACCESS_SECRET = "j".repeat(32);
const configValues: Readonly<Record<string, string>> = {
  APP_ENV: "test",
  OTP_PROVIDER: "local",
  OTP_HMAC_SECRET: "o".repeat(32),
  JWT_ACCESS_SECRET,
  REFRESH_TOKEN_HMAC_SECRET: "r".repeat(32),
};

class RecordingOtpProvider implements OtpProvider {
  public readonly mobileNumbers: string[] = [];
  public readonly codes: string[] = [];

  public async sendCode(
    mobileNumber: string,
    code: string,
  ): Promise<OtpDelivery> {
    this.mobileNumbers.push(mobileNumber);
    this.codes.push(code);
    return { providerMessageId: "synthetic-delivery" };
  }
}

class RejectingOtpProvider implements OtpProvider {
  public async sendCode(): Promise<OtpDelivery> {
    throw new Error("raw provider host and credential detail");
  }
}

function createService(
  repository: InMemoryIdentityRepository,
  otpProvider: OtpProvider,
): AuthService {
  return new AuthService(
    repository,
    otpProvider,
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

describe("CUST-01 authentication entry", () => {
  it("rejects invalid mobile input before provider delivery", async () => {
    const provider = new RecordingOtpProvider();
    const service = createService(new InMemoryIdentityRepository(), provider);

    await expect(
      service.requestOtp({ mobileNumber: "not-a-mobile", countryCode: "IN" }),
    ).rejects.toMatchObject({ code: "INVALID_MOBILE_NUMBER", status: 400 });
    expect(provider.mobileNumbers).toHaveLength(0);
  });

  it("normalizes a valid India request and omits mobile and OTP values", async () => {
    const repository = new InMemoryIdentityRepository();
    const provider = new RecordingOtpProvider();
    const service = createService(repository, provider);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await service.requestOtp({
      mobileNumber: "98765 43210",
      countryCode: "IN",
    });

    expect(provider.mobileNumbers).toEqual(["+919876543210"]);
    expect(response.challengeId).not.toHaveLength(0);
    expect(response.expiresInSeconds).toBe(300);
    expect(response.resendAfterSeconds).toBe(60);
    expect(response.debugCode).toBeUndefined();
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain(provider.mobileNumbers[0]);
    expect(serialized).not.toContain(provider.codes[0]);
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();

    log.mockRestore();
    warn.mockRestore();
  });

  it("returns the same public response shape without checking account existence", async () => {
    const repository = new InMemoryIdentityRepository();
    await repository.createUser("+919876543210", "customer");
    const accountLookup = vi.spyOn(repository, "findUserByMobile");
    const provider = new RecordingOtpProvider();
    const service = createService(repository, provider);

    const existing = await service.requestOtp({
      mobileNumber: "+919876543210",
    });
    const unknown = await service.requestOtp({
      mobileNumber: "+919876543219",
    });
    const withoutChallengeId = ({
      challengeId: _challengeId,
      ...response
    }: typeof existing): typeof response => response;

    expect(withoutChallengeId(existing)).toEqual(withoutChallengeId(unknown));
    expect(accountLookup).not.toHaveBeenCalled();
  });

  it("rejects a concurrent duplicate before a second provider send", async () => {
    const repository = new InMemoryIdentityRepository();
    const provider = new RecordingOtpProvider();
    const service = createService(repository, provider);

    const first = service.requestOtp({ mobileNumber: "+919876543210" });
    await expect(
      service.requestOtp({ mobileNumber: "+919876543210" }),
    ).rejects.toMatchObject({
      code: "OTP_REQUEST_IN_PROGRESS",
      status: 429,
    });
    await first;

    expect(provider.mobileNumbers).toHaveLength(1);
  });

  it("maps provider failure to a generic privacy-safe service error", async () => {
    const service = createService(
      new InMemoryIdentityRepository(),
      new RejectingOtpProvider(),
    );

    await expect(
      service.requestOtp({ mobileNumber: "+919876543210" }),
    ).rejects.toMatchObject({
      code: "OTP_DELIVERY_UNAVAILABLE",
      message: "We could not send a code right now. Try again later",
      status: 503,
    });
  });

  it("keeps OTP request public without weakening controlled auth routes", () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AuthController.prototype.requestOtp as object,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AuthController.prototype.verifyOtp as object,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AuthController.prototype.logout as object,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AuthController.prototype.switchRole as object,
      ),
    ).toBeUndefined();
  });
});
