/**
 * middleware/index.ts — Barrel export for the middleware layer.
 */
export type {
  RequestContext,
  RequestMiddleware,
  ResponseMiddleware,
} from './types.js';
export { correlationIdMiddleware } from './correlation.middleware.js';
