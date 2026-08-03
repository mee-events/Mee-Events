import { Module } from "@nestjs/common";
import { CapabilityGuard } from "../authorization/capability.guard";
import { IdentityModule } from "../identity/identity.module";
import { AccessTokenGuard } from "../platform-foundation/security/access-token.guard";
import { PostgresInventoryRepository } from "./adapters/postgres-inventory.repository";
import { InventoryService } from "./application/inventory.service";
import { INVENTORY_REPOSITORY } from "./ports/inventory-repository";
import {
  CrmInventoryController,
  InventoryOpsController,
} from "./presentation/crm-inventory.controller";

@Module({
  imports: [IdentityModule],
  controllers: [CrmInventoryController, InventoryOpsController],
  providers: [
    InventoryService,
    AccessTokenGuard,
    CapabilityGuard,
    {
      provide: INVENTORY_REPOSITORY,
      useClass: PostgresInventoryRepository,
    },
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
