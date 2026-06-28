/**
 * =============================================================================
 * httpbin.types.ts — Response shapes for httpbin.org & postman-echo.com
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Typing the bodies of our foundation test APIs lets `api.get<HttpbinGet>()`
 *   return a fully-typed body — so assertions get autocomplete and the compiler
 *   catches typos in field names. This is the payoff of the generic ApiResponse<T>.
 * =============================================================================
 */

/** Shape returned by httpbin.org/get and similar reflective endpoints. */
export interface HttpbinGet {
  readonly args: Record<string, string>;
  readonly headers: Record<string, string>;
  readonly origin: string;
  readonly url: string;
}

/** Shape returned by httpbin.org/post|put|patch|delete (extends GET fields). */
export interface HttpbinData extends HttpbinGet {
  /** Raw request body as text. */
  readonly data: string;
  /** Parsed JSON body, when sent as JSON. */
  readonly json: unknown;
  /** Parsed url-encoded form fields, when sent as a form. */
  readonly form: Record<string, string>;
}

/** Shape returned by httpbin.org/headers. */
export interface HttpbinHeaders {
  readonly headers: Record<string, string>;
}

/** Shape returned by httpbin.org/cookies. */
export interface HttpbinCookies {
  readonly cookies: Record<string, string>;
}

/** Shape returned by postman-echo.com/get|post. */
export interface PostmanEcho {
  readonly args: Record<string, string>;
  readonly headers: Record<string, string>;
  readonly url: string;
  /** Present on POST/PUT: parsed JSON body. */
  readonly json?: unknown;
  /** Present on POST/PUT: parsed form fields. */
  readonly form?: Record<string, string>;
  /** Present on POST/PUT: raw body. */
  readonly data?: unknown;
}
