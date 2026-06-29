/**
 * =============================================================================
 * no-auth.strategy.ts — "No authentication" (Strategy + Null Object pattern)
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Sometimes the right strategy is "none". Rather than scattering `if (auth)`
 *   checks, the Null Object pattern provides a do-nothing implementation that
 *   satisfies the interface — callers treat it like any other strategy.
 *
 * WHY USE IT:
 *   Makes "unauthenticated" an EXPLICIT, intentional choice in test code, and
 *   keeps the ApiClient free of null checks.
 * =============================================================================
 */
import type { AuthStrategy, AuthHeaders } from '../auth.types.js';

/**
 * Null-object auth strategy: satisfies the interface but adds no headers.
 */
export class NoAuthStrategy implements AuthStrategy {
  /** Identifies this strategy in logs/diagnostics. */
  public readonly scheme = 'None';

  /**
   * @returns An empty header set (no authentication applied).
   */
  public apply(): AuthHeaders {
    return {};
  }
}
