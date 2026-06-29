/**
 * =============================================================================
 * booking.factory.ts — BookingFactory (FACTORY pattern)
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   While the Builder is for FINE-GRAINED, per-test customization, the Factory
 *   provides NAMED, ready-made scenarios behind a single call. Tests that just
 *   need "a valid booking" or "an invalid booking" shouldn't repeat builder
 *   chains — they ask the factory by intent.
 *
 * BUILDER vs FACTORY (the interview answer):
 *   - Builder: "assemble exactly the object I describe, step by step."
 *   - Factory: "give me a pre-configured object for THIS scenario."
 *   They compose: the Factory USES the Builder internally (DRY) — one source of
 *   default truth, two ergonomic entry points.
 * =============================================================================
 */
import { faker } from '@faker-js/faker';
import type { Booking } from '../models/booking.model.js';
import { BookingBuilder } from './booking.builder.js';

/**
 * Factory of named, ready-made {@link Booking} scenarios (built atop the Builder).
 */
export class BookingFactory {
  /** A fully-random, VALID booking — the common case. */
  public static valid(): Booking {
    return BookingBuilder.aBooking().build();
  }

  /** A valid booking with the deposit flag forced to a specific value. */
  public static withDeposit(paid: boolean): Booking {
    return BookingBuilder.aBooking().withDepositPaid(paid).build();
  }

  /** Minimal valid booking — required fields only (no additionalneeds). */
  public static minimal(): Booking {
    return BookingBuilder.aBooking().withoutAdditionalNeeds().build();
  }

  /** A booking for a named guest (random everything else). */
  public static forGuest(firstname: string, lastname: string): Booking {
    return BookingBuilder.aBooking()
      .withFirstname(firstname)
      .withLastname(lastname)
      .build();
  }

  /**
   * An INVALID payload (missing required fields) for negative testing (Phase 9).
   * Returns a Partial so the type system reflects that it is intentionally
   * incomplete — you cannot accidentally treat it as a full Booking.
   */
  public static invalid(): Partial<Booking> {
    return { firstname: faker.person.firstName() }; // missing lastname, price, dates...
  }
}
