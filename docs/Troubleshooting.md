# Troubleshooting

Concrete issues encountered during OminAPI development, with root causes and
exact fixes. Run all commands from the repository root.

---

## 1. Flaky public APIs — intermittent 5xx or timeouts

**Symptom:** A test passes locally but fails on CI with a 503 or a connection
timeout against Restful Booker, DummyJSON, or postman-echo.

**Root cause:** Free, public test APIs share infrastructure and occasionally
spike in latency or return server errors under load.

**Fix:**

1. `playwright.config.ts` sets `retries: isCI ? 2 : 0`. Playwright automatically
   re-runs failed tests twice on CI before marking them red.
2. `src/utils/retry.ts` provides an application-level exponential-backoff wrapper
   for operations inside services where a single HTTP call must be retried.
3. Performance SLA tests in `tests/performance/` wrap assertions in the retry
   utility to absorb transient contention during parallel suite runs.

```bash
# Confirm retry behaviour from the CLI:
npx playwright test --retries=2
```

---

## 2. httpbin.org 5xx errors

**Symptom:** Tests in `tests/foundation/` or `tests/authentication/` that target
httpbin fail with 500–503.

**Root cause:** The canonical `httpbin.org` instance hosted on Heroku was
decommissioned and is no longer reliable.

**Fix:** The framework was repointed to **httpbingo.org**, which is an actively
maintained, httpbin-compatible mirror.

- `src/config/config.manager.ts` — `HTTPBIN_BASE_URL` defaults to
  `https://httpbingo.org`.
- `.env.example` — shows the override key if you want to run your own
  self-hosted httpbin instance.

```bash
# Override for a self-hosted instance:
HTTPBIN_BASE_URL=http://localhost:8080 npm test
```

---

## 3. `baseURL` leading-slash drops the `/v1` path prefix

**Symptom:** Requests to Open Brewery DB arrive at `/breweries` instead of
`/v1/breweries`; the server returns 404.

**Root cause:** When `baseURL` is set to `https://api.openbrewerydb.org/v1` and
a relative path like `/breweries` is passed, the browser-standard `new URL()`
resolution treats the leading slash as an absolute path from the origin, silently
dropping `/v1`.

**Fix:** Set `baseURL` to the origin only (`https://api.openbrewerydb.org`) and
include `/v1` in every resource path string inside `BreweryService`.

```typescript
// src/services/brewery.service.ts
async getBreweries(params?: ...) {
  return this.client.get('/v1/breweries', { params }); // /v1 lives here
}
```

This is the pattern used across all services: `baseURL` = origin,
resource path = full path from root.

---

## 4. `exactOptionalPropertyTypes` rejects properties typed as `: undefined`

**Symptom:** TypeScript compilation fails with:

```
Type 'undefined' is not assignable to type '...' with 'exactOptionalPropertyTypes'.
```

**Root cause:** `tsconfig.json` enables `exactOptionalPropertyTypes: true`. Under
this flag, `prop: T | undefined` and an absent `prop` are distinct. You cannot
write `workers: undefined` to "unset" an optional property.

**Fix:** Use a conditional spread instead of assigning `undefined`:

```typescript
// WRONG — fails exactOptionalPropertyTypes
const config = { workers: isCI ? 4 : undefined };

// CORRECT — used in playwright.config.ts
const config = {
  ...(isCI ? { workers: 4 } : {}),
};
```

---

## 5. Allure report is blank / `allure` command not found

**Symptom:** Running `npm run allure:report` prints an error or opens an empty
report page.

**Root cause:** Allure CLI is a Java application. The `allure-playwright` package
writes raw JSON results to `allure-results/` at no cost, but converting those
results into the HTML report requires **Java 8+** on `PATH`.

**Fix:**

1. Install a JDK (Java 8 or later). On Ubuntu:
   ```bash
   sudo apt install default-jdk
   java -version   # verify
   ```
2. Re-run:
   ```bash
   npm run allure:report   # generates allure-report/ (requires Java on PATH)
   npm run allure:open     # opens the generated report in a browser
   ```

> The Playwright HTML report (`npm run test:report`) does **not** require Java
> and is the fastest way to inspect results locally.

---

## 6. ReqRes returns 401 "Invalid key"

**Symptom:** Any request to `https://reqres.in/` returns HTTP 401 with the
message `"error": "Invalid key"`.

**Root cause:** ReqRes changed its pricing model and now requires a paid
subscription key for all API access. The previously-free unauthenticated tier was
removed.

**Fix:** ReqRes has been **removed** from the framework. API-key authentication
is now demonstrated via header reflection against `httpbingo.org`
(`/get` echoes all request headers). No code change needed — the switch is
already in place.

---

## 7. Performance SLA tests fail intermittently under full-suite contention

**Symptom:** `tests/performance/` tests pass in isolation but fail when the full
213-test suite runs in parallel (`fullyParallel: true`).

**Root cause:** Running 20 test files simultaneously saturates the host's network
stack or the target API's rate limiter, inflating latency beyond SLA thresholds.

**Fix (two layers):**

1. SLA assertions inside `tests/performance/` are wrapped in the `retry` utility
   so a single high-latency sample does not fail the test.
2. On CI, `workers: 4` (set via conditional spread in `playwright.config.ts`)
   caps parallelism to 4, reducing contention.

```bash
# Run performance tests in isolation to get accurate baselines:
npx playwright test tests/performance
```

---

## 8. WebSocket `MockWebSocketServer.stop()` throws on double-stop

**Symptom:** `tests/websocket/` teardown throws `Error: Server is not running`
when the server is stopped twice (e.g., by both the test and the fixture).

**Root cause:** The initial implementation of `MockWebSocketServer.stop()` called
`wss.close()` without guarding against a second call.

**Fix:** `stop()` is now idempotent — it checks an internal `_running` flag
before calling `close()`.

```typescript
// src/utils/ws-server.ts
stop(): Promise<void> {
  if (!this._running) return Promise.resolve(); // guard
  this._running = false;
  return new Promise(resolve => this.wss.close(() => resolve()));
}
```

No action needed — the fix is already committed. If you subclass
`MockWebSocketServer`, apply the same guard pattern.

---

## 9. `test.only` accidentally committed — CI blocks the run

**Symptom:** CI fails immediately with:

```
Error: item.only() is not allowed in CI mode
```

**Root cause:** `playwright.config.ts` sets `forbidOnly: isCI`, which makes
Playwright fail fast if any `test.only` or `describe.only` is found.

**Fix:** Search and remove all `.only` occurrences:

```bash
grep -r "\.only(" tests/          # find every leftover test.only / describe.only
# Edit the offending files, then re-commit.
```

The pre-commit hook (Husky + lint-staged) runs ESLint before every commit; add
the `no-focused-tests` rule to `eslint.config.mjs` to catch this automatically
at commit time.

---

## 10. TypeScript compilation errors after upgrading dependencies

**Symptom:** `npm run typecheck` (or `tsc --noEmit`) reports new errors after a
dependency upgrade.

**Common causes and fixes:**

| Error                                          | Fix                                                           |
| ---------------------------------------------- | ------------------------------------------------------------- |
| `exactOptionalPropertyTypes` violations        | Use conditional spread (see issue 4 above)                    |
| `noUncheckedIndexedAccess` on array/map access | Add a `?? fallback` or runtime check                          |
| `baseUrl` in `tsconfig.json` deprecated        | Remove `baseUrl`; use relative `./`-prefixed paths in `paths` |
| Missing `@types/*` package                     | `npm install --save-dev @types/<package>`                     |

---

## 11. `.env` values not loading — `process.env.X` is `undefined`

**Symptom:** `ConfigManager` throws "required env var X is not set" even though
`.env` contains `X=value`.

**Root cause:** `dotenv.config()` must be called before the config object is
evaluated. In ESM (`"type": "module"`), top-level `import` ordering matters.

**Fix:** `playwright.config.ts` calls `dotenv.config()` at the top of the file,
before `defineConfig(...)` is evaluated. Ensure your `.env` file exists:

```bash
cp .env.example .env
# Edit .env as needed
```

`.env` is git-ignored. Never commit real credentials.

---

_See also [BestPractices](BestPractices.md) and [FAQ](FAQ.md)._
