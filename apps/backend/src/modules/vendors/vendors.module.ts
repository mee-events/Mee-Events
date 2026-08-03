import { Module } from "@nestjs/common";
import { CapabilityGuard } from "../authorization/capability.guard";
import { IdentityModule } from "../identity/identity.module";
import { AccessTokenGuard } from "../platform-foundation/security/access-token.guard";
import { PostgresVendorRepository } from "./adapters/postgres-vendor.repository";
import { VendorService } from "./application/vendor.service";
import { VENDOR_REPOSITORY } from "./ports/vendor-repository";
import { CrmVendorController } from "./presentation/crm-vendor.controller";
import { VendorController } from "./presentation/vendor.controller";

@Module({
  imports: [IdentityModule],
  controllers: [CrmVendorController, VendorController],
  providers: [
    VendorService,
    AccessTokenGuard,
    CapabilityGuard,
    {
      provide: VENDOR_REPOSITORY,
      useClass: PostgresVendorRepository,
    },
  ],
  exports: [VendorService],
})
export class VendorsModule {}
