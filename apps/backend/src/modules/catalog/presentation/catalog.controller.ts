import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type {
  EventTypeSummary,
  ServiceCategorySummary,
} from "@me-event/api-contracts";
import { Public } from "../../authorization/public.decorator";
import {
  CATALOG_REPOSITORY,
  type CatalogRepository,
} from "../ports/catalog-repository";

@ApiTags("Catalogue")
@Public()
@Controller("catalog")
export class CatalogController {
  public constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalog: CatalogRepository,
  ) {}

  @Get("event-types")
  @ApiOperation({ summary: "List active event types" })
  public async eventTypes(): Promise<{
    eventTypes: readonly EventTypeSummary[];
  }> {
    const records = await this.catalog.listEventTypes();
    return {
      eventTypes: records.map((record) => ({
        code: record.code,
        displayName: record.displayName,
        displayOrder: record.displayOrder,
      })),
    };
  }

  @Get("service-categories")
  @ApiOperation({ summary: "List active service categories" })
  public async serviceCategories(): Promise<{
    serviceCategories: readonly ServiceCategorySummary[];
  }> {
    const records = await this.catalog.listServiceCategories();
    return {
      serviceCategories: records.map((record) => ({
        code: record.code,
        displayName: record.displayName,
        displayOrder: record.displayOrder,
      })),
    };
  }
}
