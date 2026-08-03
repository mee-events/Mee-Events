import type { PoolClient } from "pg";

/**
 * Shared Pattern B module-owned timeline/activity writer.
 * Event-anchored narrative continues to use event_timelines / event_activities.
 * These helpers write the module-scoped tables introduced in 0013.
 */

export type PatternBModule =
  | "vendor"
  | "worker"
  | "inventory"
  | "finance"
  | "operations";

const MODULE_TABLES = {
  vendor: {
    timeline: "vendor_timelines",
    activity: "vendor_activities",
    fk: "vendor_id",
  },
  worker: {
    timeline: "worker_timelines",
    activity: "worker_activities",
    fk: "worker_id",
  },
  inventory: {
    timeline: "inventory_timelines",
    activity: "inventory_activities",
    fk: "item_id",
  },
  finance: {
    timeline: "finance_timelines",
    activity: "finance_activities",
    fk: "event_record_id",
  },
  operations: {
    timeline: "operations_timelines",
    activity: "operations_activities",
    fk: "event_record_id",
  },
} as const satisfies Record<
  PatternBModule,
  { readonly timeline: string; readonly activity: string; readonly fk: string }
>;

export async function appendModuleTimeline(
  client: PoolClient,
  module: PatternBModule,
  input: {
    readonly aggregateId: string;
    readonly actorUserId: string;
    readonly entryType: string;
    readonly title: string;
    readonly content?: string;
    readonly customerVisible?: boolean;
    readonly metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const cfg = MODULE_TABLES[module];
  await client.query(
    `INSERT INTO ${cfg.timeline} (
       ${cfg.fk}, actor_user_id, entry_type, title, content, metadata, customer_visible
     ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)`,
    [
      input.aggregateId,
      input.actorUserId,
      input.entryType,
      input.title,
      input.content ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.customerVisible ?? true,
    ],
  );
}

export async function appendModuleActivity(
  client: PoolClient,
  module: PatternBModule,
  input: {
    readonly aggregateId: string;
    readonly actorUserId: string;
    readonly activityType: string;
    readonly content?: string;
    readonly customerVisible?: boolean;
  },
): Promise<void> {
  const cfg = MODULE_TABLES[module];
  await client.query(
    `INSERT INTO ${cfg.activity} (
       ${cfg.fk}, actor_user_id, activity_type, content, customer_visible
     ) VALUES ($1,$2,$3,$4,$5)`,
    [
      input.aggregateId,
      input.actorUserId,
      input.activityType,
      input.content ?? null,
      input.customerVisible ?? true,
    ],
  );
}

/** Write module timeline + activity in one call (same TX as caller). */
export async function appendModuleTimelineAndActivity(
  client: PoolClient,
  module: PatternBModule,
  input: {
    readonly aggregateId: string;
    readonly actorUserId: string;
    readonly entryType: string;
    readonly title: string;
    readonly activityType: string;
    readonly content?: string;
    readonly customerVisible?: boolean;
    readonly metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await appendModuleTimeline(client, module, {
    aggregateId: input.aggregateId,
    actorUserId: input.actorUserId,
    entryType: input.entryType,
    title: input.title,
    ...(input.content === undefined ? {} : { content: input.content }),
    ...(input.customerVisible === undefined
      ? {}
      : { customerVisible: input.customerVisible }),
    ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
  });
  await appendModuleActivity(client, module, {
    aggregateId: input.aggregateId,
    actorUserId: input.actorUserId,
    activityType: input.activityType,
    ...(input.content === undefined ? {} : { content: input.content }),
    ...(input.customerVisible === undefined
      ? {}
      : { customerVisible: input.customerVisible }),
  });
}
