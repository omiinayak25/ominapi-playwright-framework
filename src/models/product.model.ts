/**
 * =============================================================================
 * product.model.ts — Domain model for DummyJSON "products"
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Types the Product resource AND DummyJSON's list-envelope shape. Real APIs
 *   rarely return a bare array for collections — they wrap items with paging
 *   metadata. Modeling that envelope (ProductList) is what lets the repository
 *   hide it from tests.
 * =============================================================================
 */

/** A product as returned by DummyJSON (only the fields we assert on are typed). */
export interface Product {
  readonly id: number;
  readonly title: string;
  readonly price: number;
  readonly description: string;
  readonly category: string;
  readonly stock: number; // available inventory count
}

/**
 * DummyJSON wraps collections in a paging envelope:
 *   { products: [...], total, skip, limit }
 * Modeling this is the difference between a robust repository and guesswork.
 */
export interface ProductList {
  readonly products: Product[]; // items on this page
  readonly total: number; // total matching items across all pages
  readonly skip: number; // offset applied to this page
  readonly limit: number; // page size requested
}

/**
 * Payload for creating/updating a product. All optional because DummyJSON
 * accepts partial product data; `title` is the one field we always send.
 */
export interface NewProduct {
  readonly title: string;
  readonly price?: number;
  readonly description?: string;
  readonly category?: string;
}

/** DummyJSON's DELETE response adds soft-delete metadata to the product. */
export interface DeletedProduct extends Product {
  readonly isDeleted: boolean; // true once soft-deleted
  readonly deletedOn: string; // ISO timestamp of the deletion
}
