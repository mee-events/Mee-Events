import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import {
  AUTH_IP_RATE_LIMIT_MAX,
  AUTH_IP_RATE_LIMIT_WINDOW_MS,
  MemoryWindowCounter,
} from "../../common/http/memory-window-counter";
import { AccessTokenGuard } from "../platform-foundation/security/access-token.guard";
import {
  EXOTEL_HTTP_TRANSPORT,
  FetchExotelHttpTransport,
} from "./adapters/exotel-http.transport";
import { ExotelOtpProvider } from "./adapters/exotel-otp.provider";
import { LocalOtpProvider } from "./adapters/local-otp.provider";
import { PostgresIdentityRepository } from "./adapters/postgres-identity.repository";
import { AuthIpRateLimitGuard } from "./application/auth-ip-rate-limit.guard";
import { AuthService } from "./application/auth.service";
import { IDENTITY_REPOSITORY } from "./ports/identity-repository";
import { OTP_PROVIDER, type OtpProvider } from "./ports/otp-provider";
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
    AuthIpRateLimitGuard,
    {
      provide: MemoryWindowCounter,
      useFactory: (): MemoryWindowCounter =>
        new MemoryWindowCounter(
          AUTH_IP_RATE_LIMIT_MAX,
          AUTH_IP_RATE_LIMIT_WINDOW_MS,
        ),
    },
    LocalOtpProvider,
    ExotelOtpProvider,
    {
      provide: EXOTEL_HTTP_TRANSPORT,
      useClass: FetchExotelHttpTransport,
    },
    { provide: IDENTITY_REPOSITORY, useClass: PostgresIdentityRepository },
    {
      provide: OTP_PROVIDER,
      inject: [ConfigService, LocalOtpProvider, ExotelOtpProvider],
      useFactory: (
        config: ConfigService,
        local: LocalOtpProvider,
        exotel: ExotelOtpProvider,
      ): OtpProvider => {
        return selectOtpProvider(
          config.getOrThrow<string>("OTP_PROVIDER"),
          local,
          exotel,
        );
      },
    },
  ],
  exports: [JwtModule, IDENTITY_REPOSITORY],
})
export class IdentityModule {}

export function selectOtpProvider(
  selection: string,
  local: OtpProvider,
  exotel: OtpProvider,
): OtpProvider {
  if (selection === "local") return local;
  if (selection === "exotel") return exotel;
  throw new Error("Unsupported OTP provider selection");
}
