/**
 * api-client/index.ts — Barrel export for the HTTP Facade.
 * Lets consumers `import { ApiClient } from '@api-client/index'` cleanly.
 */
export { ApiClient } from './api-client.js';
export type {
  ApiResponse,
  RequestOptions,
  QueryValue,
} from './api-client.types.js';
