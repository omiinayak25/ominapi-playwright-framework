# Utilities — `src/utils/`

## Overview

OmniAPI ships 17 utility modules in `src/utils/`. Each is a focused, tested
module with a single responsibility. They are the foundation that API clients,
services, builders, and validators build on — but they have no knowledge of
Playwright or test structure, so they are also independently reusable.

Repository: <https://github.com/omiinayak25/omniapi-playwright-framework>

---

## Quick Reference

| Module          | File                 | Primary export(s)                                      | Purpose                                         |
| --------------- | -------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| Logger          | `logger.ts`          | `logger` (Winston instance)                            | Structured, leveled logging                     |
| JSON            | `json.ts`            | `safeJsonParse<T>`                                     | Non-throwing JSON parse                         |
| Random          | `random.ts`          | `uuid`, `randomInt`, `pickOne`                         | Unique IDs and test randomness                  |
| Date            | `date.ts`            | `toIsoDate`, `addDays`, `todayIso`, `futureIso`        | ISO date formatting and arithmetic              |
| Data Loader     | `data-loader.ts`     | `loadJson`, `loadCsv`, `loadExcel`, `dataPath`         | Data-driven test file loading                   |
| Pagination      | `pagination.ts`      | `PaginationHelper.collectAll`                          | Auto-collect across paginated endpoints         |
| File            | `file.ts`            | `FileHelper`                                           | Temp files, binary I/O, magic-byte detection    |
| Perf            | `perf.ts`            | `PerfHelper`                                           | Timing, concurrent batches, latency percentiles |
| JWT             | `jwt.ts`             | `decodeJwt`, `createJwt`, `tamperPayload`, `toAlgNone` | JWT decode and tamper utilities                 |
| Retry           | `retry.ts`           | `withRetry`, `delay`                                   | Generic exponential-backoff retry               |
| Circuit Breaker | `circuit-breaker.ts` | `CircuitBreaker`                                       | Fail-fast resilience pattern                    |
| Cache           | `cache.ts`           | `TtlCache<V>`                                          | In-memory TTL cache                             |
| Errors          | `errors.ts`          | `ApiError`, `CircuitOpenError`                         | Typed framework errors                          |
| Mock Server     | `mock-server.ts`     | `MockServer`                                           | In-process fake HTTP server                     |
| WS Server       | `ws-server.ts`       | `MockWebSocketServer`                                  | In-process echo WebSocket server                |
| Contract Diff   | `contract-diff.ts`   | `detectBreakingChanges`, `isBackwardCompatible`        | Schema backward-compatibility checks            |
| OpenAPI         | `openapi.ts`         | `OpenApiContract`                                      | Load spec files, extract response schemas       |

---

## Detailed Reference

### `logger.ts` — Structured Logger

**Source:** [`src/utils/logger.ts`](../src/utils/logger.ts)

Winston-based singleton logger. The log level is driven by the `LOG_LEVEL`
environment variable (`error | warn | info | http | debug`). Every line includes
a timestamp, colorized level, the message, and any metadata object as JSON.

```typescript
export const logger: winston.Logger;
```

**Usage**

```typescript
import { logger } from '../utils/logger.js';

logger.info('Booking created', { id: 42 });
logger.http('[booker] → POST /booking', { params: {} });
logger.debug('[booker] response body', { body: parsed.data });
logger.warn('[retry] attempt 1 failed, retrying in 100ms');
logger.error('Unexpected failure', error);
```

Set `LOG_LEVEL=debug` locally for full request/response output. Set
`LOG_LEVEL=warn` in CI to suppress noise. Never use `console.log` in framework
code — it is unleveled and unstructured.

---

### `json.ts` — Safe JSON Parse

**Source:** [`src/utils/json.ts`](../src/utils/json.ts)

`JSON.parse` throws on empty bodies, HTML error pages, or malformed JSON —
masking the real assertion in a test. `safeJsonParse` never throws; it returns a
discriminated result.

```typescript
export interface ParseResult<T> {
  readonly isJson: boolean;
  readonly data: T | string;
}

export function safeJsonParse<T = unknown>(text: string): ParseResult<T>;
```

**Behavior**

| Input               | `isJson` | `data`        |
| ------------------- | -------- | ------------- |
| `''` (empty string) | `false`  | `''`          |
| Valid JSON          | `true`   | Parsed value  |
| Invalid JSON        | `false`  | Original text |

Used internally by `ApiClient.send()` to populate `ApiResponse.body` and
`ApiResponse.isJson`.

---

### `random.ts` — Randomness Helpers

**Source:** [`src/utils/random.ts`](../src/utils/random.ts)

Three focused primitives for unique IDs and varied test data. Uses Node's built-in
`crypto.randomUUID()` — zero dependency, RFC-4122 v4.

```typescript
export function uuid(): string;
export function randomInt(min: number, max: number): number; // inclusive [min, max]
export function pickOne<T>(items: readonly T[]): T; // throws on empty array
```

`uuid()` is the basis for correlation IDs injected by `correlationIdMiddleware`.
`pickOne` and `randomInt` are used in builders for varied default values.

---

### `date.ts` — ISO Date Helpers

**Source:** [`src/utils/date.ts`](../src/utils/date.ts)

Date arithmetic in the UTC calendar (no timezone drift). Restful Booker expects
`yyyy-mm-dd`. All functions return strings, not `Date` objects, since the
downstream use is always a request payload.

```typescript
export function toIsoDate(date: Date): string; // Date -> "yyyy-mm-dd"
export function addDays(date: Date, days: number): Date; // non-mutating
export function todayIso(): string; // today as "yyyy-mm-dd"
export function futureIso(days: number): string; // today + N days
```

Used in `BookingBuilder.aBooking()` to guarantee `checkin < checkout`:

```typescript
checkin: futureIso(7),   // 7 days from today
checkout: futureIso(12), // 12 days from today (5-night stay)
```

---

### `data-loader.ts` — Data-Driven Test File Loading

**Source:** [`src/utils/data-loader.ts`](../src/utils/data-loader.ts)

Reads test data from the `data/` directory in JSON, CSV, or Excel format.
JSON and CSV are synchronous (test generation at collection time); Excel is
asynchronous (used inside test bodies).

```typescript
export function dataPath(relative: string): string; // resolve under data/
export function loadJson<T>(relative: string): T; // sync JSON parse
export function loadCsv<T = Record<string, string>>(relative: string): T[]; // sync CSV (csv-parse)
export async function loadExcel<T = Record<string, unknown>>(
  relative: string,
  sheetName?: string,
): Promise<T[]>; // async, first sheet if no name given
```

CSV rows come back as strings; convert types at the call site. Excel cells are
returned as exceljs `CellValue` types.

```typescript
// Data-driven: one test per CSV row
const cases = loadCsv<{ username: string; password: string }>(
  'login-cases.csv',
);
for (const row of cases) {
  test(`login ${row.username}`, async ({ api }) => {
    /* ... */
  });
}
```

---

### `pagination.ts` — Pagination Helper

**Source:** [`src/utils/pagination.ts`](../src/utils/pagination.ts)

Drives any page-fetching function until all items are collected, with a hard
safety cap to prevent infinite loops. Works for offset-based and page-based
APIs — the caller's closure adapts the math.

```typescript
export type PageFetcher<T> = (
  pageIndex: number,
  pageSize: number,
) => Promise<T[]>;

export interface CollectAllOptions {
  pageSize?: number; // default 20
  maxPages?: number; // default 100 — safety cap
}

export class PaginationHelper {
  static async collectAll<T>(
    fetchPage: PageFetcher<T>,
    options?: CollectAllOptions,
  ): Promise<T[]>;
}
```

Termination: a page returning fewer items than `pageSize` signals the last page.

```typescript
const allBreweries = await PaginationHelper.collectAll(
  (page, size) => breweries.getPage(page + 1, size).then((r) => r.body),
  { pageSize: 50 },
);
```

---

### `file.ts` — FileHelper

**Source:** [`src/utils/file.ts`](../src/utils/file.ts)

Binary-safe file I/O for file-upload tests. Writes to a scratch directory under
`test-results/files/` (git-ignored). Identifies file types by magic bytes, not
extensions.

```typescript
export type FileType = 'png' | 'jpeg' | 'pdf' | 'zip' | 'gzip' | 'unknown';

export class FileHelper {
  static tempDir(): string;
  static write(name: string, content: string | Buffer): string; // returns path
  static read(filePath: string): Buffer;
  static readText(filePath: string): string;
  static size(filePath: string): number;
  static exists(filePath: string): boolean;
  static remove(filePath: string): void;
  static detectType(buffer: Buffer): FileType; // magic-byte detection
  static minimalPdf(): Buffer; // minimal valid PDF bytes
  static emptyZip(): Buffer; // structurally valid empty ZIP
  static gzip(text: string): Buffer; // gzip-compress a string
}
```

**Magic byte signatures detected**

| Type   | Signature      |
| ------ | -------------- |
| `png`  | `89 50 4E 47`  |
| `jpeg` | `FF D8 FF`     |
| `pdf`  | `%PDF` (ASCII) |
| `zip`  | `50 4B` (`PK`) |
| `gzip` | `1F 8B`        |

---

### `perf.ts` — PerfHelper

**Source:** [`src/utils/perf.ts`](../src/utils/perf.ts)

Smoke-level performance assertions — timing, concurrent batches, and latency
percentiles. Not a load tool (use k6/Gatling for that); this verifies SLAs and
basic concurrency health as part of the functional suite.

```typescript
export interface LatencyStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number; // all in ms
}

export interface BatchResult<T> {
  results: T[];
  durations: number[];
  totalMs: number; // wall-clock time for the whole batch
}

export class PerfHelper {
  static async measure<T>(
    task: () => Promise<T>,
  ): Promise<{ result: T; durationMs: number }>;
  static async runBatch<T>(
    task: () => Promise<T>,
    count: number,
  ): Promise<BatchResult<T>>;
  static stats(durations: number[]): LatencyStats;
}
```

`runBatch` runs all copies via `Promise.all` (true concurrency), capturing each
individual duration and the total wall-clock time.

```typescript
const batch = await PerfHelper.runBatch(() => api.get('/products'), 10);
const stats = PerfHelper.stats(batch.durations);
expect(stats.p95).toBeLessThan(3000);
expect(batch.totalMs).toBeLessThan(5000); // truly concurrent, not sequential
```

---

### `jwt.ts` — JWT Utilities (Security Testing)

**Source:** [`src/utils/jwt.ts`](../src/utils/jwt.ts)

Decode and tamper JWTs for security tests that verify a server rejects invalid
tokens. These utilities intentionally produce tokens with broken signatures.

```typescript
export interface DecodedJwt {
  readonly header: Record<string, unknown>;
  readonly payload: Record<string, unknown>;
  readonly signature: string;
}

export function decodeJwt(token: string): DecodedJwt; // decode without verification
export function createJwt(
  payload: Record<string, unknown>,
  options?: { alg?: string; signature?: string },
): string; // forge with fake signature
export function tamperPayload(
  token: string,
  changes: Record<string, unknown>,
): string; // mutate payload, keep original sig
export function toAlgNone(token: string): string; // alg:none attack variant
```

**Security attack vectors covered**

| Function               | Attack                      | Expected server response |
| ---------------------- | --------------------------- | ------------------------ |
| `tamperPayload`        | Escalate role/id            | 401 or 403               |
| `toAlgNone`            | Skip signature verification | 401                      |
| `createJwt` + fake sig | Forge a token               | 401                      |

---

### `retry.ts` — Generic Retry with Backoff

**Source:** [`src/utils/retry.ts`](../src/utils/retry.ts)

Generic async retry with exponential backoff and a pluggable `shouldRetry`
predicate. `ApiClient` uses the same backoff formula internally for HTTP status
codes; this utility is the standalone version for arbitrary async functions.

```typescript
export interface RetryConfig {
  retries: number;
  baseDelayMs?: number; // default 0 (immediate retry)
  shouldRetry?: (error: unknown) => boolean; // default: always retry
}

export function delay(ms: number): Promise<void>; // Promise-based sleep

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
): Promise<T>;
```

Backoff formula: `delay = baseDelayMs * 2^attempt`. The last error is rethrown
after all attempts are exhausted.

```typescript
const result = await withRetry(() => apiClient.get('/flaky-endpoint'), {
  retries: 3,
  baseDelayMs: 200,
  shouldRetry: (e) => e instanceof NetworkError,
});
```

---

### `circuit-breaker.ts` — CircuitBreaker

**Source:** [`src/utils/circuit-breaker.ts`](../src/utils/circuit-breaker.ts)

Tracks consecutive failures and fails fast once a threshold is exceeded. After a
cooldown period one trial call is allowed (half-open state). On success the
circuit resets to closed; on failure it returns to open.

```typescript
export type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  constructor(failureThreshold: number, cooldownMs: number);

  get currentState(): CircuitState;
  async execute<T>(fn: () => Promise<T>): Promise<T>; // throws CircuitOpenError if open
  reset(): void; // manual reset (test teardown)
}
```

Throws `CircuitOpenError` (from `errors.ts`) when the circuit is open. Use
`breaker.reset()` between test scenarios to restore a clean `closed` state.

---

### `cache.ts` — TtlCache

**Source:** [`src/utils/cache.ts`](../src/utils/cache.ts)

Generic in-memory cache with time-to-live. Entries are lazily evicted on `get()`
when expired. Used by `ApiClient` to optionally cache GET responses when
`options.cache` is configured.

```typescript
export class TtlCache<V> {
  constructor(ttlMs: number);

  get(key: string): V | undefined; // returns undefined if missing or expired
  set(key: string, value: V): void;
  has(key: string): boolean;
  clear(): void;
  get size(): number;
}
```

Cache key for GET responses in `ApiClient`:
`"GET <path>?<serialized-params>"`. Only successful GETs (status < 400) are
stored.

---

### `errors.ts` — Typed Framework Errors

**Source:** [`src/utils/errors.ts`](../src/utils/errors.ts)

Two typed errors that carry structured context for programmatic handling.

```typescript
export class ApiError extends Error {
  constructor(message: string, status?: number, path?: string, body?: unknown);
  readonly status: number | undefined;
  readonly path: string | undefined;
  readonly body: unknown;
}

export class CircuitOpenError extends Error {
  constructor(message?: string); // default: 'Circuit is open — request rejected'
}
```

Use `instanceof ApiError` and `instanceof CircuitOpenError` in `catch` blocks to
branch on failure kind rather than parsing error message strings.

---

### `mock-server.ts` — MockServer

**Source:** [`src/utils/mock-server.ts`](../src/utils/mock-server.ts)

An in-process `http.Server` that runs on an OS-assigned ephemeral port. Enables
deterministic offline tests and forced edge cases (500s, malformed bodies) that
live APIs cannot produce on demand.

```typescript
export interface MockRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: http.IncomingHttpHeaders;
  body: unknown;
}

export interface MockResponse {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export type MockHandler = (
  req: MockRequest,
) => MockResponse | Promise<MockResponse>;

export class MockServer {
  readonly requests: MockRequest[]; // spy: every received request is recorded

  get url(): string; // http://127.0.0.1:<port>
  stub(method: string, path: string, response: MockResponse): this; // fixed response
  on(method: string, path: string, handler: MockHandler): this; // dynamic response
  reset(): void; // clear routes and recorded requests
  start(): Promise<void>;
  stop(): Promise<void>;
}
```

**Consumer-contract spy pattern**: after making a call, inspect `server.requests`
to assert the client sent the correct body and headers.

```typescript
server.stub('POST', '/booking', { status: 201, body: { bookingid: 99 } });
await client.post('/booking', { data: payload });
expect(server.requests[0].body).toMatchObject(payload);
```

---

### `ws-server.ts` — MockWebSocketServer

**Source:** [`src/utils/ws-server.ts`](../src/utils/ws-server.ts)

In-process WebSocket server built on the `ws` library. Default behavior is
echo (prefixes messages with `echo:`). Records all received messages and tracks
connection count for reconnect assertions.

```typescript
export class MockWebSocketServer {
  readonly received: string[]; // every text message received (spy)
  connectionCount: number; // total connections accepted

  get url(): string; // ws://127.0.0.1:<port>
  start(): Promise<void>;
  stop(): Promise<void>; // idempotent; drops connections first
  dropConnections(): void; // forcibly close all clients (simulate server drop)
}
```

Injected into tests via the `ws` fixture which provides `{ server, client }`.
`client` is a `WebSocketClient`; `server` is this class.

---

### `contract-diff.ts` — Breaking Change Detection

**Source:** [`src/utils/contract-diff.ts`](../src/utils/contract-diff.ts)

Compares two JSON Schema objects (old vs new) and identifies changes that break
existing consumers of a response. Operates from the consumer's perspective:
adding fields is safe; removing or changing them is breaking.

```typescript
export interface BreakingChange {
  kind: 'removed-field' | 'type-changed' | 'required-removed';
  field: string;
  detail: string;
}

export function detectBreakingChanges(
  oldSchema: SchemaObject,
  newSchema: SchemaObject,
): BreakingChange[];

export function isBackwardCompatible(
  oldSchema: SchemaObject,
  newSchema: SchemaObject,
): boolean;
```

**Change classification**

| Change                   | Classification | Reason                               |
| ------------------------ | -------------- | ------------------------------------ |
| Field removed            | Breaking       | Consumer code reading it breaks      |
| Field type changed       | Breaking       | Consumer casts become invalid        |
| Required → optional      | Breaking       | Field may now be absent unexpectedly |
| New optional field added | Safe           | Consumers ignore unknown fields      |

---

### `openapi.ts` — OpenApiContract

**Source:** [`src/utils/openapi.ts`](../src/utils/openapi.ts)

Loads an OpenAPI 3.x JSON spec from `src/contracts/` and extracts a
fully-resolved JSON Schema for a given operation's response. Resolves `$ref`
pointers recursively into a self-contained schema AJV can compile.

```typescript
export class OpenApiContract {
  static fromFile(relative: string): OpenApiContract; // loads from src/contracts/

  get version(): string; // spec's info.version

  getResponseSchema(
    apiPath: string,
    method: string,
    status?: string, // default '200'
  ): SchemaObject; // throws if not found
}
```

Unresolved `$ref` or a missing operation throws with a clear message (fail fast).

```typescript
const contract = OpenApiContract.fromFile('products-v1.json');
const schema = contract.getResponseSchema('/products/{id}', 'get', '200');
// schema is now self-contained JSON Schema (all $refs inlined)
expectMatchesSchema(res, schema);
```

---

## Best Practices

- Import utilities as named exports: `import { logger } from '../utils/logger.js'`.
- Never use `console.log` in framework code; use `logger` with structured metadata.
- Use `safeJsonParse` instead of `JSON.parse` anywhere the input may not be valid
  JSON (HTTP responses, file contents from tests).
- Keep `baseDelayMs: 0` in retry configs during unit and functional tests to keep
  suite runtime short. Use non-zero delays only for integration tests against live
  services.
- Call `CircuitBreaker.reset()` in test teardown so state does not leak between
  scenarios.
- Use `FileHelper.detectType(buffer)` to assert the actual content type of a
  download, not `res.headers['content-type']` — headers can lie, magic bytes do
  not.
- Use `PaginationHelper.collectAll` with a realistic `maxPages` cap (not the
  default 100) when you know the data size, to catch runaway loops early.

---

## Common Mistakes

| Mistake                                                                      | Correct approach                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| `JSON.parse(rawText)` in test code                                           | `safeJsonParse` — or just use `res.body`               |
| `fs.readFileSync` with a relative path                                       | Use `FileHelper` or `dataPath()` for consistent base   |
| Comparing `res.headers['Content-Type']`                                      | Headers are lower-cased: `res.headers['content-type']` |
| Letting `PaginationHelper` run at default `maxPages: 100` on a large dataset | Set `maxPages` to a known reasonable bound             |
| Forgetting `server.reset()` between mock scenarios                           | `MockServer.reset()` clears routes and the request spy |

---

## References

- [Architecture.md](Architecture.md)
- [APIClient.md](APIClient.md)
- [DesignPatterns.md](DesignPatterns.md)
- [`src/utils/`](../src/utils/) — all 17 source files
- [`src/fixtures/api.fixtures.ts`](../src/fixtures/api.fixtures.ts) — MockServer and WS server fixtures
