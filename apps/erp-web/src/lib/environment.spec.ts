import { describe, expect, it } from "vitest";
import {
  resolveEmployeeApiBaseUrl,
  resolveEmployeeAppEnv,
} from "./environment";

describe("employee public environment", () => {
  it("defaults development to the local API", () => {
    expect(resolveEmployeeAppEnv({})).toBe("development");
    expect(resolveEmployeeApiBaseUrl({})).toBe("http://localhost:3002/api/v1");
  });

  it("accepts an explicit development API URL", () => {
    expect(
      resolveEmployeeApiBaseUrl({
        NEXT_PUBLIC_APP_ENV: "development",
        NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:3002/api/v1/",
      }),
    ).toBe("http://127.0.0.1:3002/api/v1");
  });

  it("requires a non-loopback https API URL in production", () => {
    expect(
      resolveEmployeeApiBaseUrl({
        NEXT_PUBLIC_APP_ENV: "production",
        NEXT_PUBLIC_API_BASE_URL: "https://api.internal.test/api/v1",
      }),
    ).toBe("https://api.internal.test/api/v1");
  });

  it("rejects a missing production API URL", () => {
    expect(() =>
      resolveEmployeeApiBaseUrl({ NEXT_PUBLIC_APP_ENV: "production" }),
    ).toThrow("NEXT_PUBLIC_API_BASE_URL is required");
  });

  it("rejects localhost production API URLs", () => {
    expect(() =>
      resolveEmployeeApiBaseUrl({
        NEXT_PUBLIC_APP_ENV: "production",
        NEXT_PUBLIC_API_BASE_URL: "https://localhost:3002/api/v1",
      }),
    ).toThrow("loopback");
  });

  it("rejects staging http API URLs", () => {
    expect(() =>
      resolveEmployeeApiBaseUrl({
        NEXT_PUBLIC_APP_ENV: "staging",
        NEXT_PUBLIC_API_BASE_URL: "http://staging-api.internal.test/api/v1",
      }),
    ).toThrow("https");
  });
});
