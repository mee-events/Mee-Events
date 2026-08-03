import {
  HYDERABAD_BRANCH,
  type AuthenticatedPrincipal,
} from "../../modules/platform-foundation/domain/platform-foundation";

/**
 * Resolve the active branch for the authenticated principal.
 *
 * Source of truth (in order):
 * 1. Active role assignment `scopeId` (branch-scoped roles)
 * 2. Any other active assignment with a `scopeId`
 * 3. Platform default branch (single-branch bootstrap until multi-branch JWT ships)
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
      typeof assignment.scopeId === "string" &&
      assignment.scopeId.length > 0,
  );
  if (active?.scopeId !== undefined) {
    return active.scopeId;
  }

  const anyScoped = principal.roleAssignments.find(
    (assignment) =>
      assignment.active &&
      typeof assignment.scopeId === "string" &&
      assignment.scopeId.length > 0,
  );
  if (anyScoped?.scopeId !== undefined) {
    return anyScoped.scopeId;
  }

  return HYDERABAD_BRANCH.id;
}

/** @deprecated Prefer resolveBranchId(principal). Kept for bootstrap catalog only. */
export const DEFAULT_BRANCH_ID = HYDERABAD_BRANCH.id;
