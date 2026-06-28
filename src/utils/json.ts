/**
 * =============================================================================
 * json.ts — Safe JSON helpers
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   `JSON.parse` THROWS on non-JSON input (HTML error pages, plain text, empty
 *   bodies). In a test framework that must inspect EVERY response — including
 *   malformed ones (Phase 9: negative testing) — a throw mid-parse would mask
 *   the real assertion. This helper never throws; it returns a typed result.
 *
 * WHEN TO USE:
 *   Inside the ApiClient when converting a raw response string into a body, and
 *   anywhere you parse untrusted/uncertain JSON.
 * =============================================================================
 */

/** Result of a parse attempt: either typed data, or the raw text if not JSON. */
export interface ParseResult<T> {
  readonly isJson: boolean;
  readonly data: T | string;
}

/**
 * Parses a string as JSON without throwing.
 * - Empty string  -> { isJson: false, data: '' }
 * - Valid JSON    -> { isJson: true,  data: <parsed> }
 * - Invalid JSON  -> { isJson: false, data: <original text> }
 */
export function safeJsonParse<T = unknown>(text: string): ParseResult<T> {
  if (text.trim() === '') {
    return { isJson: false, data: '' };
  }
  try {
    return { isJson: true, data: JSON.parse(text) as T };
  } catch {
    return { isJson: false, data: text };
  }
}
