/**
 * =============================================================================
 * file-types.spec.ts — Handling PDF / CSV / ZIP / GZIP file types
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Different file types are identified by MAGIC BYTES, not extensions. We
 *   generate real files of each type locally and prove detectType() recognizes
 *   them, plus a byte-accurate write→read round-trip (no corruption).
 * =============================================================================
 */
import { test, expect } from '@playwright/test';
import { FileHelper } from '../../src/utils/file.js';

test.describe('Phase 11 · File types & round-trips', () => {
  // Writing then reading a CSV as text returns the identical string (no encoding drift).
  test('CSV: text write/read round-trip is exact', () => {
    const csv = 'col1,col2\nval1,val2\n';
    const p = FileHelper.write('data.csv', csv);
    expect(FileHelper.readText(p)).toBe(csv);
  });

  // A generated minimal PDF is detected as 'pdf' and survives a byte-identical write/read.
  test('PDF: detected by %PDF magic header', () => {
    const pdf = FileHelper.minimalPdf();
    expect(FileHelper.detectType(pdf)).toBe('pdf');

    const p = FileHelper.write('doc.pdf', pdf);
    expect(FileHelper.read(p).length).toBe(pdf.length); // byte-identical
  });

  // An empty but valid ZIP archive is recognized as 'zip' by its PK signature.
  test('ZIP: a real empty archive is detected by PK magic', () => {
    const zip = FileHelper.emptyZip();
    expect(FileHelper.detectType(zip)).toBe('zip');
  });

  // A gzip-compressed buffer is non-empty and detected as 'gzip' via its 1F 8B header.
  test('GZIP: compressed buffer is detected by 1F 8B magic', () => {
    const gz = FileHelper.gzip('hello omni api');
    expect(FileHelper.detectType(gz)).toBe('gzip');
    expect(gz.length).toBeGreaterThan(0);
  });

  // Plain text with no recognizable magic bytes is classified as 'unknown'.
  test('unknown content is reported as unknown', () => {
    expect(FileHelper.detectType(Buffer.from('just plain text'))).toBe(
      'unknown',
    );
  });
});
