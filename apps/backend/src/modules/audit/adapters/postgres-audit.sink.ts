import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { PG_POOL } from "../../../database/database.module";
import type { AuditEvent, AuditSink } from "../audit-event";

@Injectable()
export class PostgresAuditSink implements AuditSink {
  public constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  public async append(event: AuditEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_events (
         request_id, actor_user_id, actor_role, branch_id,
         entity_type, entity_id, action,
         before_version, after_version, reason, metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        event.requestId,
        event.actorUserId ?? null,
        event.actorRole ?? null,
        event.branchId ?? null,
        event.entityType,
        event.entityId,
        event.action,
        event.beforeVersion ?? null,
        event.afterVersion ?? null,
        event.reason ?? null,
        JSON.stringify(event.metadata ?? {}),
      ],
    );
  }
}
