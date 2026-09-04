import type {
  PlatformRole,
  RoleAssignment,
  RoleScopeType,
} from "@me-event/shared-types";

export const PHASE_ONE_BRANCH_ID = "00000000-0000-4000-8000-000000000001";

const VENDOR_SCOPED_ROLES: ReadonlySet<PlatformRole> = new Set([
  "vendor_owner",
  "vendor_member",
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/**
 * Phase 1 role/resource scope policy.
 *
 * - Every role may be assigned to the Hyderabad branch.
 * - Only the company administrator role may be global.
 * - Vendor owner/member grants may target a vendor resource UUID.
 *
 * Operational branch selection is deliberately separate from these grants.
 */
export function isSupportedPhaseOneRoleAssignment(
  assignment: RoleAssignment,
): boolean {
  switch (assignment.scopeType) {
    case "branch":
      return assignment.scopeId === PHASE_ONE_BRANCH_ID;
    case "global":
      return (
        assignment.role === "administrator" && assignment.scopeId === undefined
      );
    case "vendor":
      return (
        VENDOR_SCOPED_ROLES.has(assignment.role) && isUuid(assignment.scopeId)
      );
  }
}

export function hasSupportedActiveRoleAssignment(
  assignments: readonly RoleAssignment[],
  role: PlatformRole,
): boolean {
  return assignments.some(
    (assignment) =>
      assignment.active &&
      assignment.role === role &&
      isSupportedPhaseOneRoleAssignment(assignment),
  );
}

/**
 * Authorizes one vendor resource from role scope alone. Membership is a
 * separate, mandatory check in the vendor application service.
 */
export function hasActiveVendorResourceGrant(
  assignments: readonly RoleAssignment[],
  activeRole: PlatformRole,
  vendorId: string,
  vendorBranchId: string,
): boolean {
  if (!VENDOR_SCOPED_ROLES.has(activeRole)) return false;
  const supported = activeSupportedAssignments(assignments);
  if (supported === undefined) return false;
  return supported.some(
    (assignment) =>
      assignment.role === activeRole &&
      ((assignment.scopeType === "vendor" && assignment.scopeId === vendorId) ||
        (assignment.scopeType === "branch" &&
          assignment.scopeId === vendorBranchId)),
  );
}

export function activeSupportedAssignments(
  assignments: readonly RoleAssignment[],
): readonly RoleAssignment[] | undefined {
  if (
    assignments.some(
      (assignment) => !isSupportedPhaseOneRoleAssignment(assignment),
    )
  ) {
    return undefined;
  }
  const seen = new Set<string>();
  for (const assignment of assignments) {
    const key = roleAssignmentKey(assignment);
    if (seen.has(key)) return undefined;
    seen.add(key);
  }
  return assignments.filter((assignment) => assignment.active);
}

export function roleAssignmentKey(assignment: {
  readonly role: PlatformRole;
  readonly scopeType: RoleScopeType;
  readonly scopeId?: string;
}): string {
  return `${assignment.role}:${assignment.scopeType}:${assignment.scopeId ?? ""}`;
}

function isUuid(value: string | undefined): boolean {
  return value !== undefined && UUID_PATTERN.test(value);
}
