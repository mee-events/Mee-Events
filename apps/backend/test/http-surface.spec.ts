import { Controller, Get, INestApplication, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { afterEach, describe, expect, it } from "vitest";
import { GlobalExceptionFilter } from "../src/common/http/global-exception.filter";
import {
  configureHttpSurface,
  HSTS_VALUE,
  isCorsOriginAllowed,
  isOpenApiEnabled,
  PERMISSIONS_POLICY,
  PINO_REDACT_PATHS,
  shouldSendHsts,
  type HttpSurfaceOptions,
} from "../src/common/http/http-surface";

@Controller()
class ProbeController {
  @Get("probe")
  public probe(): { ok: true } {
    return { ok: true };
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe("HTTP surface helpers", () => {
  it("enables OpenAPI in development and via a test-only override", () => {
    expect(isOpenApiEnabled("development", false)).toBe(true);
    expect(isOpenApiEnabled("test", false)).toBe(false);
    expect(isOpenApiEnabled("staging", false)).toBe(false);
    expect(isOpenApiEnabled("production", false)).toBe(false);
    expect(isOpenApiEnabled("test", true)).toBe(true);
    expect(isOpenApiEnabled("staging", true)).toBe(false);
    expect(isOpenApiEnabled("production", true)).toBe(false);
  });

  it("sends HSTS only in staging and production", () => {
    expect(shouldSendHsts("development")).toBe(false);
    expect(shouldSendHsts("test")).toBe(false);
    expect(shouldSendHsts("staging")).toBe(true);
    expect(shouldSendHsts("production")).toBe(true);
  });

  it("allows listed CORS origins and development localhost, denies unknown", () => {
    const allowed = ["https://erp.internal.test"];
    expect(isCorsOriginAllowed(undefined, "production", allowed)).toBe(true);
    expect(
      isCorsOriginAllowed("https://erp.internal.test", "production", allowed),
    ).toBe(true);
    expect(
      isCorsOriginAllowed("https://evil.example", "production", allowed),
    ).toBe(false);
    expect(
      isCorsOriginAllowed("http://localhost:43721", "development", allowed),
    ).toBe(true);
    expect(
      isCorsOriginAllowed("http://localhost:43721", "production", allowed),
    ).toBe(false);
    expect(allowed.includes("*")).toBe(false);
  });

  it("redacts authorization, cookies, OTP codes, and tokens", () => {
    expect(PINO_REDACT_PATHS).toEqual(
      expect.arrayContaining([
        "req.headers.authorization",
        "req.headers.cookie",
        "res.headers['set-cookie']",
        "req.body.code",
        "req.body.refreshToken",
        "req.body.accessToken",
        "*.refreshToken",
        "*.accessToken",
        "*.password",
        "*.apiKey",
      ]),
    );
  });
});

describe("configureHttpSurface (loopback Nest stub, no PostgreSQL)", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    if (app !== undefined) {
      await app.close();
      app = undefined;
    }
  });

  async function boot(options: HttpSurfaceOptions): Promise<string> {
    app = await NestFactory.create(ProbeModule, { logger: false });
    app.useGlobalFilters(new GlobalExceptionFilter());
    configureHttpSurface(app, options);
    await app.listen(0, "127.0.0.1");
    return app.getUrl();
  }

  it("serves OpenAPI in development and returns 404 in production", async () => {
    const developmentUrl = await boot({
      appEnv: "development",
      allowedOrigins: "http://localhost:3001",
      enableOpenApiOverride: false,
    });
    const developmentDocs = await fetch(`${developmentUrl}/api/docs`);
    expect(developmentDocs.status).toBe(200);
    await app?.close();
    app = undefined;

    const productionUrl = await boot({
      appEnv: "production",
      allowedOrigins: "https://erp.internal.test",
      enableOpenApiOverride: false,
    });
    expect((await fetch(`${productionUrl}/api/docs`)).status).toBe(404);
    expect((await fetch(`${productionUrl}/api/docs-json`)).status).toBe(404);
  });

  it("keeps OpenAPI off in staging and allows a test-only override", async () => {
    const stagingUrl = await boot({
      appEnv: "staging",
      allowedOrigins: "https://staging-erp.internal.test",
      enableOpenApiOverride: false,
    });
    expect((await fetch(`${stagingUrl}/api/docs`)).status).toBe(404);
    expect((await fetch(`${stagingUrl}/api/docs-json`)).status).toBe(404);
    await app?.close();
    app = undefined;

    const overrideUrl = await boot({
      appEnv: "test",
      allowedOrigins: "http://localhost:3001",
      enableOpenApiOverride: true,
    });
    expect((await fetch(`${overrideUrl}/api/docs`)).status).toBe(200);
  });

  it("sends security headers and omits HSTS in development", async () => {
    const url = await boot({
      appEnv: "development",
      allowedOrigins: "http://localhost:3001",
      enableOpenApiOverride: false,
    });
    const response = await fetch(`${url}/api/v1/probe`);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(response.headers.get("permissions-policy")).toBe(PERMISSIONS_POLICY);
    expect(response.headers.get("strict-transport-security")).toBeNull();

    const missing = await fetch(`${url}/api/v1/missing`);
    expect(missing.status).toBe(404);
    expect(missing.headers.get("x-content-type-options")).toBe("nosniff");
    expect(missing.headers.get("permissions-policy")).toBe(PERMISSIONS_POLICY);
  });

  it("sends HSTS under production config and applies CORS allow/deny", async () => {
    const url = await boot({
      appEnv: "production",
      allowedOrigins: "https://erp.internal.test",
      enableOpenApiOverride: false,
    });
    const allowed = await fetch(`${url}/api/v1/probe`, {
      headers: { Origin: "https://erp.internal.test" },
    });
    expect(allowed.headers.get("strict-transport-security")).toBe(HSTS_VALUE);
    expect(allowed.headers.get("access-control-allow-origin")).toBe(
      "https://erp.internal.test",
    );

    const denied = await fetch(`${url}/api/v1/probe`, {
      headers: { Origin: "https://evil.example" },
    });
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();
  });
});
