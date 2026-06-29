/**
 * =============================================================================
 * booking-lifecycle.spec.ts — Full request-chaining lifecycle (Restful Booker)
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   The canonical real-world API flow, where each step consumes data extracted
 *   from the previous one:
 *     login -> TOKEN -> create -> BOOKING_ID -> read -> update -> patch ->
 *     delete -> verify-delete (404)
 *
 * TECHNIQUES DEMONSTRATED:
 *   1) CONTEXT PASSING — a single typed `ctx` object accumulates extracted
 *      values (token, bookingId) instead of fragile module-level globals.
 *   2) test.step() — models the chain as readable, individually-reported steps
 *      that share the test's scope.
 *
 * ROBUSTNESS:
 *   Restful Booker runs on Heroku and can be slow/flaky, so this spec opts into
 *   retries locally too — a realistic concession for third-party-dependent E2E.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { CookieTokenStrategy } from '../../src/auth/index.js';
import { BookingFactory } from '../../src/builders/index.js';
import { config } from '../../src/config/index.js';
import { HttpStatus } from '../../src/constants/http-status.js';

/** The context object threaded through the chain (explicit, typed). */
interface ChainContext {
  token?: string;
  bookingId?: number;
}

test.describe('Phase 7 · Booking lifecycle (request chaining)', () => {
  // Heroku flakiness insurance for this third-party E2E flow.
  test.describe.configure({ retries: 2 });

  // Scenario: the full CRUD lifecycle of one booking, each step feeding the next
  // via the shared ctx (token then bookingId).
  // Expected: every step succeeds in order and the final read returns 404,
  // confirming the resource was created, mutated, and ultimately removed.
  test('login -> create -> read -> update -> patch -> delete -> verify', async ({
    auth,
    bookings,
  }) => {
    const ctx: ChainContext = {};
    const original = BookingFactory.forGuest('Chain', 'Tester');

    await test.step('1) login and extract token', async () => {
      ctx.token = await auth.loginBooker(
        config.credentials.username,
        config.credentials.password,
      );
      expect(ctx.token).toBeTruthy();
    });

    await test.step('2) create booking and extract id', async () => {
      const res = await bookings.create(original);
      expect(res.status).toBe(HttpStatus.OK);
      ctx.bookingId = res.body.bookingid;
      expect(ctx.bookingId).toBeGreaterThan(0);
      // The created resource echoes what we sent.
      expect(res.body.booking.firstname).toBe('Chain');
    });

    await test.step('3) read the created booking', async () => {
      const res = await bookings.getById(ctx.bookingId!);
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.firstname).toBe('Chain');
      expect(res.body.lastname).toBe('Tester');
    });

    await test.step('4) full update (PUT) with auth', async () => {
      const updated = BookingFactory.forGuest('Updated', 'Guest');
      const res = await bookings.update(
        ctx.bookingId!,
        updated,
        new CookieTokenStrategy(ctx.token!),
      );
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.firstname).toBe('Updated');
    });

    await test.step('5) partial update (PATCH) with auth', async () => {
      const res = await bookings.partialUpdate(
        ctx.bookingId!,
        { additionalneeds: 'Champagne' },
        new CookieTokenStrategy(ctx.token!),
      );
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.additionalneeds).toBe('Champagne');
    });

    await test.step('6) delete with auth', async () => {
      const res = await bookings.remove(
        ctx.bookingId!,
        new CookieTokenStrategy(ctx.token!),
      );
      expect(res.status).toBe(HttpStatus.CREATED); // Booker returns 201 on delete
    });

    await test.step('7) verify deletion (now 404)', async () => {
      const res = await bookings.getById(ctx.bookingId!);
      expect(res.status).toBe(HttpStatus.NOT_FOUND);
    });
  });

  // Scenario: create a booking, then fetch the full id listing.
  // Expected: the new booking's id is present in the collection (chaining a created
  // resource into a list query).
  test('newly created bookings appear in the collection listing', async ({
    bookings,
  }) => {
    const created = await bookings.create(BookingFactory.valid());
    const id = created.body.bookingid;

    const list = await bookings.getAllIds();
    expect(list.status).toBe(HttpStatus.OK);
    expect(list.body.some((ref) => ref.bookingid === id)).toBe(true);
  });
});
