/**
 * =============================================================================
 * data-exposure-headers.spec.ts — Sensitive data exposure & security headers
 * -----------------------------------------------------------------------------
 * WHAT WE VERIFY:
 *   - A normal resource response leaks NO sensitive fields (findSensitiveData).
 *   - The detector actually works (positive control on a crafted leaky object).
 *   - REAL FINDING: DummyJSON /users returns plaintext `password` — exactly the
 *     kind of exposure a security test must surface.
 *   - Security headers audit: assert the hardening headers DummyJSON does set.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import {
  findSensitiveData,
  auditSecurityHeaders,
} from '../../src/validators/index.js';
import { logger } from '../../src/utils/logger.js';
import { HttpStatus } from '../../src/constants/http-status.js';

test.describe('Phase 12 · Data exposure & security headers', () => {
  test('a normal product response leaks no sensitive fields', async ({
    products,
  }) => {
    const res = await products.getById(1);
    expect(findSensitiveData(res.body)).toHaveLength(0);
  });

  test('the sensitive-data detector works (positive control)', () => {
    const leaky = {
      id: 1,
      username: 'bob',
      password: 'hunter2',
      nested: { apiKey: 'sk-123' },
    };
    const hits = findSensitiveData(leaky);
    expect(hits).toContain('password');
    expect(hits).toContain('nested.apiKey');
  });

  test('FINDING: DummyJSON /users exposes plaintext passwords', async ({
    dummyjson,
  }) => {
    const res = await dummyjson.get('/users', {
      params: { limit: 1, select: 'username,password' },
    });
    expect(res.status).toBe(HttpStatus.OK);

    const hits = findSensitiveData(res.body);
    // A security test SURFACES this exposure rather than ignoring it.
    expect(hits.some((h) => h.toLowerCase().includes('password'))).toBe(true);
    logger.warn('Security finding: /users exposes password fields', { hits });
  });

  test('security headers audit reports DummyJSON hardening headers', async ({
    products,
  }) => {
    const res = await products.getById(1);
    const report = auditSecurityHeaders(res.headers);
    logger.info('Security header report', report);

    // DummyJSON sets these — assert they are detected as present.
    expect(report.present).toContain('x-content-type-options');
    expect(report.present).toContain('strict-transport-security');
  });
});
