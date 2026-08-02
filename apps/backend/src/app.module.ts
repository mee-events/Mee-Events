import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { randomUUID } from "node:crypto";
import { validateEnvironment } from "./config/environment";
import { DatabaseModule } from "./database/database.module";
import { AuditModule } from "./modules/audit/audit.module";
import { BookingsModule } from "./modules/bookings/bookings.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { CrmModule } from "./modules/crm/crm.module";
import { EnquiriesModule } from "./modules/enquiries/enquiries.module";
import { EventRecordsModule } from "./modules/event-records/event-records.module";
import { HealthModule } from "./modules/health/health.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { PlatformFoundationModule } from "./modules/platform-foundation/platform-foundation.module";
import { QuotationsModule } from "./modules/quotations/quotations.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? "info",
        redact: {
          paths: [
            "req.headers.authorization",
            "req.body.code",
            "res.headers['set-cookie']",
          ],
          censor: "[REDACTED]",
        },
        genReqId: (request) =>
          request.headers["x-request-id"]?.toString() ?? randomUUID(),
      },
    }),
    DatabaseModule,
    AuditModule,
    HealthModule,
    IdentityModule,
    PlatformFoundationModule,
    CatalogModule,
    EnquiriesModule,
    CrmModule,
    QuotationsModule,
    PaymentsModule,
    BookingsModule,
    EventRecordsModule,
  ],
})
export class AppModule {}
