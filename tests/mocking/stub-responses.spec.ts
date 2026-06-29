/**
 * =============================================================================
 * stub-responses.spec.ts — Forcing exact statuses, bodies & headers
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   The superpower of mocking is forcing responses a live API won't give on
 *   demand: a 201 with a Location header, a 500 error, a custom header. This lets
 *   you test how YOUR code handles each case deterministically.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { HttpStatus } from '../../src/constants/http-status.js';

test.describe('Phase 15 · Stub responses', () => {
  // Stub a POST to return 201 with a Location and custom header; expect the
  // client to surface the exact status, body, and both headers — verifying
  // created-resource handling without a real server.
  test('forces a 201 Created with custom headers', async ({ mock }) => {
    const { server, client } = mock;
    server.stub('POST', '/items', {
      status: HttpStatus.CREATED,
      body: { id: 99, created: true },
      headers: { location: '/items/99', 'x-request-id': 'mock-123' },
    });

    const res = await client.post<{ id: number }>('/items', {
      data: { name: 'widget' },
    });

    expect(res.status).toBe(HttpStatus.CREATED);
    expect(res.body.id).toBe(99);
    expect(res.headers['location']).toBe('/items/99');
    expect(res.headers['x-request-id']).toBe('mock-123');
  });

  // Stub a forced 500; expect the client to propagate the error status and
  // body so failure-path logic can be exercised on demand.
  test('forces a 500 error to test failure handling', async ({ mock }) => {
    const { server, client } = mock;
    server.stub('GET', '/flaky', {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { error: 'simulated outage' },
    });

    const res = await client.get<{ error: string }>('/flaky');
    expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.body.error).toBe('simulated outage');
  });
});
