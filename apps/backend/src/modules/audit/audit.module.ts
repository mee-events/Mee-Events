import { Global, Module } from "@nestjs/common";
import { PostgresAuditSink } from "./adapters/postgres-audit.sink";
import { AUDIT_SINK } from "./audit-event";

@Global()
@Module({
  providers: [{ provide: AUDIT_SINK, useClass: PostgresAuditSink }],
  exports: [AUDIT_SINK],
})
export class AuditModule {}
