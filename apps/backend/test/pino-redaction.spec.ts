import { Writable } from "node:stream";
import pino from "pino";
import { describe, expect, it } from "vitest";
import { PINO_REDACT_PATHS } from "../src/common/http/http-surface";

describe("Pino redaction paths", () => {
  it("censors tokens, OTP codes, and cookies in a real pino logger", () => {
    const chunks: Buffer[] = [];
    const stream = new Writable({
      write(
        chunk: Buffer,
        _encoding: BufferEncoding,
        callback: (error?: Error | null) => void,
      ): void {
        chunks.push(chunk);
        callback();
      },
    });
    const logger = pino(
      {
        redact: { paths: [...PINO_REDACT_PATHS], censor: "[REDACTED]" },
      },
      stream,
    );
    const secrets = {
      authorization: "Bearer authorization-secret",
      cookie: "refresh=cookie-secret",
      code: "otp-code-secret",
      mobileNumber: "+919000000000",
      refreshToken: "refresh-token-secret",
      accessToken: "access-token-secret",
      password: "password-secret",
      apiKey: "api-key-secret",
      exotelApiKey: "exotel-api-key-secret",
      exotelApiToken: "exotel-api-token-secret",
      exotelAccountSid: "exotel-account-sensitive",
      clientSecret: "client-secret-value",
      hmacSecret: "hmac-secret-value",
      databaseUrl: "postgresql://user:database-secret@db.invalid/app",
    };
    logger.info({
      req: {
        headers: {
          authorization: secrets.authorization,
          cookie: secrets.cookie,
        },
        body: {
          code: secrets.code,
          mobileNumber: secrets.mobileNumber,
          refreshToken: secrets.refreshToken,
          accessToken: secrets.accessToken,
          password: secrets.password,
          apiKey: secrets.apiKey,
          exotelApiKey: secrets.exotelApiKey,
          exotelApiToken: secrets.exotelApiToken,
          exotelAccountSid: secrets.exotelAccountSid,
          nested: { clientSecret: secrets.clientSecret },
        },
      },
      res: {
        headers: { "set-cookie": secrets.cookie },
        body: { hmacSecret: secrets.hmacSecret },
      },
      environment: {
        DATABASE_URL: secrets.databaseUrl,
        EXOTEL_API_KEY: secrets.exotelApiKey,
        EXOTEL_API_TOKEN: secrets.exotelApiToken,
        EXOTEL_ACCOUNT_SID: secrets.exotelAccountSid,
      },
    });
    const serialized = Buffer.concat(chunks).toString();
    const line = JSON.parse(serialized) as {
      req: {
        headers: { authorization: string; cookie: string };
        body: Record<string, string | Record<string, string>>;
      };
      res: {
        headers: { "set-cookie": string };
        body: Record<string, string>;
      };
      environment: Record<string, string>;
    };
    expect(line.req.headers.authorization).toBe("[REDACTED]");
    expect(line.req.headers.cookie).toBe("[REDACTED]");
    expect(line.req.body.code).toBe("[REDACTED]");
    expect(line.req.body.mobileNumber).toBe("[REDACTED]");
    expect(line.req.body.refreshToken).toBe("[REDACTED]");
    expect(line.req.body.accessToken).toBe("[REDACTED]");
    expect(line.req.body.password).toBe("[REDACTED]");
    expect(line.req.body.apiKey).toBe("[REDACTED]");
    expect(line.req.body.exotelApiKey).toBe("[REDACTED]");
    expect(line.req.body.exotelApiToken).toBe("[REDACTED]");
    expect(line.req.body.exotelAccountSid).toBe("[REDACTED]");
    expect(line.res.headers["set-cookie"]).toBe("[REDACTED]");
    expect(line.req.body.nested).toEqual({ clientSecret: "[REDACTED]" });
    expect(line.res.body.hmacSecret).toBe("[REDACTED]");
    expect(line.environment.DATABASE_URL).toBe("[REDACTED]");
    expect(line.environment.EXOTEL_API_KEY).toBe("[REDACTED]");
    expect(line.environment.EXOTEL_API_TOKEN).toBe("[REDACTED]");
    expect(line.environment.EXOTEL_ACCOUNT_SID).toBe("[REDACTED]");
    for (const secret of Object.values(secrets)) {
      expect(serialized).not.toContain(secret);
    }
  });
});
