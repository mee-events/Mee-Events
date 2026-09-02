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

export interface ReplaceOtpChallengeInput {
  readonly challenge: OtpChallengeRecord;
  readonly now: Date;
  readonly requestWindowStartsAt: Date;
  readonly maxRequests: number;
}

export type ReplaceOtpChallengeResult =
  | { readonly outcome: "created" }
  | { readonly outcome: "cooldown"; readonly retryAfterSeconds: number }
  | { readonly outcome: "request-limit" };

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

export interface CompleteOtpVerificationInput {
  readonly challengeId: string;
  readonly deviceId: string;
  readonly sessionId: string;
  readonly refreshTokenDigest: string;
  readonly now: Date;
  readonly expiresAt: Date;
  readonly requestId: string;
  readonly defaultRole: PlatformRole;
}

export type CompleteOtpVerificationResult =
  | { readonly outcome: "invalid" }
  | {
      readonly outcome: "completed";
      readonly user: UserRecord;
      readonly session: DeviceSession;
    };

export interface RevokeCurrentSessionInput {
  readonly sessionId: string;
  readonly userId: string;
  readonly revokedAt: Date;
  readonly requestId: string;
  readonly actorRole: string;
}

export interface RevokeAllSessionsInput {
  readonly userId: string;
  readonly revokedAt: Date;
  readonly requestId: string;
  readonly actorRole: string;
}

export interface IdentityRepository {
  saveChallenge(challenge: OtpChallengeRecord): Promise<void>;
  replaceOtpChallenge(
    input: ReplaceOtpChallengeInput,
  ): Promise<ReplaceOtpChallengeResult>;
  invalidateChallenge(
    challengeId: string,
    invalidatedAt: Date,
  ): Promise<boolean>;
  findChallenge(id: string): Promise<OtpChallengeRecord | undefined>;
  findLatestOpenChallengeByMobile(
    mobileNumber: string,
  ): Promise<OtpChallengeRecord | undefined>;
  countChallengesSince(mobileNumber: string, since: Date): Promise<number>;
  recordFailedChallengeAttempt(
    challengeId: string,
  ): Promise<OtpChallengeRecord | undefined>;
  consumeChallenge(challengeId: string, consumedAt: Date): Promise<boolean>;
  completeOtpVerification(
    input: CompleteOtpVerificationInput,
  ): Promise<CompleteOtpVerificationResult>;
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
  listSessionsForUser(userId: string): Promise<readonly DeviceSession[]>;
  coordinateSessionRefresh(
    presentedRefreshTokenDigest: string,
    nextRefreshTokenDigest: string,
    lastSeenAt: Date,
    expiresAt: Date,
    requestId: string,
  ): Promise<CoordinatedRefreshResult>;
  rotateSessionRefreshToken(
    sessionId: string,
    nextRefreshTokenDigest: string,
    previousRefreshTokenDigest: string,
    lastSeenAt: Date,
    expiresAt: Date,
  ): Promise<boolean>;
  revokeSession(sessionId: string, revokedAt: Date): Promise<void>;
  revokeCurrentSession(input: RevokeCurrentSessionInput): Promise<void>;
  revokeAllSessionsForUser(input: RevokeAllSessionsInput): Promise<number>;
  persistRoleSwitch(
    input: RoleSwitchPersistence,
  ): Promise<UserRecord | undefined>;
}
