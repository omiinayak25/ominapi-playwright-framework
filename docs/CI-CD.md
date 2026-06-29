# CI/CD

## Overview

OminAPI ships with three CI pipeline definitions and a Docker image. All three pipelines follow the same gate philosophy: static quality checks run first and block the more expensive test jobs on failure. GitHub Actions adds a sharded parallel test matrix for maximum speed.

| Platform       | File                                                      |
| -------------- | --------------------------------------------------------- |
| GitHub Actions | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) |
| Jenkins        | [`Jenkinsfile`](../Jenkinsfile)                           |
| Azure DevOps   | [`azure-pipelines.yml`](../azure-pipelines.yml)           |
| Docker         | [`Dockerfile`](../Dockerfile)                             |

---

## Purpose

| Goal                                                 | Mechanism                                                             |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| Catch type, lint, format errors before running tests | Quality gate job / stage runs `typecheck`, `lint`, `format:check`     |
| Cut wall-clock time on large suites                  | GitHub Actions: 4-shard parallel test matrix                          |
| Produce a single unified HTML report from shards     | `playwright merge-reports` in the `report` job                        |
| Retain artifacts for post-mortem debugging           | Blob reports (7 days), merged HTML (14 days), JUnit XML, summary.json |
| Environment parity between local and CI              | Docker image `node:22-bookworm-slim` used by Jenkins and Dockerfile   |
| Validate run readiness before any test executes      | `globalSetup` logs config banner; misconfiguration fails fast         |

---

## `globalSetup` Readiness Check

[`../src/global-setup.ts`](../src/global-setup.ts) runs once before the entire suite. It imports `ConfigManager`, which validates the environment and throws on misconfiguration. A run banner is logged to CI output:

```ts
// Runs once before the whole suite; importing config validates the env and throws on misconfig
export default function globalSetup(): void {
  // Log a run banner so CI output records which config the suite started with
  logger.info('OminAPI suite starting', {
    env: config.env,
    baseUrl: config.baseUrl,
    logLevel: config.logLevel,
    ci: !!process.env.CI, // true when running under any CI provider
  });
}
```

If the config is invalid, the banner never appears and the run fails with a clear error before a single test runs. This is the first quality gate in every pipeline.

---

## GitHub Actions

**File:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

### Triggers

```yaml
# Trigger the pipeline on pushes and PRs targeting main or develop
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

### Concurrency

```yaml
# One concurrent run per git ref; cancel any superseded run to save CI minutes
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

Superseded runs on the same ref are cancelled to save CI minutes.

### Jobs

| Job       | `needs`   | Purpose                                         |
| --------- | --------- | ----------------------------------------------- |
| `quality` | —         | Typecheck + lint + format check                 |
| `test`    | `quality` | Sharded test matrix (4 shards)                  |
| `report`  | `test`    | Download all blob reports, merge to single HTML |

### Quality Gate (Static Checks)

```yaml
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm # cache the npm download dir keyed on package-lock.json
      - run: npm ci # deterministic install from the lockfile
      - run: npm run typecheck # tsc --noEmit
      - run: npm run lint # ESLint
      - run: npm run format:check # Prettier check (no writes)
```

Failure here cancels all downstream jobs. Cheap static analysis runs first.

### Sharded Test Matrix

```yaml
test:
  needs: quality # only runs after the quality gate passes
  strategy:
    fail-fast: false # let every shard finish so all failures surface
    matrix:
      shard: [1, 2, 3, 4] # fan out into 4 parallel shard jobs
  steps:
    # Run this shard's slice of the suite; blob format is required for later merge
    - run: npx playwright test --shard=${{ matrix.shard }}/4 --reporter=blob
    - uses: actions/upload-artifact@v4
      if: ${{ !cancelled() }} # upload even on test failure for debugging
      with:
        name: blob-report-${{ matrix.shard }}
        path: blob-report
        retention-days: 7
```

- `fail-fast: false` — all shards run to completion even if one fails, so the full picture is captured.
- Each shard uploads its blob report as a separate artifact.
- `if: ${{ !cancelled() }}` — uploads even when the test step fails, preserving the report for debugging.

### Report Merge

```yaml
report:
  needs: test # runs after all shards complete
  if: ${{ !cancelled() }} # still merge even if some shards failed
  steps:
    - name: Download all blob reports
      uses: actions/download-artifact@v4
      with:
        path: all-blobs
        pattern: blob-report-* # grab every per-shard blob artifact
        merge-multiple: true # collapse them into one directory
    - name: Merge into a single HTML report
      run: npx playwright merge-reports --reporter=html ./all-blobs
    - uses: actions/upload-artifact@v4
      with:
        name: playwright-html-report
        path: playwright-report
        retention-days: 14 # keep the merged report longer than raw blobs
```

The merged `playwright-report/` artifact is retained for 14 days.

---

## Jenkins

**File:** [`Jenkinsfile`](../Jenkinsfile)

Declarative pipeline running inside the `node:22-bookworm-slim` Docker image.

### Stages

| Stage          | Steps                                           |
| -------------- | ----------------------------------------------- |
| `Install`      | `npm ci`                                        |
| `Quality gate` | `typecheck`, `lint`, `format:check` in parallel |
| `Test`         | `npm run test:ci`                               |

Quality gate sub-stages run in parallel:

```groovy
stage('Quality gate') {
  // Independent static checks run concurrently to minimize gate latency
  parallel {
    stage('Typecheck') { steps { sh 'npm run typecheck' } }
    stage('Lint')      { steps { sh 'npm run lint' } }
    stage('Format')    { steps { sh 'npm run format:check' } }
  }
}
```

### Post Actions

```groovy
post {
  always { // run whether the build passed or failed
    // Publish JUnit results to the Jenkins test trend page
    junit testResults: 'test-results/junit-results.xml', allowEmptyResults: true
    // Archive the HTML report, allure results, and summary for post-mortem
    archiveArtifacts artifacts: 'playwright-report/**, allure-results/**, test-results/summary.json',
                     allowEmptyArchive: true
  }
}
```

JUnit results are published to the Jenkins test trend page. HTML report, allure-results, and summary.json are archived as build artifacts.

### Pipeline Options

- `timeout(time: 30, unit: 'MINUTES')` — entire build hard-timeout.
- `disableConcurrentBuilds()` — prevents parallel builds on the same branch.
- `environment { CI = 'true' }` — activates CI mode in `playwright.config.ts` (forbidOnly, retries: 2, workers: 4).

---

## Azure DevOps

**File:** [`azure-pipelines.yml`](../azure-pipelines.yml)

Two sequential stages. Both run on `ubuntu-latest`.

### Quality Stage

```yaml
# First stage: cheap static checks gate the test stage
- stage: Quality
  jobs:
    - job: static_checks
      steps:
        - script: npm run typecheck
        - script: npm run lint
        - script: npm run format:check
```

### Test Stage

```yaml
- stage: Test
  dependsOn: Quality # only starts once the Quality stage succeeds
  jobs:
    - job: run_tests
      steps:
        - script: npm run test:ci
        - task: PublishTestResults@2
          condition: always() # publish results even if tests failed
          inputs:
            testResultsFormat: JUnit
            testResultsFiles: 'test-results/junit-results.xml'
            testRunTitle: OminAPI
        - task: PublishBuildArtifacts@1
          condition: always() # always upload the HTML report artifact
          inputs:
            PathtoPublish: playwright-report
            ArtifactName: playwright-report
```

`condition: always()` on publish tasks ensures reports are uploaded even when tests fail.

---

## Docker

**File:** [`Dockerfile`](../Dockerfile)

```dockerfile
FROM node:22-bookworm-slim

WORKDIR /app

# Dependencies layer cached separately from source layer.
COPY package.json package-lock.json ./
RUN npm ci

COPY . . # copy source last so edits don't bust the npm ci cache layer

ENV CI=true # enables forbidOnly, retries, and worker capping
CMD ["npm", "run", "test:ci"] # default container entrypoint
```

- **Base image:** `node:22-bookworm-slim` — same image as the Jenkins agent. No browser dependencies needed for an API-only suite.
- **Layer order:** manifests copied and installed before source so the `npm ci` layer is cached when only source files change.
- **Default command:** `npm run test:ci` with `CI=true` preset.

### Run locally in Docker

```bash
docker build -t ominapi .   # build the image, tagged 'ominapi'
docker run --rm ominapi      # run the suite; --rm removes the container after exit
```

### Pass environment variables

```bash
# Override config at runtime via -e flags without rebuilding the image
docker run --rm \
  -e BASE_URL=https://staging.example.com \
  -e LOG_LEVEL=warn \
  ominapi
```

---

## CI/CD Flow Diagram

```mermaid
flowchart TD
    subgraph GitHub Actions
        GH_PUSH[Push / PR to main or develop] --> GH_Q[quality job\nnpm run typecheck\nnpm run lint\nnpm run format:check]
        GH_Q -->|pass| GH_S1[test shard 1/4\n--shard=1/4 --reporter=blob]
        GH_Q -->|pass| GH_S2[test shard 2/4\n--shard=2/4 --reporter=blob]
        GH_Q -->|pass| GH_S3[test shard 3/4\n--shard=3/4 --reporter=blob]
        GH_Q -->|pass| GH_S4[test shard 4/4\n--shard=4/4 --reporter=blob]
        GH_Q -->|fail| GH_CANCEL[Cancel — no tests run]
        GH_S1 --> GH_BLOB1[upload blob-report-1\nretention 7d]
        GH_S2 --> GH_BLOB2[upload blob-report-2\nretention 7d]
        GH_S3 --> GH_BLOB3[upload blob-report-3\nretention 7d]
        GH_S4 --> GH_BLOB4[upload blob-report-4\nretention 7d]
        GH_BLOB1 & GH_BLOB2 & GH_BLOB3 & GH_BLOB4 --> GH_MERGE[report job\nplaywright merge-reports --reporter=html]
        GH_MERGE --> GH_HTML[upload playwright-html-report\nretention 14d]
    end

    subgraph Jenkins
        J_PUSH[SCM trigger] --> J_INSTALL[Install\nnpm ci]
        J_INSTALL --> J_Q[Quality gate parallel\ntypecheck + lint + format:check]
        J_Q -->|pass| J_TEST[Test\nnpm run test:ci]
        J_TEST --> J_POST[post always\nJUnit publish\nArchive playwright-report/ allure-results/ summary.json]
    end

    subgraph Azure DevOps
        AZ_TRIGGER[Push to main or develop] --> AZ_Q[Quality stage\ntypecheck + lint + format:check]
        AZ_Q -->|dependsOn pass| AZ_TEST[Test stage\nnpm run test:ci]
        AZ_TEST --> AZ_JUNIT[PublishTestResults@2\nJUnit condition always]
        AZ_TEST --> AZ_HTML[PublishBuildArtifacts@1\nplaywright-report condition always]
    end

    subgraph Docker
        DOCKER_BUILD[docker build -t ominapi .] --> DOCKER_RUN[docker run --rm ominapi\nCMD: npm run test:ci]
    end
```

---

## Quality Gates Summary

| Gate                          | Where enforced         | Tool                                 |
| ----------------------------- | ---------------------- | ------------------------------------ |
| TypeScript compilation        | All pipelines          | `npm run typecheck` (`tsc --noEmit`) |
| Linting                       | All pipelines          | `npm run lint` (ESLint)              |
| Code formatting               | All pipelines          | `npm run format:check` (Prettier)    |
| `test.only` in committed code | `playwright.config.ts` | `forbidOnly: isCI`                   |
| Pre-commit hooks              | Local                  | Husky + lint-staged                  |
| Run configuration readiness   | `playwright.config.ts` | `globalSetup`                        |

---

## Parallel Execution

### GitHub Actions (sharding)

The `--shard=N/4` flag tells Playwright which subset of tests this worker should run. Playwright distributes spec files across shards by file hash. Four shards in parallel cuts wall-clock time to approximately one-quarter of a sequential run.

### Within a shard / local run

`playwright.config.ts` sets `fullyParallel: true`, so all spec files within a single shard run in parallel workers. On CI, workers are capped at 4 (`workers: 4`) for stable, comparable timings. Locally, all available CPU cores are used.

---

## Environment Variable Reference

| Variable              | Effect                                            | Default                                |
| --------------------- | ------------------------------------------------- | -------------------------------------- |
| `CI`                  | Enables `forbidOnly`, `retries: 2`, `workers: 4`  | unset (falsy)                          |
| `BASE_URL`            | API base URL for all requests                     | `https://restful-booker.herokuapp.com` |
| `LOG_LEVEL`           | Winston log level (`debug`/`info`/`warn`/`error`) | `info`                                 |
| `IGNORE_HTTPS_ERRORS` | Set to `'true'` for self-signed TLS environments  | `false`                                |

---

## Artifact Retention

| Artifact                          | Platform                  | Retention                 |
| --------------------------------- | ------------------------- | ------------------------- |
| `blob-report-N` (per shard)       | GitHub Actions            | 7 days                    |
| `playwright-html-report` (merged) | GitHub Actions            | 14 days                   |
| `playwright-report/**`            | Jenkins archive           | Build lifetime            |
| `allure-results/**`               | Jenkins archive           | Build lifetime            |
| `test-results/summary.json`       | Jenkins archive           | Build lifetime            |
| `playwright-report`               | Azure DevOps artifact     | Pipeline retention policy |
| `test-results/junit-results.xml`  | Azure DevOps test results | Pipeline retention policy |

---

## Best Practices

- **Keep the quality gate cheap.** Typecheck, lint, and format check are near-instant. They block expensive network-bound test runs on trivially fixable issues.
- **Never skip artifacts on failure.** Use `if: ${{ !cancelled() }}` (GitHub Actions) and `condition: always()` (Azure DevOps) to upload reports even when tests fail — that is exactly when you need the report.
- **Use `fail-fast: false` in the matrix.** All shards should run to completion so you see all failures, not just the first shard's.
- **Cache `npm` dependencies.** `actions/setup-node` with `cache: npm` and Jenkins `docker` agent (layer caching) keep install fast.
- **Set `CI=true` explicitly.** All three pipelines set `CI=true` via the environment. This activates `forbidOnly`, retry behavior, and worker capping in `playwright.config.ts`.
- **Tag Docker images by commit SHA in production.** The `Dockerfile` defaults to `CMD ["npm", "run", "test:ci"]`; override with environment-specific `BASE_URL` at runtime.

---

## Common Mistakes

| Mistake                                       | Correct Approach                                                                                     |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Forgetting `--reporter=blob` on shard runs    | Blob format is required for `merge-reports`; HTML output from shards cannot be merged                |
| Not setting `fail-fast: false` in the matrix  | A single shard failure will cancel remaining shards, hiding other failures                           |
| Skipping artifact upload on test failure      | Use `if: ${{ !cancelled() }}` — the report is most needed when tests fail                            |
| Running tests before the quality gate         | `needs: quality` ensures static checks pass before spending time on test execution                   |
| Using `npm install` in CI instead of `npm ci` | `npm ci` is deterministic (locks to `package-lock.json`); `npm install` can silently change the tree |

---

## Real Project Usage

1. **Branch protection.** Require the `quality` and `test` jobs to pass before merging to `main`.
2. **Merge-report link in PR comments.** Post the `playwright-html-report` download URL as a PR comment via a GitHub Actions step after the `report` job.
3. **Allure history in Jenkins.** Use the Allure Jenkins Plugin to display the trend graph across builds.
4. **Matrix scaling.** Increase shards from 4 to 8 as the test suite grows; no code changes needed, just update the matrix `shard: [1,2,3,4,5,6,7,8]`.
5. **Self-hosted runners.** For compliance environments, replace `ubuntu-latest` with a self-hosted runner label; the pipeline steps are identical.

---

## Interview Questions

1. **Why does the GitHub Actions pipeline have three jobs instead of one?**
   Separation of concerns and fail-fast economics. The `quality` job catches static errors cheaply (seconds) before spending minutes on test execution. The `report` job is isolated so it runs even if some test shards fail.

2. **What is Playwright sharding and how does it work?**
   `--shard=N/M` tells Playwright to run the Nth of M equal partitions of the test suite. Playwright distributes spec files across shards by a deterministic hash. Each shard runs its files in parallel workers, so total wall-clock time is approximately `(sequential time) / M`.

3. **Why does the Jenkins quality gate run typecheck, lint, and format check in parallel?**
   They are fully independent checks. Running them in parallel minimizes gate latency. Any single failure still fails the whole stage.

4. **Why does the Dockerfile copy `package.json` and `package-lock.json` before the rest of the source?**
   Docker builds layers incrementally. Copying manifests first means the `npm ci` layer is cached until the manifests change. Copying the full source after means source edits only invalidate the source layer, not the dependency layer — keeping builds fast.

5. **What does `forbidOnly: isCI` prevent?**
   It makes the test run fail if any `test.only` or `describe.only` call exists in the committed code. This prevents a developer from accidentally shipping a commit that runs only a subset of tests in CI.

---

## References

- [Playwright Sharding](https://playwright.dev/docs/test-sharding)
- [GitHub Actions `actions/upload-artifact@v4`](https://github.com/actions/upload-artifact)
- [Jenkins Declarative Pipeline](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Azure DevOps `PublishTestResults@2`](https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/test/publish-test-results)
- [Playwright `merge-reports`](https://playwright.dev/docs/test-sharding#merging-reports-from-multiple-shards)

---

## Related Modules

- [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml)
- [`../Jenkinsfile`](../Jenkinsfile)
- [`../azure-pipelines.yml`](../azure-pipelines.yml)
- [`../Dockerfile`](../Dockerfile)
- [`../playwright.config.ts`](../playwright.config.ts)
- [`../src/global-setup.ts`](../src/global-setup.ts)
- [Reporting.md](Reporting.md)
