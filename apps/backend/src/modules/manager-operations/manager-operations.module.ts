import { Module } from "@nestjs/common";
import { CapabilityGuard } from "../authorization/capability.guard";
import { IdentityModule } from "../identity/identity.module";
import { AccessTokenGuard } from "../platform-foundation/security/access-token.guard";
import { PostgresManagerOperationsRepository } from "./adapters/postgres-manager-operations.repository";
import { ManagerOperationsService } from "./application/manager-operations.service";
import { MANAGER_OPERATIONS_REPOSITORY } from "./ports/manager-operations-repository";
import { CrmManagerOperationsController } from "./presentation/crm-manager-operations.controller";
import { ManagerOperationsController } from "./presentation/manager-operations.controller";

@Module({
  imports: [IdentityModule],
  controllers: [CrmManagerOperationsController, ManagerOperationsController],
  providers: [
    ManagerOperationsService,
    AccessTokenGuard,
    CapabilityGuard,
    {
      provide: MANAGER_OPERATIONS_REPOSITORY,
      useClass: PostgresManagerOperationsRepository,
    },
  ],
  exports: [ManagerOperationsService],
})
export class ManagerOperationsModule {}
