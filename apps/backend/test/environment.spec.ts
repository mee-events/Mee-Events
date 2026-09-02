import { describe, expect, it } from "vitest";
import {
  EXOTEL_INDIA_API_BASE_URL,
  validateEnvironment,
} from "../src/config/environment";

const development = {
  APP_ENV: "development",
  PORT: "3002",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/me_event",
  OTP_PROVIDER: "local",
  OTP_HMAC_SECRET: "o".repeat(32),
  JWT_ACCESS_SECRET: "j".repeat(32),
  REFRESH_TOKEN_HMAC_SECRET: "r".repeat(32),
  ALLOWED_ORIGINS: "http://localhost:3001",
};

const production = {
  ...development,
  APP_ENV: "production",
  OTP_PROVIDER: "exotel",
  DATABASE_URL:
    "postgresql://app:synthetic-db-secret@db.internal.test:5432/me_event",
  ALLOWED_ORIGINS: "https://erp.internal.test",
  EXOTEL_API_BASE_URL: EXOTEL_INDIA_API_BASE_URL,
  EXOTEL_API_KEY: "synthetic-api-key",
  EXOTEL_API_TOKEN: "synthetic-api-token",
  EXOTEL_ACCOUNT_SID: "synthetic_account",
  EXOTEL_SMS_SENDER_ID: "MEEEVT",
  EXOTEL_DLT_ENTITY_ID: "100000000000000001",
  EXOTEL_DLT_TEMPLATE_ID: "200000000000000002",
  EXOTEL_OTP_BODY_TEMPLATE:
    "Your Mee Events sign-in code is {{OTP}}. It expires in five minutes.",
  EXOTEL_REQUEST_TIMEOUT_MS: "5000",
};

describe("environment validation", () => {
  it("accepts safe development configuration", () => {
    expect(validateEnvironment(development).PORT).toBe(3002);
  });

  it("accepts APP_ENV=test with the local OTP provider", () => {
    expect(
      validateEnvironment({ ...development, APP_ENV: "test" }).APP_ENV,
    ).toBe("test");
  });

  it("accepts production configuration with Exotel and https origins", () => {
    const env = validateEnvironment(production);
    expect(env.APP_ENV).toBe("production");
    expect(env.OTP_PROVIDER).toBe("exotel");
    expect(env.EXOTEL_API_BASE_URL).toBe(EXOTEL_INDIA_API_BASE_URL);
    expect(env.EXOTEL_REQUEST_TIMEOUT_MS).toBe(5000);
  });

  it("rejects the local OTP provider in production", () => {
    expect(() =>
      validateEnvironment({
        ...production,
        OTP_PROVIDER: "local",
        EXOTEL_API_BASE_URL: undefined,
        EXOTEL_API_KEY: undefined,
        EXOTEL_API_TOKEN: undefined,
      }),
    ).toThrow("local OTP provider is forbidden");
  });

  it("rejects the local OTP provider in staging", () => {
    expect(() =>
      validateEnvironment({
        ...production,
        APP_ENV: "staging",
        OTP_PROVIDER: "local",
        EXOTEL_API_BASE_URL: undefined,
        EXOTEL_API_KEY: undefined,
        EXOTEL_API_TOKEN: undefined,
      }),
    ).toThrow("local OTP provider is forbidden");
  });

  it("rejects missing DATABASE_URL", () => {
    expect(() =>
      validateEnvironment({ ...development, DATABASE_URL: undefined }),
    ).toThrow("DATABASE_URL");
  });

  it("rejects an invalid DATABASE_URL", () => {
    expect(() =>
      validateEnvironment({ ...development, DATABASE_URL: "not-a-url" }),
    ).toThrow("DATABASE_URL");
  });

  it("rejects missing authentication secrets", () => {
    expect(() =>
      validateEnvironment({ ...development, JWT_ACCESS_SECRET: undefined }),
    ).toThrow("JWT_ACCESS_SECRET");
  });

  it("rejects authentication secrets shorter than 32 characters", () => {
    expect(() =>
      validateEnvironment({ ...development, OTP_HMAC_SECRET: "too-short" }),
    ).toThrow("OTP_HMAC_SECRET");
  });

  it("rejects placeholder authentication secrets in production", () => {
    expect(() =>
      validateEnvironment({
        ...production,
        JWT_ACCESS_SECRET: "INJECT_FROM_SECRET_MANAGER".padEnd(32, "x"),
      }),
    ).toThrow("placeholder");
  });

  it("does not include secret values in validation errors", () => {
    const secret = `leak-me-${"s".repeat(32)}`;
    try {
      validateEnvironment({
        ...production,
        JWT_ACCESS_SECRET: "INJECT_FROM_SECRET_MANAGER".padEnd(32, "x"),
        OTP_HMAC_SECRET: secret,
      });
      throw new Error("expected validation to fail");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain(secret);
      expect(message).not.toContain("INJECT_FROM_SECRET_MANAGER");
    }
  });

  it("rejects template DATABASE_URL placeholders in production", () => {
    expect(() =>
      validateEnvironment({
        ...production,
        DATABASE_URL: "postgresql://USER:PASSWORD@HOST:5432/me_event",
      }),
    ).toThrow("DATABASE_URL");
  });

  it("rejects invalid PORT values", () => {
    expect(() => validateEnvironment({ ...development, PORT: "0" })).toThrow(
      "PORT",
    );
  });

  it("rejects wildcard CORS in production", () => {
    expect(() =>
      validateEnvironment({ ...production, ALLOWED_ORIGINS: "*" }),
    ).toThrow("Wildcard CORS");
  });

  it("rejects wildcard CORS in staging", () => {
    expect(() =>
      validateEnvironment({
        ...production,
        APP_ENV: "staging",
        ALLOWED_ORIGINS: "*",
      }),
    ).toThrow("Wildcard CORS");
  });

  it("rejects loopback CORS in production", () => {
    expect(() =>
      validateEnvironment({
        ...production,
        ALLOWED_ORIGINS: "https://localhost:3001",
      }),
    ).toThrow("loopback");
  });

  it("accepts ENABLE_OPENAPI true or false and rejects other values", () => {
    expect(
      validateEnvironment({ ...development, ENABLE_OPENAPI: "true" })
        .ENABLE_OPENAPI,
    ).toBe("true");
    expect(
      validateEnvironment({ ...production, ENABLE_OPENAPI: "false" })
        .ENABLE_OPENAPI,
    ).toBe("false");
    expect(() =>
      validateEnvironment({ ...development, ENABLE_OPENAPI: "yes" }),
    ).toThrow("ENABLE_OPENAPI");
  });

  it("allows local mode without any Exotel configuration", () => {
    const env = validateEnvironment(development);
    expect(env.OTP_PROVIDER).toBe("local");
    expect(env.EXOTEL_API_KEY).toBeUndefined();
  });

  it("rejects the retired ambiguous external provider value", () => {
    expect(() =>
      validateEnvironment({ ...development, OTP_PROVIDER: "external" }),
    ).toThrow("OTP_PROVIDER");
  });

  it("rejects missing Exotel configuration when OTP_PROVIDER is exotel", () => {
    expect(() =>
      validateEnvironment({
        ...production,
        EXOTEL_API_BASE_URL: undefined,
        EXOTEL_API_KEY: undefined,
        EXOTEL_API_TOKEN: undefined,
        EXOTEL_ACCOUNT_SID: undefined,
        EXOTEL_SMS_SENDER_ID: undefined,
        EXOTEL_DLT_ENTITY_ID: undefined,
        EXOTEL_DLT_TEMPLATE_ID: undefined,
        EXOTEL_OTP_BODY_TEMPLATE: undefined,
        EXOTEL_REQUEST_TIMEOUT_MS: undefined,
      }),
    ).toThrow("EXOTEL_API_BASE_URL");
  });

  it("rejects blank Exotel fields", () => {
    expect(() =>
      validateEnvironment({
        ...production,
        APP_ENV: "test",
        EXOTEL_API_TOKEN: "   ",
      }),
    ).toThrow("EXOTEL_API_TOKEN");
  });

  it("rejects HTTP, credential-bearing, and unapproved Exotel hosts", () => {
    for (const baseUrl of [
      "http://api.in.exotel.com",
      "https://synthetic:key@api.in.exotel.com",
      "https://api.exotel.com",
      "https://sms.internal.test",
    ]) {
      expect(() =>
        validateEnvironment({
          ...production,
          EXOTEL_API_BASE_URL: baseUrl,
        }),
      ).toThrow("approved India origin");
    }
  });

  it("rejects account SID path injection", () => {
    expect(() =>
      validateEnvironment({
        ...production,
        EXOTEL_ACCOUNT_SID: "synthetic/../../other-account",
      }),
    ).toThrow("single safe URL segment");
  });

  it("rejects unsafe sender and DLT identifier formats", () => {
    expect(() =>
      validateEnvironment({
        ...production,
        EXOTEL_SMS_SENDER_ID: "MEE EVENTS",
      }),
    ).toThrow("EXOTEL_SMS_SENDER_ID");
    expect(() =>
      validateEnvironment({
        ...production,
        EXOTEL_DLT_ENTITY_ID: "not-numeric",
      }),
    ).toThrow("EXOTEL_DLT_ENTITY_ID");
    expect(() =>
      validateEnvironment({
        ...production,
        EXOTEL_DLT_TEMPLATE_ID: "123/456",
      }),
    ).toThrow("EXOTEL_DLT_TEMPLATE_ID");
  });

  it("requires exactly one safe OTP placeholder in one-line copy", () => {
    for (const bodyTemplate of [
      "Mee Events code has no variable.",
      "Codes {{OTP}} and {{OTP}} are invalid.",
      "Mee Events code: {{CODE}}",
      "Mee Events code: {{OTP}}\nVisit us.",
      "Mee Events code: {{OTP}} https://example.invalid",
    ]) {
      expect(() =>
        validateEnvironment({
          ...production,
          EXOTEL_OTP_BODY_TEMPLATE: bodyTemplate,
        }),
      ).toThrow("EXOTEL_OTP_BODY_TEMPLATE");
    }
  });

  it("requires a bounded positive Exotel timeout", () => {
    for (const timeout of ["0", "999", "10001"]) {
      expect(() =>
        validateEnvironment({
          ...production,
          EXOTEL_REQUEST_TIMEOUT_MS: timeout,
        }),
      ).toThrow("EXOTEL_REQUEST_TIMEOUT_MS");
    }
  });

  it("rejects Exotel example placeholders in staging and production", () => {
    for (const APP_ENV of ["staging", "production"] as const) {
      expect(() =>
        validateEnvironment({
          ...production,
          APP_ENV,
          EXOTEL_API_TOKEN: "INJECT_FROM_SECRET_MANAGER",
        }),
      ).toThrow("placeholder");
      expect(() =>
        validateEnvironment({
          ...production,
          APP_ENV,
          EXOTEL_DLT_TEMPLATE_ID: "PENDING",
        }),
      ).toThrow("placeholder");
    }
  });
});
