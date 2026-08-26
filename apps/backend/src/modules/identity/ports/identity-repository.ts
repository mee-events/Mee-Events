import type { DeviceSession, PlatformRole } from "@me-event/shared-types";
import type { UserRecord } from "../domain/user";

export interface OtpChallengeRecord {
  readonly id: string;
  readonly mobileNumber: string;
  readonly codeDigest: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly resendAfter: Date;
  readonly attemptsRemaining: number;
  readonly consumedAt?: Date;
}

export interface DeviceSessionRecord {
  readonly session: DeviceSession;
  readonly refreshTokenDigest: string;
  readonly previousRefreshTokenDigest?: string;
}

export interface RefreshDigestMatch {
  readonly record: DeviceSessionRecord;
  readonly match: "current" | "previous";
}

export type CoordinatedRefreshResult =
  | { readonly outcome: "invalid" }
  | { readonly outcome: "inactive" }
  | { readonly outcome: "conflict" }
  | { readonly outcome: "reused"; readonly session: DeviceSession }
  | {
      readonly outcome: "rotated";
      readonly session: DeviceSession;
      readonly user: UserRecord;
    };

export const IDENTITY_REPOSITORY = Symbol("IDENTITY_REPOSITORY");

export interface RoleSwitchPersistence {
  readonly userId: string;
  readonly role: PlatformRole;
  readonly expectedVersion: number;
  readonly requestId: string;
  readonly actorUserId: string;
  readonly actorRole: PlatformRole;
  readonly fromRole: PlatformRole;
  readonly toRole: PlatformRole;
}

export interface IdentityRepository {
  saveChallenge(challenge: OtpChallengeRecord): Promise<void>;
  findChallenge(id: string): Promise<OtpChallengeRecord | undefined>;
  findLatestOpenChallengeByMobile(
    mobileNumber: string,
  ): Promise<OtpChallengeRecord | undefined>;
  countChallengesSince(mobileNumber: string, since: Date): Promise<number>;
  recordFailedChallengeAttempt(
    challengeId: string,
  ): Promise<OtpChallengeRecord | undefined>;
  consumeChallenge(challengeId: string, consumedAt: Date): Promise<boolean>;
  findUserByMobile(mobileNumber: string): Promise<UserRecord | undefined>;
  findUserById(id: string): Promise<UserRecord | undefined>;
  createUser(
    mobileNumber: string,
    defaultRole: PlatformRole,
  ): Promise<UserRecord>;
  saveSession(
    session: DeviceSession,
    refreshTokenDigest: string,
  ): Promise<void>;
  findSessionById(id: string): Promise<DeviceSession | undefined>;
  findSessionByRefreshDigest(
    digest: string,
  ): Promise<RefreshDigestMatch | undefined>;
  coordinateSessionRefresh(
    presentedRefreshTokenDigest: string,
    nextRefreshTokenDigest: string,
    lastSeenAt: Date,
    expiresAt: Date,
  ): Promise<CoordinatedRefreshResult>;
  rotateSessionRefreshToken(
    sessionId: string,
    nextRefreshTokenDigest: string,
    previousRefreshTokenDigest: string,
    lastSeenAt: Date,
    expiresAt: Date,
  ): Promise<boolean>;
  revokeSession(sessionId: string, revokedAt: Date): Promise<void>;
  persistRoleSwitch(
    input: RoleSwitchPersistence,
  ): Promise<UserRecord | undefined>;
}
