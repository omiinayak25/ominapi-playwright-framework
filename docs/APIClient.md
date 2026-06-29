# ApiClient — HTTP Facade

## Overview

`ApiClient` is the central HTTP abstraction in OminAPI. It wraps Playwright's
`APIRequestContext` behind five clean verb methods, normalizes every response into
a consistent `ApiResponse<T>` shape, and provides opt-in enterprise features
(retry, TTL cache, correlation IDs, middleware) through `ApiClientOptions`.

Repository: <https://github.com/omiinayak25/ominapi-playwright-framework>

Source files:

- [`src/api-client/api-client.ts`](../src/api-client/api-client.ts)
- [`src/api-client/api-client.types.ts`](../src/api-client/api-client.types.ts)
- [`src/api-client/index.ts`](../src/api-client/index.ts)

Related clients in the same barrel export:

- [`GraphQLClient`](#graphqlclient) — thin GraphQL layer over `ApiClient`
- [`WebSocketClient`](#websocketclient) — Promise-based WebSocket wrapper

---

## Purpose

| Without `ApiClient`                     | With `ApiClient`                        |
| --------------------------------------- | --------------------------------------- |
| Every test reimplements header merging  | One place, applied uniformly            |
| `JSON.parse` throws on HTML error pages | `safeJsonParse` — never throws          |
| No consistent timing/logging            | Every call timed and logged             |
| 4xx/5xx throw before you can assert     | Returned as `ApiResponse`; opt-in throw |
| Auth logic scattered across tests       | Strategy pattern, injected once         |

---

## Constructor

```typescript
new ApiClient(
  context: APIRequestContext,  // Playwright request context (carries baseURL)
  name: string = 'api',        // Label used in log lines
  auth?: AuthStrategy,         // Optional client-wide default auth strategy
  options: ApiClientOptions = {},
)
```

**Parameters**

| Parameter | Type                | Required             | Description                                            |
| --------- | ------------------- | -------------------- | ------------------------------------------------------ |
| `context` | `APIRequestContext` | Yes                  | Injected by fixtures; already carries `baseURL`        |
| `name`    | `string`            | No (default `'api'`) | Appears in every log line for this client              |
| `auth`    | `AuthStrategy`      | No                   | Applied to every request unless overridden per-call    |
| `options` | `ApiClientOptions`  | No                   | Opt-in enterprise features; omit for baseline behavior |

Tests never call `new ApiClient()` directly. They receive a ready instance via
the Playwright fixture system (Dependency Injection). See
[`src/fixtures/api.fixtures.ts`](../src/fixtures/api.fixtures.ts).

---

## HTTP Verb Methods

All five verbs share the same signature pattern and all return `Promise<ApiResponse<T>>`.

```typescript
client.get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>
client.post<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>
client.put<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>
client.patch<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>
client.del<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>
```

> `del` is used instead of `delete` because `delete` is a reserved word in
> JavaScript/TypeScript.

All five delegate to one private `send()` method (Single Responsibility + DRY),
which handles auth resolution, middleware, caching, the actual fetch, response
normalization, and retry.

---

## `RequestOptions`

Every verb accepts an optional `RequestOptions` object. All fields are optional;
a bare GET needs none.

```typescript
interface RequestOptions {
  headers?: Record<string, string>; // Per-request headers, merged over defaults
  params?: Record<string, QueryValue>; // Query-string params -> ?key=value
  data?: unknown; // JSON body; sets Content-Type: application/json
  form?: Record<string, QueryValue>; // x-www-form-urlencoded body
  multipart?: Record<string, MultipartValue>; // multipart/form-data (file uploads)
  timeout?: number; // Per-request timeout in ms
  failOnStatusCode?: boolean; // When true, non-2xx throws (default: false)
  auth?: AuthStrategy; // Per-request auth; overrides client default
}
```

**Type aliases used above**

```typescript
type QueryValue = string | number | boolean;

interface FilePayload {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

type MultipartValue = string | number | boolean | FilePayload;
```

**Body fields are mutually exclusive**: use exactly one of `data`, `form`, or
`multipart` per call.

---

## `ApiResponse<T>`

Every verb returns this normalized shape regardless of which API is called or
which HTTP status was returned.

```typescript
interface ApiResponse<T = unknown> {
  status: number; // Numeric HTTP status, e.g. 200, 404
  statusText: string; // "OK", "Not Found", etc.
  ok: boolean; // true for 2xx responses
  headers: Record<string, string>; // Lower-cased header names
  body: T; // Parsed JSON body, or raw text if not JSON
  rawText: string; // Unparsed response text (XML, plain text, debugging)
  isJson: boolean; // true when body was valid JSON
  durationMs: number; // Wall-clock request time (basis for SLA assertions)
  sizeBytes: number; // Response body size in bytes
  url: string; // Final resolved request URL
  raw: APIResponse; // Playwright's raw APIResponse (escape hatch)
}
```

Because every call returns `ApiResponse<T>`, assertions are uniform across the
entire framework:

```typescript
// Every field below is populated by the client on each call, so assertions look identical everywhere
expect(res.status).toBe(200); // exact HTTP status
expect(res.ok).toBe(true); // 2xx convenience flag
expect(res.isJson).toBe(true); // body was parsed as JSON
expect(res.durationMs).toBeLessThan(2000); // SLA / timing check
expect(res.body.firstname).toBe('John'); // typed body access
```

---

## `ApiClientOptions`

Passed as the fourth constructor argument to enable enterprise features. Omitting
it yields baseline behavior with no overhead.

```typescript
interface ApiClientOptions {
  retry?: RetryPolicy;
  cache?: CachePolicy;
  correlationId?: boolean; // Auto-inject x-correlation-id header
  requestMiddleware?: RequestMiddleware[];
  responseMiddleware?: ResponseMiddleware[];
}
```

### `RetryPolicy`

```typescript
interface RetryPolicy {
  retries: number; // Max retries after the first attempt
  retryOnStatuses?: number[]; // Defaults: [429, 500, 502, 503, 504]
  baseDelayMs?: number; // Exponential base; 0 = immediate retry
}
```

Retry uses exponential backoff: `delay = baseDelayMs * 2^(attempt - 1)`.

### `CachePolicy`

```typescript
interface CachePolicy {
  ttlMs: number; // TTL for cached GET responses
}
```

Only successful GET responses (status < 400) are cached. The cache key is
`"GET <path>?<serialized-params>"`. Cache entries are lazily evicted on read.

### Middleware

```typescript
// Runs before the request is sent; may mutate ctx.headers in place.
type RequestMiddleware = (ctx: RequestContext) => void;

// Runs after the response is received; for observation/side-effects only.
type ResponseMiddleware = (response: ApiResponse) => void;
```

When `correlationId: true` is set, `correlationIdMiddleware` is automatically
appended to the request middleware chain and injects a UUID as
`x-correlation-id` unless the caller already set that header.

---

## Code Examples

### Basic GET (from fixtures)

```typescript
// Import test/expect from the fixtures module, not @playwright/test, to get injected clients
import { test, expect } from '../../src/fixtures/api.fixtures.js';

// `httpbin` is the client injected by the fixture system
test('GET /get echoes headers', async ({ httpbin }) => {
  const res = await httpbin.get('/get', {
    headers: { 'x-custom': 'omni' }, // merged over the client's default headers
    params: { env: 'staging' }, // serialized to ?env=staging
  });

  expect(res.status).toBe(200);
  expect(res.isJson).toBe(true);
  expect(res.durationMs).toBeLessThan(3000);
});
```

### POST with JSON body

```typescript
test('JSON body is serialized correctly', async ({ echo }) => {
  const payload = { framework: 'OminAPI', nested: { level: 2 } };

  // `data` sets a JSON body and Content-Type: application/json automatically
  const res = await echo.post<PostmanEcho>('/post', { data: payload });

  expect(res.status).toBe(200);
  expect(res.body.json).toEqual(payload); // echo server reflects the parsed JSON back
});
```

### Form-encoded body

```typescript
test('url-encoded form body is transmitted', async ({ echo }) => {
  const res = await echo.post<PostmanEcho>('/post', {
    form: { username: 'omni', remember: true }, // `form` sends x-www-form-urlencoded instead of JSON
  });

  // form values arrive as strings, so the boolean becomes 'true'
  expect(res.body.form).toMatchObject({ username: 'omni', remember: 'true' });
});
```

### Per-request auth override

```typescript
// Same endpoint — one call with auth, one without (negative test)
const authed = await booker.del('/booking/1', { auth: cookieStrategy });
const unauthed = await booker.del('/booking/1');

expect(authed.status).toBe(201); // Restful Booker returns 201 on delete
expect(unauthed.status).toBe(403);
```

### Opt-in retry + TTL cache

```typescript
// Enterprise features are enabled purely through the 4th constructor argument (auth left undefined here)
const client = new ApiClient(context, 'resilient', undefined, {
  retry: { retries: 3, baseDelayMs: 100, retryOnStatuses: [429, 503] }, // retry 429/503 with exponential backoff
  cache: { ttlMs: 5000 }, // cache successful GETs for 5s
  correlationId: true, // auto-inject an x-correlation-id header
});
```

### Full booking lifecycle chaining

```typescript
test('create -> read -> update -> delete', async ({ auth, bookings }) => {
  // Shared context carries values from one step to the next (request chaining)
  const ctx: { token?: string; bookingId?: number } = {};

  await test.step('login', async () => {
    // Obtain a token to authorize the later delete
    ctx.token = await auth.loginBooker(
      config.credentials.username,
      config.credentials.password,
    );
  });

  await test.step('create', async () => {
    const res = await bookings.create(
      BookingFactory.forGuest('Chain', 'Tester'), // factory builds a valid booking payload
    );
    ctx.bookingId = res.body.bookingid; // capture the new id for the next step
  });

  await test.step('delete', async () => {
    const strategy = new CookieTokenStrategy(ctx.token!); // auth from the token captured at login
    const res = await bookings.remove(ctx.bookingId!, strategy);
    expect(res.status).toBe(201); // Restful Booker returns 201 on successful delete
  });
});
```

---

## GraphQLClient

`GraphQLClient` is a thin layer over `ApiClient` for GraphQL APIs. It always
uses POST, sets the `{ query, variables }` envelope, and returns the standard
`{ data, errors }` wrapper as `GraphQLResponse<T>`.

```typescript
class GraphQLClient {
  constructor(client: ApiClient, endpoint: string);

  query<T>(
    query: string,
    variables?: GraphQLVariables,
  ): Promise<ApiResponse<GraphQLResponse<T>>>;
  mutate<T>(
    mutation: string,
    variables?: GraphQLVariables,
  ): Promise<ApiResponse<GraphQLResponse<T>>>;
}
```

Helper function `graphqlData<T>(res)` unwraps `.body.data` and throws if
`.body.errors` is non-empty, converting GraphQL's "200 with errors" pattern
into a real test failure.

```typescript
// Run a GraphQL query; the response still arrives as a standard ApiResponse
const res = await countries.query<CountriesData>(COUNTRIES_QUERY);
const data = graphqlData(res); // unwraps .body.data; throws if errors present
expect(data.countries.length).toBeGreaterThan(0);
```

---

## WebSocketClient

`WebSocketClient` wraps the `ws` library's event-driven API into Promises for
linear test code. It uses a message buffer + waiter queue to eliminate race
conditions between `send()` and `waitForMessage()`.

```typescript
class WebSocketClient {
  constructor(url: string);

  connect(timeoutMs?: number): Promise<void>;
  isOpen(): boolean;
  send(data: string | object): void;
  waitForMessage(timeoutMs?: number): Promise<string>;
  waitForJson<T>(timeoutMs?: number): Promise<T>;
  close(code?: number): Promise<void>;
  reconnect(timeoutMs?: number): Promise<void>;
}
```

```typescript
test('echo round-trip', async ({ ws }) => {
  await ws.client.connect(); // open the socket and wait until it is ready
  ws.client.send('hello');
  const reply = await ws.client.waitForMessage(); // Promise resolves on next message (buffered, race-free)
  expect(reply).toBe('echo:hello');
});
```

---

## Best Practices

- Import `test` and `expect` from `src/fixtures/api.fixtures.ts`, not from
  `@playwright/test` directly — the fixture module re-exports `expect` and
  provides all injected clients.
- Use generic type parameters (`client.get<MyType>(...)`) for typed `res.body`
  access. The default `unknown` forces a deliberate cast.
- Do not set `failOnStatusCode: true` globally. Keep it `false` (the default)
  so negative tests can assert 4xx/5xx without exception handling.
- For SLA assertions use `res.durationMs`; for payload-size assertions use
  `res.sizeBytes` — both are measured by the client on every call.
- Use `res.rawText` when a response is not JSON (XML, empty body, HTML error
  pages). Check `res.isJson` before casting `res.body`.

---

## Common Mistakes

| Mistake                                              | Correct approach                        |
| ---------------------------------------------------- | --------------------------------------- |
| `new ApiClient(context, ...)` inside a test          | Receive it via fixture injection        |
| `JSON.parse(res.rawText)` inside a test              | Use `res.body` — already parsed         |
| `data` and `form` in the same call                   | They are mutually exclusive             |
| Asserting `res.ok` for a 201 (also `true`)           | Assert `res.status` for the exact code  |
| Forgetting `await context.dispose()` in manual setup | Use `withClient()` helper from fixtures |

---

## Real Project Usage

The `ApiClient` is never instantiated directly in tests — it is injected via
fixtures ([`src/fixtures/api.fixtures.ts`](../src/fixtures/api.fixtures.ts)). Each
fixture binds a client to one base URL and disposes its `APIRequestContext` after
the test. Services ([`src/services/`](../src/services/)) wrap a client to expose
domain methods, so a test reads `products.getById(1)` — never a raw `fetch`. The
opt-in `ApiClientOptions` (retry/cache/middleware) are exercised in
[`tests/enterprise/`](../tests/enterprise/) against the local mock server for
deterministic results.

## Interview Questions

1. **Why wrap Playwright's `APIRequestContext` in a Facade instead of calling it
   directly?** To centralize cross-cutting concerns (header/auth merging, timing,
   safe JSON parsing, logging, a normalized `ApiResponse<T>`) in one place — tests
   depend on a stable surface, so the HTTP engine could be swapped without touching
   a single test (Open/Closed Principle).
2. **Why does the client default `failOnStatusCode` to `false`?** So 4xx/5xx
   responses are returned for assertion rather than thrown — essential for negative
   and security testing where the failure status _is_ the expected outcome.
3. **How does per-request auth override client-level auth?** `send()` resolves
   `const strategy = options.auth ?? this.auth`, then merges the strategy's headers
   _before_ per-request headers, so an explicit header always wins. This lets one
   client make both authorized and unauthorized calls.
4. **How were retry/cache/middleware added without breaking existing tests?** They
   live behind the optional `ApiClientOptions` (4th constructor arg). Omitting it
   yields byte-identical behavior, so all prior tests stayed green — a textbook
   Open/Closed extension.
5. **Why a single private `send()` that all verbs delegate to?** DRY + Single
   Responsibility: there is exactly one place that times, executes, parses,
   normalizes, and logs a request.

## Related Modules

- [Architecture.md](Architecture.md) · [DesignPatterns.md](DesignPatterns.md) · [Utilities.md](Utilities.md)
- [Authentication.md](Authentication.md) · [Validation.md](Validation.md) · [GraphQL.md](GraphQL.md) · [WebSocket.md](WebSocket.md)

## References

- [Architecture.md](Architecture.md)
- [DesignPatterns.md](DesignPatterns.md)
- [Utilities.md](Utilities.md)
- [`src/api-client/api-client.ts`](../src/api-client/api-client.ts)
- [`src/api-client/api-client.types.ts`](../src/api-client/api-client.types.ts)
- [`src/api-client/graphql-client.ts`](../src/api-client/graphql-client.ts)
- [`src/api-client/ws-client.ts`](../src/api-client/ws-client.ts)
- [`src/fixtures/api.fixtures.ts`](../src/fixtures/api.fixtures.ts)
- [`src/middleware/types.ts`](../src/middleware/types.ts)
- [`src/middleware/correlation.middleware.ts`](../src/middleware/correlation.middleware.ts)
