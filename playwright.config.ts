/**
 * =============================================================================
 * playwright.config.ts — The control center of the test framework
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Central, version-controlled configuration for HOW tests run: parallelism,
 *   retries, timeouts, reporters, and shared HTTP request settings. One file
 *   governs local runs AND CI, so behavior is reproducible everywhere.
 *
 * WHAT PROBLEM IT SOLVES:
 *   Without it, every test would re-declare base URLs, headers, and timeouts
 *   (DRY violation). Here we define them ONCE; every test inherits them via the
 *   `request` fixture and `use` block.
 *
 * HOW IT WORKS:
 *   Playwright reads `defineConfig(...)` at startup. For an API-only framework
 *   we skip browsers entirely and lean on the built-in `APIRequestContext`
 *   (exposed to tests as the `request` fixture).
 *
 * BEST PRACTICE:
 *   - Drive environment-specific values (baseURL, retries) from env vars so the
 *     SAME config works for dev/staging/prod and local/CI without edits.
 *   - Fail the build if `test.only` is left in code (forbidOnly on CI).
 * =============================================================================
 */
import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load .env BEFORE the config object is evaluated so process.env is populated.
dotenv.config();

const isCI = !!process.env.CI;

export default defineConfig({
  // Root folder Playwright scans for *.spec.ts files. One sub-folder per phase.
  testDir: './tests',

  // Per-test timeout (ms). APIs are fast, but allow slack for chained flows.
  timeout: 30_000,

  // Assertion-level timeout for expect(...).toPass / polling assertions.
  expect: { timeout: 10_000 },

  // Run every test file in parallel — the #1 reason API suites stay fast.
  fullyParallel: true,

  // Block accidental `test.only` from being committed to CI.
  forbidOnly: isCI,

  // Flaky-network resilience: retry twice on CI, never locally (fail fast).
  retries: isCI ? 2 : 0,

  // Limit workers on CI for stable, comparable timings; use all cores locally.
  // Conditional spread (not `: undefined`) keeps strict exactOptionalPropertyTypes happy.
  ...(isCI ? { workers: 4 } : {}),

  // Reporters: human-readable list locally + machine-readable artifacts for CI.
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit-results.xml' }],
  ],

  // Settings inherited by the built-in `request` fixture in EVERY test.
  use: {
    // Default API under test; overridable per-service in later phases.
    baseURL: process.env.BASE_URL ?? 'https://restful-booker.herokuapp.com',

    // Default headers applied to every request (per-request overrides allowed).
    extraHTTPHeaders: {
      Accept: 'application/json',
    },

    // Capture a trace on the first retry — invaluable for debugging CI flakes.
    trace: 'on-first-retry',

    // Fail fast on TLS issues by default; flip via env for self-signed test envs.
    ignoreHTTPSErrors: process.env.IGNORE_HTTPS_ERRORS === 'true',
  },
});
