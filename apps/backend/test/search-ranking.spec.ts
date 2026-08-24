import { describe, expect, it } from "vitest";
import type { Pool } from "pg";
import {
  compareHits,
  normalizeQuery,
  scoreMatch,
  tokenize,
} from "../src/modules/search/application/search-ranking";
import { PostgresSearchRepository } from "../src/modules/search/adapters/postgres-search.repository";

describe("search ranking", () => {
  it("normalizes and tokenizes multi-word queries", () => {
    expect(normalizeQuery("  Birthday  Cake ")).toBe("birthday cake");
    expect(tokenize("Birthday Cake")).toEqual(["birthday", "cake"]);
  });

  it("ranks exact occasion above partial service", () => {
    const exact = {
      score: scoreMatch({
        name: "Birthday",
        query: "birthday",
        type: "occasion",
      }),
      type: "occasion" as const,
      name: "Birthday",
    };
    const partial = {
      score: scoreMatch({
        name: "Birthday Photography",
        query: "birthday",
        type: "service",
      }),
      type: "service" as const,
      name: "Birthday Photography",
    };
    expect(exact.score).toBeGreaterThan(partial.score);
    expect(compareHits(exact, partial)).toBeLessThan(0);
  });

  it("matches photo prefix to photography", () => {
    const score = scoreMatch({
      name: "Photography & Videography",
      query: "photo",
      type: "service",
    });
    expect(score).toBeGreaterThan(0);
  });

  it("matches meh prefix via contains/prefix on Mehndi", () => {
    const score = scoreMatch({
      name: "Mehndi",
      query: "meh",
      type: "occasion",
    });
    expect(score).toBeGreaterThan(0);
  });
});

describe("search catalogue media", () => {
  it("resolves occasion, service and product media from catalog_media only", async () => {
    const captured: string[] = [];
    const pool = {
      query: async (sql: string) => {
        captured.push(sql);
        return {
          rows: [
            {
              id: "1",
              code: "wedding",
              display_name: "Wedding",
              subtitle: "Occasion",
              image_url: "https://cdn.example/wedding.jpg",
              similarity: 1,
            },
          ],
        };
      },
    } as unknown as Pool;
    const search = new PostgresSearchRepository(pool);
    const occasions = await search.searchOccasions(["wedding"], 8);
    const services = await search.searchServices(["photo"], 8);
    const products = await search.searchProducts(["cinematic"], 8);
    expect(occasions[0]?.imageUrl).toBe("https://cdn.example/wedding.jpg");
    expect(services[0]?.type).toBe("service");
    expect(products[0]?.type).toBe("product");
    expect(captured[0]).toContain("catalog_media");
    expect(captured[0]).toContain("entity_type = 'occasion'");
    expect(captured[0]).toContain("review_status = 'approved'");
    expect(captured[0]).toContain("hyderabad_customer_visible = true");
    expect(captured[1]).toContain("entity_type = 'service'");
    expect(captured[1]).not.toContain("cs.cover_image_url");
    expect(captured[2]).not.toContain("p.cover_image_url");
    expect(captured[2]).toContain("entity_type = 'product'");
    expect(captured[2]).toContain("entity_type = 'subcategory'");
    expect(captured[2]!.indexOf("prod_media")).toBeLessThan(
      captured[2]!.indexOf("sub_media"),
    );
    expect(captured[2]!.indexOf("sub_media")).toBeLessThan(
      captured[2]!.indexOf("svc_media"),
    );
    expect(captured[2]).toContain("media_role IN ('cover', 'gallery', 'icon')");
    expect(captured[2]).toContain("sc.content_status = 'approved'");
    expect(captured[2]).toContain("sc.active = true");
    expect(
      captured.every((sql) =>
        sql.includes("COALESCE(thumbnail_url, media_url)"),
      ),
    ).toBe(true);
    expect(captured[0]).toContain("COALESCE(thumbnail_url, media_url)");
    expect(captured[1]).toContain("COALESCE(thumbnail_url, media_url)");
    expect(captured[2]).toContain("COALESCE(thumbnail_url, media_url)");
  });

  it("does not inherit occasion photography into service or product search SQL", async () => {
    const captured: string[] = [];
    const pool = {
      query: async (sql: string) => {
        captured.push(sql);
        return { rows: [] };
      },
    } as unknown as Pool;
    const search = new PostgresSearchRepository(pool);
    await search.searchServices(["decor"], 5);
    await search.searchProducts(["mandap"], 5);
    expect(captured[0]).not.toContain("entity_type = 'occasion'");
    expect(captured[1]).not.toContain("entity_type = 'occasion'");
  });

  it("hides products when the parent subcategory is not customer-visible", async () => {
    const captured: string[] = [];
    const pool = {
      query: async (sql: string) => {
        captured.push(sql);
        return { rows: [] };
      },
    } as unknown as Pool;
    await new PostgresSearchRepository(pool).searchProducts(["stage"], 5);
    expect(captured[0]).toContain("sc.content_status = 'approved'");
    expect(captured[0]).toContain("sc.active = true");
    expect(captured[0]).toContain("p.placeholder = false");
    expect(captured[0]).toContain("cs.customer_selectable = true");
  });
});
