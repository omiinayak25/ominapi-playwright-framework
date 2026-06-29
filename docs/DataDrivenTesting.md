# Data-Driven Testing

> OminAPI framework — Phase 8 data-driven testing patterns.
> Repo: <https://github.com/omiinayak25/ominapi-playwright-framework>

---

## Overview

Data-driven testing separates test **logic** from test **data**. OminAPI supports four data formats — JSON, CSV, Excel, and environment-specific JSON datasets — through a single `data-loader` module. Adding a test case means adding a row to a file, not editing TypeScript.

---

## Purpose

- Eliminate copy-paste of parametric test cases.
- Let non-developers (QA analysts, BAs) contribute test data via CSV or Excel.
- Select environment-specific datasets at runtime via a single env var (`TEST_ENV`).
- Provide a single, typed API for every format.

---

## Architecture

### data-loader

**File:** [`../src/utils/data-loader.ts`](../src/utils/data-loader.ts)

| Export                               | Sync/Async | Format        | Description                                        |
| ------------------------------------ | ---------- | ------------- | -------------------------------------------------- |
| `dataPath(relative)`                 | Sync       | —             | Resolves a path relative to `<cwd>/data/`          |
| `loadJson<T>(relative)`              | **Sync**   | JSON          | Parses a JSON file; returns `T`                    |
| `loadCsv<T>(relative)`               | **Sync**   | CSV           | Parses with `csv-parse/sync`; rows keyed by header |
| `loadExcel<T>(relative, sheetName?)` | **Async**  | Excel (.xlsx) | Uses `exceljs`; reads first (or named) sheet       |

`DATA_DIR` is `path.resolve(process.cwd(), 'data')` — all paths resolve relative to the project root `data/` directory.

---

## The Sync vs Async Constraint

This is the most important design decision in the data-loader:

> **Playwright collects tests synchronously.** A `for` loop that generates `test(...)` calls must run at module evaluation time — before any `async` work completes.

| Format | API                                          | Can generate one test per row?                                |
| ------ | -------------------------------------------- | ------------------------------------------------------------- |
| JSON   | `loadJson` (sync)                            | **Yes** — `for (const c of cases) { test(...) }` at top level |
| CSV    | `loadCsv` (sync)                             | **Yes** — same pattern                                        |
| Excel  | `loadExcel` (async, exceljs has no sync API) | **No** — must loop _inside_ a single test body                |

To get one-test-per-row from Excel, pre-convert the sheet to JSON in `global-setup.ts` during framework initialization.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Test file imports data-loader] --> B{Format?}
    B -- JSON --> C["loadJson&lt;T&gt;(file)\n(sync)"]
    B -- CSV --> D["loadCsv&lt;T&gt;(file)\n(sync)"]
    B -- Excel --> E["loadExcel&lt;T&gt;(file)\n(async)"]
    B -- Env JSON --> F["loadJson&lt;EnvData&gt;(env/config.env.json)\n(sync)"]
    C --> G[for loop at module level\none test() per row]
    D --> G
    E --> H[await inside a single test\nloop rows inside the test body]
    F --> I[loadJson selects dataset by config.env\nTEST_ENV env var]
```

---

## Data Files

| File                                                     | Format     | Used by                                                                |
| -------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| [`../data/status-cases.json`](../data/status-cases.json) | JSON array | `tests/data-driven/json-driven.spec.ts`                                |
| [`../data/bookings.csv`](../data/bookings.csv)           | CSV        | `tests/data-driven/csv-driven.spec.ts`                                 |
| [`../data/products.xlsx`](../data/products.xlsx)         | Excel      | `tests/data-driven/excel-driven.spec.ts`                               |
| [`../data/env/dev.json`](../data/env/dev.json)           | JSON       | `tests/data-driven/environment-data.spec.ts` (when `TEST_ENV=dev`)     |
| [`../data/env/staging.json`](../data/env/staging.json)   | JSON       | `tests/data-driven/environment-data.spec.ts` (when `TEST_ENV=staging`) |

---

## JSON-Driven Tests

**File:** [`../tests/data-driven/json-driven.spec.ts`](../tests/data-driven/json-driven.spec.ts)

JSON is the simplest format. `loadJson` is synchronous, so the `for` loop generates one named `test()` per row at collection time.

**Data file (`data/status-cases.json`):**

```json
[
  { "name": "OK", "code": 200, "ok": true },
  { "name": "Created", "code": 201, "ok": true },
  { "name": "Bad Request", "code": 400, "ok": false },
  { "name": "Unauthorized", "code": 401, "ok": false },
  { "name": "Forbidden", "code": 403, "ok": false },
  { "name": "Not Found", "code": 404, "ok": false },
  { "name": "Server Error", "code": 500, "ok": false }
]
```

**Test code:**

```typescript
interface StatusCase {
  name: string;
  code: number;
  ok: boolean;
}

// Loaded SYNCHRONOUSLY at collection time — generates tests before any test runs.
const cases = loadJson<StatusCase[]>('status-cases.json');

test.describe('Phase 8 · JSON-driven status codes', () => {
  for (const c of cases) {
    test(`${c.name} -> HTTP ${c.code}`, async ({ echo }) => {
      const res = await echo.get(`/status/${c.code}`);
      expect(res.status).toBe(c.code);
      expect(res.ok).toBe(c.ok);
    });
  }
});
```

Adding a new status-code case requires only a new line in `status-cases.json`.

---

## CSV-Driven Tests

**File:** [`../tests/data-driven/csv-driven.spec.ts`](../tests/data-driven/csv-driven.spec.ts)

CSV is what non-developers reach for. `loadCsv` uses `csv-parse/sync` with `{ columns: true, trim: true }`.

**Critical note on type coercion:** CSV values are **always strings**. Convert to the correct runtime types before using them in typed payloads.

**Data file (`data/bookings.csv`):**

```
firstname,lastname,totalprice,depositpaid,checkin,checkout,additionalneeds
Alice,Anderson,250,true,2026-08-01,2026-08-05,Breakfast
Bob,Brown,99,false,2026-09-10,2026-09-12,
Carol,Clark,1200,true,2026-10-15,2026-10-20,Late checkout
```

**Test code showing type coercion:**

```typescript
interface BookingRow {
  firstname: string;
  lastname: string;
  totalprice: string; // <-- string from CSV, not number
  depositpaid: string; // <-- "true"/"false" string, not boolean
  checkin: string;
  checkout: string;
  additionalneeds: string;
}

const rows = loadCsv<BookingRow>('bookings.csv');

for (const row of rows) {
  test(`creates booking for ${row.firstname} ${row.lastname}`, async ({
    bookings,
  }) => {
    const booking: Booking = {
      firstname: row.firstname,
      lastname: row.lastname,
      totalprice: Number(row.totalprice), // string -> number
      depositpaid: row.depositpaid.toLowerCase() === 'true', // string -> boolean
      bookingdates: { checkin: row.checkin, checkout: row.checkout },
      // Empty CSV cell -> omit the optional field entirely.
      ...(row.additionalneeds ? { additionalneeds: row.additionalneeds } : {}),
    };

    const res = await bookings.create(booking);
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.booking.totalprice).toBe(Number(row.totalprice));
  });
}
```

---

## Excel-Driven Tests

**File:** [`../tests/data-driven/excel-driven.spec.ts`](../tests/data-driven/excel-driven.spec.ts)

`loadExcel` uses `exceljs`, which has no synchronous API. Because of the sync-constraint, rows are loaded and iterated **inside a single test body**, not used to generate individual `test()` calls.

Excel cell values come back as `exceljs` cell types (numbers stay numbers, strings stay strings — no manual coercion needed for numeric columns).

```typescript
interface ProductRow {
  productId: number;
  minPrice: number;
  category: string;
}

test('every spreadsheet row validates against the live product API', async ({
  products,
}) => {
  // await INSIDE the test body — loadExcel is async.
  const rows = await loadExcel<ProductRow>('products.xlsx');
  expect(rows.length).toBeGreaterThan(0);

  for (const row of rows) {
    const res = await products.getById(Number(row.productId));
    expect(res.status, `product ${row.productId}`).toBe(HttpStatus.OK);
    expect(res.body.price).toBeGreaterThanOrEqual(Number(row.minPrice));
  }
});
```

**Key limitation:** A single test failure does not stop subsequent rows in the loop. If you need a dedicated Playwright test per row from Excel, pre-convert the sheet to JSON in `global-setup.ts` and then use `loadJson` (sync) to generate tests.

---

## Environment Dataset Selection

**File:** [`../tests/data-driven/environment-data.spec.ts`](../tests/data-driven/environment-data.spec.ts)

The same test logic can run against different data per environment. The dataset is selected by `config.env`, which reads from the `TEST_ENV` environment variable (default: `"dev"`).

**Dataset files:**

```
data/env/dev.json
  { "environment": "dev", "label": "Development", "expectedMinProducts": 10, "sampleProductId": 1 }

data/env/staging.json
  { "environment": "staging", "label": "Staging", "expectedMinProducts": 10, "sampleProductId": 2 }
```

**Test code:**

```typescript
interface EnvData {
  environment: string;
  label: string;
  expectedMinProducts: number;
  sampleProductId: number;
}

test(`loads and uses the dataset for env="${config.env}"`, async ({
  products,
}) => {
  // Resolves to data/env/dev.json or data/env/staging.json depending on TEST_ENV.
  const data = loadJson<EnvData>(`env/${config.env}.json`);
  expect(data.environment).toBe(config.env);

  const res = await products.getById(data.sampleProductId);
  expect(res.status).toBe(HttpStatus.OK);
  expect(res.body.id).toBe(data.sampleProductId);
});
```

**Switch environments:**

```bash
TEST_ENV=staging npx playwright test tests/data-driven/environment-data.spec.ts
```

No code change needed.

---

## `dataPath` Helper

`dataPath(relative)` resolves any relative path under `<cwd>/data/`. All three loaders use it internally.

```typescript
import { dataPath } from '../../src/utils/data-loader.js';

// Absolute path to data/bookings.csv:
const absPath = dataPath('bookings.csv');

// Works in CI and locally — always resolves from the project root.
const envPath = dataPath('env/dev.json');
```

---

## Best Practices

- Use `loadJson` or `loadCsv` when you want one test per row — they are synchronous and safe to call at module level.
- Use `loadExcel` only inside a test body (`await loadExcel(...)`). If you need per-row isolation, pre-convert Excel to JSON in `global-setup.ts`.
- Always type-coerce CSV values. Define two interfaces: one with all-string fields for the raw CSV row, and the domain model with correct types. Convert at the call site with `Number()`, `Boolean()`, etc.
- Use `expect(res.status, \`product ${row.productId}\`).toBe(...)`— the second argument to`expect` becomes the failure message, identifying which row failed in Excel/CSV loops.
- Keep data files in `data/` (committed). Use `data/env/` for environment-specific variants. Never hard-code env-specific values in test files.
- To add a new environment (e.g., `prod`), add `data/env/prod.json` and set `TEST_ENV=prod`. `ConfigManager` validates the value against the allowed enum.

---

## Common Mistakes

| Mistake                                                                 | Correct approach                                                                |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Using `await loadExcel(...)` at module level to generate `test()` calls | Excel is async — loop inside a single test body, or pre-convert in global-setup |
| Treating CSV numbers as numbers directly                                | CSV delivers strings; convert with `Number(row.totalprice)`                     |
| Treating CSV booleans as booleans                                       | Use `row.depositpaid.toLowerCase() === 'true'`                                  |
| Using an absolute path in `loadJson`                                    | Pass only the relative path; `dataPath()` resolves it to `<cwd>/data/`          |
| Calling `loadJson('env/prod.json')` when `CONFIG.env` is `"dev"`        | Use `loadJson(\`env/${config.env}.json\`)` so the env var drives selection      |
| Forgetting to handle the empty-cell case in CSV                         | Check `row.additionalneeds` before including optional fields                    |

---

## Interview Questions

1. **Why can JSON and CSV generate one test per row, but Excel cannot?**
   Playwright collects tests synchronously at module load time. `loadJson` and `loadCsv` are synchronous; `loadExcel` (`exceljs`) is async and cannot be called at the top level to drive `test()` generation.

2. **What is type coercion in CSV-driven testing and why does it matter?**
   `csv-parse` returns every value as a string (`"250"`, `"true"`). Passing a string where a typed model expects a number or boolean causes silent bugs. Convert explicitly: `Number(row.totalprice)`, `row.depositpaid.toLowerCase() === 'true'`.

3. **How does environment-specific data selection work without changing test code?**
   `config.env` reads `TEST_ENV`. The test calls `loadJson(\`env/${config.env}.json\`)`. Setting `TEST_ENV=staging`at the shell selects`data/env/staging.json` automatically.

4. **What is `dataPath` and why does it exist?**
   It resolves a relative path to an absolute path under `<cwd>/data/`. This makes data references portable across environments without hard-coded absolute paths.

5. **How would you achieve one Playwright test per Excel row?**
   Pre-convert the Excel file to JSON in `global-setup.ts` using `loadExcel`, write the result to a JSON file, then use `loadJson` (sync) in the spec to generate `test()` calls.

6. **What should the failure message include when asserting inside a data-driven loop?**
   Use the second argument to `expect` as a label: `expect(res.status, \`product ${row.productId}\`)` — this identifies which row failed in the Playwright report.

---

## References

- `csv-parse` library: <https://csv.js.org/parse/api/sync/>
- `exceljs` library: <https://github.com/exceljs/exceljs>
- Playwright parameterized tests: <https://playwright.dev/docs/test-parameterize>
- ConfigManager (env selection): [`../src/config/config.manager.ts`](../src/config/config.manager.ts)

---

## Related Modules

| Module                | Path                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| data-loader           | [`../src/utils/data-loader.ts`](../src/utils/data-loader.ts)                                     |
| ConfigManager (env)   | [`../src/config/config.manager.ts`](../src/config/config.manager.ts)                             |
| status-cases.json     | [`../data/status-cases.json`](../data/status-cases.json)                                         |
| bookings.csv          | [`../data/bookings.csv`](../data/bookings.csv)                                                   |
| products.xlsx         | [`../data/products.xlsx`](../data/products.xlsx)                                                 |
| data/env/dev.json     | [`../data/env/dev.json`](../data/env/dev.json)                                                   |
| data/env/staging.json | [`../data/env/staging.json`](../data/env/staging.json)                                           |
| JSON-driven spec      | [`../tests/data-driven/json-driven.spec.ts`](../tests/data-driven/json-driven.spec.ts)           |
| CSV-driven spec       | [`../tests/data-driven/csv-driven.spec.ts`](../tests/data-driven/csv-driven.spec.ts)             |
| Excel-driven spec     | [`../tests/data-driven/excel-driven.spec.ts`](../tests/data-driven/excel-driven.spec.ts)         |
| Environment-data spec | [`../tests/data-driven/environment-data.spec.ts`](../tests/data-driven/environment-data.spec.ts) |
| Booking model         | [`../src/models/booking.model.ts`](../src/models/booking.model.ts)                               |
| BookingService        | [`../src/services/booking.service.ts`](../src/services/booking.service.ts)                       |
| CRUD doc              | [CRUD.md](CRUD.md)                                                                               |
