import { Injectable } from "@nestjs/common";
import { platformBootstrapResponseSchema } from "@me-event/api-contracts";
import {
  activeSupportedAssignments,
  hasSupportedActiveRoleAssignment,
} from "../../../common/branch/role-scope-policy";
import { DomainError } from "../../../common/errors/domain.error";
import {
  HYDERABAD_BRANCH,
  MODULE_DEFINITIONS,
  PLATFORM_BOOTSTRAP_MINIMUM_CLIENT_VERSION,
  PLATFORM_BOOTSTRAP_POLICY_VERSION,
  PLATFORM_BOOTSTRAP_SCHEMA_VERSION,
  ROLE_CAPABILITIES,
  ROLE_LANDING_MODULES,
  ROLE_MODULES,
  ROLE_SURFACES,
  type AuthenticatedPrincipal,
  type PlatformBootstrap,
} from "../domain/platform-foundation";

@Injectable()
export class PlatformFoundationService {
  public createBootstrap(
    principal: AuthenticatedPrincipal,
    requestId: string,
    now: Date = new Date(),
  ): PlatformBootstrap {
    const normalizedRequestId = requestId.trim();
    if (
      normalizedRequestId.length === 0 ||
      normalizedRequestId === "undefined" ||
      Number.isNaN(now.getTime())
    ) {
      requestContextUnavailable();
    }
    if (
      principal.userId.trim().length === 0 ||
      principal.sessionId.trim().length === 0
    ) {
      bootstrapUnavailable();
    }

    const supportedAssignments = activeSupportedAssignments(
      principal.roleAssignments,
    );
    const activeRole = principal.activeRole;
    if (
      supportedAssignments === undefined ||
      !hasSupportedActiveRoleAssignment(supportedAssignments, activeRole) ||
      (principal.branchId !== undefined &&
        principal.branchId !== HYDERABAD_BRANCH.id)
    ) {
      bootstrapUnavailable();
    }
    const activeAssignments: PlatformBootstrap["access"]["assignedActiveRoles"] =
      supportedAssignments.map((assignment) => ({
        role: assignment.role,
        surface: ROLE_SURFACES[assignment.role],
        scopeType: assignment.scopeType,
        ...(assignment.scopeId === undefined
          ? {}
          : { scopeId: assignment.scopeId }),
      }));

    return platformBootstrapResponseSchema.parse({
      schemaVersion: PLATFORM_BOOTSTRAP_SCHEMA_VERSION,
      minimumClientBootstrapVersion: PLATFORM_BOOTSTRAP_MINIMUM_CLIENT_VERSION,
      policyVersion: PLATFORM_BOOTSTRAP_POLICY_VERSION,
      generatedAt: now.toISOString(),
      requestId: normalizedRequestId,
      actor: {
        userId: principal.userId,
        sessionId: principal.sessionId,
        activeRole,
      },
      branch: HYDERABAD_BRANCH,
      client: {
        surface: ROLE_SURFACES[activeRole],
        landingModule: ROLE_LANDING_MODULES[activeRole],
      },
      access: {
        assignedActiveRoles: activeAssignments,
        capabilities: ROLE_CAPABILITIES[activeRole],
        modules: ROLE_MODULES[activeRole].map(
          (moduleId) => MODULE_DEFINITIONS[moduleId],
        ),
      },
      controls: {
        roleVisibility: "assigned-active-only",
        dataScope: "hyderabad-branch-and-assignment",
        mutationAudit: "required",
        serverAuthorization: "required",
      },
    });
  }
}

function bootstrapUnavailable(): never {
  throw new DomainError(
    "PLATFORM_BOOTSTRAP_UNAVAILABLE",
    "This account setup is not available.",
    403,
  );
}

function requestContextUnavailable(): never {
  throw new DomainError(
    "REQUEST_CONTEXT_UNAVAILABLE",
    "Request context is unavailable.",
    500,
  );
}
