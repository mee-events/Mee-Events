import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { platformRoles, type PlatformRole } from "@me-event/shared-types";
import type { Request } from "express";
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from "../../identity/ports/identity-repository";
import type { AuthenticatedPrincipal } from "../domain/platform-foundation";

interface AccessTokenClaims {
  readonly sub: string;
  readonly sid: string;
  readonly role: PlatformRole;
}

export type AuthenticatedPlatformRequest = Request & {
  user?: AuthenticatedPrincipal;
  id?: string | number;
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
  public constructor(
    private readonly jwt: JwtService,
    @Inject(IDENTITY_REPOSITORY)
    private readonly identityRepository: IdentityRepository,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedPlatformRequest>();
    const token = this.readBearerToken(request);
    const claims = await this.verifyClaims(token);
    const [user, session] = await Promise.all([
      this.identityRepository.findUserById(claims.sub),
      this.identityRepository.findSessionById(claims.sid),
    ]);

    if (
      user === undefined ||
      session === undefined ||
      session.userId !== user.id ||
      session.revokedAt !== undefined ||
      Date.parse(session.expiresAt) <= Date.now() ||
      user.lastActiveRole !== claims.role
    ) {
      throw new UnauthorizedException("Access token session is not active");
    }

    const roleIsAssigned = user.roles.some(
      (assignment) => assignment.active && assignment.role === claims.role,
    );
    if (!roleIsAssigned) {
      throw new UnauthorizedException("Access token role is not active");
    }

    request.user = {
      userId: user.id,
      sessionId: session.id,
      activeRole: claims.role,
      roleAssignments: user.roles,
    };
    return true;
  }

  private readBearerToken(request: Request): string {
    const authorization = request.get("authorization");
    const match =
      authorization === undefined
        ? undefined
        : /^Bearer\s+(\S+)$/i.exec(authorization);
    const token = match?.[1];
    if (token === undefined) {
      throw new UnauthorizedException("Bearer access token is required");
    }
    return token;
  }

  private async verifyClaims(token: string): Promise<AccessTokenClaims> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.jwt.verifyAsync<Record<string, unknown>>(token);
    } catch {
      throw new UnauthorizedException("Access token is invalid or expired");
    }

    const { sub, sid, role } = payload;
    if (
      typeof sub !== "string" ||
      typeof sid !== "string" ||
      !isPlatformRole(role)
    ) {
      throw new UnauthorizedException("Access token claims are invalid");
    }
    return { sub, sid, role };
  }
}

function isPlatformRole(value: unknown): value is PlatformRole {
  return (
    typeof value === "string" && platformRoles.some((role) => role === value)
  );
}
