import { Module } from "@nestjs/common";
import { CapabilityGuard } from "../authorization/capability.guard";
import { CatalogModule } from "../catalog/catalog.module";
import { IdentityModule } from "../identity/identity.module";
import { AccessTokenGuard } from "../platform-foundation/security/access-token.guard";
import { PostgresEnquiryRepository } from "./adapters/postgres-enquiry.repository";
import { EnquiryService } from "./application/enquiry.service";
import { LeadUpdatedOutboxProcessor } from "./application/lead-updated-outbox.processor";
import { ENQUIRY_REPOSITORY } from "./ports/enquiry-repository";
import { EnquiryController } from "./presentation/enquiry.controller";

@Module({
  imports: [IdentityModule, CatalogModule],
  controllers: [EnquiryController],
  providers: [
    EnquiryService,
    LeadUpdatedOutboxProcessor,
    AccessTokenGuard,
    CapabilityGuard,
    { provide: ENQUIRY_REPOSITORY, useClass: PostgresEnquiryRepository },
  ],
})
export class EnquiriesModule {}
