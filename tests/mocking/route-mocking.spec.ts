/**
 * =============================================================================
 * route-mocking.spec.ts — Route mocking with a fake server
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Register routes on the in-process mock server, then hit them through the real
 *   ApiClient. Tests are fully OFFLINE and deterministic. Unregistered routes
 *   return 404 — proving routing is exact.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { HttpStatus } from '../../src/constants/http-status.js';

interface User {
  id: number;
  name: string;
}

test.describe('Phase 15 · Route mocking', () => {
  // Register GET /users with a fixed body; expect the client to receive that
  // exact payload (200, two users) — the canned response, served offline.
  test('a stubbed route returns the canned response', async ({ mock }) => {
    const { server, client } = mock;
    server.stub('GET', '/users', {
      body: [
        { id: 1, name: 'Ada' },
        { id: 2, name: 'Linus' },
      ],
    });

    const res = await client.get<User[]>('/users');

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]?.name).toBe('Ada');
  });

  // Hit a path no stub was registered for; expect 404, proving the mock server
  // matches routes exactly and doesn't fall through to a catch-all.
  test('an unregistered route returns 404', async ({ mock }) => {
    const res = await mock.client.get('/not-mocked');
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
  });
});
