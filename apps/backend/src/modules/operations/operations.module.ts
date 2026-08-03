import { Module } from "@nestjs/common";
import { CapabilityGuard } from "../authorization/capability.guard";
import { IdentityModule } from "../identity/identity.module";
import { AccessTokenGuard } from "../platform-foundation/security/access-token.guard";
import { PostgresOperationsRepository } from "./adapters/postgres-operations.repository";
import { OperationsService } from "./application/operations.service";
import { OPERATIONS_REPOSITORY } from "./ports/operations-repository";
import {
  CrmOperationsController,
  OperationsOpsController,
} from "./presentation/crm-operations.controller";

@Module({
  imports: [IdentityModule],
  controllers: [CrmOperationsController, OperationsOpsController],
  providers: [
    OperationsService,
    AccessTokenGuard,
    CapabilityGuard,
    {
      provide: OPERATIONS_REPOSITORY,
      useClass: PostgresOperationsRepository,
    },
  ],
  exports: [OperationsService],
})
export class OperationsModule {}
