/**
 * =============================================================================
 * payload-validation.spec.ts — Contract-layer negative testing
 * -----------------------------------------------------------------------------
 * WHY VALIDATE AT THE CONTRACT LAYER:
 *   Public demo APIs are PERMISSIVE — they accept nulls, empty strings, and
 *   wrong types without complaint. Asserting "the API returns 400" against them
 *   would flake. So we test our CONTRACT deterministically: a strict JSON Schema
 *   that defines what "valid" means, and we prove every malformed payload is
 *   rejected with a precise error. (Against YOUR OWN strict API, the same
 *   payloads would also be rejected server-side.)
 *
 * COVERS: missing fields, nulls, empty values, wrong types, boundary values.
 * =============================================================================
 */
import { test, expect } from '@playwright/test';
import { SchemaValidator } from '../../src/validators/index.js';
import { bookingStrictSchema } from '../../src/schemas/index.js';
import {
  BookingFactory,
  NegativeBookingFactory,
  BookingBuilder,
} from '../../src/builders/index.js';

const validator = SchemaValidator.getInstance();
const isValid = (data: unknown): boolean =>
  validator.validate(bookingStrictSchema, data).valid;

test.describe('Phase 9 · Contract-layer negative payloads', () => {
  // Positive baseline: a clean, in-range booking validates true, so the
  // rejection cases below can be trusted as real failures.
  test('a valid booking passes the strict schema', () => {
    // BookingFactory prices can exceed the strict max; clamp for this baseline.
    const ok = BookingBuilder.aBooking().withTotalPrice(150).build();
    expect(isValid(ok)).toBe(true);
  });

  // A payload omitting required fields must fail the schema's `required` rule.
  test('MISSING required fields is rejected', () => {
    expect(isValid(NegativeBookingFactory.missingRequired())).toBe(false);
  });

  // Nulls violate the typed fields; expect invalid AND that the error names the
  // offending field(s), proving the validator pinpoints the cause.
  test('NULL values are rejected', () => {
    const result = validator.validate(
      bookingStrictSchema,
      NegativeBookingFactory.withNulls(),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/lastname|totalprice/);
  });

  // Empty strings pass type checks but violate minLength; expect rejection.
  test('EMPTY string values are rejected (minLength)', () => {
    expect(isValid(NegativeBookingFactory.withEmptyStrings())).toBe(false);
  });

  // Type mismatches (e.g. string where number expected) must fail; expect the
  // error to reference the mistyped field(s).
  test('WRONG types are rejected', () => {
    const result = validator.validate(
      bookingStrictSchema,
      NegativeBookingFactory.withWrongTypes(),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/totalprice|depositpaid/);
  });

  // Values just outside the allowed range (over max / under min) must fail the
  // numeric bounds.
  test('BOUNDARY: price over max and under min are rejected', () => {
    expect(isValid(NegativeBookingFactory.overMaxPrice())).toBe(false);
    expect(isValid(NegativeBookingFactory.underMinPrice())).toBe(false);
  });

  // The inclusive boundaries themselves must pass — bounds are min/max, not
  // exclusive limits.
  test('BOUNDARY: edge values (min=1, max=100000) are accepted', () => {
    const atMin = BookingBuilder.aBooking().withTotalPrice(1).build();
    const atMax = BookingBuilder.aBooking().withTotalPrice(100_000).build();
    expect(isValid(atMin)).toBe(true);
    expect(isValid(atMax)).toBe(true);
  });

  // An otherwise-valid payload with one extra field must fail because the
  // schema forbids unknown properties — guards against payload tampering.
  test('an unexpected extra field is rejected (additionalProperties:false)', () => {
    const tampered = {
      ...BookingFactory.minimal(),
      totalprice: 100,
      hacker: 1,
    };
    expect(isValid(tampered)).toBe(false);
  });
});
