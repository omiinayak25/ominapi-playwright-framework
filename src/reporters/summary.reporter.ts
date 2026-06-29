/**
 * =============================================================================
 * summary.reporter.ts — Custom Playwright reporter (run summary + JSON artifact)
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Built-in reporters (list/html/junit) are great, but teams often want a
 *   tailored summary: pass/fail counts, total duration, and the SLOWEST tests
 *   (perf hotspots) — plus a machine-readable summary.json for dashboards/CI.
 *   Implementing Playwright's Reporter interface is the idiomatic extension point.
 *
 * HOW PLAYWRIGHT REPORTERS WORK:
 *   Playwright calls lifecycle hooks: onBegin (run start), onTestEnd (per test),
 *   onEnd (run finished). We accumulate records and emit the summary in onEnd.
 *
 * REGISTERED IN: playwright.config.ts -> reporter: [['./src/reporters/summary.reporter.ts']]
 * =============================================================================
 */
import type {
  Reporter,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import * as fs from 'node:fs';
import * as path from 'node:path';

/** One captured test outcome, accumulated during the run for the final summary. */
interface TestRecord {
  readonly title: string;
  readonly status: TestResult['status'];
  readonly durationMs: number;
}

/**
 * Custom Playwright reporter that prints a run summary and writes summary.json.
 * Implements the Reporter lifecycle hooks (onBegin/onTestEnd/onEnd).
 */
export default class SummaryReporter implements Reporter {
  private readonly records: TestRecord[] = [];
  private startTime = 0;

  /** Run start — record the wall-clock start so onEnd can compute total duration. */
  public onBegin(_config: unknown, _suite: Suite): void {
    this.startTime = Date.now();
  }

  /** Per-test hook — capture the test's full title, status, and duration. */
  public onTestEnd(test: TestCase, result: TestResult): void {
    this.records.push({
      // titlePath: ['', '<file>', '<describe>', '<test>'] — drop the empty root.
      title: test.titlePath().filter(Boolean).join(' › '),
      status: result.status,
      durationMs: result.duration,
    });
  }

  /** Run finished — aggregate counts, find the slowest tests, and emit both artifacts. */
  public onEnd(result: FullResult): void {
    const totalMs = Date.now() - this.startTime;
    const count = (status: TestResult['status']): number =>
      this.records.filter((r) => r.status === status).length;

    const summary = {
      result: result.status,
      total: this.records.length,
      passed: count('passed'),
      failed: count('failed'),
      timedOut: count('timedOut'),
      skipped: count('skipped'),
      durationMs: totalMs,
      slowest: [...this.records]
        .sort((a, b) => b.durationMs - a.durationMs)
        .slice(0, 5)
        .map((r) => ({ title: r.title, durationMs: r.durationMs })),
    };

    // Machine-readable artifact for CI/dashboards.
    const outDir = path.resolve(process.cwd(), 'test-results');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, 'summary.json'),
      JSON.stringify(summary, null, 2),
    );

    // Human-readable console block (process.stdout to avoid console linting).
    const lines = [
      '',
      '──────────── OminAPI Run Summary ────────────',
      ` result   : ${summary.result}`,
      ` total    : ${summary.total}`,
      ` passed   : ${summary.passed}`,
      ` failed   : ${summary.failed}`,
      ` timedOut : ${summary.timedOut}`,
      ` skipped  : ${summary.skipped}`,
      ` duration : ${(summary.durationMs / 1000).toFixed(1)}s`,
      ' slowest  :',
      ...summary.slowest.map((s) => `   - ${s.durationMs}ms  ${s.title}`),
      '─────────────────────────────────────────────',
      '',
    ];
    process.stdout.write(lines.join('\n'));
  }
}
