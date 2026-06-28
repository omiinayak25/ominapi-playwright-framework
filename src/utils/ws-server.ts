/**
 * =============================================================================
 * ws-server.ts — MockWebSocketServer (in-process echo WebSocket server)
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Deterministic, offline WebSocket tests need a controllable server. This one
 *   ECHOES messages by default, records what it receives, counts connections
 *   (for reconnect assertions), and can forcibly drop clients (to simulate a
 *   server-side disconnect).
 * =============================================================================
 */
import { WebSocketServer, type WebSocket as WsSocket } from 'ws';
import type { AddressInfo } from 'node:net';

export class MockWebSocketServer {
  private wss: WebSocketServer | undefined;
  private port = 0;
  private readonly sockets = new Set<WsSocket>();

  /** Every text message the server received (spy). */
  public readonly received: string[] = [];
  /** Total number of connections accepted (for reconnect assertions). */
  public connectionCount = 0;

  /** ws:// URL once started. */
  public get url(): string {
    return `ws://127.0.0.1:${this.port}`;
  }

  /** Start listening on an ephemeral port; default behavior is echo. */
  public start(): Promise<void> {
    return new Promise((resolve) => {
      const wss = new WebSocketServer({ port: 0 }, () => {
        this.port = (wss.address() as AddressInfo).port;
        resolve();
      });
      this.wss = wss;

      wss.on('connection', (socket) => {
        this.connectionCount++;
        this.sockets.add(socket);
        socket.on('message', (data: Buffer) => {
          const text = data.toString('utf-8');
          this.received.push(text);
          // Echo it straight back (prefixing so tests can distinguish direction).
          socket.send(`echo:${text}`);
        });
        socket.on('close', () => this.sockets.delete(socket));
      });
    });
  }

  /** Forcibly close all open client connections (simulate a server drop). */
  public dropConnections(): void {
    for (const socket of this.sockets) {
      socket.close();
    }
    this.sockets.clear();
  }

  /** Stop the server entirely. Idempotent — a second call resolves immediately. */
  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wss = this.wss;
      if (!wss) {
        resolve();
        return;
      }
      // Null out FIRST so a duplicate stop() (e.g. fixture teardown) is a no-op.
      this.wss = undefined;
      this.dropConnections();
      wss.close((err) => (err ? reject(err) : resolve()));
    });
  }
}
