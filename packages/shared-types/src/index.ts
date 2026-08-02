export const platformRoles = [
  "customer",
  "vendor_owner",
  "vendor_member",
  "worker",
  "employee",
  "support",
  "finance",
  "manager",
  "administrator",
  "auditor",
] as const;

export type PlatformRole = (typeof platformRoles)[number];

export interface RoleAssignment {
  readonly role: PlatformRole;
  readonly scopeId?: string;
  readonly active: boolean;
  readonly verifiedAt?: string;
}

export interface AuthenticatedUser {
  readonly id: string;
  readonly mobileNumber: string;
  readonly roles: readonly RoleAssignment[];
  readonly lastActiveRole: PlatformRole;
}

export interface DeviceSession {
  readonly id: string;
  readonly userId: string;
  readonly deviceId: string;
  readonly createdAt: string;
  readonly lastSeenAt: string;
  readonly expiresAt: string;
  readonly revokedAt?: string;
}
