/**
 * =============================================================================
 * request-spy.spec.ts — Verifying what the client SENT (consumer contract)
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Mocking isn't only about responses — the server records every request, so we
 *   can assert our client sent the RIGHT method, path, headers, and body. This
 *   verifies the CONSUMER side of the contract (the request shape), which a live
 *   API can't tell you about.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { ApiKeyStrategy } from '../../src/auth/index.js';

test.describe('Phase 15 · Request spying', () => {
  // Send one POST with a body, custom header, and API-key auth; expect the
  // server to have recorded exactly that request so we can assert what the
  // client actually transmitted on the wire.
  test('captures method, path, headers and body the client sent', async ({
    mock,
  }) => {
    const { server, client } = mock;
    server.stub('POST', '/track', { status: 202, body: { ok: true } });

    await client.post('/track', {
      data: { event: 'signup', userId: 42 },
      headers: { 'x-correlation-id': 'trace-abc' },
      auth: new ApiKeyStrategy('x-api-key', 'secret-key'),
    });

    expect(server.requests).toHaveLength(1);
    const captured = server.requests[0];
    expect(captured?.method).toBe('POST');
    expect(captured?.path).toBe('/track');
    expect(captured?.body).toEqual({ event: 'signup', userId: 42 });
    // Auth strategy + custom header were actually transmitted.
    expect(captured?.headers['x-api-key']).toBe('secret-key');
    expect(captured?.headers['x-correlation-id']).toBe('trace-abc');
  });

  // Two sequential GETs; expect the recorded requests to preserve call order
  // (FIFO), so callers can reason about sequencing.
  test('records multiple requests in order', async ({ mock }) => {
    const { server, client } = mock;
    server.stub('GET', '/a', { body: {} });
    server.stub('GET', '/b', { body: {} });

    await client.get('/a');
    await client.get('/b');

    expect(server.requests.map((r) => r.path)).toEqual(['/a', '/b']);
  });
});
