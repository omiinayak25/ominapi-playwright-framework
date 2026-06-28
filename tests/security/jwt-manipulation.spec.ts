/**
 * =============================================================================
 * jwt-manipulation.spec.ts — JWT tampering tooling & checks
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   The two classic JWT attacks are payload tampering (privilege escalation) and
 *   alg:"none" (skip signature verification). We use our jwt utils to FORGE such
 *   tokens and assert the forgery is structurally what an attacker would send —
 *   the artifact a secure server MUST reject.
 *
 * NOTE on the target:
 *   httpbin /bearer does NOT verify signatures (it accepts any bearer), so it
 *   cannot demonstrate REJECTION. We therefore test the manipulation tooling
 *   deterministically (decode/tamper/alg-none), and document the server-side
 *   expectation. Against a real signature-verifying API, sending these tokens
 *   should yield 401.
 * =============================================================================
 */
import { test, expect } from '@playwright/test';
import {
  createJwt,
  decodeJwt,
  tamperPayload,
  toAlgNone,
} from '../../src/utils/jwt.js';

test.describe('Phase 12 · JWT manipulation', () => {
  const original = createJwt({ sub: '1234', name: 'OmniAPI', role: 'user' });

  test('a JWT decodes into header, payload, signature', () => {
    const decoded = decodeJwt(original);
    expect(decoded.header.alg).toBe('HS256');
    expect(decoded.payload.role).toBe('user');
    expect(decoded.signature).toBeTruthy();
  });

  test('payload tampering changes claims but reuses the old signature', () => {
    const tampered = tamperPayload(original, { role: 'admin' });
    const decoded = decodeJwt(tampered);

    // Privilege escalated in the payload...
    expect(decoded.payload.role).toBe('admin');
    // ...while the signature is the ORIGINAL — so it no longer matches.
    expect(decoded.signature).toBe(decodeJwt(original).signature);
    // The token string itself differs from the original.
    expect(tampered).not.toBe(original);
  });

  test('alg:none attack produces an unsigned token', () => {
    const none = toAlgNone(original);
    const decoded = decodeJwt(none);

    expect(decoded.header.alg).toBe('none');
    expect(decoded.signature).toBe(''); // empty signature segment
    expect(none.endsWith('.')).toBe(true);
  });
});
