/**
 * =============================================================================
 * logger.ts — Structured, leveled application logger (Winston)
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   `console.log` is unstructured, unleveled, and impossible to filter or ship
 *   to a log aggregator. A real framework needs ONE logger with levels, colors,
 *   timestamps, and (later) file transports — the backbone for the request/
 *   response logging we build in Phase 18 (Reporting) and Phase 20 (Middleware).
 *
 * WHAT PROBLEM IT SOLVES:
 *   - Noise control: set LOG_LEVEL=debug locally, LOG_LEVEL=warn in CI.
 *   - Consistency: every log line has the same timestamp + level format.
 *   - Testability: a single seam to later redirect/mock logs.
 *
 * HOW IT WORKS:
 *   Winston pipes a log message through formats (timestamp → colorize →
 *   printf) into a transport (the console here; files added later). The level
 *   comes from validated config, so verbosity is environment-driven.
 *
 * WHEN TO USE:
 *   Import `logger` anywhere instead of console:
 *     logger.info('Created booking', { id });
 *     logger.debug('Raw response', { body });
 *
 * BEST PRACTICE:
 *   Log STRUCTURED metadata (objects) as the second arg, not string-concatenated
 *   text — it stays machine-parseable for dashboards.
 * =============================================================================
 */
import winston from 'winston';
import { config } from '../config/index.js';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Custom single-line format: "2026-06-28 10:00:00 [info]: message {meta}".
 * Readable in a terminal, still greppable in CI logs.
 */
const consoleFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaKeys = Object.keys(meta).filter((k) => k !== 'splat');
  const metaStr = metaKeys.length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `${String(ts)} [${level}]: ${String(message)}${metaStr}`;
});

/**
 * The shared logger instance. Level is driven by config (LOG_LEVEL env var),
 * so the SAME code is chatty locally and quiet in CI without edits.
 */
export const logger: winston.Logger = winston.createLogger({
  level: config.logLevel,
  format: combine(
    errors({ stack: true }), // If an Error is logged, include its stack trace.
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    colorize({ all: true }), // Color the whole line by level (red/yellow/etc.).
    consoleFormat,
  ),
  transports: [new winston.transports.Console()],
});
