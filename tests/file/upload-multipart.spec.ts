/**
 * =============================================================================
 * upload-multipart.spec.ts — Multipart file upload
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   File uploads use multipart/form-data: one request carrying file part(s) plus
 *   scalar fields. We build the file part with a filename + MIME type + bytes and
 *   prove the server received the exact content (httpbingo echoes it back).
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { FileHelper } from '../../src/utils/file.js';
import { HttpStatus } from '../../src/constants/http-status.js';

// httpbingo echoes uploaded files and fields as arrays of strings.
interface UploadEcho {
  files: Record<string, string[]>;
  form: Record<string, string[]>;
}

test.describe('Phase 11 · Multipart upload', () => {
  // POST a CSV file plus a scalar field as multipart; the echo server returns both, proving exact byte round-trip.
  test('uploads a CSV file and a field; server receives exact content', async ({
    httpbin,
  }) => {
    const csv = 'id,name\n1,alice\n2,bob\n';
    const filePath = FileHelper.write('upload.csv', csv);
    const buffer = FileHelper.read(filePath);

    const res = await httpbin.post<UploadEcho>('/post', {
      multipart: {
        file: { name: 'upload.csv', mimeType: 'text/csv', buffer },
        description: 'omni-upload',
      },
    });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.files.file?.[0]).toBe(csv); // exact bytes round-tripped
    expect(res.body.form.description?.[0]).toBe('omni-upload');
  });

  // Binary (PNG) bytes upload cleanly as a multipart file part; the server confirms it received the part.
  test('uploads binary image bytes via multipart', async ({ httpbin }) => {
    // A tiny PNG-headed buffer stands in for an image file.
    const pngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    FileHelper.write('pixel.png', pngBytes);

    const res = await httpbin.post<UploadEcho>('/post', {
      multipart: {
        image: { name: 'pixel.png', mimeType: 'image/png', buffer: pngBytes },
      },
    });

    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.files.image).toBeDefined(); // server received the file part
  });
});
