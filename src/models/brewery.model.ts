/**
 * =============================================================================
 * brewery.model.ts — Domain model for Open Brewery DB
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Open Brewery DB uses PAGE-BASED pagination (?page=&per_page=) and returns a
 *   bare array (no envelope). Its /meta endpoint provides the total. Typing both
 *   lets the BreweryService and PaginationHelper work safely.
 * =============================================================================
 */

/** A brewery record (only the fields we assert on are typed). */
export interface Brewery {
  readonly id: string; // stable string id (slug-like, not numeric)
  readonly name: string;
  readonly brewery_type: string; // e.g. "micro", "brewpub", "large"
  readonly city: string;
  readonly state_province: string; // state or province (named for non-US support)
  readonly country: string;
}

/** Open Brewery DB's /meta response (used to learn the total count). */
export interface BreweryMeta {
  readonly total: string | number; // total brewery count; API may return as string
  readonly page: string | number; // current page number
  readonly per_page: string | number; // page size
}
