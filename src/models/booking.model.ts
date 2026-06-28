/**
 * =============================================================================
 * booking.model.ts — Domain model for Restful Booker "bookings"
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Types the Booking resource used to demonstrate AUTH on real mutations
 *   (Phase 4) and full chaining (Phase 7). Restful Booker requires a token for
 *   PUT/PATCH/DELETE, making it the ideal playground for authenticated CRUD.
 * =============================================================================
 */

/** Check-in / check-out dates (ISO yyyy-mm-dd strings, as Booker expects). */
export interface BookingDates {
  readonly checkin: string;
  readonly checkout: string;
}

/** A booking payload/resource. */
export interface Booking {
  readonly firstname: string;
  readonly lastname: string;
  readonly totalprice: number;
  readonly depositpaid: boolean;
  readonly bookingdates: BookingDates;
  readonly additionalneeds?: string;
}

/** Booker's create response wraps the booking with its new id. */
export interface CreateBookingResponse {
  readonly bookingid: number;
  readonly booking: Booking;
}

/** Booker's /auth response. */
export interface AuthTokenResponse {
  readonly token: string;
}
