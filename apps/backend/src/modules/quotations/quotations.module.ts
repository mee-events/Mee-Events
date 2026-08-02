import { Module } from "@nestjs/common";
import { CapabilityGuard } from "../authorization/capability.guard";
import { IdentityModule } from "../identity/identity.module";
import { AccessTokenGuard } from "../platform-foundation/security/access-token.guard";
import { PostgresQuotationRepository } from "./adapters/postgres-quotation.repository";
import { QuotationService } from "./application/quotation.service";
import { QUOTATION_REPOSITORY } from "./ports/quotation-repository";
import { CrmQuotationController } from "./presentation/crm-quotation.controller";
import { QuotationController } from "./presentation/quotation.controller";

@Module({
  imports: [IdentityModule],
  controllers: [QuotationController, CrmQuotationController],
  providers: [
    QuotationService,
    AccessTokenGuard,
    CapabilityGuard,
    { provide: QUOTATION_REPOSITORY, useClass: PostgresQuotationRepository },
  ],
  exports: [QuotationService, QUOTATION_REPOSITORY],
})
export class QuotationsModule {}
