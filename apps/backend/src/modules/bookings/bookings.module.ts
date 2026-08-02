import { Module } from "@nestjs/common";
import { CapabilityGuard } from "../authorization/capability.guard";
import { IdentityModule } from "../identity/identity.module";
import { AccessTokenGuard } from "../platform-foundation/security/access-token.guard";
import { PostgresBookingRepository } from "./adapters/postgres-booking.repository";
import { BookingService } from "./application/booking.service";
import { BOOKING_REPOSITORY } from "./ports/booking-repository";
import {
  BookingController,
  CrmBookingController,
} from "./presentation/booking.controller";

@Module({
  imports: [IdentityModule],
  controllers: [BookingController, CrmBookingController],
  providers: [
    BookingService,
    AccessTokenGuard,
    CapabilityGuard,
    { provide: BOOKING_REPOSITORY, useClass: PostgresBookingRepository },
  ],
})
export class BookingsModule {}
