/**
 * =============================================================================
 * retry.ts — Generic retry with exponential backoff
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Transient failures (network blips, 503s) should be retried, not failed.
 *   This generic helper retries any async function with EXPONENTIAL BACKOFF and a
 *   pluggable shouldRetry predicate, so the policy is reusable everywhere
 *   (the ApiClient uses the same idea for retryable status codes).
 *
 * BACKOFF: delay = baseDelayMs * 2^(attempt-1) — spreads load and gives a failing
 *   dependency time to recover, instead of a tight retry storm.
 * =============================================================================
 */
import { logger } from './logger.js';

export interface RetryConfig {
  /** Maximum number of RETRIES after the first attempt. */
  readonly retries: number;
  /** Base backoff delay in ms (0 = retry immediately; good for tests). */
  readonly baseDelayMs?: number;
  /** Decide whether a thrown error is retryable (default: always). */
  readonly shouldRetry?: (error: unknown) => boolean;
}

/** Promise-based sleep. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Run `fn`, retrying on failure per the config; rethrows the last error. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
): Promise<T> {
  const baseDelay = config.baseDelayMs ?? 0;
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable = config.shouldRetry ? config.shouldRetry(error) : true;
      if (attempt === config.retries || !retryable) break;

      const wait = baseDelay * Math.pow(2, attempt);
      logger.warn(
        `[retry] attempt ${attempt + 1} failed, retrying in ${wait}ms`,
      );
      if (wait > 0) await delay(wait);
    }
  }
  throw lastError;
}
