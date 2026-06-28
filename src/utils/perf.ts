/**
 * =============================================================================
 * perf.ts — PerfHelper (timing, concurrency, latency percentiles)
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Performance assertions need consistent measurement: time a call, run a
 *   concurrent batch, and summarize latency with PERCENTILES (p95/p99) — because
 *   averages hide the slow tail that users actually feel.
 *
 * SCOPE:
 *   This is SMOKE-level performance for an API test framework, not a load tool.
 *   For sustained high-RPS load testing use k6/Gatling; this verifies SLAs and
 *   basic concurrency health as part of the functional suite.
 * =============================================================================
 */

/** Summary statistics for a set of latency samples (all in milliseconds). */
export interface LatencyStats {
  readonly count: number;
  readonly min: number;
  readonly max: number;
  readonly avg: number;
  readonly p50: number;
  readonly p90: number;
  readonly p95: number;
  readonly p99: number;
}

/** Result of a concurrent batch run. */
export interface BatchResult<T> {
  readonly results: T[];
  readonly durations: number[];
  /** Wall-clock time for the whole batch (basis for the concurrency check). */
  readonly totalMs: number;
}

export class PerfHelper {
  /** Time a single async task, returning its result and elapsed ms. */
  public static async measure<T>(
    task: () => Promise<T>,
  ): Promise<{ result: T; durationMs: number }> {
    const start = Date.now();
    const result = await task();
    return { result, durationMs: Date.now() - start };
  }

  /**
   * Run `count` copies of a task CONCURRENTLY, capturing each one's duration and
   * the overall wall-clock time.
   */
  public static async runBatch<T>(
    task: () => Promise<T>,
    count: number,
  ): Promise<BatchResult<T>> {
    const start = Date.now();
    const timed = await Promise.all(
      Array.from({ length: count }, async () => {
        const t0 = Date.now();
        const result = await task();
        return { result, duration: Date.now() - t0 };
      }),
    );
    return {
      results: timed.map((t) => t.result),
      durations: timed.map((t) => t.duration),
      totalMs: Date.now() - start,
    };
  }

  /** Compute latency percentiles & summary from a list of durations (ms). */
  public static stats(durations: number[]): LatencyStats {
    const sorted = [...durations].sort((a, b) => a - b);
    const n = sorted.length;
    if (n === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        avg: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
      };
    }

    const percentile = (p: number): number => {
      // Nearest-rank method: rank = ceil(p/100 * n), 1-based.
      const rank = Math.ceil((p / 100) * n);
      const index = Math.min(n - 1, Math.max(0, rank - 1));
      return sorted[index] ?? 0;
    };

    const sum = sorted.reduce((acc, v) => acc + v, 0);
    return {
      count: n,
      min: sorted[0] ?? 0,
      max: sorted[n - 1] ?? 0,
      avg: Math.round(sum / n),
      p50: percentile(50),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
    };
  }
}
