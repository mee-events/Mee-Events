import { describe, expect, it } from "vitest";
import { validateEnvironment } from "../src/config/environment";

const valid = {
  APP_ENV: "development",
  PORT: "3002",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/me_event",
  OTP_PROVIDER: "local",
  OTP_HMAC_SECRET: "o".repeat(32),
  JWT_ACCESS_SECRET: "j".repeat(32),
  REFRESH_TOKEN_HMAC_SECRET: "r".repeat(32),
  ALLOWED_ORIGINS: "http://localhost:3001",
};

describe("environment validation", () => {
  it("accepts safe development configuration", () => {
    expect(validateEnvironment(valid).PORT).toBe(3002);
  });

  it("rejects the local OTP provider in production", () => {
    expect(() =>
      validateEnvironment({ ...valid, APP_ENV: "production" }),
    ).toThrow("local OTP provider is forbidden");
  });
});
