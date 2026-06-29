# Installation

A step-by-step guide to getting OminAPI running locally, in Docker, and in CI.

---

## Overview

OminAPI is a Node.js/TypeScript project. Installation involves cloning the
repository, selecting the correct Node version, installing npm dependencies,
and providing a `.env` file. No browsers need to be downloaded because all
tests target HTTP/GraphQL/WebSocket APIs.

---

## Prerequisites

| Requirement | Version                           | Notes                                            |
| ----------- | --------------------------------- | ------------------------------------------------ |
| **Node.js** | ≥ 20 (pinned **22** via `.nvmrc`) | Install via [nvm](https://github.com/nvm-sh/nvm) |
| **npm**     | Bundled with Node                 | Used for all scripts                             |
| **nvm**     | Any current                       | Reads `.nvmrc` automatically                     |
| **Java**    | Any JDK/JRE                       | Required only to _render_ the Allure HTML report |
| **Docker**  | Any recent                        | Optional — for containerised runs                |
| **git**     | Any current                       | For cloning and the Husky pre-commit hook        |

---

## Step 1 — Clone the Repository

```bash
git clone https://github.com/omiinayak25/ominapi-playwright-framework.git
cd ominapi-playwright-framework
```

---

## Step 2 — Activate the Pinned Node Version

The project pins **Node 22** in `.nvmrc`. With nvm installed:

```bash
nvm use
```

Output: `Now using node v22.x.x`.
If Node 22 is not yet installed: `nvm install 22 && nvm use`.

---

## Step 3 — Install Dependencies

```bash
npm install
```

This installs all runtime and dev dependencies listed in `package.json`, and
also runs the `prepare` script which sets up the Husky pre-commit hook.

---

## Step 4 — Environment Setup

All configuration is supplied via environment variables. A fully annotated
template is provided:

```bash
cp .env.example .env
```

Then edit `.env` as needed. The file is git-ignored — secrets never commit.
Minimum required change for most users: the defaults in `.env.example` point
to free public APIs and work out of the box with no edits.

Key variables (see [Configuration.md](Configuration.md) for the full
reference):

| Variable         | Default                                | Purpose                                          |
| ---------------- | -------------------------------------- | ------------------------------------------------ |
| `TEST_ENV`       | `dev`                                  | Environment profile (`dev` / `staging` / `prod`) |
| `BASE_URL`       | `https://restful-booker.herokuapp.com` | Primary API under test                           |
| `LOG_LEVEL`      | `info`                                 | Winston log verbosity                            |
| `API_TIMEOUT_MS` | `30000`                                | Per-request timeout (ms)                         |

---

## Step 5 — First Run

Run the full 213-test suite:

```bash
npm test
```

Run a single phase (faster for initial verification):

```bash
npm run test:foundation
```

Run only the CRUD phase:

```bash
npm run test:crud
```

---

## Step 6 — Report Generation

### Playwright HTML report

```bash
npm run test:report
```

Opens the built-in Playwright HTML report from `playwright-report/`.

### Allure report (requires Java)

```bash
npm run allure:report   # generate from allure-results/ → allure-report/
npm run allure:open     # open in the browser
```

---

## Step 7 — Full Quality Gate

Before pushing or creating a PR, run the full gate:

```bash
npm run verify
```

This executes in sequence: `typecheck` → `lint` → `format:check` → `npm test`.
The same sequence runs on CI.

---

## Docker Usage

The `Dockerfile` uses `node:22-bookworm-slim`. No browser download is needed
because all tests are API-only.

```bash
# Build the image
docker build -t ominapi .

# Run the suite (executes npm run test:ci inside the container)
docker run --rm ominapi
```

To inject environment variables at runtime:

```bash
docker run --rm \
  -e BASE_URL=https://my-staging-api.example.com \
  -e TEST_ENV=staging \
  ominapi
```

---

## CI Usage

Three pipeline definitions are provided at the repository root:

| File                       | System         |
| -------------------------- | -------------- |
| `.github/workflows/ci.yml` | GitHub Actions |
| `Jenkinsfile`              | Jenkins        |
| `azure-pipelines.yml`      | Azure DevOps   |

### GitHub Actions flow

1. **Quality gate job** — `typecheck`, `lint`, `format:check`.
2. **Sharded test matrix** — `npm run test:ci` split across 4 parallel shards
   (`npx playwright test --shard=N/4`). Each shard uploads a blob report
   artifact.
3. **Merge reports job** — merges shard blobs into a single Playwright HTML
   report, published as a workflow artifact.

The `CI=true` environment variable is set automatically by GitHub Actions.
When `CI` is set, the framework activates: `forbidOnly`, 2 retries, 4 workers
(see `playwright.config.ts`).

### Injecting secrets in CI

Set environment variables as repository secrets (GitHub) or pipeline variables
(Jenkins / Azure DevOps). The `.env` file is never committed. Example for
GitHub Actions:

```yaml
env:
  BASE_URL: ${{ secrets.BASE_URL }}
  BOOKER_USERNAME: ${{ secrets.BOOKER_USERNAME }}
  BOOKER_PASSWORD: ${{ secrets.BOOKER_PASSWORD }}
```

---

## Cleaning Build Artefacts

```bash
npm run clean
```

Removes: `playwright-report/`, `test-results/`, `allure-results/`, `dist/`.

---

## Available Scripts Reference

All scripts are defined in `package.json`:

| Script            | Command                                                     | Purpose                                                |
| ----------------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| `test`            | `playwright test`                                           | Run the full suite                                     |
| `test:foundation` | `playwright test tests/foundation`                          | Foundation phase only                                  |
| `test:crud`       | `playwright test tests/crud`                                | CRUD phase only                                        |
| `test:ci`         | `playwright test`                                           | CI alias for the full suite                            |
| `test:report`     | `playwright show-report`                                    | Open the Playwright HTML report                        |
| `verify`          | `typecheck && lint && format:check && test`                 | Full quality gate                                      |
| `allure:report`   | `allure generate allure-results --clean -o allure-report`   | Generate Allure report                                 |
| `allure:open`     | `allure open allure-report`                                 | Open Allure report                                     |
| `typecheck`       | `tsc --noEmit`                                              | TypeScript type-check without emitting                 |
| `lint`            | `eslint .`                                                  | Run ESLint                                             |
| `lint:fix`        | `eslint . --fix`                                            | Auto-fix ESLint issues                                 |
| `format`          | `prettier --write "**/*.{ts,js,mjs,json,md}"`               | Format all files                                       |
| `format:check`    | `prettier --check "**/*.{ts,js,mjs,json,md}"`               | Check formatting                                       |
| `clean`           | `rimraf playwright-report test-results allure-results dist` | Remove build output                                    |
| `prepare`         | `husky`                                                     | Set up git hooks (runs automatically on `npm install`) |

---

## Common Mistakes

| Mistake                                      | Effect                                              | Fix                             |
| -------------------------------------------- | --------------------------------------------------- | ------------------------------- |
| Running with a Node version below 20         | Type errors or runtime failures                     | `nvm use` to activate Node 22   |
| Forgetting `cp .env.example .env`            | `ConfigManager` throws a clear error at startup     | Copy the file and restart       |
| Setting `API_TIMEOUT_MS` to a non-number     | `ConfigManager` fails fast with a descriptive error | Use an integer (e.g. `30000`)   |
| Setting `TEST_ENV` to an unlisted value      | `ConfigManager` throws listing the valid options    | Use `dev`, `staging`, or `prod` |
| Running `npm run allure:report` without Java | `allure` CLI not found or Java error                | Install a JDK/JRE first         |

---

## References

- [playwright.config.ts](../playwright.config.ts)
- [.env.example](../.env.example)
- [.nvmrc](../.nvmrc)
- [Dockerfile](../Dockerfile)
- [package.json](../package.json)

## Related Modules

- [GettingStarted.md](GettingStarted.md)
- [Configuration.md](Configuration.md)
- [FolderStructure.md](FolderStructure.md)
