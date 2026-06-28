/**
 * =============================================================================
 * contract-diff.ts — Backward-compatibility / breaking-change detection
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   When an API evolves, some schema changes are SAFE for existing consumers
 *   (adding an optional field) and some are BREAKING (removing a field, changing
 *   a type, dropping a field from `required`). This detects breaking changes
 *   between two versions of a RESPONSE schema — the basis of version validation.
 *
 * PERSPECTIVE — response (consumer) contract:
 *   For responses, consumers rely on fields EXISTING with stable types. So:
 *     - removed field        -> BREAKING (consumer code reading it breaks)
 *     - type changed         -> BREAKING
 *     - required -> optional -> BREAKING (field may now be absent unexpectedly)
 *     - new field added      -> SAFE (consumers ignore unknown fields)
 * =============================================================================
 */
import type { SchemaObject } from 'ajv';

export interface BreakingChange {
  readonly kind: 'removed-field' | 'type-changed' | 'required-removed';
  readonly field: string;
  readonly detail: string;
}

type Props = Record<string, { type?: unknown }>;

/** Compare two object schemas and list breaking changes (old -> new). */
export function detectBreakingChanges(
  oldSchema: SchemaObject,
  newSchema: SchemaObject,
): BreakingChange[] {
  const changes: BreakingChange[] = [];
  const oldProps = (oldSchema.properties ?? {}) as Props;
  const newProps = (newSchema.properties ?? {}) as Props;
  const oldRequired = (oldSchema.required ?? []) as string[];
  const newRequired = (newSchema.required ?? []) as string[];

  for (const [name, oldProp] of Object.entries(oldProps)) {
    const newProp = newProps[name];
    if (!newProp) {
      changes.push({
        kind: 'removed-field',
        field: name,
        detail: `field "${name}" was removed`,
      });
      continue;
    }
    if (oldProp.type !== newProp.type) {
      changes.push({
        kind: 'type-changed',
        field: name,
        detail: `field "${name}" type changed: ${String(oldProp.type)} -> ${String(newProp.type)}`,
      });
    }
  }

  for (const req of oldRequired) {
    if (!newRequired.includes(req) && req in newProps) {
      changes.push({
        kind: 'required-removed',
        field: req,
        detail: `field "${req}" is no longer required`,
      });
    }
  }

  return changes;
}

/** True when evolving old -> new introduces NO breaking changes. */
export function isBackwardCompatible(
  oldSchema: SchemaObject,
  newSchema: SchemaObject,
): boolean {
  return detectBreakingChanges(oldSchema, newSchema).length === 0;
}
