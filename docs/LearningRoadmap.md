# Learning Roadmap

A structured beginner → advanced learning path mapped to the 20 phases of
OminAPI. Study the phases in order — each one builds on the patterns and code
introduced before it.

---

## How to use this guide

1. Read the linked phase's test files first to see what is being tested.
2. Then read the `src/` files the tests import to understand the implementation.
3. Study the companion doc listed in the "Read also" column.
4. Run the tests for that phase and experiment with breaking them deliberately.

---

## Beginner — Foundations (Phases 1–4)

| Phase               | Folder                  | What it teaches                                                                                    | Key files                                                                                      | Read also                                                          |
| ------------------- | ----------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1 — Project setup   | (config files)          | TypeScript strict mode, ESLint 9, Prettier, Husky hooks, `ConfigManager` Singleton, Winston logger | `playwright.config.ts`, `src/config/config.manager.ts`, `src/utils/logger.ts`, `tsconfig.json` | [Configuration](Configuration.md), [Architecture](Architecture.md) |
| 2 — HTTP foundation | `tests/foundation/`     | How `ApiClient` (Facade) wraps `APIRequestContext`; `ApiResponse<T>`; DI fixtures; GET/POST verbs  | `src/api-client/api-client.ts`, `src/fixtures/api.fixtures.ts`                                 | [APIClient](APIClient.md), [GettingStarted](GettingStarted.md)     |
| 3 — CRUD            | `tests/crud/`           | Repository pattern; `BaseApiService`; domain models; endpoint encapsulation                        | `src/services/base.service.ts`, `src/services/post.service.ts`, `src/models/`                  | [CRUD](CRUD.md)                                                    |
| 4 — Authentication  | `tests/authentication/` | Strategy pattern; five auth schemes; `AuthService`; OAuth2 simulation                              | `src/auth/strategies/`, `src/auth/auth.service.ts`                                             | [Authentication](Authentication.md)                                |

**Learning goal:** Understand how to issue HTTP calls, encapsulate endpoints in
services, and apply authentication — the three skills needed for any API test.

---

## Intermediate — Data & Validation (Phases 5–9)

| Phase                | Folder                               | What it teaches                                                                                     | Key files                                                            | Read also                                                            |
| -------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 5 — Dynamic data     | `tests/builders/`                    | Builder + Factory patterns; Faker; fluent API design; deep copy                                     | `src/builders/booking.builder.ts`, `src/builders/booking.factory.ts` | [DesignPatterns](DesignPatterns.md)                                  |
| 6 — Validation       | `tests/validation/`, `tests/schema/` | Multi-dimension response assertions; AJV JSON Schema; `SchemaValidator` Singleton; `sizeBytes`      | `src/validators/`, `src/schemas/`                                    | [Validation](Validation.md), [SchemaValidation](SchemaValidation.md) |
| 7 — Request chaining | `tests/chaining/`                    | Stateful workflows across multiple endpoints; context passing between requests; full CRUD lifecycle | `src/services/booking.service.ts`                                    | [APIClient](APIClient.md)                                            |
| 8 — Data-driven      | `tests/data-driven/`                 | JSON / CSV / Excel test data; env datasets; parameterized tests                                     | `src/utils/data-loader.ts`, `data/`                                  | [DataDrivenTesting](DataDrivenTesting.md)                            |
| 9 — Negative testing | `tests/negative/`                    | `NegativeBookingFactory`; invalid inputs; error response assertions                                 | `src/builders/negative.factory.ts`                                   | [BestPractices](BestPractices.md)                                    |

**Learning goal:** Produce high-quality, maintainable test data; validate the full
response contract; test unhappy paths.

---

## Intermediate-Advanced — Real-World Scenarios (Phases 10–14)

| Phase                 | Folder               | What it teaches                                                                            | Key files                                                                    | Read also                                   |
| --------------------- | -------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------- |
| 10 — Pagination       | `tests/pagination/`  | Offset / page / cursor pagination; filtering, sorting, search; `PaginationHelper`          | `src/utils/pagination.ts`, `src/services/brewery.service.ts`                 | [Pagination](Pagination.md)                 |
| 11 — File APIs        | `tests/file/`        | Multipart upload; binary download; magic-byte MIME detection                               | `src/utils/file.ts`                                                          | [Utilities](Utilities.md)                   |
| 12 — Security testing | `tests/security/`    | OWASP payloads (SQLi, XSS); JWT tampering; IDOR; sensitive-data exposure; security headers | `src/constants/`, `src/utils/jwt.ts`, `src/validators/security.validator.ts` | [SecurityTesting](SecurityTesting.md)       |
| 13 — Performance      | `tests/performance/` | Concurrency; latency percentiles p50/p90/p95/p99; SLA assertions; `PerfHelper`             | `src/utils/perf.ts`                                                          | [PerformanceTesting](PerformanceTesting.md) |
| 14 — GraphQL          | `tests/graphql/`     | `GraphQLClient`; queries/mutations/variables/fragments; 200-with-errors handling           | `src/api-client/graphql-client.ts`                                           | [GraphQL](GraphQL.md)                       |

**Learning goal:** Handle the specialised scenarios that appear in every
real-world API: paged collections, file endpoints, security checks, performance
SLAs, and GraphQL.

---

## Advanced — Resilience & Contracts (Phases 15–17)

| Phase                 | Folder             | What it teaches                                                                                 | Key files                                                              | Read also                             |
| --------------------- | ------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------- |
| 15 — Mocking          | `tests/mocking/`   | In-process `MockServer`; stub / dynamic / spy routes; deterministic testing                     | `src/utils/mock-server.ts`                                             | [Mocking](Mocking.md)                 |
| 16 — WebSockets       | `tests/websocket/` | `WebSocketClient`; buffer+waiter pattern; `MockWebSocketServer`; reconnect; idempotent teardown | `src/api-client/ws-client.ts`, `src/utils/ws-server.ts`                | [WebSocket](WebSocket.md)             |
| 17 — Contract testing | `tests/contract/`  | OpenAPI conformance; `contract-diff` breaking-change detection; committed spec                  | `src/utils/openapi.ts`, `src/utils/contract-diff.ts`, `src/contracts/` | [ContractTesting](ContractTesting.md) |

**Learning goal:** Isolate tests from live dependencies using mocks; test
persistent connections; enforce API contracts across versions.

---

## Expert — Observability, CI/CD & Enterprise (Phases 18–20)

| Phase                    | Folder              | What it teaches                                                                                                                      | Key files                                                                                                              | Read also                         |
| ------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 18 — Reporting           | (reporters config)  | Allure; custom `SummaryReporter`; JUnit XML; debug-level body logging; `winston`                                                     | `src/reporters/summary.reporter.ts`, `playwright.config.ts`                                                            | [Reporting](Reporting.md)         |
| 19 — CI/CD               | (pipeline files)    | GitHub Actions sharding; Jenkins; Azure DevOps; Docker; `global-setup`; `verify` quality gate                                        | `.github/workflows/ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`, `Dockerfile`                                         | [CI-CD](CI-CD.md)                 |
| 20 — Enterprise features | `tests/enterprise/` | Retry + backoff; circuit breaker; TTL cache; middleware + correlation IDs; `SecretsManager`; typed errors; opt-in `ApiClientOptions` | `src/utils/retry.ts`, `src/utils/circuit-breaker.ts`, `src/utils/cache.ts`, `src/middleware/`, `src/config/secrets.ts` | [BestPractices](BestPractices.md) |

**Learning goal:** Make a framework observable, reproducible in CI, and resilient
to real-world operational failures.

---

## Study order summary

```
Phase 1 → 2 → 3 → 4          (foundations)
         ↓
Phase 5 → 6 → 7 → 8 → 9     (data & validation)
         ↓
Phase 10 → 11 → 12 → 13 → 14 (real-world scenarios)
         ↓
Phase 15 → 16 → 17            (resilience & contracts)
         ↓
Phase 18 → 19 → 20            (observability & enterprise)
```

---

## Prerequisite knowledge

| Topic      | Minimum level needed before Phase 1                 |
| ---------- | --------------------------------------------------- |
| TypeScript | Can write interfaces, generics, async/await         |
| HTTP       | Understands verbs, status codes, headers, bodies    |
| REST       | Understands resources, CRUD operations, URL design  |
| Node.js    | Comfortable installing packages and running scripts |
| Git        | Can clone, branch, commit                           |

---

_See also [FAQ](FAQ.md), [InterviewQuestions](InterviewQuestions.md), and the
full documentation index in [../README.md](../README.md)._
