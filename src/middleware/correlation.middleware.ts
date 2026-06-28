/**
 * =============================================================================
 * correlation.middleware.ts — Auto-inject a correlation ID header
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   A correlation ID ties together all logs/spans for one logical request across
 *   services — essential for distributed debugging. This request middleware adds
 *   a unique ID header to every outgoing request UNLESS the caller already set
 *   one (so an explicit, end-to-end trace id is never overwritten).
 * =============================================================================
 */
import { uuid } from '../utils/random.js';
import type { RequestMiddleware } from './types.js';

/** Create middleware that ensures every request carries a correlation ID. */
export function correlationIdMiddleware(
  headerName = 'x-correlation-id',
): RequestMiddleware {
  return (ctx) => {
    // Respect an existing id (don't clobber a caller-provided trace id).
    const already = Object.keys(ctx.headers).some(
      (k) => k.toLowerCase() === headerName.toLowerCase(),
    );
    if (!already) {
      ctx.headers[headerName] = uuid();
    }
  };
}
