# Design Patterns in OminAPI

## Overview

OminAPI implements ten enterprise design patterns. Each one solves a concrete
problem in a test framework: DRY violations, brittle test data, untestable
configurations, and error-handling gaps. This document identifies each pattern,
maps it to its source file, explains why it was chosen, and shows a real snippet.

Repository: <https://github.com/omiinayak25/ominapi-playwright-framework>

---

## Pattern Index

| #   | Pattern              | File(s)                                    | Purpose                                |
| --- | -------------------- | ------------------------------------------ | -------------------------------------- |
| 1   | Singleton            | `src/config/config.manager.ts`             | One validated config instance          |
| 2   | Facade               | `src/api-client/api-client.ts`             | Simple verbs over Playwright internals |
| 3   | Repository           | `src/services/*.ts`                        | Domain-named CRUD over raw HTTP        |
| 4   | Strategy             | `src/auth/strategies/*.ts`                 | Swappable auth schemes                 |
| 5   | Builder              | `src/builders/booking.builder.ts`          | Step-by-step test data construction    |
| 6   | Factory              | `src/builders/booking.factory.ts`          | Named, ready-made test data scenarios  |
| 7   | Dependency Injection | `src/fixtures/api.fixtures.ts`             | Tests receive clients, not build them  |
| 8   | Null Object          | `src/auth/strategies/no-auth.strategy.ts`  | Explicit "no auth" without null checks |
| 9   | Middleware           | `src/middleware/correlation.middleware.ts` | Cross-cutting request/response hooks   |
| 10  | Circuit Breaker      | `src/utils/circuit-breaker.ts`             | Fail fast when a dependency is broken  |

---

## 1. Singleton — `ConfigManager`

### What it is

A class with a private constructor and a static `getInstance()` method that
returns one shared instance for the lifetime of the process.

### Where implemented

[`src/config/config.manager.ts`](../src/config/config.manager.ts)

### Why

Reading and validating `process.env` on every import would be wasteful and could
produce inconsistent results if env vars change mid-run. One shared, immutable
`AppConfig` is parsed once and shared everywhere.

### Benefits

- Parse + validate `process.env` exactly once (fail fast on bad config).
- One authoritative object for all settings — no scattered `process.env.X ??
'default'` chains across 500 tests.
- Test-only `reset()` escape hatch allows unit tests to re-read with different vars.

### Code

```typescript
export class ConfigManager {
  private static instance: ConfigManager | undefined;
  public readonly config: AppConfig;

  private constructor() {
    // private = cannot call `new ConfigManager()`
    this.config = ConfigManager.load();
  }

  public static getInstance(): ConfigManager {
    ConfigManager.instance ??= new ConfigManager(); // lazy init, once
    return ConfigManager.instance;
  }

  public static reset(): void {
    // TEST-ONLY: force a fresh parse
    ConfigManager.instance = undefined;
  }
}
```

---

## 2. Facade — `ApiClient`

### What it is

A simplified interface over a complex subsystem. Tests depend on `.get()`,
`.post()`, etc., not on Playwright's `APIRequestContext` internals.

### Where implemented

[`src/api-client/api-client.ts`](../src/api-client/api-client.ts)

### Why

Playwright's `context.fetch()` is powerful but low-level. Every test would
otherwise repeat: header merging, JSON parsing, timing, logging, auth, and
response normalization. The Facade centralizes all of it behind five verbs.
It also satisfies the Open/Closed Principle: the HTTP engine can be swapped
without touching a single test.

### Benefits

- DRY: one `send()` method handles every verb.
- Consistent `ApiResponse<T>` shape across the entire suite.
- Negative testing works out of the box (`failOnStatusCode` defaults to `false`).
- Observability: timing + logging on every call, automatically.

### Code

```typescript
export class ApiClient {
  public async get<T>(
    path: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.send<T>('GET', path, options);
  }
  public async post<T>(
    path: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.send<T>('POST', path, options);
  }
  // put, patch, del follow the same pattern

  private async send<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    // auth resolution → middleware → cache check → fetch → parse → normalize → retry
  }
}
```

---

## 3. Repository — `BaseApiService` and concrete services

### What it is

A layer that maps domain operations (create, getById, update, remove) to HTTP
calls, hiding path construction and transport details from test code.

### Where implemented

- [`src/services/base.service.ts`](../src/services/base.service.ts) — abstract base
- [`src/services/booking.service.ts`](../src/services/booking.service.ts)
- [`src/services/post.service.ts`](../src/services/post.service.ts)
- [`src/services/product.service.ts`](../src/services/product.service.ts)
- [`src/services/brewery.service.ts`](../src/services/brewery.service.ts)

### Why

Without the Repository layer, tests build URLs manually and use raw `client.post()`
calls. Renaming a path or changing a method signature means updating every test.
The Repository is the single place that knows `/booking` and its conventions.

### Benefits

- Tests read like business requirements: `bookings.create(booking)`.
- Path changes, auth requirements, and quirks (e.g. Booker's 201 on DELETE) live
  in one file.
- `protected url(id)` in the base class eliminates repeated string interpolation.

### Code

```typescript
export abstract class BaseApiService {
  protected constructor(
    protected readonly client: ApiClient,
    protected readonly resource: string,
  ) {}

  protected url(id: number | string): string {
    return `${this.resource}/${id}`;
  }
}

export class BookingService extends BaseApiService {
  constructor(client: ApiClient) {
    super(client, '/booking');
  }

  create(booking: Booking) {
    return this.client.post(this.resource, { data: booking });
  }
  getById(id: number) {
    return this.client.get(this.url(id));
  }
  remove(id: number, auth) {
    return this.client.del(this.url(id), { auth });
  }
}
```

---

## 4. Strategy — Auth schemes

### What it is

A family of interchangeable algorithms (auth schemes) behind a common interface.
Callers depend on `AuthStrategy`, not on a specific scheme.

### Where implemented

- [`src/auth/auth.types.ts`](../src/auth/auth.types.ts) — the interface
- [`src/auth/strategies/basic-auth.strategy.ts`](../src/auth/strategies/basic-auth.strategy.ts)
- [`src/auth/strategies/bearer-token.strategy.ts`](../src/auth/strategies/bearer-token.strategy.ts)
- [`src/auth/strategies/cookie-token.strategy.ts`](../src/auth/strategies/cookie-token.strategy.ts)
- [`src/auth/strategies/api-key.strategy.ts`](../src/auth/strategies/api-key.strategy.ts)
- [`src/auth/strategies/no-auth.strategy.ts`](../src/auth/strategies/no-auth.strategy.ts)

### Why

Different APIs use different auth (Basic, Bearer JWT, cookie, API key). Without
Strategy, every `ApiClient` call would need a conditional for the auth type.
With Strategy, the client calls `strategy.apply()` regardless of scheme.

### Benefits

- New schemes (e.g. OAuth2) require only a new class — no changes to `ApiClient`.
- Per-request override (`options.auth`) enables same-endpoint positive/negative tests.
- `apply()` is sync or async — static schemes are sync; token-refreshing schemes
  can be async without any call-site changes.

### Code

```typescript
// The contract
export interface AuthStrategy {
  readonly scheme: string;
  apply(): AuthHeaders | Promise<AuthHeaders>;
}

// One concrete strategy
export class BasicAuthStrategy implements AuthStrategy {
  public readonly scheme = 'Basic';
  constructor(
    private readonly username: string,
    private readonly password: string,
  ) {}
  apply(): AuthHeaders {
    const encoded = Buffer.from(`${this.username}:${this.password}`).toString(
      'base64',
    );
    return { Authorization: `Basic ${encoded}` };
  }
}

// ApiClient resolution (per-request overrides client default)
const strategy = auth ?? this.auth;
const authHeaders = strategy ? await strategy.apply() : {};
```

---

## 5. Builder — `BookingBuilder`

### What it is

A class with a fluent `withX()` method per field and a final `build()` that
produces the object. Also known as the **Test Data Builder** pattern.

### Where implemented

[`src/builders/booking.builder.ts`](../src/builders/booking.builder.ts)

### Why

Building a valid `Booking` inline is verbose and error-prone. Tests that care only
about `firstname` must still supply `totalprice`, `bookingdates`, etc. The Builder
seeds valid random defaults via Faker so only the field under test needs overriding.

### Benefits

- Every `build()` call yields a valid object by default — no silent missing fields.
- `build()` returns a deep copy, so two calls never share mutable state (a classic
  Builder bug this implementation deliberately avoids).
- Tests read as assertions of intent: `.withTotalPrice(0)` communicates exactly
  what the test is validating.

### Code

```typescript
export class BookingBuilder {
  private constructor(private readonly draft: BookingDraft) {}

  public static aBooking(): BookingBuilder {
    return new BookingBuilder({
      firstname: faker.person.firstName(),
      lastname: faker.person.lastName(),
      totalprice: faker.number.int({ min: 50, max: 5000 }),
      depositpaid: faker.datatype.boolean(),
      checkin: futureIso(7),
      checkout: futureIso(12),
      additionalneeds: faker.helpers.arrayElement([
        'Breakfast',
        'Late checkout',
      ]),
    });
  }

  withFirstname(firstname: string): this {
    this.draft.firstname = firstname;
    return this;
  }
  withTotalPrice(totalprice: number): this {
    this.draft.totalprice = totalprice;
    return this;
  }
  withoutAdditionalNeeds(): this {
    delete this.draft.additionalneeds;
    return this;
  }

  build(): Booking {
    /* returns a fresh deep copy */
  }
}

// Usage
const booking = BookingBuilder.aBooking()
  .withFirstname('John')
  .withTotalPrice(500)
  .build();
```

---

## 6. Factory — `BookingFactory`

### What it is

A class with static methods that return pre-configured objects for named
scenarios. The Factory delegates to the Builder internally (DRY).

### Where implemented

[`src/builders/booking.factory.ts`](../src/builders/booking.factory.ts)

### Why

When a test just needs "a valid booking" or "an invalid payload for negative
testing", spelling out a Builder chain is unnecessary repetition. Named factory
methods communicate the scenario by intent.

### Builder vs Factory

|                     | Builder                                | Factory                                       |
| ------------------- | -------------------------------------- | --------------------------------------------- |
| Control level       | Field-by-field, explicit               | Scenario-named, one call                      |
| When to use         | Test cares about specific field values | Test just needs a valid/invalid/named variant |
| Internal delegation | No                                     | Yes — calls Builder internally                |

### Code

```typescript
export class BookingFactory {
  static valid(): Booking {
    return BookingBuilder.aBooking().build();
  }

  static minimal(): Booking {
    return BookingBuilder.aBooking().withoutAdditionalNeeds().build();
  }

  static forGuest(firstname: string, lastname: string): Booking {
    return BookingBuilder.aBooking()
      .withFirstname(firstname)
      .withLastname(lastname)
      .build();
  }

  static invalid(): Partial<Booking> {
    return { firstname: faker.person.firstName() }; // missing required fields
  }
}

// Usage in a lifecycle test
const booking = BookingFactory.forGuest('Chain', 'Tester');
```

---

## 7. Dependency Injection — Playwright fixtures

### What it is

Tests declare the objects they need; the framework constructs and injects them.
Tests depend on abstractions handed to them, not on construction details.

### Where implemented

[`src/fixtures/api.fixtures.ts`](../src/fixtures/api.fixtures.ts)

### Why

If tests construct `APIRequestContext` themselves they also forget to dispose
it (resource leaks), hard-code base URLs (wrong environment), and repeat
boilerplate in every file. Fixtures push all lifecycle management out of tests.

### Benefits

- Tests are free of setup/teardown plumbing.
- `context.dispose()` always runs in the `finally` block — no leaks.
- Swapping a base URL or adding retry to all tests is one line in the fixture.

### Code

```typescript
// Helper: create → inject → always dispose
async function withClient(
  baseURL: string,
  name: string,
  run: (c: ApiClient) => Promise<void>,
) {
  const context = await playwrightRequest.newContext({
    baseURL,
    timeout: config.timeoutMs,
  });
  try {
    await run(new ApiClient(context, name));
  } finally {
    await context.dispose(); // guaranteed even if the test throws
  }
}

export const test = base.extend<ApiFixtures>({
  httpbin: async ({}, use) => {
    await withClient(config.endpoints.httpbin, 'httpbin', use);
  },
  bookings: async ({}, use) => {
    await withClient(config.endpoints.booker, 'bookings', (c) =>
      use(new BookingService(c)),
    );
  },
});

// Test file — zero plumbing
test('create booking', async ({ bookings }) => {
  const res = await bookings.create(BookingFactory.valid());
  expect(res.status).toBe(200);
});
```

---

## 8. Null Object — `NoAuthStrategy`

### What it is

A do-nothing implementation of an interface that replaces null/undefined checks
throughout the codebase. "No auth" is an explicit, intentional choice.

### Where implemented

[`src/auth/strategies/no-auth.strategy.ts`](../src/auth/strategies/no-auth.strategy.ts)

### Why

Without it, `ApiClient.send()` would need `if (strategy !== undefined)` before
every `strategy.apply()`. With `NoAuthStrategy`, the caller simply passes it as
a strategy — no conditionals, no nulls.

### Benefits

- Eliminates all null checks in `ApiClient` and calling services.
- Makes "unauthenticated" a visible, searchable, intentional choice in test code.
- Satisfies TypeScript's strict null checks structurally.

### Code

```typescript
export class NoAuthStrategy implements AuthStrategy {
  public readonly scheme = 'None';

  public apply(): AuthHeaders {
    return {}; // produces no headers — do-nothing implementation
  }
}

// Usage (negative test: endpoint requires auth, this should return 403)
const res = await booker.del('/booking/1', { auth: new NoAuthStrategy() });
expect(res.status).toBe(403);
```

---

## 9. Middleware — Correlation ID and custom hooks

### What it is

A chain of functions that run before (request middleware) or after (response
middleware) each HTTP call. Middleware handles cross-cutting concerns without
touching individual call sites.

### Where implemented

- [`src/middleware/types.ts`](../src/middleware/types.ts) — type contracts
- [`src/middleware/correlation.middleware.ts`](../src/middleware/correlation.middleware.ts)
- `ApiClient.send()` — executes the chain

### Why

Adding a correlation ID, logging extra headers, or collecting metrics should not
require modifying every single call. Middleware is registered once and applied
everywhere automatically.

### Benefits

- Cross-cutting behavior added without modifying existing call sites.
- Request middleware can mutate `ctx.headers`; response middleware observes only
  (no mutation, avoiding side-effects on the result).
- `correlationId: true` in `ApiClientOptions` appends the built-in middleware
  automatically; custom middleware is passed in the same array.

### Code

```typescript
// Request middleware type: mutates ctx.headers in place
export type RequestMiddleware = (ctx: RequestContext) => void;

// Built-in: inject x-correlation-id unless caller already set one
export function correlationIdMiddleware(
  headerName = 'x-correlation-id',
): RequestMiddleware {
  return (ctx) => {
    const already = Object.keys(ctx.headers).some(
      (k) => k.toLowerCase() === headerName.toLowerCase(),
    );
    if (!already) ctx.headers[headerName] = uuid();
  };
}

// ApiClient: run the chain before each fetch
for (const mw of this.requestMiddleware) {
  mw({ method, path, headers: mergedHeaders });
}
```

---

## 10. Circuit Breaker — `CircuitBreaker`

### What it is

A stateful wrapper around a function call that tracks consecutive failures. After
`failureThreshold` failures the circuit OPENS and subsequent calls are rejected
immediately (without hitting the failing dependency) until a cooldown elapses.

### Where implemented

[`src/utils/circuit-breaker.ts`](../src/utils/circuit-breaker.ts)

### States

| State       | Behavior                                                                    |
| ----------- | --------------------------------------------------------------------------- |
| `closed`    | Normal; calls pass through. Failures increment a counter.                   |
| `open`      | Threshold reached; calls throw `CircuitOpenError` immediately.              |
| `half-open` | Cooldown elapsed; one trial call allowed. Success → closed; failure → open. |

### Why

Retrying a broken dependency in a tight loop amplifies load and slows down the
whole suite. The circuit breaker fails fast and gives the dependency time to
recover.

### Benefits

- Tests for circuit-breaker behavior can assert the OPEN state without waiting.
- `reset()` method allows each test scenario to start from a clean `closed` state.
- `CircuitOpenError` is a typed error that tests can catch with `instanceof`.

### Code

```typescript
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private openedAt = 0;

  constructor(
    private readonly failureThreshold: number,
    private readonly cooldownMs: number,
  ) {}

  get currentState(): CircuitState {
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.openedAt >= this.cooldownMs) {
        this.state = 'half-open';
      } else {
        throw new CircuitOpenError();
      }
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
  }
}

// Usage
const breaker = new CircuitBreaker(3, 10_000); // trip after 3 failures, 10s cooldown

await breaker.execute(() => apiClient.get('/health'));
// After 3 failures:
// breaker.currentState === 'open'
// next call throws CircuitOpenError immediately
```

---

## Real Project Usage

The patterns compose across a single request:

1. **Singleton** (`ConfigManager`) provides `baseURL` to the fixture.
2. **DI** (fixture) creates `ApiClient` + `BookingService` and injects them.
3. **Factory** / **Builder** produce the `Booking` payload.
4. **Repository** (`BookingService`) calls `client.post('/booking', { data })`.
5. **Facade** (`ApiClient`) resolves the **Strategy** (auth), runs
   **Middleware** (correlation ID), checks the **TTL Cache**, fetches, and
   normalizes the response.
6. **Circuit Breaker** (if wrapped) short-circuits on repeated failures.
7. **Null Object** (`NoAuthStrategy`) appears in negative tests to make
   unauthenticated intent explicit.

---

## Interview Questions

1. **Why use a Facade over calling Playwright's API directly?** — Open/Closed
   Principle: swap the HTTP engine without touching tests; centralize timing and
   logging.

2. **What is the difference between Builder and Factory here?** — Builder
   assembles step-by-step with explicit fields; Factory delegates to Builder
   internally and exposes named scenarios. Both produce valid test data, but at
   different levels of control.

3. **Why is `failOnStatusCode` false by default in the Facade?** — Negative
   tests must receive a 404 or 403 to assert it. A throw would require exception
   handling in every negative test, masking the actual assertion.

4. **What problem does Dependency Injection solve vs creating clients inside
   tests?** — Tests that construct their own contexts forget `dispose()`,
   hard-code URLs, and repeat boilerplate. DI guarantees lifecycle management and
   makes clients configurable from one fixture file.

5. **When would you reach for Circuit Breaker vs Retry?** — Retry handles
   transient blips (a single 503). Circuit Breaker handles sustained failures
   (a dependency that is truly down) — open state stops the hammering.

---

## References

- [Architecture.md](Architecture.md)
- [APIClient.md](APIClient.md)
- [Utilities.md](Utilities.md)
- [`src/api-client/api-client.ts`](../src/api-client/api-client.ts)
- [`src/config/config.manager.ts`](../src/config/config.manager.ts)
- [`src/services/base.service.ts`](../src/services/base.service.ts)
- [`src/auth/auth.types.ts`](../src/auth/auth.types.ts)
- [`src/builders/booking.builder.ts`](../src/builders/booking.builder.ts)
- [`src/builders/booking.factory.ts`](../src/builders/booking.factory.ts)
- [`src/fixtures/api.fixtures.ts`](../src/fixtures/api.fixtures.ts)
- [`src/auth/strategies/no-auth.strategy.ts`](../src/auth/strategies/no-auth.strategy.ts)
- [`src/middleware/correlation.middleware.ts`](../src/middleware/correlation.middleware.ts)
- [`src/utils/circuit-breaker.ts`](../src/utils/circuit-breaker.ts)
