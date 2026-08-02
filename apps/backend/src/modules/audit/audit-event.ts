/**
 * Mirrors the append-only `audit_events` table from migration 0001.
 * `id` and `occurred_at` are assigned by the database.
 */
export interface AuditEvent {
  readonly requestId: string;
  readonly actorUserId?: string;
  readonly actorRole?: string;
  readonly branchId?: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly action: string;
  readonly beforeVersion?: number;
  readonly afterVersion?: number;
  readonly reason?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export const AUDIT_SINK = Symbol("AUDIT_SINK");

export interface AuditSink {
  append(event: AuditEvent): Promise<void>;
}
