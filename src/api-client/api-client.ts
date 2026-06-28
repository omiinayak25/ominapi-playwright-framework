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
import { delay } from '../utils/retry.js';
import { TtlCache } from '../utils/cache.js';
import { correlationIdMiddleware } from '../middleware/correlation.middleware.js';
import type { RequestMiddleware } from '../middleware/types.js';
import type {
  ApiClientOptions,
  ApiResponse,
  RequestOptions,
} from './api-client.types.js';
import type { AuthStrategy } from '../auth/auth.types.js';

/** Internal: the HTTP verbs we support, kept as a union for type safety. */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const DEFAULT_RETRY_STATUSES = [429, 500, 502, 503, 504];

export class ApiClient {
  /** Per-client GET cache (created only when caching is enabled). */
  private readonly cache?: TtlCache<ApiResponse>;
  /** Effective request middleware (configured + correlation-id convenience). */
  private readonly requestMiddleware: RequestMiddleware[];

  /**
   * @param context  Playwright request context (injected — Dependency Injection).
   *                  It already carries a baseURL, so callers pass only paths.
   * @param name      A label used in logs to identify which API this client hits.
   * @param auth      OPTIONAL client-wide default auth strategy (Strategy pattern).
   *                  Applied to every request unless overridden per-request.
   * @param options   OPTIONAL enterprise features (retry/cache/middleware). Omit
   *                  for the exact baseline behavior.
   */
  public constructor(
    private readonly context: APIRequestContext,
    private readonly name: string = 'api',
    private readonly auth?: AuthStrategy,
    private readonly options: ApiClientOptions = {},
  ) {
    if (options.cache) {
      this.cache = new TtlCache<ApiResponse>(options.cache.ttlMs);
    }
    this.requestMiddleware = [
      ...(options.requestMiddleware ?? []),
      ...(options.correlationId ? [correlationIdMiddleware()] : []),
    ];
  }

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
      multipart,
      timeout,
      auth,
      // Default false so 4xx/5xx are RETURNED (not thrown) — essential for
      // negative testing. Callers can opt into throwing per request.
      failOnStatusCode = false,
    } = options;

    // Resolve auth (Strategy pattern): per-request `auth` overrides the client
    // default. The chosen strategy produces headers we merge BEFORE per-request
    // headers, so an explicit header in the call always wins.
    const strategy = auth ?? this.auth;
    const authHeaders = strategy ? await strategy.apply() : {};
    const mergedHeaders: Record<string, string> = {
      ...authHeaders,
      ...(headers ?? {}),
    };

    // MIDDLEWARE: let request middleware (e.g. correlation id) mutate headers.
    for (const mw of this.requestMiddleware) {
      mw({ method, path, headers: mergedHeaders });
    }

    // CACHE: serve fresh GET responses from cache (key by path + params).
    const cacheKey = `${method} ${path}?${JSON.stringify(params ?? {})}`;
    if (this.cache && method === 'GET') {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.http(`[${this.name}] ⚡ cache hit ${method} ${path}`);
        return cached as ApiResponse<T>;
      }
    }

    // One full attempt: fetch -> parse -> normalize -> run response middleware.
    const performOnce = async (): Promise<ApiResponse<T>> => {
      logger.http(
        `[${this.name}] → ${method} ${path}`,
        strategy ? { params, auth: strategy.scheme } : { params },
      );
      if (data !== undefined)
        logger.debug(`[${this.name}] request body`, { data });

      const start = Date.now();
      const response = await this.context.fetch(path, {
        method,
        failOnStatusCode,
        ...(Object.keys(mergedHeaders).length > 0
          ? { headers: mergedHeaders }
          : {}),
        ...(params ? { params } : {}),
        ...(data !== undefined ? { data } : {}),
        ...(form ? { form } : {}),
        ...(multipart ? { multipart } : {}),
        ...(timeout !== undefined ? { timeout } : {}),
      });
      const durationMs = Date.now() - start;

      const rawText = await response.text();
      const parsed = safeJsonParse<T>(rawText);

      logger.http(
        `[${this.name}] ← ${response.status()} ${method} ${path} (${durationMs}ms)`,
      );
      logger.debug(`[${this.name}] response body`, { body: parsed.data });

      const apiResponse: ApiResponse<T> = {
        status: response.status(),
        statusText: response.statusText(),
        ok: response.ok(),
        headers: response.headers(),
        body: parsed.data as T,
        rawText,
        isJson: parsed.isJson,
        durationMs,
        sizeBytes: Buffer.byteLength(rawText, 'utf-8'),
        url: response.url(),
        raw: response,
      };

      for (const mw of this.options.responseMiddleware ?? []) {
        mw(apiResponse);
      }
      return apiResponse;
    };

    // RETRY: re-issue on transient statuses with exponential backoff (opt-in).
    const retry = this.options.retry;
    const retryStatuses = retry?.retryOnStatuses ?? DEFAULT_RETRY_STATUSES;
    const maxAttempts = retry ? retry.retries + 1 : 1;

    let result = await performOnce();
    for (let attempt = 1; attempt < maxAttempts; attempt++) {
      if (!retryStatuses.includes(result.status)) break;
      const wait = (retry?.baseDelayMs ?? 0) * Math.pow(2, attempt - 1);
      logger.warn(
        `[${this.name}] retry ${attempt}/${maxAttempts - 1} after status ${result.status}`,
      );
      if (wait > 0) await delay(wait);
      result = await performOnce();
    }

    // Cache successful GETs.
    if (this.cache && method === 'GET' && result.status < 400) {
      this.cache.set(cacheKey, result);
    }
    return result;
  }
}
