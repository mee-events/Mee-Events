import { Module } from "@nestjs/common";
import { CapabilityGuard } from "../authorization/capability.guard";
import { IdentityModule } from "../identity/identity.module";
import { AccessTokenGuard } from "../platform-foundation/security/access-token.guard";
import { PostgresPaymentRepository } from "./adapters/postgres-payment.repository";
import { PaymentService } from "./application/payment.service";
import { PAYMENT_REPOSITORY } from "./ports/payment-repository";
import {
  CrmPaymentController,
  PaymentController,
} from "./presentation/payment.controller";

@Module({
  imports: [IdentityModule],
  controllers: [PaymentController, CrmPaymentController],
  providers: [
    PaymentService,
    AccessTokenGuard,
    CapabilityGuard,
    { provide: PAYMENT_REPOSITORY, useClass: PostgresPaymentRepository },
  ],
  exports: [PaymentService],
})
export class PaymentsModule {}
