import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import type { Pool } from "pg";
import {
  claimOutboxBatch,
  markOutboxAttemptFailed,
  markOutboxPublished,
} from "../../../common/outbox/outbox-delivery";
import { PG_POOL } from "../../../database/database.module";
import {
  LEAD_REPOSITORY,
  type EnquirySubmittedPayload,
  type LeadRepository,
} from "../ports/lead-repository";

const TOPIC = "enquiry.submitted";
const POLL_INTERVAL_MS = 2_000;
const BATCH_SIZE = 20;

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
      await this.leads.createFromEnquirySubmitted(parsed);
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
