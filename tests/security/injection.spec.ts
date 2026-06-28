/**
 * =============================================================================
 * injection.spec.ts — SQL injection & XSS handling
 * -----------------------------------------------------------------------------
 * WHAT WE VERIFY:
 *   - SQLi in a login field NEVER bypasses auth (no token returned) and never
 *     triggers a 500.
 *   - SQLi in a search query returns a safe, well-formed result (no 500, no leak).
 *   - XSS payloads are stored/returned as INERT DATA (string round-trip). The API
 *     layer's job is to not choke; output encoding is the renderer's job.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import {
  SQL_INJECTION_PAYLOADS,
  XSS_PAYLOADS,
} from '../../src/constants/security-payloads.js';
import { BookingFactory } from '../../src/builders/index.js';
import type { CreateBookingResponse } from '../../src/models/booking.model.js';

interface AuthAttempt {
  token?: string;
  reason?: string;
}

test.describe('Phase 12 · Injection handling', () => {
  test.describe.configure({ retries: 2 });

  for (const payload of SQL_INJECTION_PAYLOADS) {
    test(`SQLi login is not bypassed: ${payload}`, async ({ booker }) => {
      const res = await booker.post<AuthAttempt>('/auth', {
        data: { username: payload, password: payload },
      });
      // No auth bypass: no token issued, and not a server error.
      expect(res.status).toBeLessThan(500);
      expect(res.body.token).toBeUndefined();
    });
  }

  test('SQLi in search returns a safe, well-formed response (no 500/leak)', async ({
    products,
  }) => {
    const res = await products.search("' OR 1=1--");
    expect(res.status).toBeLessThan(500);
    expect(Array.isArray(res.body.products)).toBe(true); // structured, not an error dump
  });

  for (const payload of XSS_PAYLOADS) {
    test(`XSS payload is stored as inert data: ${payload.slice(0, 20)}...`, async ({
      booker,
    }) => {
      const booking = BookingFactory.forGuest(payload, 'XSSTest');
      const res = await booker.post<CreateBookingResponse>('/booking', {
        data: booking,
      });
      expect(res.status).toBeLessThan(500);
      // The payload is returned verbatim as DATA — not executed, not mangled.
      expect(res.body.booking.firstname).toBe(payload);
    });
  }
});
