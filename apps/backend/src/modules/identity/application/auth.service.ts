import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type {
  ListSessionsResponse,
  LogoutAllResponse,
  LogoutResponse,
  MobileSwitchableRole,
  RefreshSessionRequest,
  RefreshSessionResponse,
  RequestOtpRequest,
  RequestOtpResponse,
  SwitchRoleResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from "@me-event/api-contracts";
import {
  createHmac,
  randomInt,
  randomUUID,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { DomainError } from "../../../common/errors/domain.error";
import { authPrincipalCache } from "../../platform-foundation/security/auth-principal-cache";
import { normalizeMobileNumber } from "../domain/phone-number";
import { assertActiveAssignment, isMobileSwitchableRole } from "../domain/user";
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from "../ports/identity-repository";
import { OTP_PROVIDER, type OtpProvider } from "../ports/otp-provider";

const OTP_TTL_SECONDS = 300;
const RESEND_AFTER_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const OTP_REQUEST_WINDOW_MS = 60 * 60 * 1000;
const MAX_OTP_REQUESTS_PER_WINDOW = 5;
const ACCESS_TOKEN_TTL_SECONDS = 900;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly otpRequestsInFlight = new Set<string>();

  private readonly refreshDigestsInFlight = new Set<string>();

  public constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly repository: IdentityRepository,
    @Inject(OTP_PROVIDER) private readonly otpProvider: OtpProvider,
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
    if (this.otpRequestsInFlight.has(mobileNumber)) {
      throw new DomainError(
        "OTP_REQUEST_IN_PROGRESS",
        "An OTP request is already in progress. Try again shortly",
        429,
      );
    }
    this.otpRequestsInFlight.add(mobileNumber);
    try {
      return await this.createOtpChallenge(mobileNumber);
    } finally {
      this.otpRequestsInFlight.delete(mobileNumber);
    }
  }

  private async createOtpChallenge(
    mobileNumber: string,
  ): Promise<RequestOtpResponse> {
    const now = new Date();
    const nowMs = now.getTime();
    const code = randomInt(100000, 1000000).toString();
    const challengeId = randomUUID();
    const replacement = await this.repository.replaceOtpChallenge({
      challenge: {
        id: challengeId,
        mobileNumber,
        codeDigest: this.digest(`${challengeId}:${code}`, "OTP_HMAC_SECRET"),
        createdAt: now,
        expiresAt: new Date(nowMs + OTP_TTL_SECONDS * 1000),
        resendAfter: new Date(nowMs + RESEND_AFTER_SECONDS * 1000),
        attemptsRemaining: MAX_ATTEMPTS,
      },
      now,
      requestWindowStartsAt: new Date(nowMs - OTP_REQUEST_WINDOW_MS),
      maxRequests: MAX_OTP_REQUESTS_PER_WINDOW,
    });
    if (replacement.outcome === "cooldown") {
      throw new DomainError(
        "OTP_RESEND_COOLDOWN",
        `Wait ${String(replacement.retryAfterSeconds)} seconds before requesting another OTP`,
        429,
      );
    }
    if (replacement.outcome === "request-limit") {
      throw new DomainError(
        "OTP_REQUEST_LIMIT",
        "Too many OTP requests. Try again later",
        429,
      );
    }

    try {
      await this.otpProvider.sendCode(mobileNumber, code);
    } catch {
      try {
        await this.repository.invalidateChallenge(challengeId, new Date());
      } catch {
        // Preserve the privacy-safe provider error if exact cleanup is
        // unavailable. The failed request still counts toward abuse limits.
      }
      throw new DomainError(
        "OTP_DELIVERY_UNAVAILABLE",
        "We could not send a code right now. Try again later",
        503,
      );
    }

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
    requestId?: string,
  ): Promise<VerifyOtpResponse> {
    const auditRequestId = requestId ?? randomUUID();
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
      const updated = await this.repository.recordFailedChallengeAttempt(
        challenge.id,
      );
      if (updated === undefined) {
        const current = await this.repository.findChallenge(challenge.id);
        if (current?.attemptsRemaining === 0) {
          throw new DomainError(
            "OTP_ATTEMPTS_EXHAUSTED",
            "OTP attempts exhausted",
            429,
          );
        }
        throw new DomainError(
          "OTP_CHALLENGE_INVALID",
          "OTP challenge is invalid",
          401,
        );
      }
      if (updated.attemptsRemaining === 0) {
        throw new DomainError(
          "OTP_ATTEMPTS_EXHAUSTED",
          "OTP attempts exhausted",
          429,
        );
      }
      throw new DomainError("OTP_INCORRECT", "OTP is incorrect", 401);
    }

    const refreshToken = randomBytes(48).toString("base64url");
    const now = new Date();
    const completed = await this.repository.completeOtpVerification({
      challengeId: challenge.id,
      deviceId: request.deviceId,
      sessionId: randomUUID(),
      refreshTokenDigest: this.digest(
        refreshToken,
        "REFRESH_TOKEN_HMAC_SECRET",
      ),
      now,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      requestId: auditRequestId,
      defaultRole: "customer",
    });
    if (completed.outcome === "invalid") {
      throw new DomainError(
        "OTP_CHALLENGE_INVALID",
        "OTP challenge is invalid",
        401,
      );
    }
    const { user, session } = completed;

    const accessToken = await this.signAccessToken(
      user.id,
      session.id,
      user.lastActiveRole,
    );
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
      sessionId: session.id,
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
    requestId?: string,
  ): Promise<RefreshSessionResponse> {
    const auditRequestId = requestId ?? randomUUID();
    const presentedDigest = this.digest(
      request.refreshToken,
      "REFRESH_TOKEN_HMAC_SECRET",
    );
    if (this.refreshDigestsInFlight.has(presentedDigest)) {
      throw new DomainError(
        "SESSION_REFRESH_CONFLICT",
        "We couldn't check your session. Please try again.",
        409,
      );
    }
    this.refreshDigestsInFlight.add(presentedDigest);
    try {
      const nextRefreshToken = randomBytes(48).toString("base64url");
      const now = new Date();
      const result = await this.repository.coordinateSessionRefresh(
        presentedDigest,
        this.digest(nextRefreshToken, "REFRESH_TOKEN_HMAC_SECRET"),
        now,
        new Date(now.getTime() + SESSION_TTL_MS),
        auditRequestId,
      );
      if (result.outcome === "invalid") {
        throw new DomainError(
          "SESSION_REFRESH_INVALID",
          "Your session has ended. Please sign in again.",
          401,
        );
      }

      if (result.outcome === "reused") {
        const session = result.session;
        authPrincipalCache.invalidateSession(session.id);
        throw new DomainError(
          "SESSION_REFRESH_REUSED",
          "Your session has ended. Please sign in again.",
          401,
        );
      }
      if (result.outcome === "inactive") {
        throw new DomainError(
          "SESSION_NOT_ACTIVE",
          "Your session has ended. Please sign in again.",
          401,
        );
      }
      if (result.outcome === "conflict") {
        throw new DomainError(
          "SESSION_REFRESH_CONFLICT",
          "We couldn't check your session. Please try again.",
          409,
        );
      }
      const { session, user } = result;

      const accessToken = await this.signAccessToken(
        user.id,
        session.id,
        user.lastActiveRole,
      );
      return {
        accessToken,
        refreshToken: nextRefreshToken,
        accessTokenExpiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
        sessionId: session.id,
        activeRole: user.lastActiveRole,
      };
    } finally {
      this.refreshDigestsInFlight.delete(presentedDigest);
    }
  }

  public async switchRole(
    userId: string,
    sessionId: string,
    role: MobileSwitchableRole,
    requestId?: string,
  ): Promise<SwitchRoleResponse> {
    if (!isMobileSwitchableRole(role)) {
      throw new DomainError(
        "ROLE_NOT_ASSIGNED",
        "Role is not switchable on mobile",
        403,
      );
    }
    const [user, session] = await Promise.all([
      this.repository.findUserById(userId),
      this.repository.findSessionById(sessionId),
    ]);
    if (
      user === undefined ||
      session === undefined ||
      session.userId !== user.id ||
      session.revokedAt !== undefined ||
      Date.parse(session.expiresAt) <= Date.now()
    ) {
      throw new DomainError(
        "SESSION_NOT_ACTIVE",
        "Your session has ended. Please sign in again.",
        401,
      );
    }
    assertActiveAssignment(user, role);
    if (user.lastActiveRole === role) {
      const accessToken = await this.signAccessToken(user.id, session.id, role);
      return {
        accessToken,
        accessTokenExpiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
        sessionId: session.id,
        activeRole: role,
      };
    }
    const fromRole = user.lastActiveRole;
    const updated = await this.repository.persistRoleSwitch({
      userId: user.id,
      role,
      expectedVersion: user.version,
      requestId: requestId ?? randomUUID(),
      actorUserId: user.id,
      actorRole: fromRole,
      fromRole,
      toRole: role,
    });
    if (updated === undefined) {
      throw new DomainError(
        "VERSION_CONFLICT",
        "User was updated concurrently",
        409,
      );
    }
    authPrincipalCache.invalidateUser(user.id);
    const accessToken = await this.signAccessToken(user.id, session.id, role);
    return {
      accessToken,
      accessTokenExpiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
      sessionId: session.id,
      activeRole: role,
    };
  }

  public async listSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<ListSessionsResponse> {
    const sessions = await this.repository.listSessionsForUser(userId);
    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        deviceId: session.deviceId,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        expiresAt: session.expiresAt,
        current: session.id === currentSessionId,
      })),
    };
  }

  public async logout(
    userId: string,
    sessionId: string,
    activeRole: string,
    requestId?: string,
  ): Promise<LogoutResponse> {
    await this.repository.revokeCurrentSession({
      sessionId,
      userId,
      revokedAt: new Date(),
      requestId: requestId ?? randomUUID(),
      actorRole: activeRole,
    });
    authPrincipalCache.invalidateSession(sessionId);
    return { revoked: true };
  }

  public async logoutAll(
    userId: string,
    activeRole: string,
    requestId?: string,
  ): Promise<LogoutAllResponse> {
    const revokedCount = await this.repository.revokeAllSessionsForUser({
      userId,
      revokedAt: new Date(),
      requestId: requestId ?? randomUUID(),
      actorRole: activeRole,
    });
    authPrincipalCache.invalidateUser(userId);
    return { revoked: true, revokedCount };
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
