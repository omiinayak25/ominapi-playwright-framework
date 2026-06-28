/**
 * =============================================================================
 * errors.ts — Typed framework errors
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Throwing bare Error('failed') loses context. Typed errors carry the data a
 *   caller needs to react (status, path, body) and let `instanceof` checks
 *   branch on failure kind. This is the foundation of robust error handling.
 * =============================================================================
 */

/** An HTTP-level failure with the response context attached. */
export class ApiError extends Error {
  public constructor(
    message: string,
    public readonly status?: number,
    public readonly path?: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Thrown by the circuit breaker when the circuit is OPEN (fail fast). */
export class CircuitOpenError extends Error {
  public constructor(message = 'Circuit is open — request rejected') {
    super(message);
    this.name = 'CircuitOpenError';
  }
}
