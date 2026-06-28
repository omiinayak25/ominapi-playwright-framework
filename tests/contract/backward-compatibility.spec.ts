/**
 * =============================================================================
 * backward-compatibility.spec.ts — Detecting breaking vs safe schema changes
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   API evolution must not break existing consumers. We diff an old vs new
 *   response schema and classify the change. Adding an optional field is SAFE;
 *   removing a field, changing a type, or dropping a field from `required` is
 *   BREAKING.
 * =============================================================================
 */
import { test, expect } from '@playwright/test';
import type { SchemaObject } from 'ajv';
import {
  detectBreakingChanges,
  isBackwardCompatible,
} from '../../src/utils/contract-diff.js';

const v1: SchemaObject = {
  type: 'object',
  required: ['id', 'name'],
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    price: { type: 'number' },
  },
};

test.describe('Phase 17 · Backward compatibility', () => {
  test('adding a new optional field is backward COMPATIBLE', () => {
    const v2: SchemaObject = {
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        price: { type: 'number' },
        discount: { type: 'number' }, // NEW optional field
      },
    };
    expect(isBackwardCompatible(v1, v2)).toBe(true);
    expect(detectBreakingChanges(v1, v2)).toHaveLength(0);
  });

  test('removing a field is BREAKING', () => {
    const v2: SchemaObject = {
      type: 'object',
      required: ['id', 'name'],
      properties: { id: { type: 'integer' }, name: { type: 'string' } }, // price removed
    };
    const changes = detectBreakingChanges(v1, v2);
    expect(isBackwardCompatible(v1, v2)).toBe(false);
    expect(
      changes.some((c) => c.kind === 'removed-field' && c.field === 'price'),
    ).toBe(true);
  });

  test('changing a field type is BREAKING', () => {
    const v2: SchemaObject = {
      type: 'object',
      required: ['id', 'name'],
      properties: {
        id: { type: 'string' }, // integer -> string
        name: { type: 'string' },
        price: { type: 'number' },
      },
    };
    const changes = detectBreakingChanges(v1, v2);
    expect(
      changes.some((c) => c.kind === 'type-changed' && c.field === 'id'),
    ).toBe(true);
  });

  test('dropping a field from required is BREAKING', () => {
    const v2: SchemaObject = {
      type: 'object',
      required: ['id'], // name no longer required
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        price: { type: 'number' },
      },
    };
    const changes = detectBreakingChanges(v1, v2);
    expect(
      changes.some((c) => c.kind === 'required-removed' && c.field === 'name'),
    ).toBe(true);
  });
});
