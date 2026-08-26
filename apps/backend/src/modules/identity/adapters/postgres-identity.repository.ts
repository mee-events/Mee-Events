import { Inject, Injectable } from "@nestjs/common";
import type {
  DeviceSession,
  PlatformRole,
  RoleAssignment,
} from "@me-event/shared-types";
import type { Pool, PoolClient } from "pg";
import { PG_POOL } from "../../../database/database.module";
import type { UserRecord } from "../domain/user";
import type {
  CoordinatedRefreshResult,
  IdentityRepository,
  OtpChallengeRecord,
  RefreshDigestMatch,
  RoleSwitchPersistence,
} from "../ports/identity-repository";

/** Platform DEFAULT_BRANCH for new user role assignments until multi-branch provisioning. */
const DEFAULT_BRANCH_ID = "00000000-0000-4000-8000-000000000001";

interface UserRow {
  readonly id: string;
  readonly mobile_e164: string;
  readonly last_active_role: PlatformRole;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly version: number;
}

interface RoleAssignmentRow {
  readonly role: PlatformRole;
  readonly state: string;
  readonly scope_id: string | null;
  readonly verified_at: Date | null;
}

interface SessionRow {
  readonly id: string;
  readonly user_id: string;
  readonly device_id: string;
  readonly refresh_token_digest: string;
  readonly previous_refresh_token_digest: string | null;
  readonly created_at: Date;
  readonly last_seen_at: Date;
  readonly expires_at: Date;
  readonly revoked_at: Date | null;
}

interface ChallengeRow {
  readonly id: string;
  readonly mobile_e164: string;
  readonly code_digest: string;
  readonly created_at: Date;
  readonly expires_at: Date;
  readonly resend_after: Date;
  readonly attempts_remaining: number;
  readonly consumed_at: Date | null;
}

@Injectable()
export class PostgresIdentityRepository implements IdentityRepository {
  public constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  public async saveChallenge(challenge: OtpChallengeRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO otp_challenges (
         id, mobile_e164, code_digest, expires_at, resend_after,
         attempts_remaining, consumed_at, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        challenge.id,
        challenge.mobileNumber,
        challenge.codeDigest,
        challenge.expiresAt,
        challenge.resendAfter,
        challenge.attemptsRemaining,
        challenge.consumedAt ?? null,
        challenge.createdAt,
      ],
    );
  }

  public async findChallenge(
    id: string,
  ): Promise<OtpChallengeRecord | undefined> {
    const result = await this.pool.query<ChallengeRow>(
      `SELECT * FROM otp_challenges WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    if (row === undefined) {
      return undefined;
    }
    return this.mapChallenge(row);
  }

  public async findLatestOpenChallengeByMobile(
    mobileNumber: string,
  ): Promise<OtpChallengeRecord | undefined> {
    const result = await this.pool.query<ChallengeRow>(
      `SELECT * FROM otp_challenges
       WHERE mobile_e164 = $1
         AND consumed_at IS NULL
         AND expires_at > now()
       ORDER BY expires_at DESC
       LIMIT 1`,
      [mobileNumber],
    );
    const row = result.rows[0];
    if (row === undefined) {
      return undefined;
    }
    return this.mapChallenge(row);
  }

  public async countChallengesSince(
    mobileNumber: string,
    since: Date,
  ): Promise<number> {
    const result = await this.pool.query<{ readonly count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM otp_challenges
       WHERE mobile_e164 = $1 AND created_at >= $2`,
      [mobileNumber, since],
    );
    return result.rows[0]?.count ?? 0;
  }

  private mapChallenge(row: ChallengeRow): OtpChallengeRecord {
    return {
      id: row.id,
      mobileNumber: row.mobile_e164,
      codeDigest: row.code_digest,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      resendAfter: row.resend_after,
      attemptsRemaining: row.attempts_remaining,
      ...(row.consumed_at === null ? {} : { consumedAt: row.consumed_at }),
    };
  }

  public async recordFailedChallengeAttempt(
    challengeId: string,
  ): Promise<OtpChallengeRecord | undefined> {
    const result = await this.pool.query<ChallengeRow>(
      `UPDATE otp_challenges
       SET attempts_remaining = attempts_remaining - 1
       WHERE id = $1
         AND consumed_at IS NULL
         AND attempts_remaining > 0
       RETURNING *`,
      [challengeId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : this.mapChallenge(row);
  }

  public async consumeChallenge(
    challengeId: string,
    consumedAt: Date,
  ): Promise<boolean> {
    const result = await this.pool.query<{ id: string }>(
      `UPDATE otp_challenges
       SET consumed_at = $2
       WHERE id = $1
         AND consumed_at IS NULL
         AND attempts_remaining > 0
         AND expires_at > $2
       RETURNING id`,
      [challengeId, consumedAt],
    );
    return result.rows[0] !== undefined;
  }

  public async findUserByMobile(
    mobileNumber: string,
  ): Promise<UserRecord | undefined> {
    const result = await this.pool.query<UserRow>(
      `SELECT * FROM app_users WHERE mobile_e164 = $1`,
      [mobileNumber],
    );
    const row = result.rows[0];
    if (row === undefined) {
      return undefined;
    }
    return this.toUserRecord(row, await this.loadRoleAssignments(row.id));
  }

  public async findUserById(id: string): Promise<UserRecord | undefined> {
    const result = await this.pool.query<UserRow>(
      `SELECT * FROM app_users WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    if (row === undefined) {
      return undefined;
    }
    return this.toUserRecord(row, await this.loadRoleAssignments(row.id));
  }

  public async createUser(
    mobileNumber: string,
    defaultRole: PlatformRole,
  ): Promise<UserRecord> {
    return this.withTransaction(async (client) => {
      const userResult = await client.query<UserRow>(
        `INSERT INTO app_users (mobile_e164, last_active_role)
         VALUES ($1, $2)
         RETURNING *`,
        [mobileNumber, defaultRole],
      );
      const row = userResult.rows[0];
      if (row === undefined) {
        throw new Error("INSERT INTO app_users returned no row");
      }
      const assignmentResult = await client.query<RoleAssignmentRow>(
        `INSERT INTO role_assignments (
           user_id, role, state, scope_type, scope_id, verified_at
         )
         VALUES ($1, $2, 'active', 'branch', $3, now())
         RETURNING role, state, scope_id, verified_at`,
        [row.id, defaultRole, DEFAULT_BRANCH_ID],
      );
      return this.toUserRecord(row, assignmentResult.rows);
    });
  }

  public async saveSession(
    session: DeviceSession,
    refreshTokenDigest: string,
  ): Promise<void> {
    await this.withTransaction(async (client) => {
      await client.query(
        `UPDATE device_sessions
         SET revoked_at = now(), version = version + 1
         WHERE user_id = $1 AND device_id = $2 AND revoked_at IS NULL`,
        [session.userId, session.deviceId],
      );
      await client.query(
        `INSERT INTO device_sessions (
           id, user_id, device_id, device_name, refresh_token_digest,
           created_at, last_seen_at, expires_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          session.id,
          session.userId,
          session.deviceId,
          null,
          refreshTokenDigest,
          session.createdAt,
          session.lastSeenAt,
          session.expiresAt,
        ],
      );
    });
  }

  public async findSessionById(id: string): Promise<DeviceSession | undefined> {
    const result = await this.pool.query<SessionRow>(
      `SELECT * FROM device_sessions WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : this.toDeviceSession(row);
  }

  public async findSessionByRefreshDigest(
    digest: string,
  ): Promise<RefreshDigestMatch | undefined> {
    const result = await this.pool.query<SessionRow>(
      `SELECT * FROM device_sessions
       WHERE refresh_token_digest = $1
          OR previous_refresh_token_digest = $1
       LIMIT 1`,
      [digest],
    );
    const row = result.rows[0];
    if (row === undefined) {
      return undefined;
    }
    return {
      record: {
        session: this.toDeviceSession(row),
        refreshTokenDigest: row.refresh_token_digest,
        ...(row.previous_refresh_token_digest === null
          ? {}
          : {
              previousRefreshTokenDigest: row.previous_refresh_token_digest,
            }),
      },
      match: row.refresh_token_digest === digest ? "current" : "previous",
    };
  }

  public async coordinateSessionRefresh(
    presentedRefreshTokenDigest: string,
    nextRefreshTokenDigest: string,
    lastSeenAt: Date,
    expiresAt: Date,
  ): Promise<CoordinatedRefreshResult> {
    const client = await this.pool.connect();
    let transactionOpen = false;
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
      transactionOpen = true;
      // Establish the transaction snapshot before contending for the row lock.
      await client.query("SELECT txid_current_snapshot()");
      const result = await client.query<SessionRow>(
        `SELECT * FROM device_sessions
         WHERE refresh_token_digest = $1
            OR previous_refresh_token_digest = $1
         LIMIT 1
         FOR UPDATE`,
        [presentedRefreshTokenDigest],
      );
      const row = result.rows[0];
      if (row === undefined) {
        await client.query("COMMIT");
        transactionOpen = false;
        return { outcome: "invalid" };
      }

      const session = this.toDeviceSession(row);
      if (row.refresh_token_digest !== presentedRefreshTokenDigest) {
        await client.query(
          `UPDATE device_sessions
           SET revoked_at = $2, version = version + 1
           WHERE id = $1 AND revoked_at IS NULL`,
          [session.id, lastSeenAt],
        );
        await client.query("COMMIT");
        transactionOpen = false;
        return { outcome: "reused", session };
      }
      if (
        session.revokedAt !== undefined ||
        Date.parse(session.expiresAt) <= lastSeenAt.getTime()
      ) {
        await client.query("COMMIT");
        transactionOpen = false;
        return { outcome: "inactive" };
      }

      const userResult = await client.query<UserRow>(
        `SELECT * FROM app_users WHERE id = $1`,
        [session.userId],
      );
      const userRow = userResult.rows[0];
      if (userRow === undefined) {
        await client.query("COMMIT");
        transactionOpen = false;
        return { outcome: "inactive" };
      }
      const user = this.toUserRecord(
        userRow,
        await this.loadRoleAssignments(userRow.id, client),
      );
      const rotated = await this.rotateSessionRefreshTokenWithExecutor(
        client,
        session.id,
        nextRefreshTokenDigest,
        presentedRefreshTokenDigest,
        lastSeenAt,
        expiresAt,
      );
      if (!rotated) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        return { outcome: "conflict" };
      }
      await client.query("COMMIT");
      transactionOpen = false;
      return { outcome: "rotated", session, user };
    } catch (error) {
      if (transactionOpen) {
        await client.query("ROLLBACK");
      }
      if (isPostgresError(error, "40001")) {
        return { outcome: "conflict" };
      }
      throw error;
    } finally {
      client.release();
    }
  }

  public async rotateSessionRefreshToken(
    sessionId: string,
    nextRefreshTokenDigest: string,
    previousRefreshTokenDigest: string,
    lastSeenAt: Date,
    expiresAt: Date,
  ): Promise<boolean> {
    return this.rotateSessionRefreshTokenWithExecutor(
      this.pool,
      sessionId,
      nextRefreshTokenDigest,
      previousRefreshTokenDigest,
      lastSeenAt,
      expiresAt,
    );
  }

  private async rotateSessionRefreshTokenWithExecutor(
    executor: Pool | PoolClient,
    sessionId: string,
    nextRefreshTokenDigest: string,
    previousRefreshTokenDigest: string,
    lastSeenAt: Date,
    expiresAt: Date,
  ): Promise<boolean> {
    const result = await executor.query<{ id: string }>(
      `UPDATE device_sessions
       SET refresh_token_digest = $2,
           previous_refresh_token_digest = $3,
           last_seen_at = $4,
           expires_at = $5,
           version = version + 1
       WHERE id = $1
         AND revoked_at IS NULL
         AND refresh_token_digest = $3
       RETURNING id`,
      [
        sessionId,
        nextRefreshTokenDigest,
        previousRefreshTokenDigest,
        lastSeenAt,
        expiresAt,
      ],
    );
    return result.rows[0] !== undefined;
  }

  public async revokeSession(
    sessionId: string,
    revokedAt: Date,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE device_sessions
       SET revoked_at = $2, version = version + 1
       WHERE id = $1 AND revoked_at IS NULL`,
      [sessionId, revokedAt],
    );
  }

  public async persistRoleSwitch(
    input: RoleSwitchPersistence,
  ): Promise<UserRecord | undefined> {
    return this.withTransaction(async (client) => {
      const result = await client.query<UserRow>(
        `UPDATE app_users
         SET last_active_role = $2,
             updated_at = now(),
             version = version + 1
         WHERE id = $1 AND version = $3
         RETURNING *`,
        [input.userId, input.role, input.expectedVersion],
      );
      const row = result.rows[0];
      if (row === undefined) {
        return undefined;
      }
      await client.query(
        `INSERT INTO audit_events (
           request_id, actor_user_id, actor_role, branch_id,
           entity_type, entity_id, action,
           before_version, after_version, reason, metadata
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          input.requestId,
          input.actorUserId,
          input.actorRole,
          null,
          "app_user",
          input.userId,
          "identity.role.switched",
          input.expectedVersion,
          row.version,
          null,
          JSON.stringify({
            fromRole: input.fromRole,
            toRole: input.toRole,
          }),
        ],
      );
      return this.toUserRecord(
        row,
        await this.loadRoleAssignments(row.id, client),
      );
    });
  }

  private async loadRoleAssignments(
    userId: string,
    executor: Pool | PoolClient = this.pool,
  ): Promise<readonly RoleAssignmentRow[]> {
    const result = await executor.query<RoleAssignmentRow>(
      `SELECT role, state, scope_id, verified_at
       FROM role_assignments
       WHERE user_id = $1`,
      [userId],
    );
    return result.rows;
  }

  private toUserRecord(
    row: UserRow,
    assignments: readonly RoleAssignmentRow[],
  ): UserRecord {
    const roles: RoleAssignment[] = assignments.map((assignment) => ({
      role: assignment.role,
      active: assignment.state === "active",
      ...(assignment.scope_id === null ? {} : { scopeId: assignment.scope_id }),
      ...(assignment.verified_at === null
        ? {}
        : { verifiedAt: assignment.verified_at.toISOString() }),
    }));
    return {
      id: row.id,
      mobileNumber: row.mobile_e164,
      roles,
      lastActiveRole: row.last_active_role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
    };
  }

  private toDeviceSession(row: SessionRow): DeviceSession {
    return {
      id: row.id,
      userId: row.user_id,
      deviceId: row.device_id,
      createdAt: row.created_at.toISOString(),
      lastSeenAt: row.last_seen_at.toISOString(),
      expiresAt: row.expires_at.toISOString(),
      ...(row.revoked_at === null
        ? {}
        : { revokedAt: row.revoked_at.toISOString() }),
    };
  }

  private async withTransaction<T>(
    work: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

function isPostgresError(error: unknown, code: string): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    error.code === code
  );
}
