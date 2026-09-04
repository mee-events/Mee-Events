import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { PINO_REDACT_PATHS } from "./common/http/http-surface";
import { requestIdForIncomingRequest } from "./common/http/request-context";
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
import { ManagerOperationsModule } from "./modules/manager-operations/manager-operations.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { PlatformFoundationModule } from "./modules/platform-foundation/platform-foundation.module";
import { AccessTokenGuard } from "./modules/platform-foundation/security/access-token.guard";
import { QuotationsModule } from "./modules/quotations/quotations.module";
import { SearchModule } from "./modules/search/search.module";
import { VendorsModule } from "./modules/vendors/vendors.module";
import { WorkersModule } from "./modules/workers/workers.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { OperationsModule } from "./modules/operations/operations.module";

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
          paths: [...PINO_REDACT_PATHS],
          censor: "[REDACTED]",
        },
        genReqId: (request) => requestIdForIncomingRequest(request),
      },
    }),
    DatabaseModule,
    AuditModule,
    HealthModule,
    IdentityModule,
    PlatformFoundationModule,
    CatalogModule,
    SearchModule,
    EnquiriesModule,
    CrmModule,
    QuotationsModule,
    PaymentsModule,
    BookingsModule,
    EventRecordsModule,
    ManagerOperationsModule,
    VendorsModule,
    WorkersModule,
    InventoryModule,
    FinanceModule,
    OperationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
  ],
})
export class AppModule {}
