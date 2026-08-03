import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module";
import { PlatformFoundationService } from "./application/platform-foundation.service";
import { PlatformBootstrapController } from "./presentation/platform-bootstrap.controller";
import { AccessTokenGuard } from "./security/access-token.guard";

@Module({
  imports: [IdentityModule],
  controllers: [PlatformBootstrapController],
  providers: [AccessTokenGuard, PlatformFoundationService],
  exports: [AccessTokenGuard],
})
export class PlatformFoundationModule {}
