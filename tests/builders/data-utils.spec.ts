/**
 * =============================================================================
 * data-utils.spec.ts — UUID & date helpers
 * -----------------------------------------------------------------------------
 * WHAT THIS PROVES:
 *   - uuid() is well-formed and unique across calls.
 *   - randomInt() respects inclusive bounds.
 *   - date helpers format as yyyy-mm-dd and order correctly (future > today).
 * =============================================================================
 */
import { test, expect } from '@playwright/test';
import { uuid, randomInt, pickOne } from '../../src/utils/random.js';
import {
  toIsoDate,
  futureIso,
  todayIso,
  addDays,
} from '../../src/utils/date.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Suite: unit tests for the random and date helper utilities.
test.describe('Phase 5 · Data utilities', () => {
  // Scenario: generate two uuids.
  // Expected: each matches the v4 pattern and the two differ (uniqueness).
  test('uuid() produces unique, RFC-4122 v4 ids', () => {
    const a = uuid();
    const b = uuid();
    expect(a).toMatch(UUID_V4);
    expect(a).not.toBe(b);
  });

  // Scenario: sample randomInt(1, 6) many times to probe boundary behavior.
  // Expected: every result stays within [1, 6] inclusive.
  test('randomInt() respects inclusive bounds', () => {
    for (let i = 0; i < 50; i++) {
      const n = randomInt(1, 6);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(6);
    }
  });

  // Scenario: pick from a known array.
  // Expected: the returned value is a member of the source array.
  test('pickOne() returns an element from the array', () => {
    const items = ['a', 'b', 'c'] as const;
    expect(items).toContain(pickOne(items));
  });

  // Scenario: format helpers for today, a future date, and an explicit date.
  // Expected: yyyy-mm-dd output, and toIsoDate strips the time component.
  test('date helpers format as yyyy-mm-dd', () => {
    expect(todayIso()).toMatch(ISO_DATE);
    expect(futureIso(7)).toMatch(ISO_DATE);
    expect(toIsoDate(new Date('2026-07-01T12:00:00Z'))).toBe('2026-07-01');
  });

  // Scenario: add 5 days to a base date.
  // Expected: result advances correctly AND the original Date is left unmodified.
  test('addDays() advances the date correctly without mutating input', () => {
    const base = new Date('2026-07-01T00:00:00Z');
    const later = addDays(base, 5);
    expect(toIsoDate(later)).toBe('2026-07-06');
    expect(toIsoDate(base)).toBe('2026-07-01'); // original untouched
  });

  // Scenario: compare a future ISO date to today's.
  // Expected: lexical comparison confirms future > today (ISO sorts chronologically).
  test('futureIso() is strictly after todayIso()', () => {
    expect(futureIso(10) > todayIso()).toBe(true);
  });
});
