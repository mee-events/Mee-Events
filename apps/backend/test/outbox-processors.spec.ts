import { describe, expect, it, vi } from "vitest";
import type { Pool, PoolClient } from "pg";
import { EnquirySubmittedOutboxProcessor } from "../src/modules/crm/application/enquiry-submitted-outbox.processor";
import type { LeadRepository } from "../src/modules/crm/ports/lead-repository";
import { LeadUpdatedOutboxProcessor } from "../src/modules/enquiries/application/lead-updated-outbox.processor";
import type { EnquiryRepository } from "../src/modules/enquiries/ports/enquiry-repository";

describe("live outbox processors (unit tests, mocked Pool)", () => {
  function normalize(sql: string): string {
    return sql.replace(/\s+/g, " ").trim();
  }

  function createPool(options: {
    readonly claimRows: { id: string; payload: unknown; attempts: number }[];
    readonly failStatus?: "failed" | "pending";
  }): {
    readonly pool: Pool;
    readonly published: { id: string; attempts: number }[];
    readonly failed: { id: string; attempts: number; message: string }[];
  } {
    const published: { id: string; attempts: number }[] = [];
    const failed: { id: string; attempts: number; message: string }[] = [];
    let remainingClaims = options.claimRows;
    const clientQuery = vi.fn(async (sql: string) => {
      const normalized = normalize(sql);
      if (normalized === "BEGIN" || normalized === "COMMIT") {
        return { rows: [] };
      }
      if (normalized.includes("FOR UPDATE SKIP LOCKED")) {
        const rows = remainingClaims;
        remainingClaims = [];
        return { rows };
      }
      return { rows: [] };
    });
    const poolQuery = vi.fn(async (sql: string, params?: unknown[]) => {
      const normalized = normalize(sql);
      if (normalized.includes("status = 'published'")) {
        published.push({
          id: String(params?.[0]),
          attempts: Number(params?.[1]),
        });
        return { rows: [{ id: params?.[0] }] };
      }
      if (normalized.includes("WHEN attempts >=")) {
        failed.push({
          id: String(params?.[0]),
          attempts: Number(params?.[1]),
          message: String(params?.[2]),
        });
        return { rows: [{ status: options.failStatus ?? "failed" }] };
      }
      return { rows: [] };
    });
    const pool = {
      connect: vi.fn(async () => {
        return {
          query: clientQuery,
          release: vi.fn(),
        } as unknown as PoolClient;
      }),
      query: poolQuery,
    } as unknown as Pool;
    return { pool, published, failed };
  }

  it("creates one lead from enquiry.submitted and publishes the claimed generation", async () => {
    const payload = {
      enquiryId: "enq-1",
      branchId: "branch-1",
      customerId: "cust-1",
      firstResponseDueAt: "2026-08-26T13:00:00.000Z",
    };
    const harness = createPool({
      claimRows: [{ id: "outbox-1", payload, attempts: 1 }],
    });
    const createFromEnquirySubmitted = vi.fn(async () => ({
      leadId: "lead-1",
      created: true,
    }));
    const processor = new EnquirySubmittedOutboxProcessor(harness.pool, {
      createFromEnquirySubmitted,
    } as unknown as LeadRepository);
    await processor.tick();
    await processor.tick();
    expect(createFromEnquirySubmitted).toHaveBeenCalledTimes(1);
    expect(createFromEnquirySubmitted).toHaveBeenCalledWith(payload);
    expect(harness.published).toEqual([{ id: "outbox-1", attempts: 1 }]);
    expect(harness.failed).toEqual([]);
    processor.onModuleDestroy();
  });

  it("dead-letters a poison enquiry.submitted payload without creating a lead", async () => {
    const harness = createPool({
      claimRows: [
        { id: "outbox-poison", payload: { enquiryId: 42 }, attempts: 8 },
      ],
      failStatus: "failed",
    });
    const createFromEnquirySubmitted = vi.fn();
    const processor = new EnquirySubmittedOutboxProcessor(harness.pool, {
      createFromEnquirySubmitted,
    } as unknown as LeadRepository);
    await processor.tick();
    expect(createFromEnquirySubmitted).not.toHaveBeenCalled();
    expect(harness.published).toEqual([]);
    expect(harness.failed).toEqual([
      {
        id: "outbox-poison",
        attempts: 8,
        message: "enquiry.submitted payload missing enquiryId",
      },
    ]);
    processor.onModuleDestroy();
  });

  it("does not start a second claim while the same process tick is in flight", async () => {
    let releaseConnect: (() => void) | undefined;
    const connectGate = new Promise<void>((resolve) => {
      releaseConnect = resolve;
    });
    const connect = vi.fn(async () => {
      await connectGate;
      return {
        query: vi.fn(async (sql: string) => {
          const normalized = normalize(sql);
          if (normalized === "BEGIN" || normalized === "COMMIT") {
            return { rows: [] };
          }
          return { rows: [] };
        }),
        release: vi.fn(),
      } as unknown as PoolClient;
    });
    const pool = {
      connect,
      query: vi.fn(),
    } as unknown as Pool;
    const processor = new EnquirySubmittedOutboxProcessor(pool, {
      createFromEnquirySubmitted: vi.fn(),
    } as unknown as LeadRepository);
    const first = processor.tick();
    const second = processor.tick();
    releaseConnect?.();
    await Promise.all([first, second]);
    expect(connect).toHaveBeenCalledTimes(1);
    processor.onModuleDestroy();
  });

  it("syncs crm.lead.updated once and publishes; poison is dead-lettered", async () => {
    const payload = {
      leadId: "lead-1",
      enquiryId: "enq-1",
      status: "contacted",
    };
    const harness = createPool({
      claimRows: [{ id: "outbox-2", payload, attempts: 2 }],
    });
    const syncStatusFromCrmLead = vi.fn(async () => undefined);
    const processor = new LeadUpdatedOutboxProcessor(harness.pool, {
      syncStatusFromCrmLead,
    } as unknown as EnquiryRepository);
    await processor.tick();
    expect(syncStatusFromCrmLead).toHaveBeenCalledWith("enq-1", "contacted");
    expect(harness.published).toEqual([{ id: "outbox-2", attempts: 2 }]);
    processor.onModuleDestroy();

    const poison = createPool({
      claimRows: [
        {
          id: "outbox-bad-status",
          payload: { leadId: "lead-1", enquiryId: "enq-1", status: "nope" },
          attempts: 8,
        },
      ],
      failStatus: "failed",
    });
    const poisonSync = vi.fn();
    const poisonProcessor = new LeadUpdatedOutboxProcessor(poison.pool, {
      syncStatusFromCrmLead: poisonSync,
    } as unknown as EnquiryRepository);
    await poisonProcessor.tick();
    expect(poisonSync).not.toHaveBeenCalled();
    expect(poison.failed[0]?.id).toBe("outbox-bad-status");
    expect(poison.failed[0]?.message).toContain("invalid status");
    poisonProcessor.onModuleDestroy();
  });
});
