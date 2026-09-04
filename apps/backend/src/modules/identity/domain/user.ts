import type { PlatformRole, RoleAssignment } from "@me-event/shared-types";
import {
  activeSupportedAssignments,
  hasSupportedActiveRoleAssignment,
} from "../../../common/branch/role-scope-policy";
import { DomainError } from "../../../common/errors/domain.error";

export const mobileSwitchableRoles = [
  "customer",
  "vendor_owner",
  "vendor_member",
  "worker",
] as const;

export type MobileSwitchableRole = (typeof mobileSwitchableRoles)[number];

export interface UserRecord {
  readonly id: string;
  readonly mobileNumber: string;
  readonly roles: readonly RoleAssignment[];
  readonly lastActiveRole: PlatformRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly version: number;
}

export function isMobileSwitchableRole(
  role: string,
): role is MobileSwitchableRole {
  return (mobileSwitchableRoles as readonly string[]).includes(role);
}

export function assertActiveAssignment(
  user: UserRecord,
  role: PlatformRole,
): void {
  const supportedAssignments = activeSupportedAssignments(user.roles);
  const permitted =
    supportedAssignments !== undefined &&
    hasSupportedActiveRoleAssignment(supportedAssignments, role);
  if (!permitted) {
    throw new DomainError(
      "ROLE_NOT_ASSIGNED",
      "Role is not active for this user",
      403,
    );
  }
}

export function selectLastActiveRole(
  user: UserRecord,
  role: PlatformRole,
): UserRecord {
  assertActiveAssignment(user, role);
  return {
    ...user,
    lastActiveRole: role,
    updatedAt: new Date(),
    version: user.version + 1,
  };
}
