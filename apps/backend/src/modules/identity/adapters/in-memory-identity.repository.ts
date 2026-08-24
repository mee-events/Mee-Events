import { Injectable } from "@nestjs/common";
import type { DeviceSession, PlatformRole } from "@me-event/shared-types";
import { randomUUID } from "node:crypto";
import type { AuditEvent } from "../../audit/audit-event";
import type {
  DeviceSessionRecord,
  IdentityRepository,
  OtpChallengeRecord,
  RefreshDigestMatch,
  RoleSwitchPersistence,
} from "../ports/identity-repository";
import type { UserRecord } from "../domain/user";

interface StoredSession {
  session: DeviceSession;
  digest: string;
  previousDigest?: string;
}

@Injectable()
export class InMemoryIdentityRepository implements IdentityRepository {
  private readonly challenges = new Map<string, OtpChallengeRecord>();
  private readonly users = new Map<string, UserRecord>();
  private readonly sessions = new Map<string, StoredSession>();
  public readonly roleSwitchAudits: AuditEvent[] = [];
  public failNextRoleSwitchAudit = false;

  public async saveChallenge(challenge: OtpChallengeRecord): Promise<void> {
    this.challenges.set(challenge.id, challenge);
  }

  public async findChallenge(
    id: string,
  ): Promise<OtpChallengeRecord | undefined> {
    return this.challenges.get(id);
  }

  public async findLatestOpenChallengeByMobile(
    mobileNumber: string,
  ): Promise<OtpChallengeRecord | undefined> {
    const now = Date.now();
    let latest: OtpChallengeRecord | undefined;
    for (const challenge of this.challenges.values()) {
      if (challenge.mobileNumber !== mobileNumber) {
        continue;
      }
      if (challenge.consumedAt !== undefined) {
        continue;
      }
      if (challenge.expiresAt.getTime() <= now) {
        continue;
      }
      if (
        latest === undefined ||
        challenge.expiresAt.getTime() > latest.expiresAt.getTime()
      ) {
        latest = challenge;
      }
    }
    return latest;
  }

  public async countChallengesSince(
    mobileNumber: string,
    since: Date,
  ): Promise<number> {
    let count = 0;
    for (const challenge of this.challenges.values()) {
      if (
        challenge.mobileNumber === mobileNumber &&
        challenge.createdAt.getTime() >= since.getTime()
      ) {
        count += 1;
      }
    }
    return count;
  }

  public async updateChallenge(challenge: OtpChallengeRecord): Promise<void> {
    this.challenges.set(challenge.id, challenge);
  }

  public async findUserByMobile(
    mobileNumber: string,
  ): Promise<UserRecord | undefined> {
    return this.users.get(mobileNumber);
  }

  public async findUserById(id: string): Promise<UserRecord | undefined> {
    return [...this.users.values()].find((user) => user.id === id);
  }

  public async createUser(
    mobileNumber: string,
    defaultRole: PlatformRole,
  ): Promise<UserRecord> {
    const now = new Date();
    const user: UserRecord = {
      id: randomUUID(),
      mobileNumber,
      roles: [
        { role: defaultRole, active: true, verifiedAt: now.toISOString() },
      ],
      lastActiveRole: defaultRole,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    this.users.set(mobileNumber, user);
    return user;
  }

  public replaceUser(user: UserRecord): void {
    this.users.set(user.mobileNumber, user);
  }

  public sessionCount(): number {
    return this.sessions.size;
  }

  public async saveSession(
    session: DeviceSession,
    refreshTokenDigest: string,
  ): Promise<void> {
    this.sessions.set(session.id, { session, digest: refreshTokenDigest });
  }

  public async findSessionById(id: string): Promise<DeviceSession | undefined> {
    return this.sessions.get(id)?.session;
  }

  public async findSessionByRefreshDigest(
    digest: string,
  ): Promise<RefreshDigestMatch | undefined> {
    for (const stored of this.sessions.values()) {
      if (stored.digest === digest) {
        return { record: this.toRecord(stored), match: "current" };
      }
      if (stored.previousDigest === digest) {
        return { record: this.toRecord(stored), match: "previous" };
      }
    }
    return undefined;
  }

  public async rotateSessionRefreshToken(
    sessionId: string,
    nextRefreshTokenDigest: string,
    previousRefreshTokenDigest: string,
    lastSeenAt: Date,
    expiresAt: Date,
  ): Promise<void> {
    const stored = this.sessions.get(sessionId);
    if (stored === undefined) {
      return;
    }
    this.sessions.set(sessionId, {
      session: {
        ...stored.session,
        lastSeenAt: lastSeenAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
      digest: nextRefreshTokenDigest,
      previousDigest: previousRefreshTokenDigest,
    });
  }

  public async revokeSession(
    sessionId: string,
    revokedAt: Date,
  ): Promise<void> {
    const stored = this.sessions.get(sessionId);
    if (stored === undefined || stored.session.revokedAt !== undefined) {
      return;
    }
    this.sessions.set(sessionId, {
      ...stored,
      session: { ...stored.session, revokedAt: revokedAt.toISOString() },
    });
  }

  public async persistRoleSwitch(
    input: RoleSwitchPersistence,
  ): Promise<UserRecord | undefined> {
    const current = [...this.users.values()].find(
      (user) => user.id === input.userId,
    );
    if (current === undefined || current.version !== input.expectedVersion) {
      return undefined;
    }
    const next: UserRecord = {
      ...current,
      lastActiveRole: input.role,
      updatedAt: new Date(),
      version: current.version + 1,
    };
    this.users.set(current.mobileNumber, next);
    try {
      if (this.failNextRoleSwitchAudit) {
        this.failNextRoleSwitchAudit = false;
        throw new Error("audit insert failed");
      }
      this.roleSwitchAudits.push({
        requestId: input.requestId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        entityType: "app_user",
        entityId: input.userId,
        action: "identity.role.switched",
        beforeVersion: input.expectedVersion,
        afterVersion: next.version,
        metadata: {
          fromRole: input.fromRole,
          toRole: input.toRole,
        },
      });
      return next;
    } catch (error) {
      this.users.set(current.mobileNumber, current);
      throw error;
    }
  }

  private toRecord(stored: StoredSession): DeviceSessionRecord {
    return {
      session: stored.session,
      refreshTokenDigest: stored.digest,
      ...(stored.previousDigest === undefined
        ? {}
        : { previousRefreshTokenDigest: stored.previousDigest }),
    };
  }
}
