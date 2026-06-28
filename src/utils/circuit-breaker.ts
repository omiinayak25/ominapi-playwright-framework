/**
 * =============================================================================
 * circuit-breaker.ts — CircuitBreaker (resilience pattern)
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   When a dependency is failing, hammering it with retries makes things worse.
 *   A circuit breaker "trips" after N consecutive failures and FAILS FAST for a
 *   cooldown window, giving the dependency time to recover.
 *
 * STATES:
 *   - CLOSED    : normal; calls pass through. Failures increment a counter.
 *   - OPEN      : threshold hit; calls are rejected immediately (CircuitOpenError)
 *                 until the cooldown elapses.
 *   - HALF-OPEN : after cooldown, ONE trial call is allowed. Success -> CLOSED;
 *                 failure -> OPEN again.
 * =============================================================================
 */
import { CircuitOpenError } from './errors.js';

export type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private openedAt = 0;

  public constructor(
    private readonly failureThreshold: number,
    private readonly cooldownMs: number,
  ) {}

  /** Current state (for inspection/tests). */
  public get currentState(): CircuitState {
    return this.state;
  }

  /** Run `fn` through the breaker; rejects fast with CircuitOpenError if OPEN. */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.openedAt >= this.cooldownMs) {
        this.state = 'half-open'; // allow a single trial call
      } else {
        throw new CircuitOpenError();
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /** Manually reset to CLOSED (e.g. between test scenarios). */
  public reset(): void {
    this.state = 'closed';
    this.failures = 0;
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
      this.openedAt = Date.now();
    }
  }
}
