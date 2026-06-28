# Changelog

This page gives a quick summary of what changed in OmniAPI v1.0.0.
The full, authoritative changelog (Keep a Changelog format, Semantic Versioning)
is at [../CHANGELOG.md](../CHANGELOG.md).

---

## v1.0.0 — 2026-06-28

First complete release. All 20 phases implemented; **213 tests passing**.

### Highlights

- **Full 20-phase framework** covering project setup through enterprise resilience
  in a single, teachable repository.
- **213 passing tests** across REST, GraphQL, WebSockets, contract, security,
  performance, mocking, data-driven, and more.
- **Enterprise patterns:** Singleton, Facade, Repository, Strategy, Builder,
  Factory, Dependency Injection, Null Object, Middleware, Circuit Breaker, Retry,
  TTL Cache — every pattern applied where it solves a real problem.
- **Strict TypeScript** throughout: `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, no `any`.
- **Opt-in resilience:** Phase 20 added retry/cache/middleware/circuit breaker
  without modifying the prior 199 tests (Open/Closed Principle).

### Notable changes from development

- Repointed `httpbin` fixture from `httpbin.org` (unreliable) to `httpbingo.org`.
- Open Brewery DB base URL set to origin-only; `/v1` lives in resource paths to
  avoid the `new URL()` leading-slash pitfall.
- WebSocket `MockWebSocketServer.stop()` made idempotent (double-stop guard).
- Performance SLA specs hardened with application-level retries.
- `tsconfig.json` `baseUrl` removed; path aliases use relative `./`-prefixed
  targets for TypeScript 7 compatibility.

### Removed

- ReqRes integration dropped — the previously-free key now requires a paid
  subscription. API-key auth demonstrated via header reflection on httpbingo.

### Known issues in this release

- `tests/e2e/` and `tests/regression/` are empty placeholder directories.
- Allure report rendering requires Java 8+ (`allure-results/` generation does
  not).
- Some suites depend on third-party public APIs; retries absorb transient
  failures.

---

For planned enhancements, see [Roadmap](Roadmap.md).
For the complete entry with all `Added / Changed / Fixed / Removed` detail,
see [../CHANGELOG.md](../CHANGELOG.md).
