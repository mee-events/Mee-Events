import { Module } from "@nestjs/common";
import { CapabilityGuard } from "../authorization/capability.guard";
import { IdentityModule } from "../identity/identity.module";
import { AccessTokenGuard } from "../platform-foundation/security/access-token.guard";
import { PostgresEventRecordRepository } from "./adapters/postgres-event-record.repository";
import { EventRecordService } from "./application/event-record.service";
import { EVENT_RECORD_REPOSITORY } from "./ports/event-record-repository";
import { CrmEventRecordController } from "./presentation/crm-event-record.controller";
import { EventRecordController } from "./presentation/event-record.controller";

@Module({
  imports: [IdentityModule],
  controllers: [EventRecordController, CrmEventRecordController],
  providers: [
    EventRecordService,
    AccessTokenGuard,
    CapabilityGuard,
    {
      provide: EVENT_RECORD_REPOSITORY,
      useClass: PostgresEventRecordRepository,
    },
  ],
  exports: [EventRecordService],
})
export class EventRecordsModule {}
