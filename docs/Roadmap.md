# Roadmap

Status of all 20 implementation phases and planned future enhancements.

---

## Completed — all 20 phases (v1.0.0)

| #   | Phase                               | Description                                                                                                                                                                            | Status |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Project setup & architecture        | Strict TypeScript, Playwright config, ESLint 9 flat config, Prettier, Husky + lint-staged, `ConfigManager` Singleton, Winston logger, `HttpStatus` constants, layered folder structure | Done   |
| 2   | HTTP foundation                     | `ApiClient` Facade, normalized `ApiResponse<T>`, `safeJsonParse`, DI fixtures (`httpbin`, `echo`)                                                                                      | Done   |
| 3   | CRUD (Repository pattern)           | `BaseApiService` + `PostService`, `ProductService`; `Post`/`Product` domain models                                                                                                     | Done   |
| 4   | Authentication (Strategy)           | `AuthStrategy` interface; Basic, Bearer/JWT, API-Key, Cookie/Session, NoAuth (Null Object) strategies; `AuthService`; OAuth2 simulation                                                | Done   |
| 5   | Dynamic requests (Builder/Factory)  | `BookingBuilder`, `BookingFactory`, `NegativeBookingFactory`; Faker + UUID + date utilities                                                                                            | Done   |
| 6   | Response & schema validation (AJV)  | `SchemaValidator` Singleton + cache; reusable response assertions; JSON schemas for post/product/booking                                                                               | Done   |
| 7   | Request chaining (E2E lifecycle)    | Authenticated `BookingService`; full login → create → read → update → patch → delete → verify lifecycle                                                                                | Done   |
| 8   | Data-driven (JSON/CSV/Excel/env)    | `DataLoader`; env datasets; parameterized suites                                                                                                                                       | Done   |
| 9   | Negative testing                    | `NegativeBookingFactory`; malformed JSON, bad tokens, boundary values, strict schema                                                                                                   | Done   |
| 10  | Pagination / filter / sort / search | Offset, page-based, cursor-style pagination; `BreweryService`; `PaginationHelper`                                                                                                      | Done   |
| 11  | File APIs                           | Multipart upload, binary download, `FileHelper` with magic-byte type detection                                                                                                         | Done   |
| 12  | Security testing (OWASP)            | SQLi/XSS payloads, broken-auth/IDOR, JWT tampering, sensitive-data detection, security-header audit, rate-limit resilience                                                             | Done   |
| 13  | Performance (percentiles)           | `PerfHelper`, concurrency, p50/p90/p95/p99 latency assertions, smoke load, SLA, large-payload tests                                                                                    | Done   |
| 14  | GraphQL                             | `GraphQLClient`, `graphqlData` unwrapper; queries, mutations, variables, fragments, error handling                                                                                     | Done   |
| 15  | Mocking (fake server)               | In-process `MockServer` with stub/dynamic/spy routes; `mock` fixture                                                                                                                   | Done   |
| 16  | WebSockets                          | `WebSocketClient` (buffer + waiter pattern), `MockWebSocketServer`, reconnect, idempotent teardown                                                                                     | Done   |
| 17  | Contract testing (OpenAPI)          | `OpenApiContract`, `contract-diff` breaking-change detection, committed OpenAPI spec                                                                                                   | Done   |
| 18  | Reporting (Allure/custom)           | Allure reporter, custom `SummaryReporter`, JUnit XML, debug-level request/response body logging                                                                                        | Done   |
| 19  | CI/CD                               | GitHub Actions (quality gate → 4 shards → merged report), Jenkinsfile, Azure pipeline, Dockerfile, `global-setup`, `verify` script                                                     | Done   |
| 20  | Enterprise features                 | Retry + backoff, circuit breaker, TTL cache, middleware + correlation IDs, `SecretsManager`, typed errors, opt-in `ApiClientOptions`                                                   | Done   |

**Total: 20 / 20 phases complete — 213 tests passing.**

---

## Known placeholders

| Item                    | Note                                               |
| ----------------------- | -------------------------------------------------- |
| `tests/e2e/`            | Reserved folder — no specs yet                     |
| `tests/regression/`     | Reserved folder — no specs yet                     |
| Allure report rendering | Requires Java; results generation works without it |

---

## Planned enhancements

| Enhancement                     | Description                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| True cursor pagination          | Cursor-based pagination against an authenticated API (not just simulated)           |
| Live OpenAPI sweep              | Run `contract-diff` against the live server on every deploy, not just in CI         |
| Per-test report attachments     | Attach request/response bodies to Allure automatically for every test               |
| k6 / Gatling load profiles      | Full load test profiles for capacity planning; latency regression baselines         |
| `e2e/` and `regression/` suites | Multi-service happy-path and historical-bug regression scenarios                    |
| Record-and-replay mocking       | Record real API interactions once; replay them offline for deterministic regression |

---

_See [../CHANGELOG.md](../CHANGELOG.md) for the detailed release history and
[LearningRoadmap](LearningRoadmap.md) for the phase-by-phase learning path._
