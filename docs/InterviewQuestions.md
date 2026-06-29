# Interview Questions

25+ senior QA / SDET interview questions grounded in the OminAPI framework.
Each answer references the actual implementation so you can open the code while
you study.

---

## Design Patterns

### Q1. What design patterns are used in this framework and why?

| Pattern              | Where                                                | Why                                                                 |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| Singleton            | `ConfigManager`, `SchemaValidator`, `SecretsManager` | One validated, shared, cached instance; prevents duplicate I/O      |
| Facade               | `ApiClient`, `GraphQLClient`, `WebSocketClient`      | Hides transport complexity; tests never touch raw Playwright        |
| Repository           | `BaseApiService` + service concretes                 | Endpoint paths live in one file; changes are isolated               |
| Strategy             | `src/auth/strategies/`                               | Swap auth schemes at runtime via one `apply()` interface            |
| Builder              | `BookingBuilder`                                     | Fluent, defaulted, deep-copy test data creation                     |
| Factory              | `BookingFactory`, `NegativeBookingFactory`           | Named scenarios composed from the Builder                           |
| Dependency Injection | `src/fixtures/api.fixtures.ts`                       | Tests declare needs; the framework provides and disposes            |
| Null Object          | `NoAuthStrategy`                                     | Eliminates `if (auth != null)` guards everywhere                    |
| Middleware           | `src/middleware/`                                    | Cross-cutting concerns (correlation IDs) without modifying services |
| Circuit Breaker      | `src/utils/circuit-breaker.ts`                       | Fail fast when a dependency is down; protect the suite              |
| Retry                | `src/utils/retry.ts`                                 | Recover from transient blips without changing callers               |
| TTL Cache            | `src/utils/cache.ts`                                 | Avoid redundant network calls in a test run                         |

---

### Q2. What is the difference between Facade and Repository, and when do you use each?

**Facade** hides complexity of a subsystem behind a simple, unified interface.
`ApiClient` is a Facade over Playwright's `APIRequestContext` — callers call
`client.get(url)` and get back a typed `ApiResponse<T>`; they never deal with
raw `APIResponse`, `safeJsonParse`, timing extraction, or middleware hooks.

**Repository** abstracts data access for a specific resource type, hiding
endpoint paths and request construction. `ProductService` is a Repository — it
knows that products live at `/products/:id` (DummyJSON), constructs the correct
request, and returns a typed `Product`. Callers say `products.getById(5)`, not
`client.get('https://dummyjson.com/products/5')`.

**Rule of thumb:** Facade = simplify a transport/library; Repository = encapsulate
one resource's access pattern.

---

### Q3. How does the Strategy pattern enable pluggable authentication?

All five strategies implement `AuthStrategy.apply(headers)`:

```typescript
// src/auth/strategies/basic-auth.strategy.ts
// Each strategy mutates the headers map in place; the client calls apply() before every request
apply(headers: Record<string, string>): void {
  // Set HTTP Basic auth: base64-encoded "user:pass"
  headers['Authorization'] = `Basic ${Buffer.from(...).toString('base64')}`;
}
```

`ApiClient` calls `strategy.apply(headers)` before every request. Changing from
Basic to Bearer auth is a constructor argument change in the service, not a code
change in the client or the tests. `NoAuthStrategy.apply()` is a no-op, removing
all `if (auth)` null checks.

---

### Q4. Why is `SchemaValidator` implemented as a Singleton?

AJV schema compilation (parsing JSON Schema, building validation bytecode) is
CPU-intensive. If each test compiled its own validator it would be repeated
hundreds of times per suite run. The Singleton ensures schemas are compiled once
on first access, stored in a `Map`, and reused across all 213 tests.

---

### Q5. Explain the Builder pattern as implemented in `BookingBuilder`.

`BookingBuilder` uses the fluent interface style:

1. Constructor sets safe, valid defaults (faker-generated names, today + 1 day).
2. Each `withX()` method mutates the internal draft and returns `this`.
3. `build()` returns a deep copy of the draft so tests cannot accidentally share
   mutable state.

`BookingFactory` composes the Builder into named scenarios (`valid()`,
`withDates(checkIn, checkOut)`) that communicate test intent at the call site.
`NegativeBookingFactory` provides invalid payloads (`missingFirstName()`,
`invalidDates()`).

---

### Q6. What is Dependency Injection and how does OminAPI implement it?

DI means a unit receives its dependencies rather than creating them. In
OminAPI, Playwright's `test.extend()` mechanism is used in
`src/fixtures/api.fixtures.ts`:

```typescript
// Extend Playwright's base test with custom fixtures
export const test = base.extend<Fixtures>({
  bookingService: async ({ request }, use) => {
    const client = new ApiClient(request, bookingOptions); // build the dependency from the injected request context
    await use(new BookingService(client)); // hand the ready service to the test
    // automatic teardown after test
  },
});
```

Test files import `test` from fixtures and declare `{ bookingService }` in the
test parameter list. They never call `new BookingService(...)` — the runner
injects the ready-to-use instance and disposes of it after each test.

---

### Q7. What is the Null Object pattern and why use `NoAuthStrategy`?

A Null Object implements the full interface with do-nothing behaviour. Without it,
`ApiClient` would contain `if (this.strategy != null) this.strategy.apply(...)`.
`NoAuthStrategy.apply()` simply does nothing, eliminating the null check
entirely and making the client's hot path branch-free. Tests that test
unauthenticated behaviour explicitly pass `new NoAuthStrategy()`, which
self-documents intent.

---

## Validation

### Q8. What is the difference between response validation and schema validation?

**Response validation** (`src/validators/response.validator.ts`) checks
observable HTTP attributes: status code, response time, payload size, and
specific header values. It answers "did the server respond correctly?"

**Schema validation** (`src/validators/schema.validator.ts` + `src/schemas/`)
checks the structural contract of the response body using AJV JSON Schema. It
answers "does the payload match the agreed contract?" — catching field renames,
type changes, missing required fields, and invalid enum values that a status-code
assertion would miss entirely.

---

### Q9. Why use AJV JSON Schema instead of manually checking every field?

1. **Completeness:** A schema asserts every field simultaneously; manual checks
   assert only the fields the test author remembered to check.
2. **Maintainability:** Adding a required field to the schema fails every test
   that does not return it — automatic regression coverage.
3. **Error quality:** AJV reports the exact path and constraint that failed
   (e.g., `/price must be number`) without needing to write the assertion.
4. **Performance:** `SchemaValidator` compiles schemas once (Singleton) so
   validation is close to zero cost per call.

---

## Contract Testing

### Q10. What is contract testing and how is it different from integration testing?

**Integration testing** exercises a flow end-to-end and asserts on observable
behaviour (status, body content).

**Contract testing** validates that the API surface (endpoints, request/response
schemas, required fields, status codes) matches a committed specification and
that changes between versions are backward-compatible.

In OminAPI, `src/contracts/` holds the committed OpenAPI spec for Swagger
Petstore. `src/utils/contract-diff.ts` compares the live API against the
committed spec and fails if a breaking change is detected (removed field, changed
type, newly required property).

---

### Q11. What constitutes a breaking change in an API contract?

- Removing a previously present field.
- Changing a field's type (e.g., `string` → `number`).
- Making an optional field required.
- Removing an endpoint or HTTP method.
- Changing a status code for a success response.

Non-breaking: adding optional fields, adding new endpoints, relaxing constraints.
`src/utils/contract-diff.ts` detects the breaking cases listed above.

---

## Resilience

### Q12. What is the difference between retry and circuit breaker?

**Retry** (`src/utils/retry.ts`) re-attempts a failed operation a fixed number of
times with exponential backoff. It is appropriate when failures are transient
(momentary network blip, rate-limit 429).

**Circuit Breaker** (`src/utils/circuit-breaker.ts`) tracks a failure count over
a time window. When failures exceed a threshold, the circuit opens and subsequent
calls fail immediately (without making the network request). After a cooldown
period the circuit half-opens to probe recovery. It is appropriate when a
dependency is likely down for an extended period — retrying would only slow the
suite and waste quota.

**Rule:** Use retry for transient blips; use circuit breaker to fail fast when a
dependency is durably degraded.

---

### Q13. What is a TTL cache and when is it useful in test frameworks?

A TTL (time-to-live) cache stores the result of a call for a configurable
duration and returns the cached value on subsequent calls within that window.

In OminAPI (`src/utils/cache.ts`), it is useful for:

- Auth tokens — log in once per suite run rather than once per test.
- Static reference data — fetch the product catalogue once and reuse it across
  performance/pagination tests.
- Expensive setup calls — fetch the OpenAPI spec once for contract tests.

---

### Q14. How does idempotency affect API test design?

An operation is idempotent if repeating it produces the same result. GET, PUT,
and DELETE are idempotent by specification; POST generally is not.

Test implications:

- **Retrying GET/PUT/DELETE** is safe — the outcome is the same whether the
  first attempt reached the server or not.
- **Retrying POST** can create duplicate resources; retry must be disabled or the
  test must clean up extra records.
- **Soft assertions before teardown** — if a test creates a resource and then
  asserts on it, teardown should always attempt deletion even if the assertion
  fails, to avoid leaking state into other tests.

---

## Performance Testing

### Q15. Why assert on percentiles (p95/p99) rather than average latency?

Averages are dominated by the majority of fast responses and mask slow outliers.
A p99 of 8 s means 1% of users wait 8 s — a very different story from
"average 200 ms". Percentile assertions (`PerfHelper.percentile(samples, 0.99)`)
in `tests/performance/` catch tail latency that would be invisible to mean-based
SLAs.

---

### Q16. What is the difference between a performance smoke test and a load test?

**Performance smoke test** (what OminAPI implements in `tests/performance/`):
sends a small number of concurrent requests (e.g., 20) and asserts that p95
latency stays under a threshold. It catches gross regressions in a CI pipeline
in seconds.

**Load test** (not yet implemented; see [Roadmap](Roadmap.md)): simulates
realistic or peak traffic volumes over minutes to identify capacity limits and
degradation curves. Tools: k6, Gatling, Locust.

---

## Negative & Security Testing

### Q17. What categories of negative tests should an API test framework cover?

OminAPI covers all of these in `tests/negative/` and `tests/security/`:

- **Invalid input:** missing required fields, wrong types, out-of-range values,
  oversized payloads.
- **Malformed requests:** invalid JSON body, wrong Content-Type.
- **Auth failures:** missing token, expired token, tampered JWT, wrong credentials.
- **Authorization failures:** IDOR (accessing another user's resource), privilege
  escalation.
- **Injection:** SQL injection and XSS payloads in query and body parameters
  (OWASP payloads in `src/constants/`).
- **Sensitive-data exposure:** checking that error responses do not leak stack
  traces, connection strings, or PII.
- **Security headers:** X-Frame-Options, X-Content-Type-Options, HSTS presence.

---

### Q18. How do you test JWT tampering without a real auth server?

`src/utils/jwt.ts` provides helpers to:

1. Decode an existing JWT (without verifying the signature).
2. Modify the payload (e.g., change `role` from `user` to `admin`).
3. Re-encode and re-sign with a different or blank secret.

Tests then send the tampered token and assert that the server returns 401 or 403.
This validates that the server verifies signatures and does not accept
client-supplied claims at face value.

---

## Testing Architecture & Strategy

### Q19. How do you distinguish a flaky test from a real failure?

| Indicator            | Likely flaky          | Likely real failure |
| -------------------- | --------------------- | ------------------- |
| Consistent on re-run | Fails ~20%            | Fails 100%          |
| Env-specific         | Fails only on CI      | Fails locally too   |
| Timing-sensitive     | Yes                   | No                  |
| Network-dependent    | Yes (3rd-party API)   | Not if mocked       |
| Payload-specific     | Random data collision | Deterministic input |

Strategy in OminAPI:

- `retries: isCI ? 2 : 0` — repeated CI failure = real failure.
- `LOG_LEVEL=debug` + trace-on-first-retry — the trace file captures the exact
  request/response on the flaky run.
- Move to mock server if the external API is the noise source.

---

### Q20. Why run tests with `fullyParallel: true`?

API tests are I/O-bound: the test runner is idle while waiting for HTTP
responses. Parallel execution saturates that idle time, running all 213 tests in
a fraction of the sequential time. There is no shared browser state (no DOM), so
test isolation is trivially maintained. The only risk is shared stateful API
resources — OminAPI solves this by creating and deleting resources within each
test rather than relying on pre-seeded data.

---

### Q21. What is request chaining and why does it belong in API testing?

Request chaining means using the output of one API call as the input of the next
— simulating a real user workflow across multiple endpoints.

Example in `tests/chaining/`:
`login → token → create booking → booking_id → read → update → patch → delete → verify 404`

This validates that the system's state transitions are correct end-to-end, not
just that individual endpoints return 200 in isolation.

---

### Q22. How does data-driven testing work in OminAPI?

`src/utils/data-loader.ts` loads test data from JSON, CSV, and Excel files.
Parameterized tests iterate over the loaded rows:

```typescript
// Load rows once at module scope (outside the tests)
const users = await DataLoader.loadJson<User[]>('data/users.json');
// Generate one test per data row — adding a scenario means adding a row, not code
for (const user of users) {
  test(`login: ${user.email}`, async ({ authService }) => {
    const token = await authService.login(user.email, user.password);
    expect(token).toBeTruthy();
  });
}
```

This separates test logic from test data — adding a new scenario means adding a
row to a data file, not writing new test code.

---

### Q23. How do you ensure a test leaves no side effects (test isolation)?

Three strategies used in OminAPI:

1. **Teardown in fixture:** `src/fixtures/api.fixtures.ts` disposes clients and
   any created resources after each test via the `use()/after` lifecycle.
2. **`test.afterEach` cleanup:** Tests that create bookings delete them in
   `afterEach`, even if the test body fails.
3. **Local mock server:** Mocking and WebSocket tests use in-process servers;
   no external state is mutated.

---

### Q24. How is CI/CD integrated, and what does the GitHub Actions pipeline do?

The pipeline in `.github/workflows/ci.yml` runs three stages:

1. **Quality gate:** `typecheck`, `lint`, `format:check` — fast checks that block
   bad code immediately.
2. **Sharded tests:** 4 parallel shards run `playwright test --shard=N/4`,
   cutting wall-clock time by ~75%.
3. **Report merge:** Shard blob reports are merged into a single HTML artifact
   published on the Actions run.

Jenkins (`Jenkinsfile`) and Azure DevOps (`azure-pipelines.yml`) follow the same
pattern for teams that do not use GitHub Actions.

---

### Q25. What would you add to this framework to make it production-ready for a large team?

Based on the planned roadmap and production experience:

1. **True load tests** — k6 or Gatling profiles for capacity planning, not just
   smoke percentiles.
2. **Latency regression baselines** — store p95 from main and fail PRs that
   regress by > 10%.
3. **Per-test report attachments** — attach request/response bodies to the Allure
   report automatically for every test.
4. **Live OpenAPI sweep** — run `contract-diff` against the live server on every
   deploy, not just in CI.
5. **Record-and-replay mocking** — record real API interactions once and replay
   them offline for deterministic regression runs.
6. **`e2e/` and `regression/` suites** — currently empty placeholders; fill in
   multi-service happy-path and historical-bug regression scenarios.
7. **Secrets rotation testing** — validate that the framework handles 401 +
   token refresh gracefully without manual intervention.

---

_See also [DesignPatterns](DesignPatterns.md), [BestPractices](BestPractices.md),
and [LearningRoadmap](LearningRoadmap.md)._
