/**
 * =============================================================================
 * request-response-body.spec.ts — Request bodies & response bodies
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   APIs exchange data in the body. Two common encodings:
 *     - JSON  (application/json): the modern default — pass via `data`.
 *     - FORM  (x-www-form-urlencoded): classic HTML forms — pass via `form`.
 *   postman-echo reflects exactly what it received, so we can assert the body
 *   was serialized and transmitted correctly.
 *
 * WHAT THIS TEACHES:
 *   - `data` -> JSON body + auto Content-Type: application/json.
 *   - `form` -> url-encoded body.
 *   - Reading a typed response body and asserting nested fields.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import type { PostmanEcho } from '../../src/types/httpbin.types.js';

test.describe('Phase 2 · Request & response bodies', () => {
  test('JSON request body is serialized and echoed back', async ({ echo }) => {
    const payload = {
      framework: 'OmniAPI',
      nested: { level: 2, tags: ['api', 'playwright'] },
    };

    const res = await echo.post<PostmanEcho>('/post', { data: payload });

    expect(res.status).toBe(200);
    expect(res.isJson).toBe(true);
    // postman-echo returns the parsed JSON under `json`.
    expect(res.body.json).toEqual(payload);
  });

  test('url-encoded form body is transmitted correctly', async ({ echo }) => {
    const res = await echo.post<PostmanEcho>('/post', {
      form: { username: 'omni', remember: true },
    });

    expect(res.status).toBe(200);
    // Form values arrive as strings under `form`.
    expect(res.body.form).toMatchObject({ username: 'omni', remember: 'true' });
  });

  test('Content-Type is automatically set to JSON for `data` bodies', async ({
    echo,
  }) => {
    const res = await echo.post<PostmanEcho>('/post', { data: { a: 1 } });
    expect(res.body.headers['content-type']).toContain('application/json');
  });
});
