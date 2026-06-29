/**
 * =============================================================================
 * booking-builder.spec.ts — BookingBuilder behavior
 * -----------------------------------------------------------------------------
 * WHAT THIS PROVES:
 *   - Defaults are valid: aBooking().build() needs no overrides.
 *   - Fluent overrides apply exactly the fields you set.
 *   - build() returns INDEPENDENT copies (no shared-state bug).
 *   - Optional field can be omitted (minimal payload).
 * =============================================================================
 */
import { test, expect } from '@playwright/test';
import { BookingBuilder } from '../../src/builders/index.js';

// Suite: unit tests for the fluent BookingBuilder — defaults, overrides,
// copy isolation, and optional-field handling.
test.describe('Phase 5 · BookingBuilder', () => {
  // Scenario: build with no overrides at all.
  // Expected: every required field is populated and self-consistent (valid dates).
  test('produces a valid booking with zero overrides', () => {
    const booking = BookingBuilder.aBooking().build();

    expect(booking.firstname).toBeTruthy();
    expect(booking.lastname).toBeTruthy();
    expect(booking.totalprice).toBeGreaterThan(0);
    expect(typeof booking.depositpaid).toBe('boolean');
    // checkin must be strictly before checkout.
    expect(booking.bookingdates.checkin < booking.bookingdates.checkout).toBe(
      true,
    );
  });

  // Scenario: chain several with*() setters.
  // Expected: each overridden field holds exactly the value provided.
  test('applies only the fields explicitly set', () => {
    const booking = BookingBuilder.aBooking()
      .withFirstname('John')
      .withLastname('Doe')
      .withTotalPrice(999)
      .withDepositPaid(true)
      .build();

    expect(booking.firstname).toBe('John');
    expect(booking.lastname).toBe('Doe');
    expect(booking.totalprice).toBe(999);
    expect(booking.depositpaid).toBe(true);
  });

  // Scenario: build twice from one builder, mutating it in between.
  // Expected: earlier result is unaffected by later mutation, and nested objects
  // are distinct instances (deep copy, not shared reference).
  test('build() returns independent copies (no shared state)', () => {
    const builder = BookingBuilder.aBooking().withFirstname('First');
    const a = builder.build();
    // Mutating the builder after building must NOT affect the earlier result.
    builder.withFirstname('Second');
    const b = builder.build();

    expect(a.firstname).toBe('First');
    expect(b.firstname).toBe('Second');
    expect(a.bookingdates).not.toBe(b.bookingdates); // distinct nested objects
  });

  // Scenario: explicitly drop the optional field via withoutAdditionalNeeds().
  // Expected: additionalneeds is undefined (minimal payload supported).
  test('can omit the optional additionalneeds field', () => {
    const booking = BookingBuilder.aBooking().withoutAdditionalNeeds().build();
    expect(booking.additionalneeds).toBeUndefined();
  });
});
