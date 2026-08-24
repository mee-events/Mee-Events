import { Module } from "@nestjs/common";
import { PostgresCatalogRepository } from "./adapters/postgres-catalog.repository";
import { CATALOG_REPOSITORY } from "./ports/catalog-repository";
import { CatalogReviewController } from "./presentation/catalog-review.controller";
import { CatalogController } from "./presentation/catalog.controller";

@Module({
  controllers: [CatalogController, CatalogReviewController],
  providers: [
    { provide: CATALOG_REPOSITORY, useClass: PostgresCatalogRepository },
  ],
  exports: [CATALOG_REPOSITORY],
})
export class CatalogModule {}
