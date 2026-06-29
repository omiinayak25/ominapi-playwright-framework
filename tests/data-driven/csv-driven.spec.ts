/**
 * =============================================================================
 * csv-driven.spec.ts — Parameterized booking creation from a CSV dataset
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   CSV is the format non-developers reach for. Each row becomes a test case.
 *   Note the TYPE-CONVERSION step: CSV values are ALWAYS strings, so we coerce
 *   "250" -> 250 and "true" -> true before building the typed payload. Handling
 *   that conversion in one place is part of robust data-driven testing.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { loadCsv } from '../../src/utils/data-loader.js';
import { HttpStatus } from '../../src/constants/http-status.js';
import type { Booking } from '../../src/models/booking.model.js';

interface BookingRow {
  firstname: string;
  lastname: string;
  totalprice: string;
  depositpaid: string;
  checkin: string;
  checkout: string;
  additionalneeds: string;
}

// Load synchronously at collection time so one test() is generated per CSV row.
const rows = loadCsv<BookingRow>('bookings.csv');

// Suite: each CSV row drives a booking-creation test (with string->type coercion).
test.describe('Phase 8 · CSV-driven booking creation', () => {
  test.describe.configure({ retries: 2 }); // Booker (Heroku) flakiness insurance

  // One generated test per row: each booking is created and echoed back -> 200.
  for (const row of rows) {
    test(`creates booking for ${row.firstname} ${row.lastname}`, async ({
      bookings,
    }) => {
      // Type conversion: CSV strings -> typed model values.
      const booking: Booking = {
        firstname: row.firstname,
        lastname: row.lastname,
        totalprice: Number(row.totalprice),
        depositpaid: row.depositpaid.toLowerCase() === 'true',
        bookingdates: { checkin: row.checkin, checkout: row.checkout },
        // Empty CSV cell -> omit the optional field entirely.
        ...(row.additionalneeds
          ? { additionalneeds: row.additionalneeds }
          : {}),
      };

      const res = await bookings.create(booking);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.booking.firstname).toBe(row.firstname);
      expect(res.body.booking.totalprice).toBe(Number(row.totalprice));
    });
  }
});
