/**
 * =============================================================================
 * api-client.types.ts — The TYPE CONTRACT for the HTTP Facade
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Defines the inputs (RequestOptions) and the normalized output (ApiResponse)
 *   of every call made through ApiClient. Because every verb returns the SAME
 *   shape, assertions across the whole framework are uniform and predictable.
 * =============================================================================
 */
import type { APIResponse } from '@playwright/test';
import type { AuthStrategy } from '../auth/auth.types.js';

/** Primitive values allowed in query strings and url-encoded form bodies. */
export type QueryValue = string | number | boolean;

/**
 * Options accepted by every ApiClient verb. All optional — a bare GET needs none.
 * Mirrors the subset of Playwright's fetch options we expose, with clearer names.
 */
export interface RequestOptions {
  /** Per-request headers, merged over the client's defaults. */
  readonly headers?: Record<string, string>;

  /** Query-string parameters, e.g. { page: 2, active: true } -> ?page=2&active=true */
  readonly params?: Record<string, QueryValue>;

  /** JSON request body. Objects are serialized and Content-Type set to JSON. */
  readonly data?: unknown;

  /** application/x-www-form-urlencoded body (mutually exclusive with `data`). */
  readonly form?: Record<string, QueryValue>;

  /** Per-request timeout (ms). Falls back to the Playwright/config default. */
  readonly timeout?: number;

  /**
   * When true, a non-2xx/3xx status does NOT throw — the response is returned
   * for assertion. We default to this (see ApiClient) so negative tests work.
   */
  readonly failOnStatusCode?: boolean;

  /**
   * Per-request auth strategy. Overrides any client-level default auth for THIS
   * call only — ideal for negative tests ("same endpoint, with vs without auth").
   */
  readonly auth?: AuthStrategy;
}

/**
 * A normalized, framework-wide response wrapper.
 * `T` is the expected parsed body type (default `unknown` forces a deliberate cast).
 */
export interface ApiResponse<T = unknown> {
  /** Numeric HTTP status, e.g. 200, 404. */
  readonly status: number;

  /** Human-readable status text, e.g. "OK", "Not Found". */
  readonly statusText: string;

  /** True for 2xx responses (mirrors fetch's `ok`). */
  readonly ok: boolean;

  /** Lower-cased response headers as a plain object. */
  readonly headers: Record<string, string>;

  /** Parsed body when JSON; otherwise the raw text. Typed as T for convenience. */
  readonly body: T;

  /** The unparsed response text — useful for XML / plain-text / debugging. */
  readonly rawText: string;

  /** True when the body was valid JSON (vs text/HTML/empty). */
  readonly isJson: boolean;

  /** Wall-clock duration of the request in milliseconds (basis for SLA checks). */
  readonly durationMs: number;

  /** Final resolved request URL. */
  readonly url: string;

  /** Escape hatch: the raw Playwright APIResponse for advanced needs. */
  readonly raw: APIResponse;
}
