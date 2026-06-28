/**
 * =============================================================================
 * validation.spec.ts — Validating WebSocket message shape (JSON Schema)
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Streamed messages deserve the same contract rigor as REST bodies. We parse a
 *   received JSON message and validate it against a JSON Schema (reusing the AJV
 *   SchemaValidator from Phase 6).
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { SchemaValidator } from '../../src/validators/index.js';
import type { SchemaObject } from 'ajv';

const messageSchema: SchemaObject = {
  type: 'object',
  required: ['type', 'seq'],
  additionalProperties: true,
  properties: {
    type: { type: 'string' },
    seq: { type: 'integer' },
  },
};

test.describe('Phase 16 · WebSocket message validation', () => {
  test('a received JSON message conforms to its schema', async ({ ws }) => {
    const { client } = ws;
    await client.connect();

    client.send({ type: 'event', seq: 7 });
    const reply = await client.waitForMessage();

    // Strip the server's "echo:" prefix to recover the JSON payload.
    const json = reply.replace(/^echo:/, '');
    const parsed = JSON.parse(json) as unknown;

    const result = SchemaValidator.getInstance().validate(
      messageSchema,
      parsed,
    );
    expect(result.valid, result.errors.join('; ')).toBe(true);
  });

  test('an invalid message shape is detected', async ({ ws }) => {
    const { client } = ws;
    await client.connect();

    client.send({ type: 'event' }); // missing required `seq`
    const reply = await client.waitForMessage();
    const parsed = JSON.parse(reply.replace(/^echo:/, '')) as unknown;

    const result = SchemaValidator.getInstance().validate(
      messageSchema,
      parsed,
    );
    expect(result.valid).toBe(false);
  });
});
