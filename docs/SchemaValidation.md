# Schema Validation — AJV, SchemaValidator Singleton, and JSON Schema Contracts

> **Modules:** `src/validators/schema.validator.ts` · `src/schemas/*.ts` · `src/validators/index.ts`
> **Repo:** <https://github.com/omiinayak25/ominapi-playwright-framework>

---

## Overview

JSON Schema validation with AJV is the framework's primary defense against API
drift. A single `validator.validate(schema, res.body)` call checks an entire
response body's structure, types, required fields, and format constraints — far
more thorough than field-by-field `expect` assertions.

Three schema files define the contracts:

| File                            | Schema export(s)                       | AJV type               | `additionalProperties` |
| ------------------------------- | -------------------------------------- | ---------------------- | ---------------------- |
| `src/schemas/post.schema.ts`    | `postSchema`, `postArraySchema`        | `JSONSchemaType<Post>` | `false` — strict       |
| `src/schemas/booking.schema.ts` | `bookingSchema`, `bookingStrictSchema` | `SchemaObject`         | `false` — strict       |
| `src/schemas/product.schema.ts` | `productSchema`                        | `SchemaObject`         | `true` — permissive    |

---

## Purpose

- **Catch API drift early**: a missing field or type change fails the validation
  run before any downstream assertion fires.
- **Single-call coverage**: one schema check replaces dozens of `expect(x).toBe()`
  calls on individual fields.
- **Compile-time safety** (`JSONSchemaType<T>`): the TypeScript build fails if the
  schema disagrees with the model interface — the code and the contract cannot
  silently diverge.
- **Performance**: AJV compiles each schema once; subsequent validations on the
  same schema reference are near-instant (see Singleton + Cache below).

---

## Architecture

```
src/schemas/
  ├── post.schema.ts      – JSONSchemaType<Post>  (strict, compile-time coupled)
  ├── booking.schema.ts   – SchemaObject          (permissive optional/nested)
  ├── product.schema.ts   – SchemaObject          (permissive third-party API)
  └── index.ts            – barrel export

src/validators/
  ├── schema.validator.ts – SchemaValidator (Singleton + compiled-schema cache)
  ├── response.validator.ts – expectMatchesSchema (calls SchemaValidator)
  └── index.ts            – barrel export

tests/schema/
  └── json-schema.spec.ts – real responses + drift detection
```

---

## SchemaValidator — Singleton + Cache

```mermaid
flowchart TD
    A[Test / helper calls SchemaValidator.getInstance] --> B{instance exists?}
    B -->|no| C[new SchemaValidator\nAjv allErrors:true strict:false\naddFormats]
    B -->|yes| D[Return existing instance]
    C --> D
    D --> E[validate schema data]
    E --> F{schema in cache?}
    F -->|no| G[ajv.compile schema\ncache.set schema validateFn]
    F -->|yes| H[cache.get schema → validateFn]
    G & H --> I[validateFn data]
    I -->|true| J[{ valid: true, errors: [] }]
    I -->|false| K[Map errors to instancePath + message strings]
    K --> L[{ valid: false, errors: string[] }]
```

### Why Singleton?

One `Ajv` instance and one cache are shared across the entire test process.
`ajv.compile()` is non-trivial (it builds a compiled validator function); doing
it once per process per schema reference keeps validation fast even when the
same schema is used in dozens of tests.

### Key configuration choices

```typescript
// src/validators/schema.validator.ts
this.ajv = new Ajv({
  allErrors: true, // collect ALL violations, not just the first
  strict: false, // tolerate vendor/third-party keywords in schemas we don't own
});
addFormats(this.ajv); // enable "date", "email", "uri", "date-time", etc.
```

### Cache key

The cache is a `Map<AnySchema, ValidateFunction>` keyed by **object reference**.
Module-level schema constants (e.g. `postSchema`) are stable references, so they
hit the cache on every reuse.

---

## `JSONSchemaType<T>` vs `SchemaObject` — When and Why

### `JSONSchemaType<Post>` — strict, compile-time coupled

Used in `post.schema.ts` because the `Post` model is a clean flat interface with
no optional fields and no nesting. AJV's generic type cross-checks the schema
structure against the TypeScript interface at build time:

```typescript
// src/schemas/post.schema.ts
import type { JSONSchemaType } from 'ajv';
import type { Post } from '../models/post.model.js';

export const postSchema: JSONSchemaType<Post> = {
  type: 'object',
  required: ['id', 'userId', 'title', 'body'],
  additionalProperties: false, // reject unexpected fields
  properties: {
    id: { type: 'integer' },
    userId: { type: 'integer' },
    title: { type: 'string' },
    body: { type: 'string' },
  },
};
```

If someone adds a field to `Post` but forgets to add it to `postSchema`, the
TypeScript compiler errors — the model and the contract stay in sync.

**Do NOT use `JSONSchemaType<T>` when:**

- The model has optional fields (`exactOptionalPropertyTypes` causes friction)
- The model has deeply nested objects (complex generics, verbose type errors)
- You don't own the schema (third-party APIs with extra fields)

### `SchemaObject` — flexible, runtime-only

Used in `booking.schema.ts` and `product.schema.ts`. No compile-time model
coupling, which removes friction for optional fields and nested objects.

---

## Schema Definitions

### `postSchema` / `postArraySchema`

```typescript
// Strict: all four fields required, no extras allowed
export const postSchema: JSONSchemaType<Post> = {
  type: 'object',
  required: ['id', 'userId', 'title', 'body'],
  additionalProperties: false,
  properties: {
    id: { type: 'integer' },
    userId: { type: 'integer' },
    title: { type: 'string' },
    body: { type: 'string' },
  },
};

export const postArraySchema: JSONSchemaType<Post[]> = {
  type: 'array',
  items: postSchema, // validates every element
};
```

### `bookingSchema` — permissive base

```typescript
// Optional field (additionalneeds) + nested object (bookingdates)
export const bookingSchema: SchemaObject = {
  type: 'object',
  required: [
    'firstname',
    'lastname',
    'totalprice',
    'depositpaid',
    'bookingdates',
  ],
  additionalProperties: false,
  properties: {
    firstname: { type: 'string' },
    lastname: { type: 'string' },
    totalprice: { type: 'number' },
    depositpaid: { type: 'boolean' },
    bookingdates: {
      type: 'object',
      required: ['checkin', 'checkout'],
      additionalProperties: false,
      properties: {
        checkin: { type: 'string' },
        checkout: { type: 'string' },
      },
    },
    additionalneeds: { type: 'string' }, // optional — not in `required`
  },
};
```

### `bookingStrictSchema` — constraints for negative/boundary testing

Adds `minLength`, `maxLength`, `minimum`, `maximum`, and `format: 'date'`
constraints that the permissive demo API accepts but your contract should reject:

```typescript
export const bookingStrictSchema: SchemaObject = {
  // same shape as bookingSchema but with value constraints:
  properties: {
    firstname: { type: 'string', minLength: 1, maxLength: 50 },
    lastname: { type: 'string', minLength: 1, maxLength: 50 },
    totalprice: { type: 'integer', minimum: 1, maximum: 100000 },
    depositpaid: { type: 'boolean' },
    bookingdates: {
      type: 'object',
      required: ['checkin', 'checkout'],
      additionalProperties: false,
      properties: {
        checkin: { type: 'string', format: 'date' },
        checkout: { type: 'string', format: 'date' },
      },
    },
    additionalneeds: { type: 'string' },
  },
  required: [
    'firstname',
    'lastname',
    'totalprice',
    'depositpaid',
    'bookingdates',
  ],
  additionalProperties: false,
};
```

`bookingStrictSchema` is used in negative and boundary test suites where the
test data is under our control and MUST be rejected by the schema.

### `productSchema` — permissive (`additionalProperties: true`)

```typescript
// DummyJSON returns rating, tags, images, reviews, meta, ... — we don't assert on all of them
export const productSchema: SchemaObject = {
  type: 'object',
  required: ['id', 'title', 'price', 'description', 'category', 'stock'],
  additionalProperties: true, // tolerate the many fields we don't depend on
  properties: {
    id: { type: 'integer' },
    title: { type: 'string' },
    price: { type: 'number' },
    description: { type: 'string' },
    category: { type: 'string' },
    stock: { type: 'integer' },
  },
};
```

---

## `additionalProperties` Trade-off

| Setting             | Use case                                                   | Risk                                                         |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| `false` (strict)    | Your own API, known stable response shape                  | Schema must be updated when the API legitimately adds fields |
| `true` (permissive) | Third-party APIs, partial contracts, large response shapes | Extra fields can leak sensitive data without detection       |

**Rule of thumb:**

- Own API or finite, stable contract → `additionalProperties: false`
- Third-party API you don't control → `additionalProperties: true` with
  explicit required fields for the subset you rely on

---

## Drift Detection

The schema layer catches drift that field-by-field assertions miss:

```typescript
// tests/schema/json-schema.spec.ts

test('DRIFT DETECTION — wrong types & missing fields are rejected', () => {
  const validator = SchemaValidator.getInstance();

  const drifted = {
    id: 1,
    userId: 1,
    title: 'ok',
    body: 12345, // WRONG: should be string
  };

  const result = validator.validate(postSchema, drifted);
  expect(result.valid).toBe(false);
  expect(result.errors.join(' ')).toContain('/body');
  // Error message: "/body must be type string"
});

test('DRIFT DETECTION — unexpected extra field is rejected', () => {
  const result = SchemaValidator.getInstance().validate(postSchema, {
    id: 1,
    userId: 1,
    title: 'ok',
    body: 'ok',
    hacker: 'unexpected', // additionalProperties:false rejects this
  });
  expect(result.valid).toBe(false);
});
```

---

## `expectMatchesSchema` Integration

`expectMatchesSchema` in `response.validator.ts` calls `SchemaValidator`
internally and wraps the result in a Playwright `expect`:

```typescript
// src/validators/response.validator.ts
export function expectMatchesSchema(res: ApiResponse, schema: AnySchema): void {
  const { valid, errors } = SchemaValidator.getInstance().validate(
    schema,
    res.body,
  );
  expect(
    valid,
    `Body failed schema validation:\n  - ${errors.join('\n  - ')}`,
  ).toBe(true);
}
```

Usage in tests:

```typescript
import { expectMatchesSchema } from '../../src/validators/index.js';
import { postSchema } from '../../src/schemas/index.js';

test('a real post conforms to postSchema', async ({ posts }) => {
  const res = await posts.getById(1);
  expectMatchesSchema(res, postSchema); // one call validates the whole body
});

test('the posts collection conforms to postArraySchema', async ({ posts }) => {
  const res = await posts.getAll();
  expectMatchesSchema(res, postArraySchema); // validates every item in the array
});
```

For nested responses (e.g. `{ booking: {...} }`) call `SchemaValidator` directly:

```typescript
test('a created booking conforms to bookingSchema', async ({ booker }) => {
  const res = await booker.post<CreateBookingResponse>('/booking', {
    data: BookingFactory.valid(),
  });
  const validator = SchemaValidator.getInstance();
  const result = validator.validate(bookingSchema, res.body.booking);
  expect(result.valid, result.errors.join('; ')).toBe(true);
});
```

---

## Best Practices

- **Always import schemas from the barrel** (`src/schemas/index.js`) so they
  remain stable references and benefit from the `SchemaValidator` cache.
- **Prefer `JSONSchemaType<T>` for your own models** — the compile-time coupling
  is a free regression test for model/schema drift.
- **Use `SchemaObject` for optional, nested, or third-party schemas** — avoid
  fighting the type system when the model isn't a clean flat interface.
- **Use `bookingStrictSchema` for negative tests** — add `minLength`, `minimum`,
  `format` constraints that deterministically reject boundary violations.
- **Read all errors, not just the first**: `allErrors: true` is set globally, and
  `result.errors.join('; ')` in the `expect` message surfaces every violation.
- **Do not create inline schema objects inside tests** — they create a new
  reference on every call, bypassing the cache. Always define schemas as module-
  level constants.

---

## Common Mistakes

| Mistake                                                                      | Fix                                                                                                    |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Defining the schema inside the test function                                 | Define as a module-level `const`; inline objects bypass the compiled-schema cache                      |
| Using `JSONSchemaType<T>` for a model with `readonly` optional fields        | Switch to `SchemaObject`; `exactOptionalPropertyTypes` causes friction                                 |
| Setting `additionalProperties: false` on a third-party API you don't control | Use `true` and enumerate only the required subset                                                      |
| Not calling `addFormats` and then using `format: 'date'`                     | The singleton constructor already calls `addFormats`; just declare `format` in the schema              |
| Missing the `format: 'date'` keyword when date strings must be validated     | Use `bookingStrictSchema` pattern: add `format: 'date'` to checkin/checkout                            |
| Forgetting `type: 'array', items: ...` for collection endpoints              | Define a separate array schema (e.g. `postArraySchema`) rather than asserting `Array.isArray` manually |

---

## Real Project Usage

| Test file                                   | Schema used                                                       | What is validated                         |
| ------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| `tests/schema/json-schema.spec.ts`          | `postSchema`, `postArraySchema`, `productSchema`, `bookingSchema` | Real responses + deliberate drift objects |
| `tests/crud/posts.crud.spec.ts`             | (inline expect + `expectMatchesSchema`)                           | CRUD response structure                   |
| `tests/crud/products.crud.spec.ts`          | `productSchema` via `expectMatchesSchema`                         | DummyJSON product shape                   |
| `tests/contract/openapi-validation.spec.ts` | Schema extracted from OpenAPI spec                                | Live provider + mocked drift              |
| `tests/negative/payload-validation.spec.ts` | `bookingStrictSchema`                                             | Boundary / negative payloads              |

---

## Interview Questions

1. **Why is `SchemaValidator` a Singleton?**
   `ajv.compile()` is expensive (it builds a validator function). The Singleton
   ensures one `Ajv` instance and one compiled-schema cache exist for the entire
   process. Each schema reference compiles exactly once.

2. **How does the schema cache work?**
   `Map<AnySchema, ValidateFunction>` keyed by object reference. Module-level
   schema constants are stable references, so `cache.get(postSchema)` hits after
   the first compile. Inline schema objects would create a new reference on every
   call and miss the cache.

3. **When should you use `JSONSchemaType<T>` vs `SchemaObject`?**
   `JSONSchemaType<T>` when: (a) the model is a clean flat interface, (b) you
   want compile-time coupling, (c) no optional fields cause `exactOptionalProperty
Types` friction. `SchemaObject` otherwise: optional fields, nested objects,
   third-party APIs.

4. **What does `additionalProperties: false` protect against?**
   It rejects responses that contain fields not declared in `properties`. This
   catches (a) API leaks of sensitive fields and (b) undeclared new fields that
   consumers might start relying on without a contract update.

5. **How does `allErrors: true` help debugging?**
   Without it, AJV stops at the first validation error. `allErrors: true` collects
   every violation; they are all surfaced in the failure message as a list,
   pinpointing all problems in a single test run.

6. **Why does `bookingStrictSchema` exist separately from `bookingSchema`?**
   `bookingSchema` reflects what the live API actually returns (lenient, no value
   constraints). `bookingStrictSchema` adds `minLength`, `minimum`, and
   `format: 'date'` constraints for deterministic boundary/negative testing where
   the test data is under our control.

---

## References

- [`src/validators/schema.validator.ts`](../src/validators/schema.validator.ts)
- [`src/schemas/post.schema.ts`](../src/schemas/post.schema.ts)
- [`src/schemas/booking.schema.ts`](../src/schemas/booking.schema.ts)
- [`src/schemas/product.schema.ts`](../src/schemas/product.schema.ts)
- [`src/schemas/index.ts`](../src/schemas/index.ts)
- [`src/models/post.model.ts`](../src/models/post.model.ts)
- [`tests/schema/json-schema.spec.ts`](../tests/schema/json-schema.spec.ts)

---

## Related Modules

- [Validation.md](Validation.md) — response assertion helpers including `expectMatchesSchema`
- [ContractTesting.md](ContractTesting.md) — OpenAPI contract uses `SchemaValidator` for live validation
- [`src/validators/response.validator.ts`](../src/validators/response.validator.ts) — `expectMatchesSchema` wrapper
- [`src/utils/openapi.ts`](../src/utils/openapi.ts) — extracts schemas from OpenAPI specs for use with `SchemaValidator`
