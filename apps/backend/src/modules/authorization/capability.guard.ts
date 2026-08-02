import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedPlatformRequest } from "../platform-foundation/security/access-token.guard";
import {
  ROLE_CAPABILITIES,
  type CapabilityId,
} from "../platform-foundation/domain/platform-foundation";
import { REQUIRED_CAPABILITY_KEY } from "./capability.decorator";

/**
 * Enforces the role-to-capability policy on controlled endpoints.
 * Must run after AccessTokenGuard so the authenticated principal exists.
 */
@Injectable()
export class CapabilityGuard implements CanActivate {
  public constructor(private readonly reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    const capability = this.reflector.getAllAndOverride<
      CapabilityId | undefined
    >(REQUIRED_CAPABILITY_KEY, [context.getHandler(), context.getClass()]);
    if (capability === undefined) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedPlatformRequest>();
    const principal = request.user;
    if (principal === undefined) {
      throw new UnauthorizedException(
        "Capability checks require an authenticated principal",
      );
    }

    const granted = ROLE_CAPABILITIES[principal.activeRole];
    if (!granted.some((id) => id === capability)) {
      throw new ForbiddenException(
        `Active role is missing the ${capability} capability`,
      );
    }
    return true;
  }
}
