import {
  Controller,
  HttpCode,
  INestApplication,
  Module,
  Post,
  UseGuards,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
import { afterEach, describe, expect, it } from "vitest";
import { DomainError } from "../src/common/errors/domain.error";
import { GlobalExceptionFilter } from "../src/common/http/global-exception.filter";
import { configureHttpSurface } from "../src/common/http/http-surface";
import {
  AUTH_IP_RATE_LIMIT_CODE,
  MemoryWindowCounter,
  requestIp,
} from "../src/common/http/memory-window-counter";
import { AuthIpRateLimitGuard } from "../src/modules/identity/application/auth-ip-rate-limit.guard";

@Controller("auth")
class OtpStubController {
  @UseGuards(AuthIpRateLimitGuard)
  @Post("otp/request")
  @HttpCode(202)
  public request(): { ok: true } {
    return { ok: true };
  }

  @UseGuards(AuthIpRateLimitGuard)
  @Post("otp/verify")
  @HttpCode(200)
  public verify(): { ok: true } {
    return { ok: true };
  }
}

@Module({
  controllers: [OtpStubController],
  providers: [
    {
      provide: MemoryWindowCounter,
      useFactory: (): MemoryWindowCounter => new MemoryWindowCounter(2, 60_000),
    },
    AuthIpRateLimitGuard,
  ],
})
class OtpLimitModule {}

describe("Auth IP rate limit", () => {
  it("uses the socket remote address and ignores a spoofed forwarded header", () => {
    expect(
      requestIp({
        ip: "198.51.100.9",
        socket: { remoteAddress: "203.0.113.10" },
      }),
    ).toBe("203.0.113.10");
  });

  it("rejects the next hit after the window is full", () => {
    const counter = new MemoryWindowCounter(2, 60_000, () => 1_000);
    expect(counter.allow("203.0.113.1")).toBe(true);
    expect(counter.allow("203.0.113.1")).toBe(true);
    expect(counter.allow("203.0.113.1")).toBe(false);
    expect(counter.allow("198.51.100.2")).toBe(true);
  });

  it("throws AUTH_IP_RATE_LIMIT from the guard", () => {
    const guard = new AuthIpRateLimitGuard(new MemoryWindowCounter(1, 60_000));
    const request = {
      socket: { remoteAddress: "203.0.113.8" },
    };
    const context = {
      switchToHttp: (): { getRequest: () => typeof request } => ({
        getRequest: (): typeof request => request,
      }),
    } as ExecutionContext;
    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(DomainError);
    try {
      guard.canActivate(context);
    } catch (error) {
      expect(error).toMatchObject({
        code: AUTH_IP_RATE_LIMIT_CODE,
        status: 429,
      });
    }
  });
});

describe("Auth IP rate limit HTTP (loopback Nest stub, no PostgreSQL)", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    if (app !== undefined) {
      await app.close();
      app = undefined;
    }
  });

  it("returns 429 with AUTH_IP_RATE_LIMIT after the process-local cap", async () => {
    app = await NestFactory.create(OtpLimitModule, { logger: false });
    app.useGlobalFilters(new GlobalExceptionFilter());
    configureHttpSurface(app, {
      appEnv: "test",
      allowedOrigins: "http://localhost:3001",
      enableOpenApiOverride: false,
    });
    await app.listen(0, "127.0.0.1");
    const url = await app.getUrl();
    const post = async (path: "request" | "verify"): Promise<Response> =>
      fetch(`${url}/api/v1/auth/otp/${path}`, { method: "POST" });

    const first = await post("request");
    expect({ status: first.status, body: await first.text() }).toEqual({
      status: 202,
      body: '{"ok":true}',
    });
    expect(first.headers.get("cache-control")).toBe("no-store");
    expect((await post("verify")).status).toBe(200);
    const limited = await post("request");
    expect(limited.status).toBe(429);
    const body = (await limited.json()) as { code?: string };
    expect(body.code).toBe(AUTH_IP_RATE_LIMIT_CODE);
  });
});
