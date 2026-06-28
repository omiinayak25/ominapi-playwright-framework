/**
 * api-client/index.ts — Barrel export for the HTTP Facade.
 * Lets consumers `import { ApiClient } from '@api-client/index'` cleanly.
 */
export { ApiClient } from './api-client.js';
export type {
  ApiResponse,
  RequestOptions,
  QueryValue,
  FilePayload,
  MultipartValue,
  ApiClientOptions,
  RetryPolicy,
  CachePolicy,
} from './api-client.types.js';
export { GraphQLClient, graphqlData } from './graphql-client.js';
export { WebSocketClient } from './ws-client.js';
export type {
  GraphQLResponse,
  GraphQLError,
  GraphQLVariables,
} from './graphql-client.js';
