/**
 * =============================================================================
 * content-types.spec.ts — JSON vs XML responses
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Not every API returns JSON. Legacy/enterprise services often return XML.
 *   Our ApiClient handles both gracefully: it tries to parse JSON, and when the
 *   body isn't JSON (e.g. XML) it sets `isJson: false` and preserves `rawText`
 *   so the test can assert on the raw markup. The client NEVER throws on parse.
 *
 * WHAT THIS TEACHES:
 *   - JSON responses -> isJson true, body is an object.
 *   - XML responses  -> isJson false, body falls back to rawText for assertions.
 *   - Content negotiation via the Accept header.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';

test.describe('Phase 2 · Content types', () => {
  test('JSON response is parsed into an object', async ({ httpbin }) => {
    const res = await httpbin.get('/json');

    expect(res.status).toBe(200);
    expect(res.isJson).toBe(true);
    expect(res.headers['content-type']).toContain('application/json');
    expect(typeof res.body).toBe('object');
  });

  test('XML response is preserved as raw text (not forced into JSON)', async ({
    httpbin,
  }) => {
    const res = await httpbin.get('/xml', {
      headers: { Accept: 'application/xml' },
    });

    expect(res.status).toBe(200);
    expect(res.isJson).toBe(false); // not JSON
    expect(res.headers['content-type']).toContain('xml');
    expect(res.rawText).toContain('<?xml'); // raw markup is intact
  });
});
