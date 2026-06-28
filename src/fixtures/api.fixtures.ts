/**
 * =============================================================================
 * api.fixtures.ts — Dependency Injection via Playwright fixtures
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Tests need a ready-to-use ApiClient bound to the correct base URL — and they
 *   should NOT build/dispose request contexts themselves (that's plumbing, and
 *   forgetting to dispose leaks resources). Fixtures inject the client and handle
 *   its full lifecycle automatically.
 *
 * WHAT PROBLEM IT SOLVES (Dependency Injection):
 *   The test declares WHAT it needs (`{ httpbin }`) and receives a working
 *   instance. It depends on an abstraction handed to it, not on construction
 *   details — the core idea of DI, and what makes tests clean and swappable.
 *
 * HOW IT WORKS:
 *   `base.extend<Fixtures>()` adds named fixtures. Each fixture:
 *     1) creates a dedicated APIRequestContext with the right baseURL,
 *     2) wraps it in an ApiClient,
 *     3) `await use(client)` hands it to the test,
 *     4) disposes the context AFTER the test (teardown) — no leaks.
 *
 * WHEN TO USE:
 *   Import `test` and `expect` from THIS module (not '@playwright/test') in any
 *   spec that needs an injected client:
 *     import { test, expect } from '@fixtures/api.fixtures';
 *     test('...', async ({ httpbin }) => { ... });
 * =============================================================================
 */
import { test as base, request as playwrightRequest } from '@playwright/test';
import {
  ApiClient,
  GraphQLClient,
  WebSocketClient,
} from '../api-client/index.js';
import { config } from '../config/index.js';
import { MockWebSocketServer } from '../utils/ws-server.js';
import {
  PostService,
  ProductService,
  BookingService,
  BreweryService,
} from '../services/index.js';
import { AuthService } from '../auth/index.js';
import { MockServer } from '../utils/mock-server.js';

/** The set of clients & repositories this fixture module injects into tests. */
export interface ApiFixtures {
  /** Client bound to httpbin.org — the HTTP request/response inspection service. */
  httpbin: ApiClient;
  /** Client bound to postman-echo.com — echoes back requests for assertions. */
  echo: ApiClient;
  /** Repository for JSONPlaceholder /posts (Phase 3 CRUD). */
  posts: PostService;
  /** Repository for DummyJSON /products (Phase 3 CRUD). */
  products: ProductService;
  /** Client bound to Restful Booker — used for authenticated CRUD (Phase 4). */
  booker: ApiClient;
  /** Service that performs login flows to obtain tokens (Phase 4). */
  auth: AuthService;
  /** Authenticated repository for Restful Booker /booking (Phase 7 chaining). */
  bookings: BookingService;
  /** Repository for Open Brewery DB (Phase 10 page-based pagination). */
  breweries: BreweryService;
  /** Raw client for DummyJSON (e.g. /users, for security tests). */
  dummyjson: ApiClient;
  /** GraphQL client for the Countries API (queries/variables/fragments). */
  countries: GraphQLClient;
  /** GraphQL client for GraphQLZero (mutations). */
  graphqlZero: GraphQLClient;
  /** In-process mock server + a client pointed at it (Phase 15). */
  mock: { server: MockServer; client: ApiClient };
  /** In-process WebSocket echo server + a client pointed at it (Phase 16). */
  ws: { server: MockWebSocketServer; client: WebSocketClient };
}

/**
 * Small helper (DRY): build a disposable client for a base URL and run the test
 * body against it, guaranteeing disposal afterwards.
 */
async function withClient(
  baseURL: string,
  name: string,
  run: (client: ApiClient) => Promise<void>,
): Promise<void> {
  const context = await playwrightRequest.newContext({
    baseURL,
    timeout: config.timeoutMs,
    ignoreHTTPSErrors: config.ignoreHttpsErrors,
    extraHTTPHeaders: { Accept: 'application/json' },
  });
  try {
    await run(new ApiClient(context, name));
  } finally {
    // Teardown ALWAYS runs — even if the test throws — so contexts never leak.
    await context.dispose();
  }
}

/** Extended Playwright test with our injected API clients. */
export const test = base.extend<ApiFixtures>({
  httpbin: async ({}, use) => {
    await withClient(config.endpoints.httpbin, 'httpbin', use);
  },
  echo: async ({}, use) => {
    await withClient(config.endpoints.postmanEcho, 'echo', use);
  },
  posts: async ({}, use) => {
    // Build a client for JSONPlaceholder, wrap it in the repository, inject it.
    await withClient(config.endpoints.jsonPlaceholder, 'jsonplaceholder', (c) =>
      use(new PostService(c)),
    );
  },
  products: async ({}, use) => {
    await withClient(config.endpoints.dummyJson, 'dummyjson', (c) =>
      use(new ProductService(c)),
    );
  },
  booker: async ({}, use) => {
    await withClient(config.endpoints.booker, 'booker', use);
  },
  auth: async ({}, use) => {
    await withClient(config.endpoints.booker, 'booker-auth', (c) =>
      use(new AuthService(c)),
    );
  },
  bookings: async ({}, use) => {
    await withClient(config.endpoints.booker, 'bookings', (c) =>
      use(new BookingService(c)),
    );
  },
  breweries: async ({}, use) => {
    await withClient(config.endpoints.openBrewery, 'breweries', (c) =>
      use(new BreweryService(c)),
    );
  },
  dummyjson: async ({}, use) => {
    await withClient(config.endpoints.dummyJson, 'dummyjson-raw', use);
  },
  countries: async ({}, use) => {
    await withClient(config.endpoints.countriesGraphql, 'countries-gql', (c) =>
      use(new GraphQLClient(c, '/')),
    );
  },
  graphqlZero: async ({}, use) => {
    await withClient(config.endpoints.graphqlZero, 'graphqlzero', (c) =>
      use(new GraphQLClient(c, '/api')),
    );
  },
  mock: async ({}, use) => {
    // Start a fresh mock server per test (ephemeral port -> full isolation).
    const server = new MockServer();
    await server.start();
    const context = await playwrightRequest.newContext({
      baseURL: server.url,
      extraHTTPHeaders: { Accept: 'application/json' },
    });
    try {
      await use({ server, client: new ApiClient(context, 'mock') });
    } finally {
      await context.dispose();
      await server.stop();
    }
  },
  ws: async ({}, use) => {
    const server = new MockWebSocketServer();
    await server.start();
    const client = new WebSocketClient(server.url);
    try {
      await use({ server, client });
    } finally {
      await client.close();
      await server.stop();
    }
  },
});

/** Re-export expect so specs import everything from one place. */
export { expect } from '@playwright/test';
