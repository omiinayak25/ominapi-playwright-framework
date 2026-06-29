/**
 * =============================================================================
 * secrets-errors.spec.ts — Secrets management & typed errors
 * -----------------------------------------------------------------------------
 * WHAT WE VERIFY:
 *   - SecretsManager reads from env, fails fast on missing required secrets, and
 *     MASKS values for safe logging.
 *   - ApiError carries status/path/body and is identifiable via instanceof.
 * =============================================================================
 */
import { test, expect } from '@playwright/test';
import { SecretsManager } from '../../src/config/secrets.js';
import { ApiError, CircuitOpenError } from '../../src/utils/errors.js';

test.describe('Phase 20 · Secrets management', () => {
  const secrets = SecretsManager.getInstance();

  // A secret present in env is returned; a missing required secret throws, while getOptional yields undefined instead.
  test('reads a present secret and fails fast on a missing one', () => {
    process.env.OMNI_TEST_SECRET = 'super-secret-value';
    expect(secrets.get('OMNI_TEST_SECRET')).toBe('super-secret-value');
    delete process.env.OMNI_TEST_SECRET;

    expect(() => secrets.get('DEFINITELY_MISSING_SECRET')).toThrow(
      /Missing required secret/,
    );
    expect(secrets.getOptional('DEFINITELY_MISSING_SECRET')).toBeUndefined();
  });

  // mask() keeps only the edges of long values, fully hides short ones, and never leaks the middle of the secret.
  test('masks secrets for safe logging', () => {
    expect(secrets.mask('abcdefgh')).toBe('ab***gh');
    expect(secrets.mask('xy')).toBe('****'); // too short -> fully masked
    // The full value never appears in the masked form.
    expect(secrets.mask('topsecret')).not.toContain('psecr');
  });
});

test.describe('Phase 20 · Typed errors', () => {
  // ApiError is a real Error/ApiError instance and exposes the status, path, and body it was constructed with.
  test('ApiError carries context and is identifiable', () => {
    const err = new ApiError('not found', 404, '/widgets/9', { error: 'nope' });
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(err.path).toBe('/widgets/9');
    expect(err.body).toEqual({ error: 'nope' });
  });

  // CircuitOpenError is a distinct error subtype with its own name, so callers can branch on it.
  test('CircuitOpenError is its own type', () => {
    const err = new CircuitOpenError();
    expect(err).toBeInstanceOf(CircuitOpenError);
    expect(err.name).toBe('CircuitOpenError');
  });
});
