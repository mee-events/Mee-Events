import { Inject, Injectable } from "@nestjs/common";
import type {
  BookingDetailResponse,
  BookingListResponse,
} from "@me-event/api-contracts";
import { DomainError } from "../../../common/errors/domain.error";
import type { AuthenticatedPrincipal } from "../../platform-foundation/domain/platform-foundation";
import { HYDERABAD_BRANCH } from "../../platform-foundation/domain/platform-foundation";
import {
  BOOKING_REPOSITORY,
  type BookingRepository,
} from "../ports/booking-repository";

@Injectable()
export class BookingService {
  public constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookings: BookingRepository,
  ) {}

  public async listOwn(
    principal: AuthenticatedPrincipal,
  ): Promise<BookingListResponse> {
    const bookings = await this.bookings.listForCustomerUser(principal.userId);
    return { bookings };
  }

  public async getOwn(
    principal: AuthenticatedPrincipal,
    bookingId: string,
  ): Promise<BookingDetailResponse> {
    const booking = await this.bookings.findForCustomerUser(
      principal.userId,
      bookingId,
    );
    if (booking === undefined) {
      throw new DomainError("BOOKING_NOT_FOUND", "Booking not found", 404);
    }
    return booking;
  }

  public async listCrm(): Promise<BookingListResponse> {
    const bookings = await this.bookings.listForBranch(HYDERABAD_BRANCH.id);
    return { bookings };
  }

  public async getCrm(bookingId: string): Promise<BookingDetailResponse> {
    const booking = await this.bookings.findById(bookingId);
    if (booking === undefined) {
      throw new DomainError("BOOKING_NOT_FOUND", "Booking not found", 404);
    }
    return booking;
  }
}
