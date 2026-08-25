import { describe, expect, it } from "vitest";
import { validateEnvironment } from "../src/config/environment";

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
  OTP_PROVIDER: "external",
  DATABASE_URL:
    "postgresql://app:synthetic-db-secret@db.internal.test:5432/me_event",
  ALLOWED_ORIGINS: "https://erp.internal.test",
  SMS_OTP_ENDPOINT: "https://sms.internal.test/otp",
  SMS_OTP_API_KEY: "k".repeat(32),
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

  it("accepts production configuration with external OTP and https origins", () => {
    const env = validateEnvironment(production);
    expect(env.APP_ENV).toBe("production");
    expect(env.OTP_PROVIDER).toBe("external");
    expect(env.SMS_OTP_ENDPOINT).toBe(production.SMS_OTP_ENDPOINT);
  });

  it("rejects the local OTP provider in production", () => {
    expect(() =>
      validateEnvironment({
        ...production,
        OTP_PROVIDER: "local",
        SMS_OTP_ENDPOINT: undefined,
        SMS_OTP_API_KEY: undefined,
      }),
    ).toThrow("local OTP provider is forbidden");
  });

  it("rejects the local OTP provider in staging", () => {
    expect(() =>
      validateEnvironment({
        ...production,
        APP_ENV: "staging",
        OTP_PROVIDER: "local",
        SMS_OTP_ENDPOINT: undefined,
        SMS_OTP_API_KEY: undefined,
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

  it("rejects loopback CORS in production", () => {
    expect(() =>
      validateEnvironment({
        ...production,
        ALLOWED_ORIGINS: "https://localhost:3001",
      }),
    ).toThrow("loopback");
  });

  it("rejects missing SMS configuration when OTP_PROVIDER is external", () => {
    expect(() =>
      validateEnvironment({
        ...production,
        SMS_OTP_ENDPOINT: undefined,
        SMS_OTP_API_KEY: undefined,
      }),
    ).toThrow("SMS_OTP_ENDPOINT");
  });

  it("rejects http SMS endpoints in production", () => {
    expect(() =>
      validateEnvironment({
        ...production,
        SMS_OTP_ENDPOINT: "http://sms.internal.test/otp",
      }),
    ).toThrow("https");
  });
});
