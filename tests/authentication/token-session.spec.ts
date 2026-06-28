/**
 * =============================================================================
 * token-session.spec.ts — Token login + Cookie/Session auth (real CRUD)
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Restful Booker is a REAL stateful API: anyone can create a booking, but
 *   DELETE/PUT require a session token obtained via POST /auth. The token rides
 *   in a Cookie header (Cookie: token=<token>) — classic session auth.
 *
 * WHAT WE PROVE (the security lesson):
 *   1) Login returns a token (AuthService).
 *   2) A protected DELETE WITHOUT the token is FORBIDDEN (403).
 *   3) The SAME DELETE WITH the token succeeds — proving authorization is real.
 *
 * This combines AuthService ("get token") + CookieTokenStrategy ("present token")
 * and is a preview of the full chaining flow in Phase 7.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { CookieTokenStrategy, NoAuthStrategy } from '../../src/auth/index.js';
import { config } from '../../src/config/index.js';
import { HttpStatus } from '../../src/constants/http-status.js';
import type {
  Booking,
  CreateBookingResponse,
} from '../../src/models/booking.model.js';

const sampleBooking: Booking = {
  firstname: 'Omni',
  lastname: 'Tester',
  totalprice: 150,
  depositpaid: true,
  bookingdates: { checkin: '2026-07-01', checkout: '2026-07-05' },
  additionalneeds: 'Breakfast',
};

test.describe('Phase 4 · Token login & Cookie/Session auth', () => {
  test('login returns a session token', async ({ auth }) => {
    const token = await auth.loginBooker(
      config.credentials.username,
      config.credentials.password,
    );
    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(5);
  });

  test('protected DELETE is forbidden without a token, allowed with it', async ({
    booker,
    auth,
  }) => {
    // 1) Create a booking (no auth required for create).
    const created = await booker.post<CreateBookingResponse>('/booking', {
      data: sampleBooking,
    });
    expect(created.status).toBe(HttpStatus.OK);
    const id = created.body.bookingid;
    expect(id).toBeGreaterThan(0);

    // 2) DELETE WITHOUT auth -> 403 Forbidden (authorization enforced).
    const unauthorized = await booker.del(`/booking/${id}`, {
      auth: new NoAuthStrategy(),
    });
    expect(unauthorized.status).toBe(HttpStatus.FORBIDDEN);

    // 3) Obtain a token, then DELETE WITH the cookie token -> 201 Created.
    const token = await auth.loginBooker(
      config.credentials.username,
      config.credentials.password,
    );
    const authorized = await booker.del(`/booking/${id}`, {
      auth: new CookieTokenStrategy(token),
    });
    expect(authorized.status).toBe(HttpStatus.CREATED); // Booker quirk: 201 on delete
  });
});
