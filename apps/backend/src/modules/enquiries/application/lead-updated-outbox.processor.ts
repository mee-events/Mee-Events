import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import type { LeadStatus } from "@me-event/api-contracts";
import type { Pool } from "pg";
import {
  claimOutboxBatch,
  markOutboxAttemptFailed,
  markOutboxPublished,
} from "../../../common/outbox/outbox-delivery";
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
      const claimed = await claimOutboxBatch(this.pool, TOPIC, BATCH_SIZE);
      for (const row of claimed) {
        await this.processRow(row.id, row.payload, row.attempts);
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

  private async processRow(
    id: string,
    payload: unknown,
    attempts: number,
  ): Promise<void> {
    try {
      const parsed = parsePayload(payload);
      await this.enquiries.syncStatusFromCrmLead(
        parsed.enquiryId,
        parsed.status,
      );
      await markOutboxPublished(this.pool, id, attempts);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown outbox failure";
      this.logger.warn(
        `Failed to process ${TOPIC} outbox ${id} (attempt ${String(attempts)}): ${message}`,
      );
      const outcome = await markOutboxAttemptFailed(
        this.pool,
        id,
        attempts,
        message,
      );
      if (outcome === "failed") {
        this.logger.warn(
          `Dead-lettered ${TOPIC} outbox ${id} after ${String(attempts)} attempts`,
        );
      }
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
