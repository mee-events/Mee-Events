import { SetMetadata } from "@nestjs/common";
import type { PlatformRole } from "@me-event/shared-types";

export const REQUIRED_ROLES = "required_roles";
export const RequireRoles = (
  ...roles: readonly PlatformRole[]
): MethodDecorator => SetMetadata(REQUIRED_ROLES, roles);
