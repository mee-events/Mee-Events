import { describe, expect, it } from "vitest";
import {
  buildEmployeeContentSecurityPolicy,
  employeeSecurityHeaders,
  HSTS_VALUE,
  PERMISSIONS_POLICY,
  shouldSendEmployeeHsts,
} from "./security-headers";

describe("employee security headers", () => {
  it("includes CSP, Permissions-Policy, and the existing nosniff/referrer/frame headers", () => {
    const headers = employeeSecurityHeaders({
      appEnv: "development",
      apiBaseUrl: "http://localhost:3002/api/v1",
    });
    const map = Object.fromEntries(headers.map((row) => [row.key, row.value]));
    expect(map["X-Content-Type-Options"]).toBe("nosniff");
    expect(map["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(map["X-Frame-Options"]).toBe("DENY");
    expect(map["Permissions-Policy"]).toBe(PERMISSIONS_POLICY);
    expect(map["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(map["Content-Security-Policy"]).toContain(
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    );
    expect(map["Content-Security-Policy"]).toContain("http://localhost:3002");
    expect(map["Content-Security-Policy"]).toContain("http://127.0.0.1:3002");
    expect(map["Strict-Transport-Security"]).toBeUndefined();
  });

  it("sends HSTS only for staging and production config", () => {
    expect(shouldSendEmployeeHsts("development")).toBe(false);
    expect(shouldSendEmployeeHsts("test")).toBe(false);
    expect(shouldSendEmployeeHsts("staging")).toBe(true);
    expect(shouldSendEmployeeHsts("production")).toBe(true);
    const production = Object.fromEntries(
      employeeSecurityHeaders({
        appEnv: "production",
        apiBaseUrl: "https://api.internal.test/api/v1",
      }).map((row) => [row.key, row.value]),
    );
    expect(production["Strict-Transport-Security"]).toBe(HSTS_VALUE);
    expect(production["Content-Security-Policy"]).toContain(
      "https://api.internal.test",
    );
    expect(production["Content-Security-Policy"]).not.toContain(
      "http://localhost:3002",
    );
    expect(production["Content-Security-Policy"]).toContain("'unsafe-inline'");
    expect(production["Content-Security-Policy"]).not.toContain(
      "'unsafe-eval'",
    );
  });

  it("is wired through next.config.ts headers()", async () => {
    const nextConfig = (await import("../../next.config")).default;
    const resolved = await nextConfig.headers?.();
    const keys = (resolved?.[0]?.headers ?? []).map((row) => row.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "X-Content-Type-Options",
        "Referrer-Policy",
        "X-Frame-Options",
        "Content-Security-Policy",
        "Permissions-Policy",
      ]),
    );
  });

  it("keeps unsafe-eval limited to development/test", () => {
    expect(
      buildEmployeeContentSecurityPolicy({
        appEnv: "development",
        apiBaseUrl: "https://api.example/api/v1",
      }),
    ).toContain("'unsafe-inline'");
    expect(
      buildEmployeeContentSecurityPolicy({
        appEnv: "production",
        apiBaseUrl: "https://api.example/api/v1",
      }),
    ).not.toContain("'unsafe-eval'");
  });
});
