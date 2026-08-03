import type { PoolClient } from "pg";

/**
 * Shared event-anchored Pattern B writers + audit/outbox.
 * Module-scoped tables use append-module-pattern-b.ts.
 */

export async function appendEventTimeline(
  client: PoolClient,
  input: {
    readonly eventRecordId: string;
    readonly actorUserId: string;
    readonly entryType: string;
    readonly title: string;
    readonly content?: string;
    readonly customerVisible?: boolean;
    readonly metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO event_timelines (
       event_record_id, actor_user_id, entry_type, title, content,
       customer_visible, metadata
     ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
    [
      input.eventRecordId,
      input.actorUserId,
      input.entryType,
      input.title,
      input.content ?? null,
      input.customerVisible ?? true,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}

export async function appendEventActivity(
  client: PoolClient,
  input: {
    readonly eventRecordId: string;
    readonly actorUserId: string;
    readonly activityType: string;
    readonly content?: string;
    readonly customerVisible?: boolean;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO event_activities (
       event_record_id, actor_user_id, activity_type, content, customer_visible
     ) VALUES ($1,$2,$3,$4,$5)`,
    [
      input.eventRecordId,
      input.actorUserId,
      input.activityType,
      input.content ?? null,
      input.customerVisible ?? true,
    ],
  );
}

export async function appendEventTimelineAndActivity(
  client: PoolClient,
  input: {
    readonly eventRecordId: string;
    readonly actorUserId: string;
    readonly entryType: string;
    readonly title: string;
    readonly activityType: string;
    readonly content?: string;
    readonly customerVisible?: boolean;
    readonly metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await appendEventTimeline(client, {
    eventRecordId: input.eventRecordId,
    actorUserId: input.actorUserId,
    entryType: input.entryType,
    title: input.title,
    ...(input.content === undefined ? {} : { content: input.content }),
    ...(input.customerVisible === undefined
      ? {}
      : { customerVisible: input.customerVisible }),
    ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
  });
  await appendEventActivity(client, {
    eventRecordId: input.eventRecordId,
    actorUserId: input.actorUserId,
    activityType: input.activityType,
    ...(input.content === undefined ? {} : { content: input.content }),
    ...(input.customerVisible === undefined
      ? {}
      : { customerVisible: input.customerVisible }),
  });
}

export async function writeAuditOutbox(
  client: PoolClient,
  input: {
    readonly requestId: string;
    readonly actorUserId: string;
    readonly actorRole: string;
    readonly branchId: string;
    readonly entityId: string;
    readonly entityType: string;
    readonly action: string;
    readonly version: number;
    readonly payload: Record<string, unknown>;
    readonly outboxTopic: string;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO audit_events (
       request_id, actor_user_id, actor_role, branch_id,
       entity_type, entity_id, action, after_version, metadata
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      input.requestId,
      input.actorUserId,
      input.actorRole,
      input.branchId,
      input.entityType,
      input.entityId,
      input.action,
      input.version,
      JSON.stringify(input.payload),
    ],
  );
  await client.query(
    `INSERT INTO outbox_events (
       topic, aggregate_type, aggregate_id, aggregate_version, payload
     ) VALUES ($1,$2,$3,$4,$5)`,
    [
      input.outboxTopic,
      input.entityType,
      input.entityId,
      input.version,
      JSON.stringify(input.payload),
    ],
  );
}
