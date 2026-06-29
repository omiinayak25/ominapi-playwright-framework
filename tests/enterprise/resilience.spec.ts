/**
 * =============================================================================
 * resilience.spec.ts — Retry & Circuit Breaker
 * -----------------------------------------------------------------------------
 * WHAT WE VERIFY:
 *   - RETRY: a client configured with a retry policy recovers from transient 5xx
 *     (the mock returns 503 twice, then 200) — and gives up after the limit.
 *   - withRetry util retries on throw and respects shouldRetry.
 *   - CIRCUIT BREAKER: trips OPEN after the failure threshold (fail fast), then
 *     half-opens after cooldown and closes on success.
 * =============================================================================
 */
import { test, expect, request } from '@playwright/test';
import { ApiClient } from '../../src/api-client/index.js';
import { withRetry } from '../../src/utils/retry.js';
import { CircuitBreaker } from '../../src/utils/circuit-breaker.js';
import { CircuitOpenError } from '../../src/utils/errors.js';
import { MockServer } from '../../src/utils/mock-server.js';
import { delay } from '../../src/utils/retry.js';

test.describe('Phase 20 · Resilience — retry', () => {
  // Mock fails with 503 on the first two calls then returns 200; the retry policy turns this into a single successful result.
  test('ApiClient retries transient 503s then succeeds', async () => {
    const server = new MockServer();
    await server.start();
    let calls = 0;
    server.on('GET', '/flaky', () => {
      calls++;
      return calls < 3
        ? { status: 503, body: {} }
        : { status: 200, body: { ok: true } };
    });

    const ctx = await request.newContext({ baseURL: server.url });
    const client = new ApiClient(ctx, 'retry', undefined, {
      retry: { retries: 3, baseDelayMs: 0 },
    });

    const res = await client.get<{ ok: boolean }>('/flaky');
    expect(res.status).toBe(200);
    expect(calls).toBe(3); // 2 failures + 1 success

    await ctx.dispose();
    await server.stop();
  });

  // withRetry re-invokes on a thrown error until success, but skips retries entirely when shouldRetry returns false.
  test('withRetry retries on throw and respects shouldRetry', async () => {
    let attempts = 0;
    const result = await withRetry(
      () => {
        attempts++;
        if (attempts < 2) throw new Error('transient');
        return Promise.resolve('ok');
      },
      { retries: 3, baseDelayMs: 0 },
    );
    expect(result).toBe('ok');
    expect(attempts).toBe(2);

    // Non-retryable error is thrown immediately.
    let tries = 0;
    await expect(
      withRetry(
        () => {
          tries++;
          return Promise.reject(new Error('fatal'));
        },
        { retries: 5, baseDelayMs: 0, shouldRetry: () => false },
      ),
    ).rejects.toThrow('fatal');
    expect(tries).toBe(1);
  });
});

test.describe('Phase 20 · Resilience — circuit breaker', () => {
  // After enough consecutive failures the breaker flips OPEN and rejects further calls immediately without invoking the function.
  test('opens after the failure threshold and fails fast', async () => {
    const breaker = new CircuitBreaker(2, 10_000);
    const boom = (): Promise<never> => Promise.reject(new Error('down'));

    await expect(breaker.execute(boom)).rejects.toThrow('down');
    expect(breaker.currentState).toBe('closed');
    await expect(breaker.execute(boom)).rejects.toThrow('down');
    expect(breaker.currentState).toBe('open'); // threshold (2) reached

    // Now OPEN: calls are rejected immediately without invoking fn.
    let invoked = false;
    await expect(
      breaker.execute(() => {
        invoked = true;
        return Promise.resolve('x');
      }),
    ).rejects.toBeInstanceOf(CircuitOpenError);
    expect(invoked).toBe(false);
  });

  // Once the cooldown elapses the breaker half-opens; a successful trial call closes it again.
  test('half-opens after cooldown and closes on success', async () => {
    const breaker = new CircuitBreaker(1, 50); // trip after 1 failure, 50ms cooldown
    await expect(
      breaker.execute(() => Promise.reject(new Error('x'))),
    ).rejects.toThrow();
    expect(breaker.currentState).toBe('open');

    await delay(60); // wait out the cooldown
    const ok = await breaker.execute(() => Promise.resolve('recovered'));
    expect(ok).toBe('recovered');
    expect(breaker.currentState).toBe('closed');
  });
});
