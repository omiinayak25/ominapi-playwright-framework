/**
 * =============================================================================
 * http-methods.spec.ts — The five core REST verbs
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   REST maps actions to HTTP methods: GET (read), POST (create), PUT (replace),
 *   PATCH (partial update), DELETE (remove). postman-echo reflects the method &
 *   body back, letting us prove each verb is sent correctly through the ApiClient.
 *
 * WHAT THIS TEACHES:
 *   - How to call each verb via the Facade (api.get/post/put/patch/del).
 *   - That a request body round-trips correctly (echoed back under `json`).
 *
 * WHY postman-echo (not httpbin.org):
 *   The canonical httpbin.org (Heroku) is frequently down (503/504). postman-echo
 *   is reliable and reflects requests in the same spirit. See config endpoints.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { HttpStatus } from '../../src/constants/http-status.js';
import type { PostmanEcho } from '../../src/types/httpbin.types.js';

// Suite: exercises each core REST verb through the ApiClient facade.
test.describe('Phase 2 · HTTP methods', () => {
  // Scenario: a GET request to /get.
  // Expected: 200/ok and the echoed URL reflects the path.
  test('GET retrieves a resource', async ({ echo }) => {
    const res = await echo.get<PostmanEcho>('/get');

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.ok).toBe(true);
    expect(res.body.url).toContain('/get');
  });

  // Scenario: POST a JSON payload to /post.
  // Expected: 200 and the body is echoed back unchanged under `json`.
  test('POST creates a resource and echoes the JSON body', async ({ echo }) => {
    const payload = { name: 'OminAPI', phase: 2 };
    const res = await echo.post<PostmanEcho>('/post', { data: payload });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.json).toEqual(payload); // body round-tripped intact
  });

  // Scenario: PUT a full replacement payload to /put.
  // Expected: 200 and the payload round-trips under `json`.
  test('PUT replaces a resource', async ({ echo }) => {
    const payload = { id: 1, name: 'Replaced' };
    const res = await echo.put<PostmanEcho>('/put', { data: payload });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.json).toEqual(payload);
  });

  // Scenario: PATCH a partial payload to /patch.
  // Expected: 200 and only the patched field is echoed back.
  test('PATCH partially updates a resource', async ({ echo }) => {
    const res = await echo.patch<PostmanEcho>('/patch', {
      data: { name: 'Patched' },
    });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.json).toEqual({ name: 'Patched' });
  });

  // Scenario: DELETE against /delete.
  // Expected: 200 and the echoed URL reflects the delete path.
  test('DELETE removes a resource', async ({ echo }) => {
    const res = await echo.del<PostmanEcho>('/delete');

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.url).toContain('/delete');
  });
});
