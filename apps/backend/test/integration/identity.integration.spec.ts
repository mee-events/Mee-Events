import type { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHmac } from "node:crypto";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresAuditSink } from "../../src/modules/audit/adapters/postgres-audit.sink";
import { PostgresIdentityRepository } from "../../src/modules/identity/adapters/postgres-identity.repository";
import { AuthService } from "../../src/modules/identity/application/auth.service";
import type {
  OtpDelivery,
  OtpProvider,
} from "../../src/modules/identity/ports/otp-provider";
import { createIntegrationPool } from "./support/database";
import { stableUuid, syntheticMobile } from "./support/fixtures";

const OTP_HMAC_SECRET = "dbint-otp-hmac-secret-000000000000";
const JWT_ACCESS_SECRET = "dbint-jwt-access-secret-0000000000";
const REFRESH_HMAC_SECRET = "dbint-refresh-secret-0000000000000";
const HYDERABAD_BRANCH_ID = "00000000-0000-4000-8000-000000000001";

class CapturingOtpProvider implements OtpProvider {
  public lastCode: string | undefined;

  public async sendCode(
    _mobileNumber: string,
    code: string,
  ): Promise<OtpDelivery> {
    this.lastCode = code;
    return { providerMessageId: "synthetic-dbint-delivery" };
  }
}

describe("DBINT-02 identity mapping and transaction foundation", () => {
  let pool: Pool;
  let repository: PostgresIdentityRepository;

  beforeAll(() => {
    pool = createIntegrationPool();
    repository = new PostgresIdentityRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("maps challenge, user, Hyderabad role, session, consume, and revoke state", async () => {
    const label = "identity-mapping";
    const challengeId = stableUuid(`challenge:${label}`);
    const mobileNumber = syntheticMobile(label);
    const createdAt = new Date("2026-08-26T12:00:00.000Z");
    await repository.saveChallenge({
      id: challengeId,
      mobileNumber,
      codeDigest: digestOtp(challengeId, "123456"),
      createdAt,
      expiresAt: new Date("2099-08-26T12:05:00.000Z"),
      resendAfter: new Date("2026-08-26T12:01:00.000Z"),
      attemptsRemaining: 3,
    });

    expect(await repository.findChallenge(challengeId)).toMatchObject({
      id: challengeId,
      mobileNumber,
      attemptsRemaining: 3,
      createdAt,
    });
    expect(
      await repository.recordFailedChallengeAttempt(challengeId),
    ).toMatchObject({ attemptsRemaining: 2 });
    expect(await repository.consumeChallenge(challengeId, new Date())).toBe(
      true,
    );
    expect(await repository.consumeChallenge(challengeId, new Date())).toBe(
      false,
    );

    const user = await repository.createUser(mobileNumber, "customer");
    expect(user.roles).toEqual([
      expect.objectContaining({
        role: "customer",
        active: true,
        scopeId: HYDERABAD_BRANCH_ID,
      }),
    ]);
    expect(await repository.findUserByMobile(mobileNumber)).toMatchObject({
      id: user.id,
      mobileNumber,
    });

    const sessionId = stableUuid(`session:${label}`);
    const session = {
      id: sessionId,
      userId: user.id,
      deviceId: "synthetic-device-identity-mapping",
      createdAt: "2026-08-26T12:00:00.000Z",
      lastSeenAt: "2026-08-26T12:00:00.000Z",
      expiresAt: "2099-09-25T12:00:00.000Z",
    };
    await repository.saveSession(session, "synthetic-refresh-digest");
    expect(await repository.findSessionById(sessionId)).toEqual(session);
    expect(
      await repository.findSessionByRefreshDigest("synthetic-refresh-digest"),
    ).toMatchObject({ match: "current", record: { session } });
    await repository.revokeSession(
      sessionId,
      new Date("2026-08-26T12:30:00.000Z"),
    );
    expect((await repository.findSessionById(sessionId))?.revokedAt).toBe(
      "2026-08-26T12:30:00.000Z",
    );
  });

  it("rolls back the user when a safe test-only role-assignment trigger rejects", async () => {
    const mobileNumber = syntheticMobile("identity-rollback");
    await pool.query(
      `CREATE TABLE database_integration_failures (mobile_e164 text PRIMARY KEY)`,
    );
    await pool.query(
      `INSERT INTO database_integration_failures (mobile_e164) VALUES ($1)`,
      [mobileNumber],
    );
    await pool.query(
      `CREATE FUNCTION database_integration_reject_role()
       RETURNS trigger LANGUAGE plpgsql AS $function$
       BEGIN
         IF EXISTS (
           SELECT 1
           FROM app_users u
           JOIN database_integration_failures f ON f.mobile_e164 = u.mobile_e164
           WHERE u.id = NEW.user_id
         ) THEN
           RAISE EXCEPTION 'synthetic role assignment failure';
         END IF;
         RETURN NEW;
       END;
       $function$`,
    );
    await pool.query(
      `CREATE TRIGGER database_integration_reject_role
       BEFORE INSERT ON role_assignments
       FOR EACH ROW EXECUTE FUNCTION database_integration_reject_role()`,
    );

    try {
      await expect(
        repository.createUser(mobileNumber, "customer"),
      ).rejects.toThrow("synthetic role assignment failure");
    } finally {
      await pool.query(
        `DROP TRIGGER database_integration_reject_role ON role_assignments`,
      );
      await pool.query(`DROP FUNCTION database_integration_reject_role()`);
      await pool.query(`DROP TABLE database_integration_failures`);
    }

    const partial = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM app_users WHERE mobile_e164 = $1`,
      [mobileNumber],
    );
    expect(partial.rows[0]?.count).toBe(0);
  });

  it("enforces role-switch compare-and-set and writes one audit row", async () => {
    const user = await repository.createUser(
      syntheticMobile("role-switch-cas"),
      "customer",
    );
    await pool.query(
      `INSERT INTO role_assignments (
         id, user_id, role, state, scope_type, scope_id, verified_at
       ) VALUES ($1, $2, 'worker', 'active', 'branch', $3, now())`,
      [stableUuid("role-switch-worker"), user.id, HYDERABAD_BRANCH_ID],
    );

    const base = {
      userId: user.id,
      role: "worker" as const,
      expectedVersion: user.version,
      actorUserId: user.id,
      actorRole: "customer" as const,
      fromRole: "customer" as const,
      toRole: "worker" as const,
    };
    const results = await Promise.all([
      repository.persistRoleSwitch({
        ...base,
        requestId: "dbint-role-switch-a",
      }),
      repository.persistRoleSwitch({
        ...base,
        requestId: "dbint-role-switch-b",
      }),
    ]);
    expect(results.filter((result) => result !== undefined)).toHaveLength(1);
    expect(results.filter((result) => result === undefined)).toHaveLength(1);
    expect((await repository.findUserById(user.id))?.lastActiveRole).toBe(
      "worker",
    );
    const audits = await pool.query<{ action: string }>(
      `SELECT action FROM audit_events
       WHERE entity_type = 'app_user' AND entity_id = $1
         AND action = 'identity.role.switched'`,
      [user.id],
    );
    expect(audits.rows).toEqual([{ action: "identity.role.switched" }]);
  });
});

describe("DBINT-03 OTP one-time concurrency and negatives", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = createIntegrationPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("persists controlled incorrect, expired, exhausted, and consumed failures", async () => {
    const { repository, provider, service } = createAuthHarness(pool);
    const incorrectMobile = syntheticMobile("otp-incorrect");
    const requested = await service.requestOtp({
      mobileNumber: incorrectMobile,
    });
    const wrongCode = provider.lastCode === "000000" ? "000001" : "000000";
    await expect(
      service.verifyOtp({
        challengeId: requested.challengeId,
        code: wrongCode,
        deviceId: "synthetic-incorrect-device",
      }),
    ).rejects.toMatchObject({ code: "OTP_INCORRECT", status: 401 });
    expect(
      (await repository.findChallenge(requested.challengeId))
        ?.attemptsRemaining,
    ).toBe(4);

    const cases = [
      {
        label: "expired",
        expiresAt: new Date("2020-01-01T00:00:00.000Z"),
        attemptsRemaining: 5,
        expected: "OTP_EXPIRED",
      },
      {
        label: "exhausted",
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
        attemptsRemaining: 0,
        expected: "OTP_ATTEMPTS_EXHAUSTED",
      },
      {
        label: "consumed",
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
        attemptsRemaining: 5,
        consumedAt: new Date("2026-08-26T12:00:00.000Z"),
        expected: "OTP_CHALLENGE_INVALID",
      },
    ] as const;

    for (const fixture of cases) {
      const id = stableUuid(`otp-negative:${fixture.label}`);
      await repository.saveChallenge({
        id,
        mobileNumber: syntheticMobile(`otp-${fixture.label}`),
        codeDigest: digestOtp(id, "123456"),
        createdAt: new Date("2026-08-26T11:00:00.000Z"),
        expiresAt: fixture.expiresAt,
        resendAfter: new Date("2026-08-26T11:01:00.000Z"),
        attemptsRemaining: fixture.attemptsRemaining,
        ...("consumedAt" in fixture ? { consumedAt: fixture.consumedAt } : {}),
      });
      await expect(
        service.verifyOtp({
          challengeId: id,
          code: "123456",
          deviceId: `synthetic-${fixture.label}-device`,
        }),
      ).rejects.toMatchObject({ code: fixture.expected });
    }
  });

  it("allows exactly one concurrent verification and one user/session outcome", async () => {
    const { provider, service } = createAuthHarness(pool);
    const mobileNumber = syntheticMobile("otp-concurrency");
    const challenge = await service.requestOtp({ mobileNumber });
    const code = provider.lastCode;
    if (code === undefined) {
      throw new Error("Synthetic OTP capture is missing");
    }

    const results = await Promise.allSettled([
      service.verifyOtp({
        challengeId: challenge.challengeId,
        code,
        deviceId: "synthetic-concurrent-device",
      }),
      service.verifyOtp({
        challengeId: challenge.challengeId,
        code,
        deviceId: "synthetic-concurrent-device",
      }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status).toBe("rejected");
    expect(
      rejected?.status === "rejected" ? errorCode(rejected.reason) : null,
    ).toBe("OTP_CHALLENGE_INVALID");

    const state = await pool.query<{
      users: number;
      roles: number;
      sessions: number;
      audits: number;
      consumed: boolean;
    }>(
      `SELECT
         (SELECT count(*)::int FROM app_users WHERE mobile_e164 = $1) AS users,
         (SELECT count(*)::int FROM role_assignments ra JOIN app_users u ON u.id = ra.user_id WHERE u.mobile_e164 = $1) AS roles,
         (SELECT count(*)::int FROM device_sessions ds JOIN app_users u ON u.id = ds.user_id WHERE u.mobile_e164 = $1) AS sessions,
         (SELECT count(*)::int FROM audit_events a JOIN app_users u ON u.id = a.actor_user_id WHERE u.mobile_e164 = $1 AND a.action IN ('identity.user.created', 'identity.session.created')) AS audits,
         (SELECT consumed_at IS NOT NULL FROM otp_challenges WHERE id = $2) AS consumed`,
      [mobileNumber, challenge.challengeId],
    );
    expect(state.rows[0]).toEqual({
      users: 1,
      roles: 1,
      sessions: 1,
      audits: 2,
      consumed: true,
    });
  });
});

describe("DBINT-04 refresh rotation concurrency and reuse", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = createIntegrationPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("rotates once, revokes on sequential reuse, and denies the revoked session", async () => {
    const { service } = createAuthHarness(pool);
    const login = await loginWithOtp(service, "refresh-reuse");
    const rotated = await service.refreshSession({
      refreshToken: login.refreshToken,
    });
    expect(rotated.refreshToken).not.toBe(login.refreshToken);

    await expect(
      service.refreshSession({ refreshToken: login.refreshToken }),
    ).rejects.toMatchObject({ code: "SESSION_REFRESH_REUSED", status: 401 });
    await expect(
      service.refreshSession({ refreshToken: rotated.refreshToken }),
    ).rejects.toMatchObject({ code: "SESSION_NOT_ACTIVE", status: 401 });

    const audits = await pool.query<{ action: string; reason: string | null }>(
      `SELECT action, reason FROM audit_events
       WHERE actor_user_id = $1
         AND action IN ('identity.session.rotated', 'identity.session.revoked')
       ORDER BY occurred_at`,
      [login.user.id],
    );
    expect(audits.rows).toEqual([
      { action: "identity.session.rotated", reason: null },
      {
        action: "identity.session.revoked",
        reason: "refresh-token-reuse",
      },
    ]);
  });

  it("uses compare-and-set so one concurrent rotation wins without revoking it", async () => {
    const { repository, service } = createAuthHarness(pool);
    const login = await loginWithOtp(service, "refresh-concurrency");
    const results = await Promise.allSettled([
      service.refreshSession({ refreshToken: login.refreshToken }),
      service.refreshSession({ refreshToken: login.refreshToken }),
    ]);
    const fulfilled = results.filter(
      (
        result,
      ): result is PromiseFulfilledResult<
        Awaited<ReturnType<AuthService["refreshSession"]>>
      > => result.status === "fulfilled",
    );
    expect(fulfilled).toHaveLength(1);
    expect(
      results
        .filter((result) => result.status === "rejected")
        .map((result) => errorCode(result.reason)),
    ).toEqual(["SESSION_REFRESH_CONFLICT"]);

    const winnerDigest = digestRefresh(fulfilled[0]?.value.refreshToken ?? "");
    const winner = await repository.findSessionByRefreshDigest(winnerDigest);
    expect(winner?.match).toBe("current");
    expect(winner?.record.session.revokedAt).toBeUndefined();
    const rotatedAudits = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM audit_events
       WHERE actor_user_id = $1 AND action = 'identity.session.rotated'`,
      [login.user.id],
    );
    expect(rotatedAudits.rows[0]?.count).toBe(1);
  });
});

function createAuthHarness(pool: Pool): {
  readonly repository: PostgresIdentityRepository;
  readonly provider: CapturingOtpProvider;
  readonly service: AuthService;
} {
  const repository = new PostgresIdentityRepository(pool);
  const provider = new CapturingOtpProvider();
  const values: Readonly<Record<string, string>> = {
    APP_ENV: "development",
    OTP_PROVIDER: "local",
    OTP_HMAC_SECRET,
    JWT_ACCESS_SECRET,
    REFRESH_TOKEN_HMAC_SECRET: REFRESH_HMAC_SECRET,
  };
  const config = {
    getOrThrow: (key: string): string => {
      const value = values[key];
      if (value === undefined) {
        throw new Error(`Missing synthetic configuration key ${key}`);
      }
      return value;
    },
  } as unknown as ConfigService;
  return {
    repository,
    provider,
    service: new AuthService(
      repository,
      provider,
      new PostgresAuditSink(pool),
      config,
      new JwtService({ secret: JWT_ACCESS_SECRET }),
    ),
  };
}

async function loginWithOtp(
  service: AuthService,
  label: string,
): Promise<Awaited<ReturnType<AuthService["verifyOtp"]>>> {
  const request = await service.requestOtp({
    mobileNumber: syntheticMobile(label),
  });
  if (request.debugCode === undefined) {
    throw new Error("Synthetic local OTP response did not include debugCode");
  }
  return service.verifyOtp({
    challengeId: request.challengeId,
    code: request.debugCode,
    deviceId: `synthetic-device-${label}`,
  });
}

function digestOtp(challengeId: string, code: string): string {
  return createHmac("sha256", OTP_HMAC_SECRET)
    .update(`${challengeId}:${code}`)
    .digest("hex");
}

function digestRefresh(token: string): string {
  return createHmac("sha256", REFRESH_HMAC_SECRET).update(token).digest("hex");
}

function errorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== "object" || !("code" in error)) {
    return undefined;
  }
  const { code } = error;
  return typeof code === "string" ? code : undefined;
}
