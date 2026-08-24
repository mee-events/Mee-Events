import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import type {
  CatalogProductDetail,
  CatalogProductSummary,
  CatalogServiceSummary,
  EventSelectionSummary,
  EventTypeSummary,
  OccasionStageSummary,
  ServiceCategorySummary,
  ServiceSubcategorySummary,
} from "@me-event/api-contracts";
import { Public } from "../../authorization/public.decorator";
import {
  CATALOG_REPOSITORY,
  type CatalogProductRecord,
  type CatalogRepository,
  type CatalogServiceRecord,
} from "../ports/catalog-repository";

function mapEventType(record: {
  readonly code: string;
  readonly displayName: string;
  readonly displayOrder: number;
  readonly kind: "occasion" | "service_entry";
  readonly selectionCount: number;
  readonly coverImageUrl: string | null;
  readonly thumbnailUrl: string | null;
  readonly coverAltText: string | null;
}): EventTypeSummary {
  return {
    code: record.code,
    displayName: record.displayName,
    displayOrder: record.displayOrder,
    kind: record.kind,
    selectionCount: record.selectionCount,
    coverImageUrl: record.coverImageUrl,
    thumbnailUrl: record.thumbnailUrl,
    coverAltText: record.coverAltText,
  };
}

function mapServiceRecord(record: CatalogServiceRecord): CatalogServiceSummary {
  return {
    code: record.code,
    displayName: record.displayName,
    departmentCode: record.departmentCode,
    entityKind: record.entityKind,
    displayOrder: record.displayOrder,
    iconUrl: record.iconUrl,
    coverImageUrl: record.coverImageUrl,
    thumbnailUrl: record.thumbnailUrl,
    coverAltText: record.coverAltText,
    subcategoryCount: record.subcategoryCount,
    productCount: record.productCount,
  };
}

function mapProductSummary(
  record: CatalogProductRecord,
): CatalogProductSummary {
  return {
    code: record.code,
    displayName: record.displayName,
    serviceCode: record.serviceCode,
    subcategoryCode: record.subcategoryCode,
    subcategoryLetter: record.subcategoryLetter,
    coverImageUrl: record.coverImageUrl,
    thumbnailUrl: record.thumbnailUrl,
    coverAltText: record.coverAltText,
    restricted: record.restricted,
    addToPlanAllowed: record.addToPlanAllowed,
    displayOrder: record.displayOrder,
  };
}

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
      eventTypes: records.map(mapEventType),
    };
  }

  @Get("event-types/:code")
  @ApiOperation({ summary: "Get event category detail" })
  public async eventTypeDetail(@Param("code") code: string): Promise<{
    eventType: EventTypeSummary;
    selections: readonly EventSelectionSummary[];
  }> {
    const record = await this.catalog.findEventTypeByCode(code);
    if (!record) {
      throw new NotFoundException(`Event type ${code} not found`);
    }
    const selections = await this.catalog.listSelectionsForEvent(code);
    return {
      eventType: mapEventType(record),
      selections: selections.map((selection) => ({
        sourceOrdinal: selection.sourceOrdinal,
        sourceLabel: selection.sourceLabel,
        serviceCode: selection.serviceCode,
        serviceDisplayName: selection.serviceDisplayName,
        mappingStatus: selection.mappingStatus,
      })),
    };
  }

  @Get("event-types/:code/selections")
  @ApiOperation({ summary: "List mapped service selections for an event" })
  public async eventSelections(@Param("code") code: string): Promise<{
    selections: readonly EventSelectionSummary[];
  }> {
    const eventType = await this.catalog.findEventTypeByCode(code);
    if (!eventType) {
      throw new NotFoundException(`Event type ${code} not found`);
    }
    const selections = await this.catalog.listSelectionsForEvent(code);
    return {
      selections: selections.map((selection) => ({
        sourceOrdinal: selection.sourceOrdinal,
        sourceLabel: selection.sourceLabel,
        serviceCode: selection.serviceCode,
        serviceDisplayName: selection.serviceDisplayName,
        mappingStatus: selection.mappingStatus,
      })),
    };
  }

  @Get("service-categories")
  @ApiOperation({ summary: "List active service departments" })
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

  @Get("services")
  @ApiOperation({ summary: "List active granular services" })
  @ApiQuery({ name: "department", required: false, type: String })
  public async catalogServices(
    @Query("department") department?: string,
  ): Promise<{
    services: readonly CatalogServiceSummary[];
  }> {
    const records = await this.catalog.listCatalogServices(department);
    return {
      services: records.map(mapServiceRecord),
    };
  }

  @Get("services/:code")
  @ApiOperation({ summary: "Get single service detail" })
  public async serviceDetail(
    @Param("code") code: string,
  ): Promise<CatalogServiceSummary> {
    const record = await this.catalog.findCatalogServiceByCode(code);
    if (!record) {
      throw new NotFoundException(`Service ${code} not found`);
    }
    return mapServiceRecord(record);
  }

  @Get("services/:code/subcategories")
  @ApiOperation({ summary: "List service subcategories" })
  public async serviceSubcategories(@Param("code") code: string): Promise<{
    subcategories: readonly ServiceSubcategorySummary[];
  }> {
    const service = await this.catalog.findCatalogServiceByCode(code);
    if (!service) {
      throw new NotFoundException(`Service ${code} not found`);
    }
    const records = await this.catalog.listSubcategories(code);
    return {
      subcategories: records.map((record) => ({
        code: record.code,
        letter: record.letter,
        displayName: record.displayName,
        productCount: record.productCount,
        displayOrder: record.displayOrder,
        coverImageUrl: record.coverImageUrl,
        thumbnailUrl: record.thumbnailUrl,
        coverAltText: record.coverAltText,
      })),
    };
  }

  @Get("services/:code/products")
  @ApiOperation({ summary: "List customer-visible products for a service" })
  @ApiQuery({ name: "subcategory", required: false, type: String })
  public async serviceProducts(
    @Param("code") code: string,
    @Query("subcategory") subcategory?: string,
  ): Promise<{
    products: readonly CatalogProductSummary[];
  }> {
    const service = await this.catalog.findCatalogServiceByCode(code);
    if (!service) {
      throw new NotFoundException(`Service ${code} not found`);
    }
    const records = await this.catalog.listProducts({
      serviceCode: code,
      ...(subcategory === undefined ? {} : { subcategoryLetter: subcategory }),
    });
    return { products: records.map(mapProductSummary) };
  }

  @Get("products/:code")
  @ApiOperation({ summary: "Get customer-visible product detail" })
  public async productDetail(
    @Param("code") code: string,
  ): Promise<CatalogProductDetail> {
    const record = await this.catalog.findProductByCode(code);
    if (!record) {
      throw new NotFoundException(`Product ${code} not found`);
    }
    return {
      ...mapProductSummary(record),
      sourceName: record.sourceName,
      description: record.description,
      gallery: record.gallery,
    };
  }

  @Get("occasions/:code/stages")
  @ApiOperation({ summary: "List stages for an occasion" })
  public async occasionStages(@Param("code") code: string): Promise<{
    stages: readonly OccasionStageSummary[];
  }> {
    const records = await this.catalog.listOccasionStages(code);
    return {
      stages: records.map((r) => ({
        code: r.code,
        displayName: r.displayName,
        occasionCode: r.occasionCode,
        typicalDay: r.typicalDay,
        displayOrder: r.displayOrder,
      })),
    };
  }

  @Get("occasions/:code/services")
  @ApiOperation({ summary: "List services relevant to an occasion" })
  public async occasionServices(@Param("code") code: string): Promise<{
    services: readonly CatalogServiceSummary[];
  }> {
    const records = await this.catalog.listServicesForOccasion(code);
    return {
      services: records.map(mapServiceRecord),
    };
  }
}
