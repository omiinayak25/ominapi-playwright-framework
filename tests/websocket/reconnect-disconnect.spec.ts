/**
 * =============================================================================
 * reconnect-disconnect.spec.ts — Resilience: reconnect & clean disconnect
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   WebSockets must handle drops. We verify:
 *     - clean DISCONNECT: close() leaves the socket not-open; sending then throws.
 *     - RECONNECT: after a server-side drop, reconnect() restores messaging
 *       (and the server sees a second connection).
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';

test.describe('Phase 16 · Disconnect & reconnect', () => {
  test('clean disconnect closes the socket', async ({ ws }) => {
    const { client } = ws;
    await client.connect();
    expect(client.isOpen()).toBe(true);

    await client.close();
    expect(client.isOpen()).toBe(false);
  });

  test('sending after close throws a clear error', async ({ ws }) => {
    const { client } = ws;
    await client.connect();
    await client.close();
    expect(() => client.send('too late')).toThrow(/not open/);
  });

  test('reconnect restores messaging after a server-side drop', async ({
    ws,
  }) => {
    const { server, client } = ws;
    await client.connect();
    client.send('first');
    expect(await client.waitForMessage()).toBe('echo:first');

    // Server forcibly drops the connection.
    server.dropConnections();

    // Client reconnects and messaging works again.
    await client.reconnect();
    expect(client.isOpen()).toBe(true);
    client.send('second');
    expect(await client.waitForMessage()).toBe('echo:second');

    // Two distinct connections were accepted.
    expect(server.connectionCount).toBe(2);
  });
});
