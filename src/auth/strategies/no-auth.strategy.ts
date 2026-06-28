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

export class NoAuthStrategy implements AuthStrategy {
  public readonly scheme = 'None';

  public apply(): AuthHeaders {
    return {};
  }
}
