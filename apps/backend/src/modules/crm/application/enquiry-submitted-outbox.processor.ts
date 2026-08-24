import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../../database/database.module";
import {
  LEAD_REPOSITORY,
  type EnquirySubmittedPayload,
  type LeadRepository,
} from "../ports/lead-repository";

const TOPIC = "enquiry.submitted";
const POLL_INTERVAL_MS = 2_000;
const BATCH_SIZE = 20;

interface OutboxRow {
  readonly id: string;
  readonly payload: unknown;
  readonly attempts: number;
}

/**
 * CRM-side consumer for enquiry domain outbox events.
 * Creates the CRM lead asynchronously so the Enquiry module never writes
 * to `leads` / `lead_activities`.
 */
@Injectable()
export class EnquirySubmittedOutboxProcessor
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(EnquirySubmittedOutboxProcessor.name);
  private timer: NodeJS.Timeout | undefined;
  private ticking = false;

  public constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
  ) {}

  public onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, POLL_INTERVAL_MS);
    // Avoid keeping the process alive solely for the poller in tests.
    this.timer.unref?.();
    void this.tick();
  }

  public onModuleDestroy(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /** Exposed for tests / manual flush. */
  public async tick(): Promise<void> {
    if (this.ticking) {
      return;
    }
    this.ticking = true;
    try {
      const claimed = await this.claimBatch();
      for (const row of claimed) {
        await this.processRow(row);
      }
    } catch (error) {
      this.logger.error(
        `Outbox poll failed for ${TOPIC}`,
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.ticking = false;
    }
  }

  private async claimBatch(): Promise<readonly OutboxRow[]> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<OutboxRow>(
        `WITH next_rows AS (
           SELECT id
           FROM outbox_events
           WHERE topic = $1
             AND status = 'pending'
             AND available_at <= now()
           ORDER BY created_at ASC
           FOR UPDATE SKIP LOCKED
           LIMIT $2
         )
         UPDATE outbox_events o
         SET status = 'processing',
             attempts = o.attempts + 1
         FROM next_rows
         WHERE o.id = next_rows.id
         RETURNING o.id, o.payload, o.attempts`,
        [TOPIC, BATCH_SIZE],
      );
      await client.query("COMMIT");
      return result.rows;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async processRow(row: OutboxRow): Promise<void> {
    try {
      const payload = parsePayload(row.payload);
      await this.leads.createFromEnquirySubmitted(payload);
      await this.pool.query(
        `UPDATE outbox_events
         SET status = 'published',
             published_at = now(),
             last_error = NULL
         WHERE id = $1`,
        [row.id],
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown outbox failure";
      this.logger.warn(
        `Failed to process ${TOPIC} outbox ${row.id}: ${message}`,
      );
      await this.pool.query(
        `UPDATE outbox_events
         SET status = CASE
               WHEN attempts >= 8 THEN 'failed'
               ELSE 'pending'
             END,
             available_at = now() + make_interval(secs => LEAST(300, attempts * 5)),
             last_error = $2
         WHERE id = $1`,
        [row.id, message.slice(0, 2000)],
      );
    }
  }
}

function parsePayload(value: unknown): EnquirySubmittedPayload {
  if (value === null || typeof value !== "object") {
    throw new Error("enquiry.submitted payload must be an object");
  }
  const record = value as Record<string, unknown>;
  const enquiryId = asNonEmptyString(record.enquiryId, "enquiryId");
  const branchId = asNonEmptyString(record.branchId, "branchId");
  const customerId = asNonEmptyString(record.customerId, "customerId");
  const firstResponseDueAt = asNonEmptyString(
    record.firstResponseDueAt,
    "firstResponseDueAt",
  );
  return { enquiryId, branchId, customerId, firstResponseDueAt };
}

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`enquiry.submitted payload missing ${field}`);
  }
  return value;
}
