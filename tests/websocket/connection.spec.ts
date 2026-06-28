/**
 * =============================================================================
 * connection.spec.ts — WebSocket connection lifecycle
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Unlike REST, a WebSocket has a persistent CONNECTION with open/close states.
 *   We assert the client opens successfully and the server registers the
 *   connection.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';

test.describe('Phase 16 · WebSocket connection', () => {
  test('client connects and the server registers the connection', async ({
    ws,
  }) => {
    const { server, client } = ws;

    expect(client.isOpen()).toBe(false);
    await client.connect();

    expect(client.isOpen()).toBe(true);
    expect(server.connectionCount).toBe(1);
  });

  test('connecting to a dead port rejects', async ({ ws }) => {
    // Stop the server so the port is closed, then attempt to connect.
    await ws.server.stop();
    await expect(ws.client.connect(1500)).rejects.toThrow();
  });
});
