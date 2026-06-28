/**
 * =============================================================================
 * types.ts — Middleware contracts
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Middleware are cross-cutting hooks the ApiClient runs around every request.
 *   Request middleware can mutate outgoing headers (correlation IDs, tracing);
 *   response middleware can observe the result (metrics, logging). They keep
 *   cross-cutting concerns OUT of individual call sites.
 * =============================================================================
 */
import type { ApiResponse } from '../api-client/api-client.types.js';

/** Mutable view of an outgoing request passed to request middleware. */
export interface RequestContext {
  readonly method: string;
  readonly path: string;
  /** Headers map — middleware may add/modify entries in place. */
  readonly headers: Record<string, string>;
}

/** Runs before a request is sent; may mutate ctx.headers. */
export type RequestMiddleware = (ctx: RequestContext) => void;

/** Runs after a response is received; for observation/side-effects. */
export type ResponseMiddleware = (response: ApiResponse) => void;
