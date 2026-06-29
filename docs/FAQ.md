# Frequently Asked Questions

---

## Setup & Installation

### Q1. What do I need installed before I can run the tests?

- **Node.js ≥ 20** (the project pins Node 22 via `.nvmrc`).
- **npm** (ships with Node).
- **Java 8+** only if you want to render the Allure HTML report
  (`npm run allure:report`). Generating raw results and the Playwright HTML
  report work without Java.

```bash
nvm use          # switches to Node 22 from .nvmrc
npm install      # installs all dependencies
cp .env.example .env  # create your local env file
npm test         # run the full suite
```

---

### Q2. Do I need a `.env` file?

Yes. Copy `.env.example` to `.env` and edit it before running tests.
`playwright.config.ts` calls `dotenv.config()` so values are in scope for
`ConfigManager`. `.env` is git-ignored; never commit real credentials.

---

### Q3. Can I run a single phase instead of the full 213-test suite?

Yes. The `package.json` scripts expose two named phases:

```bash
npm run test:foundation   # tests/foundation/
npm run test:crud         # tests/crud/
```

For any other phase, pass the folder directly to Playwright:

```bash
npx playwright test tests/graphql
npx playwright test tests/performance
```

To run a single file or a named test:

```bash
npx playwright test tests/crud/posts.crud.spec.ts
npx playwright test -g "JWT"
```

---

### Q4. How do I switch between environments (dev / staging / prod)?

Set `TEST_ENV` and `BASE_URL` (or any other env var checked by `ConfigManager`):

```bash
TEST_ENV=staging BASE_URL=https://staging.example.com npm test
```

`playwright.config.ts` reads `process.env.BASE_URL` for `use.baseURL`.
Per-environment data files live in `data/env/`.

---

## Running Tests

### Q5. How do I see request and response bodies in the console?

Set `LOG_LEVEL=debug`:

```bash
LOG_LEVEL=debug npm test
LOG_LEVEL=debug npx playwright test tests/authentication
```

The Winston logger in `src/utils/logger.ts` prints full request/response bodies
at the `debug` level.

---

### Q6. How do I run tests in Docker?

```bash
docker build -t ominapi .
docker run --rm ominapi          # runs `npm run test:ci` inside the container
```

The `Dockerfile` installs dependencies and runs the CI test command. Useful for
confirming that the suite passes in a clean environment.

---

### Q7. What is the difference between `npm test` and `npm run test:ci`?

Both run `playwright test`. The CI environment variable (`CI=true`) changes
behavior in `playwright.config.ts`:

| Setting      | Local (`npm test`) | CI (`npm run test:ci`) |
| ------------ | ------------------ | ---------------------- |
| `retries`    | 0 (fail fast)      | 2                      |
| `workers`    | all CPU cores      | 4                      |
| `forbidOnly` | false              | true                   |

---

## Adding Tests and Services

### Q8. How do I add a new test phase?

1. Create a folder under `tests/` (e.g., `tests/graphql-v2/`).
2. Add `*.spec.ts` files inside it.
3. Import fixtures from `src/fixtures/` to get DI-provided clients/services.
4. Playwright auto-discovers all `*.spec.ts` files under `testDir: './tests'`.

---

### Q9. How do I add a new API service?

1. Create `src/services/myresource.service.ts` extending `BaseApiService`.
2. Inject the service via `src/fixtures/api.fixtures.ts` (add a fixture property).
3. Add a domain model in `src/models/` and a JSON schema in `src/schemas/` if
   the API has a stable contract.

---

### Q10. How do I add a new auth strategy?

1. Create `src/auth/strategies/myauth.strategy.ts` implementing `AuthStrategy`.
2. Implement the single `apply(headers: Record<string, string>): void` method.
3. Export it from `src/auth/index.ts`.
4. Pass an instance to `ApiClient` via `ApiClientOptions.auth` or per-request.

---

### Q11. How do I add test data for data-driven tests?

- **JSON:** Add a file to `data/` and load it with `DataLoader.loadJson(path)`.
- **CSV:** Add a `.csv` file; use `DataLoader.loadCsv(path)`.
- **Excel:** Add an `.xlsx` file; use `DataLoader.loadExcel(path)`.
- **Env-specific:** Put files in `data/env/<env-name>/` and select by
  `process.env.TEST_ENV`.

---

## Framework Architecture

### Q12. Why does the framework use a Facade pattern for the HTTP client?

`ApiClient` wraps Playwright's `APIRequestContext` to provide:

- A unified `ApiResponse<T>` shape (status, body, headers, timing) across all
  callers.
- A single place to add cross-cutting features: auth injection, middleware,
  retry, TTL cache, and correlation IDs.
- Tests that never import Playwright directly — swapping the HTTP engine would
  touch only `api-client.ts`, not tests.

---

### Q13. Why use a Repository pattern for services instead of calling `ApiClient` directly in tests?

Repository services encapsulate the resource's endpoint paths and request shapes.
If the `/booking` path moves to `/api/v2/booking`, only `BookingService` changes
— not every test. Services also own auth: `BookingService` handles token
injection internally so tests never manage headers manually.

---

### Q14. Why is `SchemaValidator` a Singleton?

AJV schema compilation is expensive. `SchemaValidator` compiles each schema once
on first use and caches the compiled validator. All tests in the suite share the
same compiled instance, making schema-validated suites as fast as status-only
ones.

---

### Q15. Why use httpbingo.org instead of httpbin.org?

The canonical `httpbin.org` Heroku instance is no longer reliable (frequent 5xx,
decommissioned in 2024). `httpbingo.org` is an actively maintained,
httpbin-compatible mirror. The switch is transparent: both expose the same API
surface (`/get`, `/post`, `/status/:code`, `/basic-auth/:user/:pass`, etc.).

---

### Q16. Why does the mock server exist when there are real public APIs?

Three reasons:

1. **Determinism:** Public APIs can return different data on each call. The mock
   server returns exactly what the test expects.
2. **Offline use:** `tests/mocking/` and `tests/websocket/` run with no network
   access.
3. **Edge-case coverage:** Testing 429 rate-limit handling or malformed responses
   is impossible against a real API without controlling the server.

---

### Q17. GraphQL responses always return HTTP 200 — how are errors detected?

GraphQL uses HTTP 200 for both success and application-level errors. The error
payload appears in `response.body.errors[]`. `GraphQLClient` in
`src/api-client/graphql-client.ts` always inspects the body and throws (or
returns an error-flagged `ApiResponse`) when `errors` is present, so tests do
not need to check the status code for GraphQL error cases.

---

### Q18. Why are `tests/e2e/` and `tests/regression/` empty?

They are intentional placeholders. Having the folders visible in the structure
communicates that end-to-end and regression suites are planned. Tests will be
added as part of the upcoming roadmap items. See [Roadmap](Roadmap.md).

---

### Q19. What is the difference between contract testing and schema validation?

|                  | Schema validation                             | Contract testing                                                |
| ---------------- | --------------------------------------------- | --------------------------------------------------------------- |
| What             | Validates response body against a JSON Schema | Validates API response against a committed OpenAPI spec         |
| Scope            | Single field/response                         | Entire API surface (all endpoints, methods, status codes)       |
| Breaking changes | Catches field-type mismatches                 | Catches removed endpoints, added required fields, changed types |
| Where            | `src/validators/schema.validator.ts`          | `src/utils/openapi.ts`, `src/utils/contract-diff.ts`            |
| Tests            | `tests/schema/`                               | `tests/contract/`                                               |

Both are complementary: schema validation is fast and per-response; contract
testing is holistic and CI-wide.

---

### Q20. How do I view the Allure report?

```bash
npm test                  # generates allure-results/
npm run allure:report     # converts to allure-report/ (requires Java)
npm run allure:open       # opens in browser
```

If Java is not available, use the Playwright HTML report instead:

```bash
npm run test:report       # opens playwright-report/ (no Java needed)
```

---

_See also [Troubleshooting](Troubleshooting.md), [BestPractices](BestPractices.md),
and [LearningRoadmap](LearningRoadmap.md)._
