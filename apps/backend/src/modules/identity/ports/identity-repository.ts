import type { DeviceSession, PlatformRole } from "@me-event/shared-types";
import type { UserRecord } from "../domain/user";

export interface OtpChallengeRecord {
  readonly id: string;
  readonly mobileNumber: string;
  readonly codeDigest: string;
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

export const IDENTITY_REPOSITORY = Symbol("IDENTITY_REPOSITORY");

export interface IdentityRepository {
  saveChallenge(challenge: OtpChallengeRecord): Promise<void>;
  findChallenge(id: string): Promise<OtpChallengeRecord | undefined>;
  updateChallenge(challenge: OtpChallengeRecord): Promise<void>;
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
  rotateSessionRefreshToken(
    sessionId: string,
    nextRefreshTokenDigest: string,
    previousRefreshTokenDigest: string,
    lastSeenAt: Date,
    expiresAt: Date,
  ): Promise<void>;
  revokeSession(sessionId: string, revokedAt: Date): Promise<void>;
}
