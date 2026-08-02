import { Injectable } from "@nestjs/common";
import {
  HYDERABAD_BRANCH,
  MODULE_DEFINITIONS,
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
    const activeAssignments = principal.roleAssignments
      .filter((assignment) => assignment.active)
      .map((assignment) => ({
        role: assignment.role,
        surface: ROLE_SURFACES[assignment.role],
        scopeId: assignment.scopeId ?? HYDERABAD_BRANCH.id,
      }));
    const activeRole = principal.activeRole;

    return {
      schemaVersion: "2026-07-29",
      policyVersion: "hyd-v1",
      generatedAt: now.toISOString(),
      requestId,
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
    };
  }
}
