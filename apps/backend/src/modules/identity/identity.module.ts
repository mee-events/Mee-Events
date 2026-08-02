import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AccessTokenGuard } from "../platform-foundation/security/access-token.guard";
import { AuthService } from "./application/auth.service";
import { LocalOtpProvider } from "./adapters/local-otp.provider";
import { PostgresIdentityRepository } from "./adapters/postgres-identity.repository";
import { IDENTITY_REPOSITORY } from "./ports/identity-repository";
import { OTP_PROVIDER } from "./ports/otp-provider";
import { AuthController } from "./presentation/auth.controller";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenGuard,
    { provide: IDENTITY_REPOSITORY, useClass: PostgresIdentityRepository },
    { provide: OTP_PROVIDER, useClass: LocalOtpProvider },
  ],
  exports: [JwtModule, IDENTITY_REPOSITORY],
})
export class IdentityModule {}
