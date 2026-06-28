/**
 * =============================================================================
 * messaging.spec.ts — Sending & receiving messages
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Messages flow asynchronously. The client's buffer+waiter design lets a test
 *   send then await the echo without races. We cover text and JSON payloads, and
 *   ordered multi-message exchange.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';

test.describe('Phase 16 · WebSocket messaging', () => {
  test('text message round-trips (echo)', async ({ ws }) => {
    const { client } = ws;
    await client.connect();

    client.send('hello');
    const reply = await client.waitForMessage();
    expect(reply).toBe('echo:hello');
  });

  test('JSON message round-trips', async ({ ws }) => {
    const { client } = ws;
    await client.connect();

    client.send({ type: 'ping', seq: 1 });
    const reply = await client.waitForMessage();
    // Server echoes "echo:" + the JSON string we sent.
    expect(reply).toBe('echo:{"type":"ping","seq":1}');
  });

  test('multiple messages are received in order', async ({ ws }) => {
    const { client } = ws;
    await client.connect();

    client.send('a');
    client.send('b');
    client.send('c');

    expect(await client.waitForMessage()).toBe('echo:a');
    expect(await client.waitForMessage()).toBe('echo:b');
    expect(await client.waitForMessage()).toBe('echo:c');
  });

  test('server records what it received', async ({ ws }) => {
    const { server, client } = ws;
    await client.connect();

    client.send('spy-me');
    await client.waitForMessage();
    expect(server.received).toContain('spy-me');
  });
});
