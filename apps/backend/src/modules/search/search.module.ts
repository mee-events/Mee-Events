import { Module } from "@nestjs/common";
import { PostgresSearchRepository } from "./adapters/postgres-search.repository";
import {
  CategorySearchProvider,
  FUTURE_STUB_TYPES,
  InventorySearchProvider,
  OccasionSearchProvider,
  ProductSearchProvider,
  ServiceSearchProvider,
  StageSearchProvider,
  StubSearchProvider,
  VenueSearchProvider,
} from "./adapters/providers/catalog-search.providers";
import { SearchService } from "./application/search.service";
import { SEARCH_PROVIDERS, type SearchProvider } from "./ports/search-provider";
import { SearchController } from "./presentation/search.controller";

@Module({
  controllers: [SearchController],
  providers: [
    PostgresSearchRepository,
    OccasionSearchProvider,
    CategorySearchProvider,
    StageSearchProvider,
    ServiceSearchProvider,
    VenueSearchProvider,
    InventorySearchProvider,
    ProductSearchProvider,
    SearchService,
    {
      provide: SEARCH_PROVIDERS,
      inject: [
        OccasionSearchProvider,
        ServiceSearchProvider,
        VenueSearchProvider,
        CategorySearchProvider,
        StageSearchProvider,
        InventorySearchProvider,
        ProductSearchProvider,
      ],
      useFactory: (
        occasion: OccasionSearchProvider,
        service: ServiceSearchProvider,
        venue: VenueSearchProvider,
        category: CategorySearchProvider,
        stage: StageSearchProvider,
        inventory: InventorySearchProvider,
        product: ProductSearchProvider,
      ): SearchProvider[] => [
        occasion,
        service,
        venue,
        category,
        stage,
        inventory,
        product,
        ...FUTURE_STUB_TYPES.map((type) => new StubSearchProvider(type)),
      ],
    },
  ],
  exports: [SearchService],
})
export class SearchModule {}
