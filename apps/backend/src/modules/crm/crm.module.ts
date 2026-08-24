import { Module } from "@nestjs/common";
import { CapabilityGuard } from "../authorization/capability.guard";
import { IdentityModule } from "../identity/identity.module";
import { AccessTokenGuard } from "../platform-foundation/security/access-token.guard";
import { PostgresLeadRepository } from "./adapters/postgres-lead.repository";
import { CrmService } from "./application/crm.service";
import { EnquirySubmittedOutboxProcessor } from "./application/enquiry-submitted-outbox.processor";
import { LEAD_REPOSITORY } from "./ports/lead-repository";
import { CrmController } from "./presentation/crm.controller";

@Module({
  imports: [IdentityModule],
  controllers: [CrmController],
  providers: [
    CrmService,
    EnquirySubmittedOutboxProcessor,
    AccessTokenGuard,
    CapabilityGuard,
    { provide: LEAD_REPOSITORY, useClass: PostgresLeadRepository },
  ],
})
export class CrmModule {}
