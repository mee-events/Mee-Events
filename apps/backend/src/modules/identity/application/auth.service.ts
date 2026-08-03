import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type {
  LogoutResponse,
  RefreshSessionRequest,
  RefreshSessionResponse,
  RequestOtpRequest,
  RequestOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from "@me-event/api-contracts";
import type { DeviceSession } from "@me-event/shared-types";
import {
  createHmac,
  randomInt,
  randomUUID,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { DomainError } from "../../../common/errors/domain.error";
import { AUDIT_SINK, type AuditSink } from "../../audit/audit-event";
import { authPrincipalCache } from "../../platform-foundation/security/auth-principal-cache";
import { normalizeMobileNumber } from "../domain/phone-number";
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from "../ports/identity-repository";
import { OTP_PROVIDER, type OtpProvider } from "../ports/otp-provider";

const OTP_TTL_SECONDS = 300;
const RESEND_AFTER_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const ACCESS_TOKEN_TTL_SECONDS = 900;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  public constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly repository: IdentityRepository,
    @Inject(OTP_PROVIDER) private readonly otpProvider: OtpProvider,
    @Inject(AUDIT_SINK) private readonly audit: AuditSink,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  public async requestOtp(
    request: RequestOtpRequest,
  ): Promise<RequestOtpResponse> {
    const mobileNumber = normalizeMobileNumber(
      request.mobileNumber,
      request.countryCode,
    );
    const code = randomInt(100000, 1000000).toString();
    const challengeId = randomUUID();
    const now = Date.now();
    const codeDigest = this.digest(`${challengeId}:${code}`, "OTP_HMAC_SECRET");

    await this.repository.saveChallenge({
      id: challengeId,
      mobileNumber,
      codeDigest,
      expiresAt: new Date(now + OTP_TTL_SECONDS * 1000),
      resendAfter: new Date(now + RESEND_AFTER_SECONDS * 1000),
      attemptsRemaining: MAX_ATTEMPTS,
    });
    await this.otpProvider.sendCode(mobileNumber, code);

    const isLocalDev =
      this.config.getOrThrow<string>("APP_ENV") === "development" &&
      this.config.getOrThrow<string>("OTP_PROVIDER") === "local";

    return {
      challengeId,
      expiresInSeconds: OTP_TTL_SECONDS,
      resendAfterSeconds: RESEND_AFTER_SECONDS,
      ...(isLocalDev ? { debugCode: code } : {}),
    };
  }

  public async verifyOtp(
    request: VerifyOtpRequest,
    requestId: string = randomUUID(),
  ): Promise<VerifyOtpResponse> {
    const challenge = await this.repository.findChallenge(request.challengeId);
    if (challenge === undefined || challenge.consumedAt !== undefined) {
      throw new DomainError(
        "OTP_CHALLENGE_INVALID",
        "OTP challenge is invalid",
        401,
      );
    }
    if (challenge.expiresAt.getTime() <= Date.now()) {
      throw new DomainError("OTP_EXPIRED", "OTP has expired", 401);
    }
    if (challenge.attemptsRemaining <= 0) {
      throw new DomainError(
        "OTP_ATTEMPTS_EXHAUSTED",
        "OTP attempts exhausted",
        429,
      );
    }

    const expected = Buffer.from(challenge.codeDigest, "hex");
    const actual = Buffer.from(
      this.digest(`${challenge.id}:${request.code}`, "OTP_HMAC_SECRET"),
      "hex",
    );
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      await this.repository.updateChallenge({
        ...challenge,
        attemptsRemaining: challenge.attemptsRemaining - 1,
      });
      throw new DomainError("OTP_INCORRECT", "OTP is incorrect", 401);
    }

    await this.repository.updateChallenge({
      ...challenge,
      consumedAt: new Date(),
    });
    const existingUser = await this.repository.findUserByMobile(
      challenge.mobileNumber,
    );
    const user =
      existingUser ??
      (await this.repository.createUser(challenge.mobileNumber, "customer"));
    if (existingUser === undefined) {
      await this.audit.append({
        requestId,
        actorUserId: user.id,
        actorRole: user.lastActiveRole,
        entityType: "app_user",
        entityId: user.id,
        action: "identity.user.created",
        afterVersion: user.version,
      });
    }

    const refreshToken = randomBytes(48).toString("base64url");
    const now = new Date();
    const session: DeviceSession = {
      id: randomUUID(),
      userId: user.id,
      deviceId: request.deviceId,
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    };
    await this.repository.saveSession(
      session,
      this.digest(refreshToken, "REFRESH_TOKEN_HMAC_SECRET"),
    );
    await this.audit.append({
      requestId,
      actorUserId: user.id,
      actorRole: user.lastActiveRole,
      entityType: "device_session",
      entityId: session.id,
      action: "identity.session.created",
      afterVersion: 1,
    });

    const accessToken = await this.signAccessToken(
      user.id,
      session.id,
      user.lastActiveRole,
    );
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        roles: user.roles,
        lastActiveRole: user.lastActiveRole,
      },
    };
  }

  public async refreshSession(
    request: RefreshSessionRequest,
    requestId: string = randomUUID(),
  ): Promise<RefreshSessionResponse> {
    const presentedDigest = this.digest(
      request.refreshToken,
      "REFRESH_TOKEN_HMAC_SECRET",
    );
    const found =
      await this.repository.findSessionByRefreshDigest(presentedDigest);
    if (found === undefined) {
      throw new DomainError(
        "SESSION_REFRESH_INVALID",
        "Refresh token is invalid",
        401,
      );
    }

    const session = found.record.session;
    if (found.match === "previous") {
      // A rotated token was presented again: assume theft and kill the session.
      await this.repository.revokeSession(session.id, new Date());
      authPrincipalCache.invalidateSession(session.id);
      await this.audit.append({
        requestId,
        actorUserId: session.userId,
        entityType: "device_session",
        entityId: session.id,
        action: "identity.session.revoked",
        reason: "refresh-token-reuse",
      });
      throw new DomainError(
        "SESSION_REFRESH_REUSED",
        "Refresh token reuse detected; session revoked",
        401,
      );
    }

    if (
      session.revokedAt !== undefined ||
      Date.parse(session.expiresAt) <= Date.now()
    ) {
      throw new DomainError("SESSION_NOT_ACTIVE", "Session is not active", 401);
    }

    const user = await this.repository.findUserById(session.userId);
    if (user === undefined) {
      throw new DomainError("SESSION_NOT_ACTIVE", "Session is not active", 401);
    }

    const nextRefreshToken = randomBytes(48).toString("base64url");
    const now = new Date();
    await this.repository.rotateSessionRefreshToken(
      session.id,
      this.digest(nextRefreshToken, "REFRESH_TOKEN_HMAC_SECRET"),
      presentedDigest,
      now,
      new Date(now.getTime() + SESSION_TTL_MS),
    );
    await this.audit.append({
      requestId,
      actorUserId: user.id,
      actorRole: user.lastActiveRole,
      entityType: "device_session",
      entityId: session.id,
      action: "identity.session.rotated",
    });

    const accessToken = await this.signAccessToken(
      user.id,
      session.id,
      user.lastActiveRole,
    );
    return {
      accessToken,
      refreshToken: nextRefreshToken,
      accessTokenExpiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  public async logout(
    userId: string,
    sessionId: string,
    activeRole: string,
    requestId: string = randomUUID(),
  ): Promise<LogoutResponse> {
    await this.repository.revokeSession(sessionId, new Date());
    authPrincipalCache.invalidateSession(sessionId);
    await this.audit.append({
      requestId,
      actorUserId: userId,
      actorRole: activeRole,
      entityType: "device_session",
      entityId: sessionId,
      action: "identity.session.revoked",
      reason: "logout",
    });
    return { revoked: true };
  }

  private signAccessToken(
    userId: string,
    sessionId: string,
    role: string,
  ): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, sid: sessionId, role },
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    );
  }

  private digest(value: string, secretName: string): string {
    const secret = this.config.getOrThrow<string>(secretName);
    return createHmac("sha256", secret).update(value).digest("hex");
  }
}
