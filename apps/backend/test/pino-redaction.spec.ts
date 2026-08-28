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
      refreshToken: "refresh-token-secret",
      accessToken: "access-token-secret",
      password: "password-secret",
      apiKey: "api-key-secret",
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
          refreshToken: secrets.refreshToken,
          accessToken: secrets.accessToken,
          password: secrets.password,
          apiKey: secrets.apiKey,
          nested: { clientSecret: secrets.clientSecret },
        },
      },
      res: {
        headers: { "set-cookie": secrets.cookie },
        body: { hmacSecret: secrets.hmacSecret },
      },
      environment: { DATABASE_URL: secrets.databaseUrl },
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
    expect(line.req.body.refreshToken).toBe("[REDACTED]");
    expect(line.req.body.accessToken).toBe("[REDACTED]");
    expect(line.req.body.password).toBe("[REDACTED]");
    expect(line.req.body.apiKey).toBe("[REDACTED]");
    expect(line.res.headers["set-cookie"]).toBe("[REDACTED]");
    expect(line.req.body.nested).toEqual({ clientSecret: "[REDACTED]" });
    expect(line.res.body.hmacSecret).toBe("[REDACTED]");
    expect(line.environment.DATABASE_URL).toBe("[REDACTED]");
    for (const secret of Object.values(secrets)) {
      expect(serialized).not.toContain(secret);
    }
  });
});
