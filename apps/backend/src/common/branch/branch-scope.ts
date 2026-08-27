import { DomainError } from "../errors/domain.error";
import type { AuthenticatedPrincipal } from "../../modules/platform-foundation/domain/platform-foundation";
import { resolveBranchId } from "./branch-context";

/**
 * True when the record belongs to the principal's active branch.
 * Cross-branch access must be treated as missing (404), never 403.
 */
export function belongsToActiveBranch(
  principal: AuthenticatedPrincipal,
  recordBranchId: string | undefined,
): boolean {
  return (
    recordBranchId !== undefined &&
    recordBranchId.length > 0 &&
    recordBranchId === resolveBranchId(principal)
  );
}

/** Throw the same not-found error used for missing rows. */
export function rejectIfNotActiveBranch(
  principal: AuthenticatedPrincipal,
  recordBranchId: string | undefined,
  code: string,
  message: string,
): void {
  if (!belongsToActiveBranch(principal, recordBranchId)) {
    throw new DomainError(code, message, 404);
  }
}
