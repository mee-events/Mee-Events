import {
  Body,
  Controller,
  Get,
  Inject,
  BadRequestException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  updateCatalogContentStatusSchema,
  updateCatalogMediaSchema,
  upsertCatalogMediaSchema,
  type CatalogMediaCoverage,
  type CatalogReviewMedia,
  type CatalogReviewProduct,
  type UpdateCatalogContentStatusRequest,
  type UpdateCatalogMediaRequest,
  type UpsertCatalogMediaRequest,
} from "@me-event/api-contracts";
import { ZodValidationPipe } from "../../../common/http/zod-validation.pipe";
import { RequireCapability } from "../../authorization/capability.decorator";
import { CapabilityGuard } from "../../authorization/capability.guard";
import type { AuthenticatedPlatformRequest } from "../../platform-foundation/security/access-token.guard";
import { CatalogMediaValidationError } from "../domain/catalog-media";
import { assertCatalogMediaApproval } from "../adapters/postgres-catalog.repository";
import {
  CATALOG_REPOSITORY,
  type CatalogMediaRecord,
  type CatalogRepository,
} from "../ports/catalog-repository";

@ApiTags("Catalogue review")
@ApiBearerAuth()
@Controller("erp/catalog")
@UseGuards(CapabilityGuard)
export class CatalogReviewController {
  public constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalog: CatalogRepository,
  ) {}

  @Get("products")
  @RequireCapability("catalog_review.read")
  @ApiOperation({ summary: "List catalogue products for content review" })
  public async listReviewProducts(): Promise<{
    products: readonly CatalogReviewProduct[];
  }> {
    const records = await this.catalog.listReviewProducts();
    return {
      products: records.map((record) => ({
        code: record.code,
        displayName: record.displayName,
        sourceName: record.sourceName,
        serviceCode: record.serviceCode,
        contentStatus: record.contentStatus,
        customerSelectable: record.customerSelectable,
        placeholder: record.placeholder,
        eligibilityFlags: record.eligibilityFlags,
      })),
    };
  }

  @Patch("products/:code")
  @RequireCapability("catalog_review.update")
  @ApiOperation({ summary: "Approve or reject product display copy" })
  public async updateProduct(
    @Req() request: AuthenticatedPlatformRequest,
    @Param("code") code: string,
    @Body(new ZodValidationPipe(updateCatalogContentStatusSchema))
    body: UpdateCatalogContentStatusRequest,
  ): Promise<CatalogReviewProduct> {
    const principal = request.user;
    if (principal === undefined) {
      throw new UnauthorizedException("Authenticated principal is required");
    }
    const updated = await this.catalog.updateProductContent({
      code,
      contentStatus: body.contentStatus,
      ...(body.displayName === undefined
        ? {}
        : { displayName: body.displayName }),
      actorUserId: principal.userId,
      ...(body.reason === undefined ? {} : { reason: body.reason }),
    });
    if (!updated) {
      throw new NotFoundException(`Product ${code} not found`);
    }
    return {
      code: updated.code,
      displayName: updated.displayName,
      sourceName: updated.sourceName,
      serviceCode: updated.serviceCode,
      contentStatus: updated.contentStatus,
      customerSelectable: updated.customerSelectable,
      placeholder: updated.placeholder,
      eligibilityFlags: updated.eligibilityFlags,
    };
  }

  @Get("media/coverage")
  @RequireCapability("catalog_review.read")
  @ApiOperation({ summary: "Catalogue media coverage for review" })
  public async mediaCoverage(): Promise<CatalogMediaCoverage> {
    return this.catalog.listMediaCoverage();
  }

  @Get("media")
  @RequireCapability("catalog_review.read")
  @ApiOperation({ summary: "List catalogue media metadata" })
  public async listMedia(
    @Query("entityType") entityType?: CatalogMediaRecord["entityType"],
    @Query("entityCode") entityCode?: string,
  ): Promise<{ media: readonly CatalogReviewMedia[] }> {
    const records = await this.catalog.listReviewMedia({
      ...(entityType === undefined ? {} : { entityType }),
      ...(entityCode === undefined ? {} : { entityCode }),
    });
    return { media: records.map(toReviewMedia) };
  }

  @Post("media")
  @RequireCapability("catalog_review.update")
  @ApiOperation({ summary: "Create or replace catalogue media metadata" })
  public async upsertMedia(
    @Req() request: AuthenticatedPlatformRequest,
    @Body(new ZodValidationPipe(upsertCatalogMediaSchema))
    body: UpsertCatalogMediaRequest,
  ): Promise<CatalogReviewMedia> {
    const principal = request.user;
    if (principal === undefined) {
      throw new UnauthorizedException("Authenticated principal is required");
    }
    const reviewStatus = body.reviewStatus ?? "draft";
    const sourceKind = body.sourceKind ?? "unspecified";
    try {
      assertCatalogMediaApproval({
        reviewStatus,
        sourceKind,
        sourceRef: body.sourceRef ?? null,
        licenceNote: body.licenceNote ?? null,
      });
      const saved = await this.catalog.upsertCatalogMedia({
        entityType: body.entityType,
        entityCode: body.entityCode,
        mediaUrl: body.mediaUrl,
        mediaRole: body.mediaRole,
        altText: body.altText,
        actorUserId: principal.userId,
        reviewStatus,
        sourceKind,
        ...(body.thumbnailUrl === undefined
          ? {}
          : { thumbnailUrl: body.thumbnailUrl }),
        ...(body.displayOrder === undefined
          ? {}
          : { displayOrder: body.displayOrder }),
        ...(body.active === undefined ? {} : { active: body.active }),
        ...(body.hyderabadCustomerVisible === undefined
          ? {}
          : { hyderabadCustomerVisible: body.hyderabadCustomerVisible }),
        ...(body.sourceRef === undefined ? {} : { sourceRef: body.sourceRef }),
        ...(body.licenceNote === undefined
          ? {}
          : { licenceNote: body.licenceNote }),
        ...(body.reason === undefined ? {} : { reason: body.reason }),
      });
      return toReviewMedia(saved);
    } catch (error) {
      if (error instanceof CatalogMediaValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Patch("media/:id")
  @RequireCapability("catalog_review.update")
  @ApiOperation({ summary: "Update catalogue media review metadata" })
  public async updateMedia(
    @Req() request: AuthenticatedPlatformRequest,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateCatalogMediaSchema))
    body: UpdateCatalogMediaRequest,
  ): Promise<CatalogReviewMedia> {
    const principal = request.user;
    if (principal === undefined) {
      throw new UnauthorizedException("Authenticated principal is required");
    }
    try {
      if (body.reviewStatus === "approved" && body.sourceKind !== undefined) {
        assertCatalogMediaApproval({
          reviewStatus: "approved",
          sourceKind: body.sourceKind,
          sourceRef: body.sourceRef ?? null,
          licenceNote: body.licenceNote ?? null,
        });
      }
      const updated = await this.catalog.updateCatalogMedia({
        id,
        actorUserId: principal.userId,
        ...(body.mediaUrl === undefined ? {} : { mediaUrl: body.mediaUrl }),
        ...(body.thumbnailUrl === undefined
          ? {}
          : { thumbnailUrl: body.thumbnailUrl }),
        ...(body.displayOrder === undefined
          ? {}
          : { displayOrder: body.displayOrder }),
        ...(body.altText === undefined ? {} : { altText: body.altText }),
        ...(body.reviewStatus === undefined
          ? {}
          : { reviewStatus: body.reviewStatus }),
        ...(body.active === undefined ? {} : { active: body.active }),
        ...(body.hyderabadCustomerVisible === undefined
          ? {}
          : { hyderabadCustomerVisible: body.hyderabadCustomerVisible }),
        ...(body.sourceKind === undefined
          ? {}
          : { sourceKind: body.sourceKind }),
        ...(body.sourceRef === undefined ? {} : { sourceRef: body.sourceRef }),
        ...(body.licenceNote === undefined
          ? {}
          : { licenceNote: body.licenceNote }),
        ...(body.reason === undefined ? {} : { reason: body.reason }),
      });
      if (!updated) {
        throw new NotFoundException(`Media ${id} not found`);
      }
      return toReviewMedia(updated);
    } catch (error) {
      if (error instanceof CatalogMediaValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}

function toReviewMedia(record: CatalogMediaRecord): CatalogReviewMedia {
  return {
    id: record.id,
    entityType: record.entityType,
    entityCode: record.entityCode,
    mediaUrl: record.mediaUrl,
    thumbnailUrl: record.thumbnailUrl,
    mediaRole: record.mediaRole,
    displayOrder: record.displayOrder,
    altText: record.altText,
    reviewStatus: record.reviewStatus,
    active: record.active,
    hyderabadCustomerVisible: record.hyderabadCustomerVisible,
    sourceKind: record.sourceKind,
    sourceRef: record.sourceRef,
    licenceNote: record.licenceNote,
    version: record.version,
  };
}
