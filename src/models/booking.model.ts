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
  readonly checkin: string; // arrival date, "yyyy-mm-dd"
  readonly checkout: string; // departure date, "yyyy-mm-dd"
}

/** A booking payload/resource. */
export interface Booking {
  readonly firstname: string;
  readonly lastname: string;
  readonly totalprice: number; // total price of the stay
  readonly depositpaid: boolean; // whether a deposit has been paid
  readonly bookingdates: BookingDates; // nested check-in/check-out range
  readonly additionalneeds?: string; // optional extras (e.g. "Breakfast")
}

/** Booker's create response wraps the booking with its new id. */
export interface CreateBookingResponse {
  readonly bookingid: number; // server-assigned id for the new booking
  readonly booking: Booking; // echo of the created booking body
}

/** An entry in GET /booking — the collection returns only id references. */
export interface BookingIdRef {
  readonly bookingid: number; // id only; fetch full record via GET /booking/{id}
}

/** Booker's /auth response. */
export interface AuthTokenResponse {
  readonly token: string; // bearer-style token for authenticated mutations
}
