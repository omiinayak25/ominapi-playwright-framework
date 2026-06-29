/**
 * =============================================================================
 * environment-data.spec.ts — Environment-specific datasets
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   The SAME test logic should run against different data per environment. We
 *   select the dataset by the active environment (config.env, driven by the
 *   TEST_ENV env var) — `data/env/dev.json`, `data/env/staging.json`, etc.
 *   Switch environments by changing one env var; the code is untouched.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { loadJson } from '../../src/utils/data-loader.js';
import { config } from '../../src/config/index.js';
import { HttpStatus } from '../../src/constants/http-status.js';

interface EnvData {
  environment: string;
  label: string;
  expectedMinProducts: number;
  sampleProductId: number;
}

// Suite: same logic, environment-selected dataset (TEST_ENV picks the JSON file).
test.describe('Phase 8 · Environment-driven data', () => {
  // Load the active env's dataset and assert the API matches its expectations.
  test(`loads and uses the dataset for env="${config.env}"`, async ({
    products,
  }) => {
    // Pick the dataset that matches the active environment.
    const data = loadJson<EnvData>(`env/${config.env}.json`);
    expect(data.environment).toBe(config.env);

    // Use a value from the env dataset to drive a real request.
    const res = await products.getById(data.sampleProductId);
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.id).toBe(data.sampleProductId);

    // And another env-specific expectation.
    const list = await products.getAll(10, 0);
    expect(list.body.total).toBeGreaterThanOrEqual(data.expectedMinProducts);
  });
});
