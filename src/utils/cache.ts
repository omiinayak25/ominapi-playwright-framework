/**
 * =============================================================================
 * cache.ts — TtlCache (in-memory cache with time-to-live)
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Repeated identical GETs waste time and load. A TTL cache returns a stored
 *   value until it expires, then transparently misses so the next call refreshes.
 *   The ApiClient uses this to optionally cache GET responses.
 * =============================================================================
 */
export class TtlCache<V> {
  private readonly store = new Map<string, { value: V; expiresAt: number }>();

  public constructor(private readonly ttlMs: number) {}

  /** Return the cached value if present AND not expired; else undefined. */
  public get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key); // lazy eviction on read
      return undefined;
    }
    return entry.value;
  }

  /** Store a value with the configured TTL. */
  public set(key: string, value: V): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  public has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  public clear(): void {
    this.store.clear();
  }

  public get size(): number {
    return this.store.size;
  }
}
