/**
 * =============================================================================
 * download-binary.spec.ts — Binary downloads (read as BYTES, verify magic)
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Downloaded files are BINARY. Reading them as a string corrupts them, so we
 *   read the raw Buffer via the underlying Playwright response (res.raw.body())
 *   and verify by:
 *     - Content-Type header,
 *     - byte length,
 *     - MAGIC BYTES (the authoritative proof of the real file type).
 *   We also persist the download and confirm the saved file's size matches.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { FileHelper } from '../../src/utils/file.js';
import { HttpStatus } from '../../src/constants/http-status.js';

test.describe('Phase 11 · Binary download', () => {
  // GET a PNG, confirm the content-type, read raw bytes, and prove it's really a PNG via magic bytes; saved file size matches.
  test('downloads a PNG and verifies type by magic bytes', async ({
    httpbin,
  }) => {
    const res = await httpbin.get('/image/png');
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.headers['content-type']).toContain('image/png');

    // Read the RAW bytes (not the lossy text body).
    const bytes = await res.raw.body();
    expect(bytes.length).toBeGreaterThan(0);
    expect(FileHelper.detectType(bytes)).toBe('png');

    // Persist and confirm the saved file is byte-identical in size.
    const saved = FileHelper.write('downloaded.png', bytes);
    expect(FileHelper.size(saved)).toBe(bytes.length);
  });

  // Requesting /bytes/256 returns exactly 256 octet-stream bytes — no truncation or text mangling.
  test('downloads an exact number of raw bytes', async ({ httpbin }) => {
    const res = await httpbin.get('/bytes/256');
    expect(res.status).toBe(HttpStatus.OK);

    const bytes = await res.raw.body();
    expect(bytes.length).toBe(256);
    expect(res.headers['content-type']).toContain('application/octet-stream');
  });
});
