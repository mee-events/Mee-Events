import type { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHmac } from "node:crypto";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type {
  ListSessionsResponse,
  LogoutAllResponse,
} from "@me-event/api-contracts";
import { PostgresIdentityRepository } from "../../src/modules/identity/adapters/postgres-identity.repository";
import { AuthService } from "../../src/modules/identity/application/auth.service";
import { activeSupportedAssignments } from "../../src/common/branch/role-scope-policy";
import { PostgresVendorRepository } from "../../src/modules/vendors/adapters/postgres-vendor.repository";
import { VendorService } from "../../src/modules/vendors/application/vendor.service";
import type { AuthenticatedPrincipal } from "../../src/modules/platform-foundation/domain/platform-foundation";
import type {
  OtpDelivery,
  OtpProvider,
} from "../../src/modules/identity/ports/otp-provider";
import { createIntegrationPool } from "./support/database";
import {
  insertSyntheticBranch,
  insertSyntheticUser,
  stableUuid,
  syntheticMobile,
} from "./support/fixtures";

const OTP_HMAC_SECRET = "dbint-otp-hmac-secret-000000000000";
const JWT_ACCESS_SECRET = "dbint-jwt-access-secret-0000000000";
const REFRESH_HMAC_SECRET = "dbint-refresh-secret-0000000000000";
const HYDERABAD_BRANCH_ID = "00000000-0000-4000-8000-000000000001";

class CapturingOtpProvider implements OtpProvider {
  public lastCode: string | undefined;
  public deliveryCount = 0;

  public async sendCode(
    _mobileNumber: string,
    code: string,
  ): Promise<OtpDelivery> {
    this.lastCode = code;
    this.deliveryCount += 1;
    return { providerMessageId: "synthetic-dbint-delivery" };
  }
}

class FailOnceOtpProvider extends CapturingOtpProvider {
  private failNext = true;

  public override async sendCode(
    mobileNumber: string,
    code: string,
  ): Promise<OtpDelivery> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("synthetic raw provider failure detail");
    }
    return super.sendCode(mobileNumber, code);
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
        scopeType: "branch",
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

  it("round-trips branch, global, vendor, multiple, and inactive grants", async () => {
    const user = await repository.createUser(
      syntheticMobile("role-scope-round-trip"),
      "customer",
    );
    const vendorA = stableUuid("role-scope-vendor-a");
    const vendorB = stableUuid("role-scope-vendor-b");
    const rows = [
      ["administrator", "active", "global", null],
      ["vendor_owner", "active", "vendor", vendorA],
      ["vendor_owner", "active", "vendor", vendorB],
      ["vendor_member", "suspended", "vendor", vendorB],
    ] as const;
    for (const [role, state, scopeType, scopeId] of rows) {
      await pool.query(
        `INSERT INTO role_assignments (
           id, user_id, role, state, scope_type, scope_id, verified_at
         ) VALUES ($1, $2, $3, $4, $5, $6, now())`,
        [
          stableUuid(`role-scope:${role}:${state}:${scopeId ?? "global"}`),
          user.id,
          role,
          state,
          scopeType,
          scopeId,
        ],
      );
    }

    const loaded = await repository.findUserById(user.id);
    expect(loaded?.roles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "customer",
          active: true,
          scopeType: "branch",
          scopeId: HYDERABAD_BRANCH_ID,
        }),
        expect.objectContaining({
          role: "administrator",
          active: true,
          scopeType: "global",
        }),
        expect.objectContaining({
          role: "vendor_owner",
          active: true,
          scopeType: "vendor",
          scopeId: vendorA,
        }),
        expect.objectContaining({
          role: "vendor_owner",
          active: true,
          scopeType: "vendor",
          scopeId: vendorB,
        }),
        expect.objectContaining({
          role: "vendor_member",
          active: false,
          scopeType: "vendor",
          scopeId: vendorB,
        }),
      ]),
    );
    expect(
      loaded?.roles.find((assignment) => assignment.scopeType === "global"),
    ).not.toHaveProperty("scopeId");
    expect(activeSupportedAssignments(loaded?.roles ?? [])).toHaveLength(4);

    await expect(
      pool.query(
        `INSERT INTO role_assignments (
           id, user_id, role, state, scope_type, scope_id, verified_at
         ) VALUES ($1, $2, 'vendor_owner', 'active', 'vendor', $3, now())`,
        [stableUuid("role-scope-duplicate"), user.id, vendorA],
      ),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("loads a wrong-branch grant but the Phase 1 policy rejects it", async () => {
    const wrongBranchId = await insertSyntheticBranch(
      pool,
      "scope-wrong-branch",
    );
    const user = await insertSyntheticUser(
      pool,
      "scope-wrong-branch-user",
      "customer",
      wrongBranchId,
    );
    const loaded = await repository.findUserById(user.id);

    expect(loaded?.roles[0]).toMatchObject({
      role: "customer",
      active: true,
      scopeType: "branch",
      scopeId: wrongBranchId,
    });
    expect(activeSupportedAssignments(loaded?.roles ?? [])).toBeUndefined();
  });

  it("keeps active vendor membership authoritative across vendors", async () => {
    const user = await insertSyntheticUser(
      pool,
      "scope-cross-vendor-user",
      "vendor_owner",
    );
    const vendorA = stableUuid("membership-vendor-a");
    const vendorB = stableUuid("membership-vendor-b");
    for (const [id, code] of [
      [vendorA, "DBINT-SCOPE-A"],
      [vendorB, "DBINT-SCOPE-B"],
    ] as const) {
      await pool.query(
        `INSERT INTO vendors (
           id, branch_id, vendor_code, business_name, owner_name, phone_e164
         ) VALUES ($1, $2, $3, $4, 'Synthetic Owner', '+919876543210')`,
        [id, HYDERABAD_BRANCH_ID, code, `Synthetic ${code}`],
      );
    }
    await pool.query(
      `INSERT INTO vendor_members (
         id, vendor_id, user_id, member_role, status
       ) VALUES
         ($1, $2, $3, 'owner', 'active'),
         ($4, $5, $3, 'owner', 'inactive')`,
      [
        stableUuid("membership-active"),
        vendorA,
        user.id,
        stableUuid("membership-inactive"),
        vendorB,
      ],
    );
    const vendors = new PostgresVendorRepository(pool);

    expect(await vendors.findVendorIdForUser(user.id)).toBe(vendorA);
    expect(await vendors.findVendorIdsForUser(user.id)).toEqual([vendorA]);
    expect(await vendors.isVendorMember(vendorA, user.id)).toBe(true);
    expect(await vendors.isVendorMember(vendorB, user.id)).toBe(false);
  });

  it("intersects database-backed vendor membership with exact or branch role scope", async () => {
    const user = await insertSyntheticUser(
      pool,
      "scope-vendor-intersection-user",
      "vendor_owner",
    );
    const vendorA = stableUuid("intersection-vendor-a");
    const vendorB = stableUuid("intersection-vendor-b");
    for (const [id, code] of [
      [vendorA, "DBINT-INTERSECTION-A"],
      [vendorB, "DBINT-INTERSECTION-B"],
    ] as const) {
      await pool.query(
        `INSERT INTO vendors (
           id, branch_id, vendor_code, business_name, owner_name, phone_e164
         ) VALUES ($1, $2, $3, $4, 'Synthetic Owner', '+919876543210')`,
        [id, HYDERABAD_BRANCH_ID, code, `Synthetic ${code}`],
      );
    }
    await pool.query(
      `INSERT INTO vendor_members (
         id, vendor_id, user_id, member_role, status
       ) VALUES
         ($1, $2, $3, 'owner', 'active'),
         ($4, $5, $3, 'member', 'active')`,
      [
        stableUuid("intersection-membership-a"),
        vendorA,
        user.id,
        stableUuid("intersection-membership-b"),
        vendorB,
      ],
    );
    const repository = new PostgresVendorRepository(pool);
    const service = new VendorService(repository);
    const vendorAGrant: AuthenticatedPrincipal = {
      userId: user.id,
      sessionId: stableUuid("intersection-session-a"),
      activeRole: "vendor_owner",
      roleAssignments: [
        {
          role: "vendor_owner",
          active: true,
          scopeType: "vendor",
          scopeId: vendorA,
        },
      ],
    };

    await expect(service.getOwnDashboard(vendorAGrant)).resolves.toMatchObject({
      totalVendors: 1,
      vendors: [expect.objectContaining({ id: vendorA })],
    });
    await expect(
      service.addOwnNote(
        vendorAGrant,
        {
          vendorId: vendorB,
          noteType: "vendor",
          content: "must not cross vendors",
        },
        stableUuid("intersection-request-denied"),
      ),
    ).rejects.toMatchObject({ code: "VENDOR_RESOURCE_FORBIDDEN", status: 403 });

    const branchGrant: AuthenticatedPrincipal = {
      ...vendorAGrant,
      roleAssignments: [
        {
          role: "vendor_owner",
          active: true,
          scopeType: "branch",
          scopeId: HYDERABAD_BRANCH_ID,
        },
      ],
    };
    await expect(service.getOwnDashboard(branchGrant)).resolves.toMatchObject({
      totalVendors: 2,
    });

    await expect(
      service.getOwnDashboard({
        ...vendorAGrant,
        userId: stableUuid("intersection-grant-without-membership"),
      }),
    ).rejects.toMatchObject({ code: "VENDOR_RESOURCE_FORBIDDEN", status: 403 });
    await expect(
      service.getOwnDashboard({
        ...vendorAGrant,
        activeRole: "customer",
        roleAssignments: [
          {
            role: "customer",
            active: true,
            scopeType: "branch",
            scopeId: HYDERABAD_BRANCH_ID,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "VENDOR_RESOURCE_FORBIDDEN", status: 403 });
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

describe("CUST-02 PostgreSQL OTP replacement and delivery recovery", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = createIntegrationPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("atomically supersedes the old code before accepting the replacement", async () => {
    const { repository, provider, service } = createAuthHarness(pool);
    const mobileNumber = syntheticMobile("cust02-resend-replacement");
    const oldChallengeId = stableUuid("challenge:cust02-resend-replacement");
    const oldCode = "123456";
    const now = Date.now();
    await repository.saveChallenge({
      id: oldChallengeId,
      mobileNumber,
      codeDigest: digestOtp(oldChallengeId, oldCode),
      createdAt: new Date(now - 61_000),
      expiresAt: new Date(now + 120_000),
      resendAfter: new Date(now - 1_000),
      attemptsRemaining: 5,
    });

    const replacement = await service.requestOtp({ mobileNumber });
    const replacementCode = provider.lastCode;
    if (replacementCode === undefined) {
      throw new Error("Synthetic OTP capture is missing");
    }

    expect(
      (await repository.findChallenge(oldChallengeId))?.consumedAt,
    ).toBeDefined();
    await expect(
      service.verifyOtp({
        challengeId: oldChallengeId,
        code: oldCode,
        deviceId: "synthetic-cust02-old-code",
      }),
    ).rejects.toMatchObject({ code: "OTP_CHALLENGE_INVALID", status: 401 });
    await expect(
      service.verifyOtp({
        challengeId: replacement.challengeId,
        code: replacementCode,
        deviceId: "synthetic-cust02-new-code",
      }),
    ).resolves.toMatchObject({ user: { lastActiveRole: "customer" } });
  });

  it("serializes same-mobile requests across two pools", async () => {
    const secondPool = createIntegrationPool();
    try {
      const first = createAuthHarness(pool);
      const second = createAuthHarness(secondPool);
      const mobileNumber = syntheticMobile("cust02-request-serialization");

      const results = await Promise.allSettled([
        first.service.requestOtp({ mobileNumber }),
        second.service.requestOtp({ mobileNumber }),
      ]);

      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        results
          .filter((result) => result.status === "rejected")
          .map((result) => errorCode(result.reason)),
      ).toEqual(["OTP_RESEND_COOLDOWN"]);
      expect(first.provider.deliveryCount + second.provider.deliveryCount).toBe(
        1,
      );
      const challenges = await pool.query<{
        readonly total: number;
        readonly open: number;
      }>(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE consumed_at IS NULL)::int AS open
         FROM otp_challenges WHERE mobile_e164 = $1`,
        [mobileNumber],
      );
      expect(challenges.rows[0]).toEqual({ total: 1, open: 1 });
    } finally {
      await secondPool.end();
    }
  });

  it("invalidates failed delivery state and permits an immediate retry", async () => {
    const repository = new PostgresIdentityRepository(pool);
    const provider = new FailOnceOtpProvider();
    const service = createAuthService(repository, provider);
    const mobileNumber = syntheticMobile("cust02-provider-recovery");

    await expect(service.requestOtp({ mobileNumber })).rejects.toMatchObject({
      code: "OTP_DELIVERY_UNAVAILABLE",
      message: "We could not send a code right now. Try again later",
      status: 503,
    });
    await expect(service.requestOtp({ mobileNumber })).resolves.toMatchObject({
      expiresInSeconds: 300,
      resendAfterSeconds: 60,
    });
    const challenges = await pool.query<{
      readonly total: number;
      readonly open: number;
    }>(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE consumed_at IS NULL)::int AS open
       FROM otp_challenges WHERE mobile_e164 = $1`,
      [mobileNumber],
    );
    expect(challenges.rows[0]).toEqual({ total: 2, open: 1 });
    expect(provider.deliveryCount).toBe(1);
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

  it("keeps PostgreSQL CAS authoritative with one true and one false", async () => {
    const secondPool = createIntegrationPool();
    try {
      const first = new PostgresIdentityRepository(pool);
      const second = new PostgresIdentityRepository(secondPool);
      const user = await first.createUser(
        syntheticMobile("refresh-repository-cas"),
        "customer",
      );
      const sessionId = stableUuid("session:refresh-repository-cas");
      await first.saveSession(
        {
          id: sessionId,
          userId: user.id,
          deviceId: "synthetic-device-refresh-repository-cas",
          createdAt: "2026-08-26T12:00:00.000Z",
          lastSeenAt: "2026-08-26T12:00:00.000Z",
          expiresAt: "2099-09-25T12:00:00.000Z",
        },
        "repository-cas-current",
      );
      const results = await Promise.all([
        first.rotateSessionRefreshToken(
          sessionId,
          "repository-cas-next-a",
          "repository-cas-current",
          new Date("2026-08-26T12:01:00.000Z"),
          new Date("2099-09-25T12:01:00.000Z"),
        ),
        second.rotateSessionRefreshToken(
          sessionId,
          "repository-cas-next-b",
          "repository-cas-current",
          new Date("2026-08-26T12:01:00.000Z"),
          new Date("2099-09-25T12:01:00.000Z"),
        ),
      ]);
      expect(results.filter(Boolean)).toHaveLength(1);
      expect(results.filter((result) => !result)).toHaveLength(1);
      const currentMatches = await Promise.all(
        ["repository-cas-next-a", "repository-cas-next-b"].map((digest) =>
          first.findSessionByRefreshDigest(digest),
        ),
      );
      expect(
        currentMatches.filter((match) => match?.match === "current"),
      ).toHaveLength(1);
    } finally {
      await secondPool.end();
    }
  });

  it("coordinates two services and pools without revoking the winner", async () => {
    const secondPool = createIntegrationPool();
    try {
      await secondPool.query("SELECT 1");
      const first = createAuthHarness(pool);
      const second = createAuthHarness(secondPool);
      for (let iteration = 0; iteration < 20; iteration += 1) {
        const login = await loginWithOtp(
          first.service,
          `refresh-two-service-${String(iteration)}`,
        );
        const results = await Promise.allSettled([
          first.service.refreshSession({ refreshToken: login.refreshToken }),
          second.service.refreshSession({ refreshToken: login.refreshToken }),
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

        const winnerDigest = digestRefresh(
          fulfilled[0]?.value.refreshToken ?? "",
        );
        const winner =
          await first.repository.findSessionByRefreshDigest(winnerDigest);
        expect(winner?.match).toBe("current");
        expect(winner?.record.session.revokedAt).toBeUndefined();
        const audits = await pool.query<{
          rotations: number;
          revocations: number;
        }>(
          `SELECT
             count(*) FILTER (WHERE action = 'identity.session.rotated')::int AS rotations,
             count(*) FILTER (WHERE action = 'identity.session.revoked')::int AS revocations
           FROM audit_events
           WHERE actor_user_id = $1
             AND action IN ('identity.session.rotated', 'identity.session.revoked')`,
          [login.user.id],
        );
        expect(audits.rows[0]).toEqual({ rotations: 1, revocations: 0 });
      }
    } finally {
      await secondPool.end();
    }
  });
});

describe("SEC-03 session control", () => {
  let pool: Pool;

  beforeAll(() => {
    pool = createIntegrationPool();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("rolls back OTP consume when session audit cannot be written", async () => {
    const { repository, provider, service } = createAuthHarness(pool);
    await pool.query(
      `CREATE FUNCTION sec03_reject_session_created_audit()
       RETURNS trigger LANGUAGE plpgsql AS $function$
       BEGIN
         IF NEW.action = 'identity.session.created' THEN
           RAISE EXCEPTION 'synthetic session created audit failure';
         END IF;
         RETURN NEW;
       END;
       $function$`,
    );
    await pool.query(
      `CREATE TRIGGER sec03_reject_session_created_audit
       BEFORE INSERT ON audit_events
       FOR EACH ROW EXECUTE FUNCTION sec03_reject_session_created_audit()`,
    );
    const mobileNumber = syntheticMobile("otp-audit-rollback");
    try {
      const challenge = await service.requestOtp({ mobileNumber });
      const code = provider.lastCode;
      if (code === undefined) {
        throw new Error("Synthetic OTP capture is missing");
      }
      await expect(
        service.verifyOtp({
          challengeId: challenge.challengeId,
          code,
          deviceId: "synthetic-otp-audit-device",
        }),
      ).rejects.toThrow("synthetic session created audit failure");
      expect(
        (await repository.findChallenge(challenge.challengeId))?.consumedAt,
      ).toBeUndefined();
      expect(await repository.findUserByMobile(mobileNumber)).toBeUndefined();
    } finally {
      await pool.query(
        `DROP TRIGGER IF EXISTS sec03_reject_session_created_audit ON audit_events`,
      );
      await pool.query(
        `DROP FUNCTION IF EXISTS sec03_reject_session_created_audit()`,
      );
    }
  });

  it("rolls back refresh rotation when the rotation audit cannot be written", async () => {
    const { repository, service } = createAuthHarness(pool);
    const login = await loginWithOtp(service, "refresh-audit-rollback");
    await pool.query(
      `CREATE FUNCTION sec03_reject_session_rotated_audit()
       RETURNS trigger LANGUAGE plpgsql AS $function$
       BEGIN
         IF NEW.action = 'identity.session.rotated' THEN
           RAISE EXCEPTION 'synthetic session rotated audit failure';
         END IF;
         RETURN NEW;
       END;
       $function$`,
    );
    await pool.query(
      `CREATE TRIGGER sec03_reject_session_rotated_audit
       BEFORE INSERT ON audit_events
       FOR EACH ROW EXECUTE FUNCTION sec03_reject_session_rotated_audit()`,
    );
    try {
      await expect(
        service.refreshSession({ refreshToken: login.refreshToken }),
      ).rejects.toThrow("synthetic session rotated audit failure");
      const stillCurrent = await repository.findSessionByRefreshDigest(
        digestRefresh(login.refreshToken),
      );
      expect(stillCurrent?.match).toBe("current");
      expect(stillCurrent?.record.session.revokedAt).toBeUndefined();
    } finally {
      await pool.query(
        `DROP TRIGGER IF EXISTS sec03_reject_session_rotated_audit ON audit_events`,
      );
      await pool.query(
        `DROP FUNCTION IF EXISTS sec03_reject_session_rotated_audit()`,
      );
    }
    const rotated = await service.refreshSession({
      refreshToken: login.refreshToken,
    });
    expect(rotated.refreshToken).not.toBe(login.refreshToken);
  });

  it("logout of the current session leaves another device usable", async () => {
    const { repository, service } = createAuthHarness(pool);
    const first = await loginWithOtp(service, "logout-other-device");
    const firstMatch = await repository.findSessionByRefreshDigest(
      digestRefresh(first.refreshToken),
    );
    const otherId = stableUuid("session:logout-other-device");
    await repository.saveSession(
      {
        id: otherId,
        userId: first.user.id,
        deviceId: "synthetic-device-logout-other",
        createdAt: "2026-08-26T12:00:00.000Z",
        lastSeenAt: "2026-08-26T12:00:00.000Z",
        expiresAt: "2099-09-25T12:00:00.000Z",
      },
      digestRefresh("logout-other-refresh-token-000000000000"),
    );
    await service.logout(
      first.user.id,
      firstMatch?.record.session.id ?? "",
      "customer",
    );
    await expect(
      service.refreshSession({ refreshToken: first.refreshToken }),
    ).rejects.toMatchObject({ code: "SESSION_NOT_ACTIVE", status: 401 });
    const rotated = await service.refreshSession({
      refreshToken: "logout-other-refresh-token-000000000000",
    });
    expect(rotated.refreshToken).not.toHaveLength(0);
  });

  it("revoke-all ends every session for the user and not another user", async () => {
    const { repository, service } = createAuthHarness(pool);
    const first = await loginWithOtp(service, "logout-all-owner");
    const other = await loginWithOtp(service, "logout-all-bystander");
    await repository.saveSession(
      {
        id: stableUuid("session:logout-all-second"),
        userId: first.user.id,
        deviceId: "synthetic-device-logout-all-second",
        createdAt: "2026-08-26T12:00:00.000Z",
        lastSeenAt: "2026-08-26T12:00:00.000Z",
        expiresAt: "2099-09-25T12:00:00.000Z",
      },
      digestRefresh("logout-all-second-refresh-token-000000"),
    );
    const revoked: LogoutAllResponse = await service.logoutAll(
      first.user.id,
      "customer",
    );
    expect(revoked.revoked).toBe(true);
    expect(revoked.revokedCount).toBe(2);
    expect(await service.listSessions(first.user.id, "")).toEqual({
      sessions: [],
    });
    await expect(
      service.refreshSession({ refreshToken: first.refreshToken }),
    ).rejects.toMatchObject({ code: "SESSION_NOT_ACTIVE", status: 401 });
    const otherRotated = await service.refreshSession({
      refreshToken: other.refreshToken,
    });
    expect(otherRotated.refreshToken).not.toHaveLength(0);
    const listed: ListSessionsResponse = await service.listSessions(
      other.user.id,
      "",
    );
    expect(JSON.stringify(listed)).not.toMatch(/refresh/i);
    expect(listed.sessions).toHaveLength(1);
  });

  it("a new device id does not steal an existing session", async () => {
    const { repository, service } = createAuthHarness(pool);
    const original = await loginWithOtp(service, "reinstall-keep-old");
    const challengeId = stableUuid("challenge:reinstall-keep-old");
    await repository.saveChallenge({
      id: challengeId,
      mobileNumber: original.user.mobileNumber,
      codeDigest: digestOtp(challengeId, "123456"),
      createdAt: new Date("2026-08-26T12:00:00.000Z"),
      expiresAt: new Date("2099-08-26T12:05:00.000Z"),
      resendAfter: new Date("2026-08-26T12:01:00.000Z"),
      attemptsRemaining: 5,
    });
    const reinstall = await service.verifyOtp({
      challengeId,
      code: "123456",
      deviceId: "synthetic-device-reinstall-new",
    });
    expect(reinstall.refreshToken).not.toBe(original.refreshToken);
    const listed: ListSessionsResponse = await service.listSessions(
      original.user.id,
      "",
    );
    expect(listed.sessions.map((session) => session.deviceId).sort()).toEqual([
      "synthetic-device-reinstall-keep-old",
      "synthetic-device-reinstall-new",
    ]);
    expect(JSON.stringify(listed)).not.toMatch(/refresh/i);
    const rotated = await service.refreshSession({
      refreshToken: original.refreshToken,
    });
    expect(rotated.refreshToken).not.toHaveLength(0);
  });
});

function createAuthHarness(pool: Pool): {
  readonly repository: PostgresIdentityRepository;
  readonly provider: CapturingOtpProvider;
  readonly service: AuthService;
} {
  const repository = new PostgresIdentityRepository(pool);
  const provider = new CapturingOtpProvider();
  return {
    repository,
    provider,
    service: createAuthService(repository, provider),
  };
}

function createAuthService(
  repository: PostgresIdentityRepository,
  provider: OtpProvider,
): AuthService {
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
  return new AuthService(
    repository,
    provider,
    config,
    new JwtService({ secret: JWT_ACCESS_SECRET }),
  );
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
