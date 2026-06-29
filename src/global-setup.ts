/**
 * =============================================================================
 * global-setup.ts — Playwright global setup (run-readiness gate)
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Runs ONCE before the whole suite. Importing the config triggers ConfigManager
 *   validation, so a misconfigured environment fails FAST here with a clear error
 *   — before a single test runs. It also logs a banner so CI logs record exactly
 *   which environment/config a run used (invaluable for debugging CI failures).
 *
 * REGISTERED IN: playwright.config.ts -> globalSetup: './src/global-setup.ts'
 * =============================================================================
 */
import { config } from './config/index.js';
import { logger } from './utils/logger.js';

/**
 * Playwright global-setup hook. Importing `config` above forces ConfigManager
 * validation (fail-fast), and this logs a one-time banner recording the env,
 * base URL, log level, and whether the run is in CI.
 */
export default function globalSetup(): void {
  logger.info('OminAPI suite starting', {
    env: config.env,
    baseUrl: config.baseUrl,
    logLevel: config.logLevel,
    ci: !!process.env.CI,
  });
}
