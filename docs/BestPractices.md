# Best Practices

Practices actually embodied in the OmniAPI framework — each with the **why** and
the **where** so you can find the implementation.

---

## 1. Centralize configuration

**Why:** A vendor outage or endpoint change should be a one-line edit, not a
search-and-replace across dozens of test files.

**Where:**

- `src/config/config.manager.ts` — `ConfigManager` Singleton reads `.env` once
  and exposes typed values.
- `playwright.config.ts` — `use.baseURL` is set from `process.env.BASE_URL`;
  environment changes require only a different env var.
- `data/` — Per-environment datasets let `test:ci` and local runs use different
  fixture values without touching test code.

---

## 2. Zero raw HTTP in tests

**Why:** Tests that call `request.get(url, { headers: ... })` directly are
brittle: auth logic, header defaults, and error handling all leak into test bodies
and must be duplicated everywhere.

**Where:**

- `src/api-client/api-client.ts` — `ApiClient` (Facade) is the single entry
  point for all HTTP. Tests never touch `APIRequestContext` directly.
- `src/services/` — `BaseApiService` + concrete services (`BookingService`,
  `ProductService`, `PostService`, `BreweryService`) encapsulate every endpoint
  path string. Moving an endpoint means editing one file.

---

## 3. Dependency Injection via fixtures

**Why:** Manual construction of clients and services inside each test creates
tight coupling and makes teardown error-prone. DI fixtures receive what they need
and dispose of it automatically.

**Where:**

- `src/fixtures/api.fixtures.ts` — Playwright `extend`-based fixture that
  provisions `apiClient`, `bookingService`, `productService`, etc. and cleans up
  after the test.
- Every test simply declares `{ bookingService }` in its parameter list; the
  runner injects the ready-to-use instance.

---

## 4. Multi-dimension schema validation

**Why:** Status-code assertions only confirm that the server responded; they say
nothing about the payload contract. Schema validation catches field renames,
type changes, and missing required properties before they break consumers.

**Where:**

- `src/schemas/` — AJV JSON schemas for `post`, `product`, and `booking`.
- `src/validators/schema.validator.ts` — `SchemaValidator` Singleton compiles
  schemas once and caches them.
- `src/validators/response.validator.ts` — `expectMatchesSchema`, `expectStatus`,
  `expectResponseTimeUnder`, `expectHeaderContains` unified in one place.

---

## 5. Retries for flaky external dependencies

**Why:** Public test APIs (Restful Booker, httpbingo, DummyJSON) occasionally
return 5xx or time out under load. A deterministic retry policy absorbs those
blips without masking real failures.

**Where:**

- `src/utils/retry.ts` — Exponential-backoff retry utility.
- `playwright.config.ts` — `retries: isCI ? 2 : 0`; Playwright retries on CI,
  fails fast locally so developers see real failures immediately.
- `tests/performance/` — SLA specs explicitly use retries to absorb network
  contention during full-suite runs.

---

## 6. Opt-in enterprise features (Open/Closed Principle)

**Why:** Adding retry, cache, or middleware to the HTTP layer should not require
editing — or worse, breaking — tests that do not need those features.

**Where:**

- `src/api-client/api-client.ts` — `ApiClientOptions` interface; retry, cache,
  and middleware are all disabled by default and activated only when the caller
  passes the relevant option.
- `src/utils/circuit-breaker.ts`, `src/utils/cache.ts` — standalone utilities;
  services opt in independently.
- Phase 20 added all enterprise features without modifying the prior 199 tests.

---

## 7. Pluggable authentication strategies

**Why:** A framework that hard-codes one auth scheme cannot scale to multiple
APIs. Swapping schemes should be a constructor argument, not a code change.

**Where:**

- `src/auth/strategies/` — Five concrete strategies: `BasicAuthStrategy`,
  `BearerTokenStrategy`, `ApiKeyStrategy`, `CookieTokenStrategy`, `NoAuthStrategy`.
- `src/auth/auth.service.ts` — `AuthService.loginBooker()` returns a token; the
  caller wraps it in `CookieTokenStrategy` and passes it to `ApiClient`.
- `NoAuthStrategy` (Null Object) — eliminates `if (auth)` guards throughout the
  client.

---

## 8. Builder + Factory for test data

**Why:** Inline object literals in tests are fragile (schema changes break every
test) and repetitive. Named scenarios in factories communicate intent.

**Where:**

- `src/builders/booking.builder.ts` — `BookingBuilder` provides a fluent API with
  safe defaults and a deep-copy `build()`.
- `src/builders/booking.factory.ts` — `BookingFactory.valid()`,
  `BookingFactory.withDates()` compose the Builder into reusable named scenarios.
- `src/builders/negative.factory.ts` — `NegativeBookingFactory` centralizes
  invalid-payload scenarios for negative testing.

---

## 9. Contract testing over snapshot testing

**Why:** Response snapshots break on trivial cosmetic changes. OpenAPI contract
tests validate that the API remains structurally backward-compatible across
versions.

**Where:**

- `src/contracts/` — Committed OpenAPI spec for Swagger Petstore.
- `src/utils/openapi.ts` — `OpenApiContract` validator.
- `src/utils/contract-diff.ts` — Breaking-change detection (removed fields,
  changed types, required additions).
- `tests/contract/` — Suite runs schema conformance and backward-compatibility
  diff tests.

---

## 10. Conventional Commits and quality gates

**Why:** Readable commit history is free documentation. An automated quality gate
prevents broken code from ever reaching CI.

**Where:**

- `.husky/pre-commit` — Runs `lint-staged` on every commit.
- `package.json` `lint-staged` — ESLint + Prettier on changed `.ts`/`.js` files;
  Prettier on JSON, Markdown, YAML.
- `npm run verify` — Runs `typecheck → lint → format:check → test` in sequence;
  the full quality gate in one command.
- Commit convention: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
  prefixes enforced by team process.

---

## 11. Strict TypeScript everywhere

**Why:** Loose typing hides contract mismatches between test code and API
payloads. Strict mode forces you to handle `undefined` and null paths explicitly.

**Where:**

- `tsconfig.json` — `strict: true`, `exactOptionalPropertyTypes: true`,
  `noUncheckedIndexedAccess: true`.
- `src/types/` — Shared TypeScript types; no `any` in the codebase.
- Pattern: `...(isCI ? { workers: 4 } : {})` (conditional spread) in
  `playwright.config.ts` to satisfy `exactOptionalPropertyTypes` without
  assigning `: undefined`.

---

## 12. Mock dependencies for deterministic tests

**Why:** Tests against live mocking suites depend on third-party uptime. An
in-process mock server makes those tests fast, offline, and perfectly
deterministic.

**Where:**

- `src/utils/mock-server.ts` — `MockServer` (stub/dynamic/spy routes).
- `src/utils/ws-server.ts` — `MockWebSocketServer`.
- `src/fixtures/api.fixtures.ts` — `mock` fixture starts and stops the server
  around the test.
- `tests/mocking/` and `tests/websocket/` — All assertions run against the local
  server; no external network required.

---

## 13. Correlation IDs for traceability

**Why:** When a test fails in CI, correlating the test log to the server log
requires a shared request identifier.

**Where:**

- `src/middleware/` — Request middleware injects an `X-Correlation-ID` header
  (UUID) on every outbound request; response middleware logs it.
- `src/utils/logger.ts` (Winston) — Structured log output includes the
  correlation ID so all log lines for a single request are linkable.

---

## 14. Performance assertions with percentiles, not averages

**Why:** Averages hide outliers. A p99 of 10 s is invisible when p50 is 50 ms
and averages wash out.

**Where:**

- `src/utils/perf.ts` — `PerfHelper` records latency samples and computes
  p50/p90/p95/p99.
- `tests/performance/` — SLA tests assert on percentile thresholds, not mean
  response time.

---

## 15. Separate `e2e/` and `regression/` as explicit placeholders

**Why:** Making the future test categories visible in the folder structure
communicates intent and prevents ad-hoc accumulation of tests in the wrong phase.

**Where:**

- `tests/e2e/` and `tests/regression/` — Empty placeholder directories. No specs
  yet; see [Roadmap](Roadmap.md) for planned additions.

---

_See also [Architecture](Architecture.md), [DesignPatterns](DesignPatterns.md),
and [Troubleshooting](Troubleshooting.md)._
