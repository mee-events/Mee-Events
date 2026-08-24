import { Injectable } from "@nestjs/common";
import type { SearchHit, SearchResultType } from "@me-event/api-contracts";
import type {
  SearchProvider,
  SearchProviderContext,
} from "../../ports/search-provider";
import { PostgresSearchRepository } from "../postgres-search.repository";

@Injectable()
export class OccasionSearchProvider implements SearchProvider {
  public readonly type: SearchResultType = "occasion";

  public constructor(private readonly repo: PostgresSearchRepository) {}

  public search(context: SearchProviderContext): Promise<readonly SearchHit[]> {
    return this.repo.searchOccasions(context.aliasTerms, context.limit);
  }
}

@Injectable()
export class CategorySearchProvider implements SearchProvider {
  public readonly type: SearchResultType = "category";

  public constructor(private readonly repo: PostgresSearchRepository) {}

  public search(context: SearchProviderContext): Promise<readonly SearchHit[]> {
    return this.repo.searchCategories(context.aliasTerms, context.limit);
  }
}

@Injectable()
export class StageSearchProvider implements SearchProvider {
  public readonly type: SearchResultType = "stage";

  public constructor(private readonly repo: PostgresSearchRepository) {}

  public search(context: SearchProviderContext): Promise<readonly SearchHit[]> {
    return this.repo.searchStages(context.aliasTerms, context.limit);
  }
}

@Injectable()
export class ServiceSearchProvider implements SearchProvider {
  public readonly type: SearchResultType = "service";

  public constructor(private readonly repo: PostgresSearchRepository) {}

  public search(context: SearchProviderContext): Promise<readonly SearchHit[]> {
    return this.repo.searchServices(
      context.aliasTerms,
      context.limit,
      "service",
    );
  }
}

@Injectable()
export class VenueSearchProvider implements SearchProvider {
  public readonly type: SearchResultType = "venue";

  public constructor(private readonly repo: PostgresSearchRepository) {}

  public search(context: SearchProviderContext): Promise<readonly SearchHit[]> {
    return this.repo.searchServices(context.aliasTerms, context.limit, "venue");
  }
}

@Injectable()
export class InventorySearchProvider implements SearchProvider {
  public readonly type: SearchResultType = "other";

  public constructor(private readonly repo: PostgresSearchRepository) {}

  public search(context: SearchProviderContext): Promise<readonly SearchHit[]> {
    return this.repo.searchServices(
      context.aliasTerms,
      context.limit,
      "inventory",
    );
  }
}

@Injectable()
export class ProductSearchProvider implements SearchProvider {
  public readonly type: SearchResultType = "product";

  public constructor(private readonly repo: PostgresSearchRepository) {}

  public search(context: SearchProviderContext): Promise<readonly SearchHit[]> {
    return this.repo.searchProducts(context.aliasTerms, context.limit);
  }
}

/** Future modules register real providers; stubs keep the registry extensible. */
@Injectable()
export class StubSearchProvider implements SearchProvider {
  public constructor(public readonly type: SearchResultType) {}

  public async search(
    _context: SearchProviderContext,
  ): Promise<readonly SearchHit[]> {
    return [];
  }
}

export const FUTURE_STUB_TYPES: readonly SearchResultType[] = [
  "package",
  "vendor",
  "theme",
  "offer",
  "city",
  "collection",
  "blog",
  "faq",
  "help",
  "coupon",
  "artist",
  "saved",
];
