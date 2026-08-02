import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { PlatformRole } from "@me-event/shared-types";
import { REQUIRED_ROLES } from "./roles.decorator";

interface AuthorizedRequest {
  readonly user?: { readonly roles: readonly PlatformRole[] };
}

@Injectable()
export class RolesGuard implements CanActivate {
  public constructor(private readonly reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<readonly PlatformRole[]>(
      REQUIRED_ROLES,
      [context.getHandler(), context.getClass()],
    );
    if (required.length === 0) return true;
    const request = context.switchToHttp().getRequest<AuthorizedRequest>();
    if (request.user === undefined) throw new UnauthorizedException();
    return required.some((role) => request.user?.roles.includes(role) === true);
  }
}
