/**
 * =============================================================================
 * negative.factory.ts — NegativeBookingFactory (malformed-payload generators)
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Negative testing needs INVALID inputs on purpose: missing fields, nulls,
 *   empty strings, wrong types, out-of-range values, and malformed JSON. This
 *   factory centralizes those generators (the positive counterpart is
 *   BookingFactory). Return type is intentionally loose (Record/unknown) — these
 *   payloads are NOT valid Bookings and the type system should say so.
 *
 * DESIGN:
 *   Builds on a valid booking, then corrupts specific fields — so each generator
 *   isolates ONE defect (the key to a meaningful negative test: change one thing).
 * =============================================================================
 */
import type { Booking } from '../models/booking.model.js';
import { BookingFactory } from './booking.factory.js';

/**
 * Factory of intentionally malformed booking payloads for negative testing.
 */
export class NegativeBookingFactory {
  /** Missing required fields (only firstname present). */
  public static missingRequired(): Record<string, unknown> {
    return { firstname: 'NoOtherFields' };
  }

  /** Required fields present but set to null. */
  public static withNulls(): Record<string, unknown> {
    return { ...BookingFactory.valid(), lastname: null, totalprice: null };
  }

  /** Required string fields present but empty. */
  public static withEmptyStrings(): Record<string, unknown> {
    return { ...BookingFactory.valid(), firstname: '', lastname: '' };
  }

  /** Fields present but with the wrong types. */
  public static withWrongTypes(): Record<string, unknown> {
    return {
      ...BookingFactory.valid(),
      totalprice: 'not-a-number',
      depositpaid: 'yes',
    };
  }

  /** Valid shape but a numeric value above the allowed maximum (boundary). */
  public static overMaxPrice(): Booking {
    return { ...BookingFactory.valid(), totalprice: 999_999 };
  }

  /** Valid shape but a numeric value below the allowed minimum (boundary). */
  public static underMinPrice(): Booking {
    return { ...BookingFactory.valid(), totalprice: 0 };
  }

  /** A syntactically BROKEN JSON string (for malformed-body tests). */
  public static readonly MALFORMED_JSON = '{ "firstname": "broken", ';
}
