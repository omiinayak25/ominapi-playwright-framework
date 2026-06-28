/**
 * =============================================================================
 * api-client.ts — ApiClient (FACADE pattern)
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Playwright's APIRequestContext is powerful but low-level. Without a Facade,
 *   EVERY test would re-implement: header merging, JSON parsing, timing, logging,
 *   and response normalization. That is a massive DRY violation across hundreds
 *   of tests. ApiClient centralizes all of it behind five clean verbs.
 *
 * WHAT PROBLEM IT SOLVES:
 *   - DRY: one place for request/response handling.
 *   - Consistency: every call returns the same ApiResponse<T> shape.
 *   - Observability: every request/response is logged with timing.
 *   - Negative testing: never throws on 4xx/5xx by default — returns the response.
 *
 * WHY FACADE (the design pattern):
 *   A Facade provides a SIMPLE interface over a complex subsystem. Tests depend
 *   on `api.get()`, not on Playwright internals — so we could swap the HTTP
 *   engine later without touching a single test (Open/Closed Principle).
 *
 * HOW IT WORKS:
 *   All five verbs delegate to one private `send()` method that does the actual
 *   work (Single Responsibility + DRY). `send()` times the call, fires it via the
 *   injected APIRequestContext, parses the body safely, logs, and normalizes.
 *
 * WHEN TO USE:
 *   Always — tests receive a ready ApiClient via fixtures (Dependency Injection).
 *   They never construct request contexts themselves.
 * =============================================================================
 */
import type { APIRequestContext } from '@playwright/test';
import { logger } from '../utils/logger.js';
import { safeJsonParse } from '../utils/json.js';
import type { ApiResponse, RequestOptions } from './api-client.types.js';

/** Internal: the HTTP verbs we support, kept as a union for type safety. */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class ApiClient {
  /**
   * @param context  Playwright request context (injected — Dependency Injection).
   *                  It already carries a baseURL, so callers pass only paths.
   * @param name      A label used in logs to identify which API this client hits.
   */
  public constructor(
    private readonly context: APIRequestContext,
    private readonly name: string = 'api',
  ) {}

  /** HTTP GET — retrieve a resource. */
  public async get<T = unknown>(
    path: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.send<T>('GET', path, options);
  }

  /** HTTP POST — create a resource (or invoke an action). */
  public async post<T = unknown>(
    path: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.send<T>('POST', path, options);
  }

  /** HTTP PUT — full replace of a resource. */
  public async put<T = unknown>(
    path: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.send<T>('PUT', path, options);
  }

  /** HTTP PATCH — partial update of a resource. */
  public async patch<T = unknown>(
    path: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.send<T>('PATCH', path, options);
  }

  /** HTTP DELETE — remove a resource. (`del` because `delete` is a reserved word.) */
  public async del<T = unknown>(
    path: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.send<T>('DELETE', path, options);
  }

  /**
   * The single engine all verbs delegate to (DRY + Single Responsibility).
   * Times the call, executes it, parses + normalizes the response, and logs.
   */
  private async send<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const {
      headers,
      params,
      data,
      form,
      timeout,
      // Default false so 4xx/5xx are RETURNED (not thrown) — essential for
      // negative testing. Callers can opt into throwing per request.
      failOnStatusCode = false,
    } = options;

    logger.http(`[${this.name}] → ${method} ${path}`, { params });

    const start = Date.now();
    const response = await this.context.fetch(path, {
      method,
      failOnStatusCode,
      ...(headers ? { headers } : {}),
      ...(params ? { params } : {}),
      ...(data !== undefined ? { data } : {}),
      ...(form ? { form } : {}),
      ...(timeout !== undefined ? { timeout } : {}),
    });
    const durationMs = Date.now() - start;

    const rawText = await response.text();
    const parsed = safeJsonParse<T>(rawText);

    logger.http(
      `[${this.name}] ← ${response.status()} ${method} ${path} (${durationMs}ms)`,
    );

    return {
      status: response.status(),
      statusText: response.statusText(),
      ok: response.ok(),
      headers: response.headers(),
      body: parsed.data as T,
      rawText,
      isJson: parsed.isJson,
      durationMs,
      url: response.url(),
      raw: response,
    };
  }
}
