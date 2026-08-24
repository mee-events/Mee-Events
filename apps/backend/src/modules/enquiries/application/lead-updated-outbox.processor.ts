import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import type { LeadStatus } from "@me-event/api-contracts";
import type { Pool } from "pg";
import { PG_POOL } from "../../../database/database.module";
import {
  ENQUIRY_REPOSITORY,
  type EnquiryRepository,
} from "../ports/enquiry-repository";

const TOPIC = "crm.lead.updated";
const POLL_INTERVAL_MS = 2_000;
const BATCH_SIZE = 20;

const LEAD_STATUSES = new Set<LeadStatus>([
  "new",
  "claimed",
  "contacted",
  "qualified",
  "quoted",
  "converted",
  "lost",
  "closed",
]);

interface OutboxRow {
  readonly id: string;
  readonly payload: unknown;
  readonly attempts: number;
}

interface LeadUpdatedPayload {
  readonly leadId: string;
  readonly enquiryId: string;
  readonly status: LeadStatus;
}

/**
 * Enquiry-side consumer for CRM lead updates.
 * Owns all writes to `enquiries.status` driven by CRM pipeline changes.
 */
@Injectable()
export class LeadUpdatedOutboxProcessor
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(LeadUpdatedOutboxProcessor.name);
  private timer: NodeJS.Timeout | undefined;
  private ticking = false;

  public constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(ENQUIRY_REPOSITORY) private readonly enquiries: EnquiryRepository,
  ) {}

  public onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, POLL_INTERVAL_MS);
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
      await this.enquiries.syncStatusFromCrmLead(
        payload.enquiryId,
        payload.status,
      );
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

function parsePayload(value: unknown): LeadUpdatedPayload {
  if (value === null || typeof value !== "object") {
    throw new Error("crm.lead.updated payload must be an object");
  }
  const record = value as Record<string, unknown>;
  const leadId = asNonEmptyString(record.leadId, "leadId");
  const enquiryId = asNonEmptyString(record.enquiryId, "enquiryId");
  const statusRaw = asNonEmptyString(record.status, "status");
  if (!LEAD_STATUSES.has(statusRaw as LeadStatus)) {
    throw new Error(
      `crm.lead.updated payload has invalid status: ${statusRaw}`,
    );
  }
  return {
    leadId,
    enquiryId,
    status: statusRaw as LeadStatus,
  };
}

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`crm.lead.updated payload missing ${field}`);
  }
  return value;
}
