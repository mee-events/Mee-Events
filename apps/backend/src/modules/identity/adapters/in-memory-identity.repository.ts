import { Injectable } from "@nestjs/common";
import type { DeviceSession, PlatformRole } from "@me-event/shared-types";
import { randomUUID } from "node:crypto";
import type { AuditEvent } from "../../audit/audit-event";
import type {
  CompleteOtpVerificationInput,
  CompleteOtpVerificationResult,
  CoordinatedRefreshResult,
  DeviceSessionRecord,
  IdentityRepository,
  OtpChallengeRecord,
  RefreshDigestMatch,
  RevokeAllSessionsInput,
  RevokeCurrentSessionInput,
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
  public readonly identityAudits: AuditEvent[] = [];
  public failNextRoleSwitchAudit = false;
  public failNextSessionAudit = false;
  private mutationQueue: Promise<unknown> = Promise.resolve();

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

  public async recordFailedChallengeAttempt(
    challengeId: string,
  ): Promise<OtpChallengeRecord | undefined> {
    const challenge = this.challenges.get(challengeId);
    if (
      challenge === undefined ||
      challenge.consumedAt !== undefined ||
      challenge.attemptsRemaining <= 0
    ) {
      return undefined;
    }
    const updated = {
      ...challenge,
      attemptsRemaining: challenge.attemptsRemaining - 1,
    };
    this.challenges.set(challengeId, updated);
    return updated;
  }

  public async consumeChallenge(
    challengeId: string,
    consumedAt: Date,
  ): Promise<boolean> {
    const challenge = this.challenges.get(challengeId);
    if (
      challenge === undefined ||
      challenge.consumedAt !== undefined ||
      challenge.attemptsRemaining <= 0 ||
      challenge.expiresAt.getTime() <= consumedAt.getTime()
    ) {
      return false;
    }
    this.challenges.set(challengeId, { ...challenge, consumedAt });
    return true;
  }

  public async completeOtpVerification(
    input: CompleteOtpVerificationInput,
  ): Promise<CompleteOtpVerificationResult> {
    return this.enqueueMutation(async () => {
      const challengeBefore = this.challenges.get(input.challengeId);
      const usersBefore = new Map(this.users);
      const sessionsBefore = new Map(
        [...this.sessions.entries()].map(
          ([id, stored]) =>
            [id, { ...stored, session: { ...stored.session } }] as const,
        ),
      );
      try {
        const consumed = await this.consumeChallenge(
          input.challengeId,
          input.now,
        );
        if (!consumed) {
          return { outcome: "invalid" };
        }
        const challenge = this.challenges.get(input.challengeId);
        if (challenge === undefined) {
          return { outcome: "invalid" };
        }

        const existingUser = await this.findUserByMobile(
          challenge.mobileNumber,
        );
        const created = existingUser === undefined;
        const user =
          existingUser ??
          (await this.createUser(challenge.mobileNumber, input.defaultRole));

        const session: DeviceSession = {
          id: input.sessionId,
          userId: user.id,
          deviceId: input.deviceId,
          createdAt: input.now.toISOString(),
          lastSeenAt: input.now.toISOString(),
          expiresAt: input.expiresAt.toISOString(),
        };
        this.persistSession(session, input.refreshTokenDigest, input.now);

        const pendingAudits: AuditEvent[] = [];
        if (created) {
          pendingAudits.push({
            requestId: input.requestId,
            actorUserId: user.id,
            actorRole: user.lastActiveRole,
            entityType: "app_user",
            entityId: user.id,
            action: "identity.user.created",
            afterVersion: user.version,
          });
        }
        pendingAudits.push({
          requestId: input.requestId,
          actorUserId: user.id,
          actorRole: user.lastActiveRole,
          entityType: "device_session",
          entityId: session.id,
          action: "identity.session.created",
          afterVersion: 1,
        });
        this.commitSessionAudits(pendingAudits);
        return { outcome: "completed", user, session };
      } catch (error) {
        if (challengeBefore !== undefined) {
          this.challenges.set(input.challengeId, challengeBefore);
        }
        this.users.clear();
        for (const [mobileNumber, user] of usersBefore) {
          this.users.set(mobileNumber, user);
        }
        this.sessions.clear();
        for (const [id, stored] of sessionsBefore) {
          this.sessions.set(id, stored);
        }
        throw error;
      }
    });
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
    this.persistSession(session, refreshTokenDigest, new Date());
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

  public async listSessionsForUser(
    userId: string,
  ): Promise<readonly DeviceSession[]> {
    return [...this.sessions.values()]
      .filter(
        (stored) =>
          stored.session.userId === userId &&
          stored.session.revokedAt === undefined,
      )
      .map((stored) => stored.session)
      .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
  }

  public async coordinateSessionRefresh(
    presentedRefreshTokenDigest: string,
    nextRefreshTokenDigest: string,
    lastSeenAt: Date,
    expiresAt: Date,
    requestId: string,
  ): Promise<CoordinatedRefreshResult> {
    const found = await this.findSessionByRefreshDigest(
      presentedRefreshTokenDigest,
    );
    if (found === undefined) {
      return { outcome: "invalid" };
    }
    const { session } = found.record;
    if (found.match === "previous") {
      const before = this.sessions.get(session.id);
      await this.revokeSession(session.id, lastSeenAt);
      try {
        this.commitSessionAudits([
          {
            requestId,
            actorUserId: session.userId,
            entityType: "device_session",
            entityId: session.id,
            action: "identity.session.revoked",
            reason: "refresh-token-reuse",
          },
        ]);
      } catch (error) {
        if (before !== undefined) {
          this.sessions.set(session.id, before);
        }
        throw error;
      }
      return { outcome: "reused", session };
    }
    if (
      session.revokedAt !== undefined ||
      Date.parse(session.expiresAt) <= lastSeenAt.getTime()
    ) {
      return { outcome: "inactive" };
    }
    const user = await this.findUserById(session.userId);
    if (user === undefined) {
      return { outcome: "inactive" };
    }
    const beforeRotate = this.sessions.get(session.id);
    const rotated = await this.rotateSessionRefreshToken(
      session.id,
      nextRefreshTokenDigest,
      presentedRefreshTokenDigest,
      lastSeenAt,
      expiresAt,
    );
    if (!rotated) {
      return { outcome: "conflict" };
    }
    try {
      this.commitSessionAudits([
        {
          requestId,
          actorUserId: user.id,
          actorRole: user.lastActiveRole,
          entityType: "device_session",
          entityId: session.id,
          action: "identity.session.rotated",
        },
      ]);
    } catch (error) {
      if (beforeRotate !== undefined) {
        this.sessions.set(session.id, beforeRotate);
      }
      throw error;
    }
    return { outcome: "rotated", session, user };
  }

  public async rotateSessionRefreshToken(
    sessionId: string,
    nextRefreshTokenDigest: string,
    previousRefreshTokenDigest: string,
    lastSeenAt: Date,
    expiresAt: Date,
  ): Promise<boolean> {
    const stored = this.sessions.get(sessionId);
    if (
      stored === undefined ||
      stored.session.revokedAt !== undefined ||
      stored.digest !== previousRefreshTokenDigest
    ) {
      return false;
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
    return true;
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

  public async revokeCurrentSession(
    input: RevokeCurrentSessionInput,
  ): Promise<void> {
    const stored = this.sessions.get(input.sessionId);
    if (
      stored === undefined ||
      stored.session.userId !== input.userId ||
      stored.session.revokedAt !== undefined
    ) {
      return;
    }
    const before = stored;
    await this.revokeSession(input.sessionId, input.revokedAt);
    try {
      this.commitSessionAudits([
        {
          requestId: input.requestId,
          actorUserId: input.userId,
          actorRole: input.actorRole,
          entityType: "device_session",
          entityId: input.sessionId,
          action: "identity.session.revoked",
          reason: "logout",
        },
      ]);
    } catch (error) {
      this.sessions.set(input.sessionId, before);
      throw error;
    }
  }

  public async revokeAllSessionsForUser(
    input: RevokeAllSessionsInput,
  ): Promise<number> {
    const snapshot = [...this.sessions.entries()].map(
      ([id, stored]) =>
        [id, { ...stored, session: { ...stored.session } }] as const,
    );
    let revokedCount = 0;
    for (const stored of this.sessions.values()) {
      if (
        stored.session.userId === input.userId &&
        stored.session.revokedAt === undefined
      ) {
        stored.session = {
          ...stored.session,
          revokedAt: input.revokedAt.toISOString(),
        };
        revokedCount += 1;
      }
    }
    try {
      this.commitSessionAudits([
        {
          requestId: input.requestId,
          actorUserId: input.userId,
          actorRole: input.actorRole,
          entityType: "app_user",
          entityId: input.userId,
          action: "identity.sessions.revoked",
          reason: "logout-all",
          metadata: { revokedCount },
        },
      ]);
    } catch (error) {
      this.sessions.clear();
      for (const [id, stored] of snapshot) {
        this.sessions.set(id, stored);
      }
      throw error;
    }
    return revokedCount;
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

  private enqueueMutation<T>(work: () => Promise<T>): Promise<T> {
    const run = this.mutationQueue.then(work, work);
    this.mutationQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private persistSession(
    session: DeviceSession,
    refreshTokenDigest: string,
    revokedAt: Date,
  ): void {
    for (const [id, stored] of this.sessions) {
      if (
        stored.session.userId === session.userId &&
        stored.session.deviceId === session.deviceId &&
        stored.session.revokedAt === undefined &&
        id !== session.id
      ) {
        this.sessions.set(id, {
          ...stored,
          session: {
            ...stored.session,
            revokedAt: revokedAt.toISOString(),
          },
        });
      }
    }
    this.sessions.set(session.id, { session, digest: refreshTokenDigest });
  }

  private commitSessionAudits(events: readonly AuditEvent[]): void {
    if (this.failNextSessionAudit) {
      this.failNextSessionAudit = false;
      throw new Error("audit insert failed");
    }
    this.identityAudits.push(...events);
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
