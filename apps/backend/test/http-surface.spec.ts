import { Controller, Get, INestApplication, Module } from "@nestjs/common";
import { APP_GUARD, NestFactory, Reflector } from "@nestjs/core";
import { JwtModule, JwtService } from "@nestjs/jwt";
import type { DeviceSession } from "@me-event/shared-types";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { DomainError } from "../src/common/errors/domain.error";
import { GlobalExceptionFilter } from "../src/common/http/global-exception.filter";
import {
  configureHttpSurface,
  HSTS_VALUE,
  isCorsOriginAllowed,
  isOpenApiEnabled,
  PERMISSIONS_POLICY,
  PINO_REDACT_PATHS,
  NO_STORE_VALUE,
  requiresNoStore,
  shouldSendHsts,
  type HttpSurfaceOptions,
} from "../src/common/http/http-surface";
import {
  requestIdForIncomingRequest,
  requireRequestId,
} from "../src/common/http/request-context";
import { PlatformFoundationService } from "../src/modules/platform-foundation/application/platform-foundation.service";
import { PlatformBootstrapController } from "../src/modules/platform-foundation/presentation/platform-bootstrap.controller";
import { Public } from "../src/modules/authorization/public.decorator";
import { InMemoryIdentityRepository } from "../src/modules/identity/adapters/in-memory-identity.repository";
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from "../src/modules/identity/ports/identity-repository";
import { AccessTokenGuard } from "../src/modules/platform-foundation/security/access-token.guard";
import { authPrincipalCache } from "../src/modules/platform-foundation/security/auth-principal-cache";

const HTTP_JWT_SECRET = "http-surface-jwt-secret-000000000000";
let httpUserCounter = 0;

@Controller()
class ProbeController {
  @Get("probe")
  public probe(): { ok: true } {
    return { ok: true };
  }
}

@Public()
@Controller("auth")
class AuthProbeController {
  @Get("probe")
  public probe(): { ok: true } {
    return { ok: true };
  }
}

@Module({
  controllers: [
    ProbeController,
    AuthProbeController,
    PlatformBootstrapController,
  ],
  providers: [PlatformFoundationService],
})
class ProbeModule {}

@Module({
  imports: [JwtModule.register({ secret: HTTP_JWT_SECRET })],
  controllers: [PlatformBootstrapController],
  providers: [
    PlatformFoundationService,
    {
      provide: IDENTITY_REPOSITORY,
      useClass: InMemoryIdentityRepository,
    },
    {
      provide: APP_GUARD,
      inject: [JwtService, Reflector, IDENTITY_REPOSITORY],
      useFactory: (
        jwt: JwtService,
        reflector: Reflector,
        repository: IdentityRepository,
      ): AccessTokenGuard => new AccessTokenGuard(jwt, reflector, repository),
    },
  ],
})
class GuardedBootstrapModule {}

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
        "req.body.mobileNumber",
        "req.body.refreshToken",
        "req.body.accessToken",
        "*.refreshToken",
        "*.accessToken",
        "*.password",
        "*.apiKey",
        "*.exotelApiKey",
        "*.exotelApiToken",
        "*.exotelAccountSid",
        "*.EXOTEL_API_KEY",
        "*.EXOTEL_API_TOKEN",
        "*.EXOTEL_ACCOUNT_SID",
      ]),
    );
  });

  it("normalizes request IDs centrally and never maps a missing ID to 403", () => {
    expect(
      requestIdForIncomingRequest(
        { id: undefined, headers: { "x-request-id": " supplied-id " } },
        () => "generated-id",
      ),
    ).toBe("supplied-id");
    expect(
      requestIdForIncomingRequest(
        { id: undefined, headers: { "x-request-id": "undefined" } },
        () => "generated-id",
      ),
    ).toBe("generated-id");
    try {
      requireRequestId({});
      expect.unreachable("missing request context must fail closed");
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      if (!(error instanceof DomainError)) throw error;
      expect(error.code).toBe("REQUEST_CONTEXT_UNAVAILABLE");
      expect(error.status).toBe(500);
    }
  });

  it("marks authentication and bootstrap responses as no-store", () => {
    expect(requiresNoStore("/api/v1/auth/otp/verify")).toBe(true);
    expect(requiresNoStore("/api/v1/auth/refresh")).toBe(true);
    expect(requiresNoStore("/api/v1/platform/bootstrap")).toBe(true);
    expect(requiresNoStore("/api/v1/platform/bootstrap/")).toBe(true);
    expect(requiresNoStore("/API/v1/AuTh/OtP/VeRiFy")).toBe(true);
    expect(requiresNoStore("/api/V1/PlAtFoRm/BoOtStRaP")).toBe(true);
    expect(requiresNoStore("/API/V1/PlAtFoRm/BoOtStRaP/")).toBe(true);
    expect(requiresNoStore("/api/v1/catalog/event-types")).toBe(false);
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

  async function bootGuarded(): Promise<string> {
    authPrincipalCache.clear();
    app = await NestFactory.create(GuardedBootstrapModule, {
      logger: false,
      abortOnError: false,
    });
    app.useGlobalFilters(new GlobalExceptionFilter());
    configureHttpSurface(app, {
      appEnv: "test",
      allowedOrigins: "http://localhost:3001",
      enableOpenApiOverride: false,
    });
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
    const document = (await (
      await fetch(`${developmentUrl}/api/docs-json`)
    ).json()) as {
      paths?: Record<string, unknown>;
      components?: { schemas?: Record<string, unknown> };
    };
    expect(document.paths).toHaveProperty("/api/v1/platform/bootstrap");
    expect(document.components?.schemas).toHaveProperty(
      "PlatformBootstrapResponseDto",
    );
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
    expect(response.headers.get("x-request-id")).not.toBeNull();

    const bootstrap = await fetch(`${url}/api/v1/platform/bootstrap`, {
      headers: { "X-Request-Id": "bootstrap-http-request" },
    });
    expect(bootstrap.status).toBe(401);
    expect(bootstrap.headers.get("cache-control")).toBe(NO_STORE_VALUE);
    expect(bootstrap.headers.get("x-request-id")).toBe(
      "bootstrap-http-request",
    );

    for (const path of [
      "/api/v1/platform/bootstrap/",
      "/api/V1/PlAtFoRm/BoOtStRaP/",
    ]) {
      const equivalentBootstrap = await fetch(`${url}${path}`);
      expect(equivalentBootstrap.status).toBe(401);
      expect(equivalentBootstrap.headers.get("cache-control")).toBe(
        NO_STORE_VALUE,
      );
      expect(equivalentBootstrap.headers.get("x-request-id")).not.toBeNull();
    }

    const mixedCaseAuth = await fetch(`${url}/api/v1/AuTh/PrObE`);
    expect(mixedCaseAuth.status).toBe(200);
    expect(mixedCaseAuth.headers.get("cache-control")).toBe(NO_STORE_VALUE);

    const missing = await fetch(`${url}/api/v1/missing`);
    expect(missing.status).toBe(404);
    expect(missing.headers.get("x-content-type-options")).toBe("nosniff");
    expect(missing.headers.get("permissions-policy")).toBe(PERMISSIONS_POLICY);
    expect(response.headers.get("cache-control")).toBeNull();
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

  it("passes bootstrap through the real AccessTokenGuard", async () => {
    const url = await bootGuarded();
    const repository = app!.get<IdentityRepository>(IDENTITY_REPOSITORY);
    const jwt = app!.get(JwtService);
    const valid = await createHttpSession(repository, jwt, "valid");

    const missing = await fetch(`${url}/api/v1/platform/bootstrap`);
    expect(missing.status).toBe(401);
    const invalid = await fetch(`${url}/api/v1/platform/bootstrap`, {
      headers: { Authorization: "Bearer invalid-token" },
    });
    expect(invalid.status).toBe(401);

    const revoked = await createHttpSession(repository, jwt, "revoked");
    await repository.revokeSession(revoked.session.id, new Date());
    expect(
      (
        await fetch(`${url}/api/v1/platform/bootstrap`, {
          headers: { Authorization: `Bearer ${revoked.token}` },
        })
      ).status,
    ).toBe(401);

    const expired = await createHttpSession(repository, jwt, "expired", true);
    expect(
      (
        await fetch(`${url}/api/v1/platform/bootstrap`, {
          headers: { Authorization: `Bearer ${expired.token}` },
        })
      ).status,
    ).toBe(401);

    const response = await fetch(`${url}/api/v1/platform/bootstrap`, {
      headers: {
        Authorization: `Bearer ${valid.token}`,
        "X-Request-Id": "guarded-bootstrap-request",
      },
    });
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(NO_STORE_VALUE);
    expect(response.headers.get("x-request-id")).toBe(
      "guarded-bootstrap-request",
    );
    expect(body).toMatchObject({
      requestId: "guarded-bootstrap-request",
      actor: {
        userId: valid.userId,
        sessionId: valid.session.id,
        activeRole: "customer",
      },
    });

    const mixedCase = await fetch(`${url}/api/v1/PlAtFoRm/BoOtStRaP/`, {
      headers: { Authorization: `Bearer ${valid.token}` },
    });
    expect(mixedCase.status).toBe(200);
    expect(mixedCase.headers.get("cache-control")).toBe(NO_STORE_VALUE);
    expect(mixedCase.headers.get("x-request-id")).not.toBeNull();
  });
});

async function createHttpSession(
  repository: IdentityRepository,
  jwt: JwtService,
  label: string,
  expired = false,
): Promise<{
  readonly userId: string;
  readonly session: DeviceSession;
  readonly token: string;
}> {
  const user = await repository.createUser(
    `+91987654${(++httpUserCounter).toString().padStart(4, "0")}`,
    "customer",
  );
  const now = new Date();
  const session: DeviceSession = {
    id: randomUUID(),
    userId: user.id,
    deviceId: `http-${label}`,
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    expiresAt: new Date(
      now.getTime() + (expired ? -60_000 : 60 * 60 * 1000),
    ).toISOString(),
  };
  await repository.saveSession(session, `unused-http-refresh-${label}`);
  const token = await jwt.signAsync({
    sub: user.id,
    sid: session.id,
    role: "customer",
  });
  return { userId: user.id, session, token };
}
