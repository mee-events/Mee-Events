import "reflect-metadata";
import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";
import { REQUIRED_CAPABILITY_KEY } from "../src/modules/authorization/capability.decorator";
import { CapabilityGuard } from "../src/modules/authorization/capability.guard";
import { CatalogReviewController } from "../src/modules/catalog/presentation/catalog-review.controller";
import type { CatalogRepository } from "../src/modules/catalog/ports/catalog-repository";
import type { AuthenticatedPlatformRequest } from "../src/modules/platform-foundation/security/access-token.guard";
import type { AuthenticatedPrincipal } from "../src/modules/platform-foundation/domain/platform-foundation";

function principalWithRole(
  role: AuthenticatedPrincipal["activeRole"] | undefined,
): AuthenticatedPrincipal | undefined {
  if (role === undefined) {
    return undefined;
  }
  return {
    userId:
      role === "administrator"
        ? "admin-1"
        : role === "auditor"
          ? "auditor-1"
          : "employee-1",
    sessionId: "session-1",
    activeRole: role,
    roleAssignments: [{ role, active: true }],
  };
}

function contextFor(
  handler: object,
  principal: AuthenticatedPrincipal | undefined,
): ExecutionContext {
  const request = { user: principal } as AuthenticatedPlatformRequest;
  return {
    getHandler: () => handler as () => unknown,
    getClass: () => CatalogReviewController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe("CatalogReviewController capabilities", () => {
  const reflector = new Reflector();
  const guard = new CapabilityGuard(reflector);
  const recorded: { actorUserId?: string }[] = [];
  const catalog = {
    listMediaCoverage: async () => ({
      occasions: { total: 21, withApprovedCover: 0 },
      services: { total: 41, withApprovedCover: 0 },
      subcategories: {
        total: 237,
        withApprovedCover: 0,
        withInheritedCover: 0,
      },
      products: { total: 974, withApprovedCover: 0, withInheritedCover: 0 },
    }),
    listReviewMedia: async () => [],
    upsertCatalogMedia: async (input: { actorUserId?: string }) => {
      recorded.push(
        input.actorUserId === undefined
          ? {}
          : { actorUserId: input.actorUserId },
      );
      return {
        id: "media-1",
        entityType: "occasion",
        entityCode: "wedding",
        mediaUrl: "https://cdn.example/w.jpg",
        thumbnailUrl: null,
        mediaRole: "cover",
        displayOrder: 0,
        altText: "Wedding",
        reviewStatus: "draft",
        active: true,
        hyderabadCustomerVisible: true,
        sourceKind: "internal",
        sourceRef: null,
        licenceNote: null,
        version: 1,
      };
    },
  } as unknown as CatalogRepository;
  const controller = new CatalogReviewController(catalog);

  it("requires catalog_review.read for GET review listing", () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITY_KEY,
        CatalogReviewController.prototype.listReviewProducts as object,
      ),
    ).toBe("catalog_review.read");
  });

  it("requires catalog_review.update for PATCH approval", () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_CAPABILITY_KEY,
        CatalogReviewController.prototype.updateProduct as object,
      ),
    ).toBe("catalog_review.update");
  });

  function expectDenied(
    run: () => unknown,
    type: typeof UnauthorizedException | typeof ForbiddenException,
    status: number,
  ): void {
    try {
      run();
      expect.fail("expected CapabilityGuard to deny the request");
    } catch (error) {
      expect(error).toBeInstanceOf(type);
      expect(
        (error as UnauthorizedException | ForbiddenException).getStatus(),
      ).toBe(status);
    }
  }

  it("denies anonymous callers through CapabilityGuard", () => {
    expectDenied(
      () =>
        guard.canActivate(
          contextFor(
            CatalogReviewController.prototype.mediaCoverage as object,
            undefined,
          ),
        ),
      UnauthorizedException,
      401,
    );
    expectDenied(
      () =>
        guard.canActivate(
          contextFor(
            CatalogReviewController.prototype.upsertMedia as object,
            undefined,
          ),
        ),
      UnauthorizedException,
      401,
    );
  });

  it("denies CRM employee for catalogue media read and mutate with 403", () => {
    const employee = principalWithRole("employee");
    expectDenied(
      () =>
        guard.canActivate(
          contextFor(
            CatalogReviewController.prototype.mediaCoverage as object,
            employee,
          ),
        ),
      ForbiddenException,
      403,
    );
    expectDenied(
      () =>
        guard.canActivate(
          contextFor(
            CatalogReviewController.prototype.upsertMedia as object,
            employee,
          ),
        ),
      ForbiddenException,
      403,
    );
  });

  it("allows auditor catalog_review.read and forbids catalog_review.update", async () => {
    const auditor = principalWithRole("auditor");
    expect(
      guard.canActivate(
        contextFor(
          CatalogReviewController.prototype.mediaCoverage as object,
          auditor,
        ),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        contextFor(
          CatalogReviewController.prototype.listMedia as object,
          auditor,
        ),
      ),
    ).toBe(true);
    const coverage = await controller.mediaCoverage();
    expect(coverage.occasions.total).toBe(21);
    expectDenied(
      () =>
        guard.canActivate(
          contextFor(
            CatalogReviewController.prototype.upsertMedia as object,
            auditor,
          ),
        ),
      ForbiddenException,
      403,
    );
  });

  it("allows administrator catalog_review.read and catalog_review.update", () => {
    const admin = principalWithRole("administrator");
    expect(
      guard.canActivate(
        contextFor(
          CatalogReviewController.prototype.mediaCoverage as object,
          admin,
        ),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        contextFor(
          CatalogReviewController.prototype.listMedia as object,
          admin,
        ),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        contextFor(
          CatalogReviewController.prototype.upsertMedia as object,
          admin,
        ),
      ),
    ).toBe(true);
  });

  it("lets catalog_review.update mutate and ignores body actor identity", async () => {
    const admin = principalWithRole("administrator");
    expect(
      guard.canActivate(
        contextFor(
          CatalogReviewController.prototype.upsertMedia as object,
          admin,
        ),
      ),
    ).toBe(true);
    recorded.length = 0;
    const request = { user: admin } as AuthenticatedPlatformRequest;
    await controller.upsertMedia(request, {
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/w.jpg",
      mediaRole: "cover",
      altText: "Wedding",
      sourceKind: "internal",
      actorUserId: "attacker-id",
    } as never);
    expect(recorded[0]?.actorUserId).toBe("admin-1");
  });
});
