import type {
  BookingActivitySummary,
  BookingDetailResponse,
  BookingSummary,
} from "@me-event/api-contracts";

export const BOOKING_REPOSITORY = Symbol("BOOKING_REPOSITORY");

export interface BookingRepository {
  listForCustomerUser(userId: string): Promise<readonly BookingSummary[]>;
  listForBranch(branchId: string): Promise<readonly BookingSummary[]>;
  findById(bookingId: string): Promise<BookingDetailResponse | undefined>;
  findForCustomerUser(
    userId: string,
    bookingId: string,
  ): Promise<BookingDetailResponse | undefined>;
}

export type { BookingActivitySummary, BookingDetailResponse, BookingSummary };
