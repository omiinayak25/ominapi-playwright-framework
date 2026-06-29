/**
 * =============================================================================
 * dynamic-mocking.spec.ts — Responses computed from the request
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   A dynamic handler inspects the incoming request (query/body) and builds the
 *   response on the fly — mimicking real server logic. Great for echo endpoints,
 *   conditional behavior, and data-shaped responses.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { HttpStatus } from '../../src/constants/http-status.js';

test.describe('Phase 15 · Dynamic mocking', () => {
  // Handler reads req.query.name and interpolates it; expect the greeting to
  // reflect the value the client passed, falling back to 'stranger' otherwise.
  test('response is computed from query parameters', async ({ mock }) => {
    const { server, client } = mock;
    server.on('GET', '/greet', (req) => ({
      body: { message: `Hello, ${req.query.name ?? 'stranger'}!` },
    }));

    const res = await client.get<{ message: string }>('/greet', {
      params: { name: 'Omni' },
    });
    expect(res.body.message).toBe('Hello, Omni!');
  });

  // Echo endpoint mirrors the request body back; expect the round-tripped
  // payload (including nested objects) to deep-equal what was sent.
  test('handler echoes the posted body', async ({ mock }) => {
    const { server, client } = mock;
    server.on('POST', '/echo', (req) => ({ body: { received: req.body } }));

    const payload = { a: 1, nested: { b: 2 } };
    const res = await client.post<{ received: typeof payload }>('/echo', {
      data: payload,
    });
    expect(res.body.received).toEqual(payload);
  });

  // Handler branches on input: id=1 -> 200, anything else -> 404. Expect the
  // status to track the request, proving response logic can be data-driven.
  test('handler returns a conditional status based on input', async ({
    mock,
  }) => {
    const { server, client } = mock;
    server.on('GET', '/resource', (req) =>
      req.query.id === '1'
        ? { status: HttpStatus.OK, body: { id: 1 } }
        : { status: HttpStatus.NOT_FOUND, body: { error: 'not found' } },
    );

    const found = await client.get('/resource', { params: { id: 1 } });
    const missing = await client.get('/resource', { params: { id: 999 } });

    expect(found.status).toBe(HttpStatus.OK);
    expect(missing.status).toBe(HttpStatus.NOT_FOUND);
  });
});
