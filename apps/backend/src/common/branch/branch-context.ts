import {
  HYDERABAD_BRANCH,
  type AuthenticatedPrincipal,
} from "../../modules/platform-foundation/domain/platform-foundation";

/**
 * Resolve the active branch for the authenticated principal.
 *
 * Source of truth (in order):
 * 1. Explicit operational `principal.branchId`
 * 2. Active-role assignment with `scopeType: branch`
 * 3. Platform default branch for global/vendor resource scopes
 *
 * Repositories must receive this value — never import HYDERABAD_BRANCH for queries.
 */
export function resolveBranchId(principal: AuthenticatedPrincipal): string {
  if (principal.branchId !== undefined && principal.branchId.length > 0) {
    return principal.branchId;
  }

  const active = principal.roleAssignments.find(
    (assignment) =>
      assignment.active &&
      assignment.role === principal.activeRole &&
      assignment.scopeType === "branch" &&
      typeof assignment.scopeId === "string" &&
      assignment.scopeId.length > 0,
  );
  if (active?.scopeId !== undefined) {
    return active.scopeId;
  }

  return HYDERABAD_BRANCH.id;
}

/** @deprecated Prefer resolveBranchId(principal). Kept for bootstrap catalog only. */
export const DEFAULT_BRANCH_ID = HYDERABAD_BRANCH.id;
