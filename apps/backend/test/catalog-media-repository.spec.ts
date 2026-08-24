import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Pool } from "pg";
import {
  assertCatalogMediaApproval,
  planCoverLifecycle,
  PostgresCatalogRepository,
} from "../src/modules/catalog/adapters/postgres-catalog.repository";
import { CatalogMediaValidationError } from "../src/modules/catalog/domain/catalog-media";
import type { CatalogMediaRecord } from "../src/modules/catalog/ports/catalog-repository";

interface MediaRow {
  id: string;
  entity_type: CatalogMediaRecord["entityType"];
  entity_code: string;
  media_url: string;
  thumbnail_url: string | null;
  media_role: CatalogMediaRecord["mediaRole"];
  display_order: number;
  alt_text: string;
  review_status: CatalogMediaRecord["reviewStatus"];
  active: boolean;
  hyderabad_customer_visible: boolean;
  source_kind: CatalogMediaRecord["sourceKind"];
  source_ref: string | null;
  licence_note: string | null;
  version: number;
}

interface RevisionRow {
  entityType: string;
  entityCode: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  actorUserId: unknown;
  reason: unknown;
}

class FakeMediaPool {
  public media: MediaRow[] = [];
  public revisions: RevisionRow[] = [];
  public failAuditField: string | null = null;
  public rolledBack = false;
  public statements: string[] = [];
  public codes = new Set(["wedding", "photography"]);
  private mediaBackup: MediaRow[] = [];
  private revisionBackup: RevisionRow[] = [];

  public async connect(): Promise<{
    query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
    release: () => void;
  }> {
    return {
      query: (sql: string, params: unknown[] = []) => this.query(sql, params),
      release: () => undefined,
    };
  }

  public async query(
    sql: string,
    params: unknown[] = [],
  ): Promise<{ rows: unknown[] }> {
    this.statements.push(sql);
    const text = sql.replace(/\s+/gu, " ").trim();
    if (text === "BEGIN") {
      this.mediaBackup = this.media.map((row) => ({ ...row }));
      this.revisionBackup = this.revisions.map((row) => ({ ...row }));
      this.rolledBack = false;
      return { rows: [] };
    }
    if (text === "COMMIT") {
      return { rows: [] };
    }
    if (text === "ROLLBACK") {
      this.media = this.mediaBackup.map((row) => ({ ...row }));
      this.revisions = this.revisionBackup.map((row) => ({ ...row }));
      this.rolledBack = true;
      return { rows: [] };
    }
    if (sql.includes("SELECT EXISTS")) {
      return { rows: [{ exists: this.codes.has(String(params[0])) }] };
    }
    if (sql.includes("INSERT INTO catalog_content_revisions")) {
      const field = String(params[2]);
      if (this.failAuditField === field) {
        throw new Error("audit insert failed");
      }
      this.revisions.push({
        entityType: String(params[0]),
        entityCode: String(params[1]),
        field,
        oldValue: params[3],
        newValue: params[4],
        actorUserId: params[5],
        reason: params[6],
      });
      return { rows: [] };
    }
    if (sql.includes("INSERT INTO catalog_media")) {
      const row: MediaRow = {
        id: randomUUID(),
        entity_type: params[0] as MediaRow["entity_type"],
        entity_code: String(params[1]),
        media_url: String(params[2]),
        thumbnail_url: (params[3] as string | null) ?? null,
        media_role: params[4] as MediaRow["media_role"],
        display_order: Number(params[5]),
        alt_text: String(params[6]),
        review_status: params[7] as MediaRow["review_status"],
        active: Boolean(params[8]),
        hyderabad_customer_visible: Boolean(params[9]),
        source_kind: params[10] as MediaRow["source_kind"],
        source_ref: (params[11] as string | null) ?? null,
        licence_note: (params[12] as string | null) ?? null,
        version: 1,
      };
      this.media.push(row);
      return { rows: [row] };
    }
    if (sql.includes("SET active = false")) {
      const id = String(params[0]);
      this.media = this.media.map((row) =>
        row.id === id
          ? { ...row, active: false, version: row.version + 1 }
          : row,
      );
      return { rows: [] };
    }
    if (sql.includes("UPDATE catalog_media")) {
      const id = String(params[0]);
      this.media = this.media.map((row) =>
        row.id === id
          ? {
              ...row,
              media_url: String(params[1]),
              thumbnail_url: (params[2] as string | null) ?? null,
              display_order: Number(params[3]),
              alt_text: String(params[4]),
              review_status: params[5] as MediaRow["review_status"],
              active: Boolean(params[6]),
              hyderabad_customer_visible: Boolean(params[7]),
              source_kind: params[8] as MediaRow["source_kind"],
              source_ref: (params[9] as string | null) ?? null,
              licence_note: (params[10] as string | null) ?? null,
              version: row.version + 1,
            }
          : row,
      );
      return { rows: [] };
    }
    if (sql.includes("media_role = 'cover'") && sql.includes("FOR UPDATE")) {
      return {
        rows: this.media
          .filter(
            (row) =>
              row.entity_type === params[0] &&
              row.entity_code === params[1] &&
              row.media_role === "cover",
          )
          .sort((left, right) => left.id.localeCompare(right.id)),
      };
    }
    if (sql.includes("FROM catalog_media") && sql.includes("WHERE id")) {
      return { rows: this.media.filter((row) => row.id === params[0]) };
    }
    return { rows: [] };
  }
}

function repoFrom(pool: FakeMediaPool): PostgresCatalogRepository {
  return new PostgresCatalogRepository(pool as unknown as Pool);
}

describe("catalogue media persistence", () => {
  it("rejects unsafe media URLs before write", async () => {
    const catalog = repoFrom(new FakeMediaPool());
    await expect(
      catalog.upsertCatalogMedia({
        entityType: "occasion",
        entityCode: "wedding",
        mediaUrl: "javascript:alert(1)",
        mediaRole: "cover",
        altText: "Wedding cover",
      }),
    ).rejects.toBeInstanceOf(CatalogMediaValidationError);
  });

  it("rejects unknown entity codes", async () => {
    const catalog = repoFrom(new FakeMediaPool());
    await expect(
      catalog.upsertCatalogMedia({
        entityType: "product",
        entityCode: "not-a-real-product",
        mediaUrl: "https://cdn.example/p.jpg",
        mediaRole: "cover",
        altText: "Missing product",
      }),
    ).rejects.toMatchObject({ message: "Unsupported entity code" });
  });

  it("rejects unspecified and incomplete licensed approval", () => {
    expect(() => {
      assertCatalogMediaApproval({
        reviewStatus: "approved",
        sourceKind: "unspecified",
        sourceRef: null,
        licenceNote: null,
      });
    }).toThrow(/unspecified media cannot be approved/u);
    expect(() => {
      assertCatalogMediaApproval({
        reviewStatus: "approved",
        sourceKind: "licensed",
        sourceRef: "x",
        licenceNote: "y",
      });
    }).toThrow(/licence/u);
  });

  it("clears nullable patch fields with null and leaves omitted fields", async () => {
    const pool = new FakeMediaPool();
    const catalog = repoFrom(pool);
    const created = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/w.jpg",
      thumbnailUrl: "https://cdn.example/w-thumb.jpg",
      mediaRole: "cover",
      altText: "Wedding",
      sourceKind: "internal",
      sourceRef: "internal-ref",
      licenceNote: "internal-licence",
      actorUserId: "actor-1",
    });
    const cleared = await catalog.updateCatalogMedia({
      id: created.id,
      thumbnailUrl: null,
      sourceRef: null,
      licenceNote: null,
      actorUserId: "actor-1",
    });
    expect(cleared?.thumbnailUrl).toBeNull();
    expect(cleared?.sourceRef).toBeNull();
    expect(cleared?.licenceNote).toBeNull();
    expect(cleared?.mediaUrl).toBe("https://cdn.example/w.jpg");
    const unchanged = await catalog.updateCatalogMedia({
      id: created.id,
      actorUserId: "actor-1",
    });
    expect(unchanged?.thumbnailUrl).toBeNull();
    expect(
      pool.revisions.filter((row) => row.field === "media_url"),
    ).toHaveLength(1);
  });

  it("writes a revision per changed field and none when unchanged", async () => {
    const pool = new FakeMediaPool();
    const catalog = repoFrom(pool);
    const created = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/old.jpg",
      mediaRole: "cover",
      altText: "Old alt",
      sourceKind: "internal",
      actorUserId: "actor-1",
      reason: "create",
    });
    pool.revisions = [];
    await catalog.updateCatalogMedia({
      id: created.id,
      mediaUrl: "https://cdn.example/new.jpg",
      reviewStatus: "in_review",
      actorUserId: "actor-1",
      reason: "replace",
    });
    const fields = pool.revisions.map((row) => row.field);
    expect(fields).toEqual(["media_url", "review_status"]);
    expect(pool.revisions[0]?.oldValue).toBe("https://cdn.example/old.jpg");
    expect(pool.revisions[0]?.newValue).toBe("https://cdn.example/new.jpg");
    expect(pool.revisions[0]?.entityType).toBe("event_type");
    const before = pool.revisions.length;
    await catalog.updateCatalogMedia({
      id: created.id,
      mediaUrl: "https://cdn.example/new.jpg",
      actorUserId: "actor-1",
    });
    expect(pool.revisions).toHaveLength(before);
  });

  it("rolls back media mutation when audit insert fails", async () => {
    const pool = new FakeMediaPool();
    const catalog = repoFrom(pool);
    const created = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/old.jpg",
      mediaRole: "cover",
      altText: "Old alt",
      sourceKind: "internal",
    });
    pool.failAuditField = "media_url";
    await expect(
      catalog.updateCatalogMedia({
        id: created.id,
        mediaUrl: "https://cdn.example/new.jpg",
        actorUserId: "actor-1",
      }),
    ).rejects.toThrow("audit insert failed");
    expect(pool.rolledBack).toBe(true);
    expect(pool.media[0]?.media_url).toBe("https://cdn.example/old.jpg");
  });

  it("keeps the approved cover public while a draft replacement coexists", async () => {
    const pool = new FakeMediaPool();
    const catalog = repoFrom(pool);
    const approved = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/live.jpg",
      mediaRole: "cover",
      altText: "Live",
      reviewStatus: "approved",
      sourceKind: "internal",
    });
    const draft = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/next.jpg",
      mediaRole: "cover",
      altText: "Next",
      reviewStatus: "draft",
      sourceKind: "internal",
    });
    expect(approved.active).toBe(true);
    expect(approved.reviewStatus).toBe("approved");
    expect(draft.active).toBe(false);
    expect(draft.reviewStatus).toBe("draft");
    const live = pool.media.find((row) => row.id === approved.id);
    expect(live?.active).toBe(true);
    expect(live?.review_status).toBe("approved");
  });

  it("promotes a draft cover, deactivates the previous public cover, and audits both", async () => {
    const pool = new FakeMediaPool();
    const catalog = repoFrom(pool);
    const approved = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/live.jpg",
      mediaRole: "cover",
      altText: "Live",
      reviewStatus: "approved",
      sourceKind: "internal",
      actorUserId: "actor-1",
    });
    const draft = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/next.jpg",
      mediaRole: "cover",
      altText: "Next",
      reviewStatus: "draft",
      sourceKind: "internal",
      actorUserId: "actor-1",
    });
    pool.revisions = [];
    const promoted = await catalog.updateCatalogMedia({
      id: draft.id,
      reviewStatus: "approved",
      actorUserId: "actor-1",
      reason: "promote",
    });
    expect(promoted?.active).toBe(true);
    expect(promoted?.reviewStatus).toBe("approved");
    expect(pool.media.find((row) => row.id === approved.id)?.active).toBe(
      false,
    );
    expect(
      pool.media.filter(
        (row) => row.active && row.review_status === "approved",
      ),
    ).toHaveLength(1);
    expect(
      pool.revisions.some(
        (row) => row.field === "active" && row.oldValue === "true",
      ),
    ).toBe(true);
    expect(
      pool.revisions.some(
        (row) => row.field === "review_status" && row.oldValue === "draft",
      ),
    ).toBe(true);
  });

  it("rejection leaves the public cover in place", async () => {
    const pool = new FakeMediaPool();
    const catalog = repoFrom(pool);
    const approved = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/live.jpg",
      mediaRole: "cover",
      altText: "Live",
      reviewStatus: "approved",
      sourceKind: "internal",
    });
    const draft = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/next.jpg",
      mediaRole: "cover",
      altText: "Next",
      reviewStatus: "draft",
      sourceKind: "internal",
    });
    await catalog.updateCatalogMedia({
      id: draft.id,
      reviewStatus: "rejected",
    });
    expect(pool.media.find((row) => row.id === approved.id)?.active).toBe(true);
    expect(pool.media.find((row) => row.id === draft.id)?.review_status).toBe(
      "rejected",
    );
    expect(pool.media.find((row) => row.id === draft.id)?.active).toBe(false);
  });

  it("rolls back a failed cover promotion and restores the previous public cover", async () => {
    const pool = new FakeMediaPool();
    const catalog = repoFrom(pool);
    const approved = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/live.jpg",
      mediaRole: "cover",
      altText: "Live",
      reviewStatus: "approved",
      sourceKind: "internal",
    });
    const draft = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/next.jpg",
      mediaRole: "cover",
      altText: "Next",
      reviewStatus: "draft",
      sourceKind: "internal",
    });
    pool.failAuditField = "review_status";
    await expect(
      catalog.updateCatalogMedia({
        id: draft.id,
        reviewStatus: "approved",
        actorUserId: "actor-1",
      }),
    ).rejects.toThrow("audit insert failed");
    expect(pool.rolledBack).toBe(true);
    expect(pool.media.find((row) => row.id === approved.id)?.active).toBe(true);
    expect(pool.media.find((row) => row.id === draft.id)?.review_status).toBe(
      "draft",
    );
  });

  it("does not republish a historical approved inactive cover on metadata-only edits", async () => {
    const pool = new FakeMediaPool();
    const catalog = repoFrom(pool);
    const historical = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/old.jpg",
      mediaRole: "cover",
      altText: "Old",
      reviewStatus: "approved",
      sourceKind: "internal",
    });
    const live = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/live.jpg",
      mediaRole: "cover",
      altText: "Live",
      reviewStatus: "draft",
      sourceKind: "internal",
    });
    await catalog.updateCatalogMedia({
      id: live.id,
      reviewStatus: "approved",
      actorUserId: "actor-1",
    });
    expect(pool.media.find((row) => row.id === historical.id)?.active).toBe(
      false,
    );
    const afterAlt = await catalog.updateCatalogMedia({
      id: historical.id,
      altText: "Historical alt",
      actorUserId: "actor-1",
    });
    expect(afterAlt?.active).toBe(false);
    expect(afterAlt?.reviewStatus).toBe("approved");
    expect(pool.media.find((row) => row.id === live.id)?.active).toBe(true);
    const afterSource = await catalog.updateCatalogMedia({
      id: historical.id,
      sourceKind: "licensed",
      sourceRef: "licence-ref-1",
      licenceNote: "licensed for Hyderabad catalogue",
      actorUserId: "actor-1",
    });
    expect(afterSource?.active).toBe(false);
    expect(pool.media.filter((row) => row.active)).toHaveLength(1);
  });

  it("deactivates the live cover without activating a replacement", async () => {
    const pool = new FakeMediaPool();
    const catalog = repoFrom(pool);
    const live = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/live.jpg",
      mediaRole: "cover",
      altText: "Live",
      reviewStatus: "approved",
      sourceKind: "internal",
    });
    const draft = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/next.jpg",
      mediaRole: "cover",
      altText: "Next",
      reviewStatus: "draft",
      sourceKind: "internal",
    });
    const deactivated = await catalog.updateCatalogMedia({
      id: live.id,
      active: false,
    });
    expect(deactivated?.active).toBe(false);
    expect(pool.media.find((row) => row.id === draft.id)?.active).toBe(false);
  });

  it("does not promote draft to approved when active is explicitly false", async () => {
    const pool = new FakeMediaPool();
    const catalog = repoFrom(pool);
    const live = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/live.jpg",
      mediaRole: "cover",
      altText: "Live",
      reviewStatus: "approved",
      sourceKind: "internal",
    });
    const draft = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/next.jpg",
      mediaRole: "cover",
      altText: "Next",
      reviewStatus: "draft",
      sourceKind: "internal",
    });
    const kept = await catalog.updateCatalogMedia({
      id: draft.id,
      reviewStatus: "approved",
      active: false,
      sourceKind: "internal",
    });
    expect(kept?.reviewStatus).toBe("approved");
    expect(kept?.active).toBe(false);
    expect(pool.media.find((row) => row.id === live.id)?.active).toBe(true);
  });

  it("reactivates an approved inactive cover only with explicit active true", async () => {
    const pool = new FakeMediaPool();
    const catalog = repoFrom(pool);
    const historical = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/old.jpg",
      mediaRole: "cover",
      altText: "Old",
      reviewStatus: "approved",
      sourceKind: "internal",
    });
    const live = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/live.jpg",
      mediaRole: "cover",
      altText: "Live",
      reviewStatus: "draft",
      sourceKind: "internal",
    });
    await catalog.updateCatalogMedia({
      id: live.id,
      reviewStatus: "approved",
    });
    const revived = await catalog.updateCatalogMedia({
      id: historical.id,
      active: true,
    });
    expect(revived?.active).toBe(true);
    expect(pool.media.find((row) => row.id === live.id)?.active).toBe(false);
  });

  it("locks the full cover set in ORDER BY id before any promotion mutation", async () => {
    const pool = new FakeMediaPool();
    const catalog = repoFrom(pool);
    const live = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/live.jpg",
      mediaRole: "cover",
      altText: "Live",
      reviewStatus: "approved",
      sourceKind: "internal",
    });
    const draft = await catalog.upsertCatalogMedia({
      entityType: "occasion",
      entityCode: "wedding",
      mediaUrl: "https://cdn.example/next.jpg",
      mediaRole: "cover",
      altText: "Next",
      reviewStatus: "draft",
      sourceKind: "internal",
    });
    pool.statements = [];
    await catalog.updateCatalogMedia({
      id: draft.id,
      reviewStatus: "approved",
      actorUserId: "actor-1",
    });
    const lockIndex = pool.statements.findIndex(
      (sql) =>
        sql.includes("ORDER BY id") &&
        sql.includes("FOR UPDATE") &&
        sql.includes("media_role = 'cover'"),
    );
    const idOnlyLock = pool.statements.findIndex((sql) =>
      /WHERE id = \$1\s+FOR UPDATE/u.test(sql.replace(/\s+/gu, " ")),
    );
    const mutationIndex = pool.statements.findIndex((sql) =>
      sql.includes("UPDATE catalog_media"),
    );
    expect(lockIndex).toBeGreaterThanOrEqual(0);
    expect(pool.statements[0] ?? "").not.toContain("FOR UPDATE");
    expect(idOnlyLock).toBe(-1);
    expect(mutationIndex).toBeGreaterThan(lockIndex);
    expect(pool.media.find((row) => row.id === live.id)?.active).toBe(false);
  });

  it("documents the 0020 one-active-cover partial unique index", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "../../infrastructure/postgres/migrations/0020_catalog_media.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("catalog_media_one_active_cover");
    expect(sql).toMatch(
      /ON catalog_media \(entity_type, entity_code\)[\s\S]*WHERE media_role = 'cover' AND active/u,
    );
    expect(
      planCoverLifecycle({
        mediaRole: "cover",
        existingActive: false,
        existingReviewStatus: "approved",
        nextReviewStatus: "approved",
      }).promote,
    ).toBe(false);
  });
});
