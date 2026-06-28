/**
 * =============================================================================
 * caching.spec.ts — TTL cache (unit) + ApiClient GET caching (integration)
 * -----------------------------------------------------------------------------
 * WHAT WE VERIFY:
 *   - TtlCache returns stored values, expires them after the TTL.
 *   - A cache-enabled ApiClient serves a repeated GET from cache (the mock server
 *     records only ONE actual request).
 * =============================================================================
 */
import { test, expect, request } from '@playwright/test';
import { ApiClient } from '../../src/api-client/index.js';
import { TtlCache } from '../../src/utils/cache.js';
import { delay } from '../../src/utils/retry.js';
import { MockServer } from '../../src/utils/mock-server.js';

test.describe('Phase 20 · TtlCache (unit)', () => {
  test('stores and returns a value within TTL', () => {
    const cache = new TtlCache<number>(1000);
    cache.set('a', 42);
    expect(cache.get('a')).toBe(42);
    expect(cache.has('a')).toBe(true);
    expect(cache.size).toBe(1);
  });

  test('expires a value after the TTL', async () => {
    const cache = new TtlCache<string>(30);
    cache.set('k', 'v');
    await delay(50);
    expect(cache.get('k')).toBeUndefined(); // expired
  });
});

test.describe('Phase 20 · ApiClient GET caching', () => {
  test('a repeated GET is served from cache (one server hit)', async () => {
    const server = new MockServer();
    await server.start();
    server.on('GET', '/data', () => ({ body: { value: 'fresh' } }));

    const ctx = await request.newContext({ baseURL: server.url });
    const client = new ApiClient(ctx, 'cached', undefined, {
      cache: { ttlMs: 5000 },
    });

    const first = await client.get<{ value: string }>('/data');
    const second = await client.get<{ value: string }>('/data');

    expect(first.body.value).toBe('fresh');
    expect(second.body.value).toBe('fresh');
    // The server saw only ONE request — the second was a cache hit.
    expect(server.requests).toHaveLength(1);

    await ctx.dispose();
    await server.stop();
  });
});
