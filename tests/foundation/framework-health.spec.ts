/**
 * =============================================================================
 * framework-health.spec.ts — Phase 1 smoke test
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Proves the framework's foundation is wired correctly END-TO-END: TypeScript
 *   compiles, path aliases resolve, ConfigManager loads & validates, constants
 *   are importable, and Playwright can discover & run a spec. No network needed
 *   — this is a pure "is the scaffolding alive?" check before Phase 2.
 *
 * BEST PRACTICE:
 *   Every framework should have a zero-dependency health test so a broken setup
 *   fails loudly on `npm test` rather than midway through a real suite.
 * =============================================================================
 */
import { test, expect } from '@playwright/test';
import { config } from '../../src/config/index.js';
import { logger } from '../../src/utils/logger.js';
import { HttpStatus } from '../../src/constants/http-status.js';

// Suite: validates the core framework scaffolding (config, constants, logger).
test.describe('Phase 1 · Framework health', () => {
  // Scenario: ConfigManager produces a well-formed, typed config object.
  // Expected: baseUrl is an http(s) URL, env is a known value, timeout is positive,
  // and the httpbin endpoint is configured.
  test('ConfigManager loads a valid, typed configuration', () => {
    expect(config.baseUrl).toMatch(/^https?:\/\//);
    expect(['dev', 'staging', 'prod']).toContain(config.env);
    expect(config.timeoutMs).toBeGreaterThan(0);
    expect(config.endpoints.httpbin).toContain('httpbin');
  });

  // Scenario: the HttpStatus constant map holds the right numeric codes.
  // Expected: named constants resolve to their canonical HTTP status numbers.
  test('HttpStatus constants expose the expected codes', () => {
    expect(HttpStatus.OK).toBe(200);
    expect(HttpStatus.CREATED).toBe(201);
    expect(HttpStatus.NOT_FOUND).toBe(404);
  });

  // Scenario: the shared logger is importable and usable.
  // Expected: logger.info is a function and a debug call executes without throwing.
  test('Logger is available and callable', () => {
    expect(typeof logger.info).toBe('function');
    logger.debug('Framework health smoke test executed');
  });
});
