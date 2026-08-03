import { Module } from "@nestjs/common";
import { CapabilityGuard } from "../authorization/capability.guard";
import { IdentityModule } from "../identity/identity.module";
import { AccessTokenGuard } from "../platform-foundation/security/access-token.guard";
import { PostgresFinanceRepository } from "./adapters/postgres-finance.repository";
import { FinanceService } from "./application/finance.service";
import { FINANCE_REPOSITORY } from "./ports/finance-repository";
import {
  CrmFinanceController,
  FinanceOpsController,
} from "./presentation/crm-finance.controller";

@Module({
  imports: [IdentityModule],
  controllers: [CrmFinanceController, FinanceOpsController],
  providers: [
    FinanceService,
    AccessTokenGuard,
    CapabilityGuard,
    {
      provide: FINANCE_REPOSITORY,
      useClass: PostgresFinanceRepository,
    },
  ],
  exports: [FinanceService],
})
export class FinanceModule {}
