import type { INestApplication } from "@nestjs/common";
import { VersioningType } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import type { Environment } from "../../config/environment";

export const PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=()";

export const HSTS_VALUE = "max-age=31536000; includeSubDomains";

const PINO_SECRET_FIELD_NAMES = [
  "refreshToken",
  "accessToken",
  "password",
  "apiKey",
  "apiSecret",
  "hmacSecret",
  "clientSecret",
  "secret",
  "otpHmacSecret",
  "jwtAccessSecret",
  "refreshTokenHmacSecret",
  "smsOtpApiKey",
  "debugCode",
  "mobileNumber",
] as const;

const PINO_SECRET_ENV_NAMES = [
  "OTP_HMAC_SECRET",
  "JWT_ACCESS_SECRET",
  "REFRESH_TOKEN_HMAC_SECRET",
  "SMS_OTP_API_KEY",
  "SUPABASE_SERVICE_KEY",
  "DATABASE_URL",
] as const;

export const PINO_REDACT_PATHS: readonly string[] = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers['proxy-authorization']",
  "res.headers['set-cookie']",
  "req.body.code",
  "req.body.*.code",
  ...PINO_SECRET_FIELD_NAMES.flatMap((field) => [
    field,
    `*.${field}`,
    `req.body.${field}`,
    `req.body.*.${field}`,
    `res.body.${field}`,
    `res.body.*.${field}`,
  ]),
  ...PINO_SECRET_ENV_NAMES.flatMap((field) => [field, `*.${field}`]),
];

export interface HttpSurfaceOptions {
  readonly appEnv: Environment["APP_ENV"];
  readonly allowedOrigins: string;
  readonly enableOpenApiOverride: boolean;
}

export function isDeployedAppEnv(
  appEnv: Environment["APP_ENV"],
): appEnv is "staging" | "production" {
  return appEnv === "staging" || appEnv === "production";
}

export function isOpenApiEnabled(
  appEnv: Environment["APP_ENV"],
  enableOpenApiOverride: boolean,
): boolean {
  return (
    appEnv === "development" || (appEnv === "test" && enableOpenApiOverride)
  );
}

export function shouldSendHsts(appEnv: Environment["APP_ENV"]): boolean {
  return isDeployedAppEnv(appEnv);
}

export function parseAllowedOrigins(value: string): readonly string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function isLocalhostDevOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/u.test(origin);
}

export function isCorsOriginAllowed(
  origin: string | undefined,
  appEnv: Environment["APP_ENV"],
  allowedOrigins: readonly string[],
): boolean {
  if (origin === undefined || origin.length === 0) {
    return true;
  }
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  return appEnv === "development" && isLocalhostDevOrigin(origin);
}

/**
 * Prefix, versioning, CORS, Helmet headers, and optional OpenAPI.
 * Extracted from `main.ts` so tests can boot a stub app without PostgreSQL.
 */
export function configureHttpSurface(
  app: INestApplication,
  options: HttpSurfaceOptions,
): void {
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.setGlobalPrefix("api");

  const allowedOrigins = parseAllowedOrigins(options.allowedOrigins);
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      callback(
        null,
        isCorsOriginAllowed(origin, options.appEnv, allowedOrigins),
      );
    },
    credentials: true,
  });

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      frameguard: { action: "deny" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      hsts: shouldSendHsts(options.appEnv)
        ? { maxAge: 31_536_000, includeSubDomains: true }
        : false,
    }),
  );
  app.use((_request: Request, response: Response, next: NextFunction): void => {
    response.setHeader("Permissions-Policy", PERMISSIONS_POLICY);
    next();
  });

  if (!isOpenApiEnabled(options.appEnv, options.enableOpenApiOverride)) {
    return;
  }

  const openApi = new DocumentBuilder()
    .setTitle("ME Event Platform API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    "api/docs",
    app,
    SwaggerModule.createDocument(app, openApi),
  );
}
