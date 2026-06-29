/**
 * =============================================================================
 * json-driven.spec.ts — Parameterized tests from a JSON dataset
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   The CLASSIC data-driven pattern: load an array of cases, then `for` over it
 *   generating one test() per row. Adding a case = adding a line to JSON — no
 *   code change. Each generated test gets its own name and report entry.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { loadJson } from '../../src/utils/data-loader.js';

interface StatusCase {
  name: string;
  code: number;
  ok: boolean;
}

// Loaded SYNCHRONOUSLY at collection time so we can generate tests from it.
const cases = loadJson<StatusCase[]>('status-cases.json');

// Suite: each JSON case generates a test asserting the echo endpoint's status/ok.
test.describe('Phase 8 · JSON-driven status codes', () => {
  // One generated test per case: hit /status/<code> and verify status + ok flag.
  for (const c of cases) {
    test(`${c.name} -> HTTP ${c.code}`, async ({ echo }) => {
      const res = await echo.get(`/status/${c.code}`);
      expect(res.status).toBe(c.code);
      expect(res.ok).toBe(c.ok);
    });
  }
});
