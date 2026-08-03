import { randomUUID } from "node:crypto";
import type {
  EventActivitySummary,
  EventActivityType,
  EventTimelineEntry,
  EventTimelineEntryType,
} from "@me-event/api-contracts";

/** In-memory Pattern B quartet capture used by foundation fakes. */
export interface PatternBAuditRecord {
  readonly id: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly action: string;
  readonly actorUserId: string;
  readonly actorRole: string;
  readonly requestId: string;
  readonly occurredAt: string;
}

export interface PatternBOutboxRecord {
  readonly id: string;
  readonly topic: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly payload: Record<string, unknown>;
  readonly occurredAt: string;
}

export class PatternBSideEffects {
  public readonly timelines = new Map<string, EventTimelineEntry[]>();
  public readonly activities = new Map<string, EventActivitySummary[]>();
  public readonly moduleTimelines = new Map<string, EventTimelineEntry[]>();
  public readonly moduleActivities = new Map<string, EventActivitySummary[]>();
  public readonly audits: PatternBAuditRecord[] = [];
  public readonly outbox: PatternBOutboxRecord[] = [];

  public appendTimeline(
    eventRecordId: string,
    entry: {
      readonly entryType: EventTimelineEntryType;
      readonly title: string;
      readonly content?: string;
      readonly customerVisible?: boolean;
      readonly actorUserId?: string;
    },
  ): EventTimelineEntry {
    const now = new Date().toISOString();
    const record: EventTimelineEntry = {
      id: randomUUID(),
      entryType: entry.entryType,
      title: entry.title,
      customerVisible: entry.customerVisible ?? true,
      occurredAt: now,
      ...(entry.content === undefined ? {} : { content: entry.content }),
      ...(entry.actorUserId === undefined
        ? {}
        : { actorUserId: entry.actorUserId }),
    };
    const list = this.timelines.get(eventRecordId) ?? [];
    this.timelines.set(eventRecordId, [record, ...list]);
    return record;
  }

  public appendActivity(
    eventRecordId: string,
    entry: {
      readonly activityType: EventActivityType;
      readonly content?: string;
      readonly customerVisible?: boolean;
      readonly actorUserId?: string;
    },
  ): EventActivitySummary {
    const now = new Date().toISOString();
    const record: EventActivitySummary = {
      id: randomUUID(),
      activityType: entry.activityType,
      customerVisible: entry.customerVisible ?? true,
      occurredAt: now,
      ...(entry.content === undefined ? {} : { content: entry.content }),
      ...(entry.actorUserId === undefined
        ? {}
        : { actorUserId: entry.actorUserId }),
    };
    const list = this.activities.get(eventRecordId) ?? [];
    this.activities.set(eventRecordId, [record, ...list]);
    return record;
  }

  public appendModuleTimelineAndActivity(
    module: string,
    aggregateId: string,
    entry: {
      readonly entryType: string;
      readonly title: string;
      readonly activityType: string;
      readonly content?: string;
      readonly customerVisible?: boolean;
      readonly actorUserId?: string;
    },
  ): void {
    const key = `${module}:${aggregateId}`;
    const now = new Date().toISOString();
    const timeline: EventTimelineEntry = {
      id: randomUUID(),
      entryType: entry.entryType as EventTimelineEntryType,
      title: entry.title,
      customerVisible: entry.customerVisible ?? true,
      occurredAt: now,
      ...(entry.content === undefined ? {} : { content: entry.content }),
      ...(entry.actorUserId === undefined
        ? {}
        : { actorUserId: entry.actorUserId }),
    };
    const activity: EventActivitySummary = {
      id: randomUUID(),
      activityType: entry.activityType as EventActivityType,
      customerVisible: entry.customerVisible ?? true,
      occurredAt: now,
      ...(entry.content === undefined ? {} : { content: entry.content }),
      ...(entry.actorUserId === undefined
        ? {}
        : { actorUserId: entry.actorUserId }),
    };
    this.moduleTimelines.set(key, [
      timeline,
      ...(this.moduleTimelines.get(key) ?? []),
    ]);
    this.moduleActivities.set(key, [
      activity,
      ...(this.moduleActivities.get(key) ?? []),
    ]);
  }

  public moduleTimelineTypes(module: string, aggregateId: string): string[] {
    return (this.moduleTimelines.get(`${module}:${aggregateId}`) ?? []).map(
      (e) => e.entryType,
    );
  }

  public moduleActivityTypes(module: string, aggregateId: string): string[] {
    return (this.moduleActivities.get(`${module}:${aggregateId}`) ?? []).map(
      (e) => e.activityType,
    );
  }

  public writeAuditOutbox(input: {
    readonly requestId: string;
    readonly actorUserId: string;
    readonly actorRole: string;
    readonly entityType: string;
    readonly entityId: string;
    readonly action: string;
    readonly outboxTopic: string;
    readonly payload?: Record<string, unknown>;
  }): void {
    const now = new Date().toISOString();
    this.audits.push({
      id: randomUUID(),
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      requestId: input.requestId,
      occurredAt: now,
    });
    this.outbox.push({
      id: randomUUID(),
      topic: input.outboxTopic,
      aggregateType: input.entityType,
      aggregateId: input.entityId,
      payload: input.payload ?? {},
      occurredAt: now,
    });
  }

  public timelineTypes(eventRecordId: string): string[] {
    return (this.timelines.get(eventRecordId) ?? []).map((e) => e.entryType);
  }

  public activityTypes(eventRecordId: string): string[] {
    return (this.activities.get(eventRecordId) ?? []).map(
      (e) => e.activityType,
    );
  }

  public outboxTopics(): string[] {
    return this.outbox.map((e) => e.topic);
  }

  public auditActions(): string[] {
    return this.audits.map((e) => e.action);
  }
}
