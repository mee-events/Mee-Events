import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import type {
  SearchResponse,
  TrendingSearchesResponse,
} from "@me-event/api-contracts";
import { Public } from "../../authorization/public.decorator";
import { SearchService } from "../application/search.service";

@ApiTags("Search")
@Public()
@Controller("search")
export class SearchController {
  public constructor(private readonly search: SearchService) {}

  @Get()
  @ApiOperation({ summary: "Unified customer catalogue search" })
  @ApiQuery({ name: "q", required: true, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "cursor", required: false, type: String })
  public async searchQuery(
    @Query("q") q = "",
    @Query("limit") limitRaw?: string,
    @Query("cursor") cursor?: string,
  ): Promise<SearchResponse> {
    const parsedLimit =
      limitRaw === undefined || limitRaw.trim().length === 0
        ? undefined
        : Number.parseInt(limitRaw, 10);
    return this.search.search({
      q,
      ...(parsedLimit !== undefined && Number.isFinite(parsedLimit)
        ? { limit: parsedLimit }
        : {}),
      ...(cursor !== undefined && cursor.trim().length > 0 ? { cursor } : {}),
    });
  }

  @Get("trending")
  @ApiOperation({ summary: "Backend-configurable trending search terms" })
  public async trending(): Promise<TrendingSearchesResponse> {
    const items = await this.search.trending();
    return { items };
  }
}
