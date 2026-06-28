# Changelog

All notable changes to **OmniAPI** are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/) and the project
adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.0] — 2026-06-28

First complete release — all 20 phases implemented, **213 tests passing**.

### Added

- **Phase 1 — Project setup:** strict TypeScript, Playwright config, ESLint 9 flat
  config, Prettier, Husky + lint-staged, `ConfigManager` (Singleton), Winston
  logger, `HttpStatus` constants, layered folder structure.
- **Phase 2 — HTTP foundation:** `ApiClient` (Facade) with `get/post/put/patch/del`,
  normalized `ApiResponse<T>`, `safeJsonParse`, DI fixtures (`httpbin`, `echo`).
- **Phase 3 — CRUD:** `BaseApiService` + `PostService`, `ProductService`
  (Repository pattern); `Post`/`Product` domain models.
- **Phase 4 — Authentication:** `AuthStrategy` interface + Basic, Bearer/JWT,
  API-Key, Cookie/Session, NoAuth (Null Object) strategies; `AuthService`;
  OAuth2-flow simulation; per-request + client-level auth in `ApiClient`.
- **Phase 5 — Dynamic requests:** `BookingBuilder` (Builder), `BookingFactory`
  (Factory), `random`/`date` utilities, Faker integration.
- **Phase 6 — Validation:** `SchemaValidator` (AJV Singleton + cache), reusable
  response assertions, JSON schemas (post/product/booking), `sizeBytes` on responses.
- **Phase 7 — Request chaining:** authenticated `BookingService`; full
  login→create→read→update→patch→delete→verify lifecycle with context passing.
- **Phase 8 — Data-driven:** `data-loader` (JSON/CSV/Excel), env datasets,
  parameterized suites.
- **Phase 9 — Negative testing:** `NegativeBookingFactory`, strict booking schema,
  contract-layer + live negative tests (malformed JSON, bad tokens, boundaries).
- **Phase 10 — Pagination:** offset/page/cursor-style, filtering, sorting, search;
  `BreweryService`, `PaginationHelper`.
- **Phase 11 — File APIs:** multipart upload, binary download, `FileHelper` with
  magic-byte type detection.
- **Phase 12 — Security:** SQLi/XSS payloads, broken-auth/IDOR, JWT tampering utils,
  sensitive-data detection, security-header audit, rate-limit resilience.
- **Phase 13 — Performance:** `PerfHelper` (concurrency, latency percentiles),
  smoke load, SLA, large-payload tests.
- **Phase 14 — GraphQL:** `GraphQLClient`, `graphqlData` unwrapper; queries,
  mutations, variables, fragments, error handling.
- **Phase 15 — Mocking:** in-process `MockServer` (stub/dynamic/spy), `mock` fixture.
- **Phase 16 — WebSockets:** `WebSocketClient` (buffer+waiter), `MockWebSocketServer`.
- **Phase 17 — Contract testing:** `OpenApiContract`, `contract-diff`
  (breaking-change detection), committed OpenAPI spec.
- **Phase 18 — Reporting:** Allure reporter, custom `SummaryReporter`,
  debug-level request/response body logging.
- **Phase 19 — CI/CD:** GitHub Actions (quality gate → 4 shards → merged report),
  Jenkinsfile, Azure pipeline, Dockerfile, `global-setup`, `verify` script.
- **Phase 20 — Enterprise features:** retry (backoff), circuit breaker, TTL cache,
  middleware + correlation IDs, `SecretsManager`, typed errors; opt-in
  `ApiClientOptions`.
- Documentation: full `docs/` guide set, metadata files, this changelog, LICENSE.

### Changed

- Repointed the `httpbin` fixture to **httpbingo.org** (canonical httpbin.org on
  Heroku was unreliable).
- Open Brewery base URL set to origin-only with `/v1` in the resource path
  (avoids the `new URL()` leading-slash pitfall).
- `ApiClient` extended with opt-in retry/cache/middleware **without** breaking the
  prior 199 tests (Open/Closed Principle).
- `tsconfig.json`: removed deprecated `baseUrl`; path aliases now use relative,
  `./`-prefixed targets (forward-compatible with TypeScript 7.0).

### Fixed

- WebSocket `MockWebSocketServer.stop()` made idempotent (double-stop in teardown).
- Performance SLA specs hardened with retries to absorb full-suite network contention.

### Removed

- **ReqRes** integration — the previously-free key is now rejected; API-key auth is
  demonstrated via header reflection instead.

### Known Issues

- `tests/e2e/` and `tests/regression/` are reserved placeholders (no specs yet).
- Allure report rendering requires Java (results generation does not).
- Some suites depend on third-party public APIs and use retries for resilience.

### Upcoming

- True cursor pagination against an authenticated API, live OpenAPI sweep,
  per-test report attachments, load-test profiles, latency regression baselines.

---

## Release links

- Repository: <https://github.com/omiinayak25/omniapi-playwright-framework>
