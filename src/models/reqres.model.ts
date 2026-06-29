/**
 * =============================================================================
 * reqres.model.ts — Domain model for ReqRes collection records
 * -----------------------------------------------------------------------------
 * Shape of GET /api/collections/{collection}/records?project_id=...
 *   { data: ReqResRecord<T>[], meta: {...} }
 * Each record wraps arbitrary user data in a `data` field plus metadata.
 * =============================================================================
 */

/** A single collection record; `T` is the user-defined payload shape. */
export interface ReqResRecord<T = Record<string, unknown>> {
  readonly id: string; // record id (string, not numeric)
  readonly collection_id: string; // owning collection
  readonly project_id: number; // owning project
  readonly created_at: string; // ISO creation timestamp
  readonly updated_at: string; // ISO last-modified timestamp
  readonly data: T; // the user-defined payload (shape varies per collection)
}

/** The list envelope returned for a collection's records. */
export interface ReqResCollection<T = Record<string, unknown>> {
  readonly data: ReqResRecord<T>[]; // the records on this page
  readonly meta: Record<string, unknown>; // opaque paging/metadata block
}

/** The user payload stored in the "products" collection (project 33261). */
export interface ProductRecordData {
  readonly name: string;
  readonly price: number;
  readonly category: string;
  readonly in_stock: boolean; // availability flag
}
