/**
 * =============================================================================
 * ws-client.ts — WebSocketClient (async-friendly WebSocket wrapper)
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Raw WebSockets are event-driven (on('message'), on('open')), which is awkward
 *   in linear tests. This client converts events into clean Promises:
 *   connect(), send(), waitForMessage(), close(), reconnect().
 *
 * THE KEY DESIGN — buffer + waiter queue:
 *   A message can arrive BEFORE a test calls waitForMessage(). So incoming
 *   messages are buffered; waitForMessage() returns a buffered message
 *   immediately if present, otherwise registers a waiter that resolves on the
 *   next message (with a timeout). This eliminates the classic WS race condition.
 * =============================================================================
 */
import WebSocket from 'ws';

export class WebSocketClient {
  private socket: WebSocket | undefined;
  private readonly buffer: string[] = [];
  private readonly waiters: Array<(msg: string) => void> = [];

  public constructor(private readonly url: string) {}

  /** Open the connection; resolves on 'open', rejects on error/timeout. */
  public connect(timeoutMs = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url);
      this.socket = socket;

      const timer = setTimeout(() => {
        reject(new Error(`[ws] connect timed out after ${timeoutMs}ms`));
        socket.terminate();
      }, timeoutMs);

      socket.on('open', () => {
        clearTimeout(timer);
        resolve();
      });
      socket.on('error', (err) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
      socket.on('message', (data: Buffer) => {
        const text = data.toString('utf-8');
        const waiter = this.waiters.shift();
        if (waiter) waiter(text);
        else this.buffer.push(text);
      });
    });
  }

  /** True if the socket is currently open. */
  public isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /** Send text, or a JSON-serialized object. */
  public send(data: string | object): void {
    if (!this.socket || !this.isOpen()) {
      throw new Error('[ws] Cannot send: socket is not open');
    }
    this.socket.send(typeof data === 'string' ? data : JSON.stringify(data));
  }

  /** Resolve with the next message (buffered or awaited), or reject on timeout. */
  public waitForMessage(timeoutMs = 5000): Promise<string> {
    const buffered = this.buffer.shift();
    if (buffered !== undefined) return Promise.resolve(buffered);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        // Remove our waiter so it can't resolve later.
        const idx = this.waiters.indexOf(waiter);
        if (idx >= 0) this.waiters.splice(idx, 1);
        reject(new Error(`[ws] No message within ${timeoutMs}ms`));
      }, timeoutMs);

      const waiter = (msg: string): void => {
        clearTimeout(timer);
        resolve(msg);
      };
      this.waiters.push(waiter);
    });
  }

  /** Wait for the next message and parse it as JSON. */
  public async waitForJson<T>(timeoutMs = 5000): Promise<T> {
    const text = await this.waitForMessage(timeoutMs);
    return JSON.parse(text) as T;
  }

  /** Close the connection cleanly; resolves once closed. */
  public close(code = 1000): Promise<void> {
    return new Promise((resolve) => {
      const socket = this.socket;
      if (!socket || socket.readyState === WebSocket.CLOSED) {
        resolve();
        return;
      }
      socket.once('close', () => resolve());
      socket.close(code);
    });
  }

  /** Close then re-open a fresh connection (clears any buffered messages). */
  public async reconnect(timeoutMs = 5000): Promise<void> {
    await this.close();
    this.buffer.length = 0;
    this.waiters.length = 0;
    await this.connect(timeoutMs);
  }
}
