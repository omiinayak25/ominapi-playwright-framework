/**
 * =============================================================================
 * middleware.spec.ts — Request/response middleware & correlation IDs
 * -----------------------------------------------------------------------------
 * WHAT WE VERIFY:
 *   - correlationId option auto-injects an x-correlation-id header (captured by
 *     the mock), and does NOT overwrite a caller-provided one.
 *   - Custom request middleware can add headers; response middleware observes
 *     every response.
 * =============================================================================
 */
import { test, expect, request } from '@playwright/test';
import { ApiClient } from '../../src/api-client/index.js';
import type { ApiResponse } from '../../src/api-client/index.js';
import { MockServer } from '../../src/utils/mock-server.js';

test.describe('Phase 20 · Middleware', () => {
  // With correlationId enabled and no header supplied, the client generates one; the mock captures a non-empty x-correlation-id.
  test('auto-injects a correlation id when none is provided', async () => {
    const server = new MockServer();
    await server.start();
    server.stub('GET', '/ping', { body: { ok: true } });

    const ctx = await request.newContext({ baseURL: server.url });
    const client = new ApiClient(ctx, 'corr', undefined, {
      correlationId: true,
    });

    await client.get('/ping');
    const captured = server.requests[0];
    expect(captured?.headers['x-correlation-id']).toBeTruthy();

    await ctx.dispose();
    await server.stop();
  });

  // When the caller passes an explicit x-correlation-id, the middleware leaves it untouched.
  test('does not overwrite a caller-provided correlation id', async () => {
    const server = new MockServer();
    await server.start();
    server.stub('GET', '/ping', { body: {} });

    const ctx = await request.newContext({ baseURL: server.url });
    const client = new ApiClient(ctx, 'corr', undefined, {
      correlationId: true,
    });

    await client.get('/ping', {
      headers: { 'x-correlation-id': 'explicit-123' },
    });
    expect(server.requests[0]?.headers['x-correlation-id']).toBe(
      'explicit-123',
    );

    await ctx.dispose();
    await server.stop();
  });

  // Custom request middleware mutates outgoing headers; response middleware fires for the response (status recorded).
  test('custom request & response middleware run', async () => {
    const server = new MockServer();
    await server.start();
    server.stub('GET', '/m', { body: { ok: true } });

    const seen: number[] = [];
    const ctx = await request.newContext({ baseURL: server.url });
    const client = new ApiClient(ctx, 'mw', undefined, {
      requestMiddleware: [
        (reqCtx) => {
          reqCtx.headers['x-tenant'] = 'acme';
        },
      ],
      responseMiddleware: [(res: ApiResponse) => seen.push(res.status)],
    });

    await client.get('/m');
    expect(server.requests[0]?.headers['x-tenant']).toBe('acme'); // request mw
    expect(seen).toEqual([200]); // response mw observed the status

    await ctx.dispose();
    await server.stop();
  });
});
