/**
 * =============================================================================
 * config.manager.ts — ConfigManager (SINGLETON pattern)
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Reading and validating `process.env` should happen ONCE, in ONE place, and
 *   produce ONE immutable, strongly-typed config object. Scattering
 *   `process.env.X ?? 'default'` across 500 tests is unmaintainable and unsafe.
 *
 * WHAT PROBLEM IT SOLVES:
 *   - Type safety: env vars are `string | undefined`; we convert & validate to
 *     real types (number, boolean, unions) and FAIL FAST on bad config.
 *   - Single source of truth: one validated object the whole framework shares.
 *
 * WHY SINGLETON (the design pattern):
 *   Config is global, read-only, and expensive to parse/validate. We want
 *   exactly one shared instance — not a fresh parse per import. Singleton
 *   guarantees that: the constructor is private; access is via getInstance().
 *
 * WHEN TO USE:
 *   Anywhere you need config: `ConfigManager.getInstance().config`.
 *   (We also re-export a ready `config` object from ./index for convenience.)
 *
 * BEST PRACTICE — FAIL FAST:
 *   A misconfigured suite should crash immediately with a CLEAR message, not
 *   silently hit the wrong URL and produce confusing test failures later.
 * =============================================================================
 */
import * as dotenv from 'dotenv';
import type {
  AppConfig,
  Environment,
  LogLevel,
} from '../types/config.types.js';

// Populate process.env from .env (no-op if the file is absent, e.g. in CI where
// vars are injected directly by the pipeline).
dotenv.config();

/** Allowed values, used to validate union-typed env vars at load time. */
const VALID_ENVIRONMENTS: readonly Environment[] = ['dev', 'staging', 'prod'];
const VALID_LOG_LEVELS: readonly LogLevel[] = [
  'error',
  'warn',
  'info',
  'http',
  'debug',
];

export class ConfigManager {
  // The one and only instance (Singleton). `static` = lives on the class itself.
  private static instance: ConfigManager | undefined;

  // The validated, immutable config. `readonly` blocks reassignment.
  public readonly config: AppConfig;

  /**
   * PRIVATE constructor — the key to Singleton. No other module can call
   * `new ConfigManager()`; they MUST go through getInstance().
   */
  private constructor() {
    this.config = ConfigManager.load();
  }

  /**
   * The global access point. Creates the instance on first call (lazy init),
   * returns the same instance forever after.
   */
  public static getInstance(): ConfigManager {
    ConfigManager.instance ??= new ConfigManager();
    return ConfigManager.instance;
  }

  /**
   * TEST-ONLY escape hatch: clears the cached instance so a unit test can force
   * a re-read with different env vars. Never call this in production code.
   */
  public static reset(): void {
    ConfigManager.instance = undefined;
  }

  /** Reads, converts, and validates every env var into a typed AppConfig. */
  private static load(): AppConfig {
    const env = ConfigManager.parseEnum(
      'TEST_ENV',
      process.env.TEST_ENV ?? 'dev',
      VALID_ENVIRONMENTS,
    );

    const baseUrl = ConfigManager.required(
      'BASE_URL',
      process.env.BASE_URL ?? 'https://restful-booker.herokuapp.com',
    );

    return {
      env,
      baseUrl,
      endpoints: {
        booker: baseUrl,
        dummyJson: process.env.DUMMYJSON_URL ?? 'https://dummyjson.com',
        reqres: process.env.REQRES_URL ?? 'https://reqres.in',
        jsonPlaceholder:
          process.env.JSONPLACEHOLDER_URL ??
          'https://jsonplaceholder.typicode.com',
        // httpbingo.org is a reliable, actively-hosted reimplementation of
        // httpbin (the canonical httpbin.org on Heroku is frequently 503/504).
        httpbin: process.env.HTTPBIN_URL ?? 'https://httpbingo.org',
        postmanEcho: process.env.POSTMAN_ECHO_URL ?? 'https://postman-echo.com',
      },
      credentials: {
        username: process.env.BOOKER_USERNAME ?? 'admin',
        password: process.env.BOOKER_PASSWORD ?? 'password123',
      },
      logLevel: ConfigManager.parseEnum(
        'LOG_LEVEL',
        process.env.LOG_LEVEL ?? 'info',
        VALID_LOG_LEVELS,
      ),
      timeoutMs: ConfigManager.parseNumber(
        'API_TIMEOUT_MS',
        process.env.API_TIMEOUT_MS,
        30_000,
      ),
      ignoreHttpsErrors: process.env.IGNORE_HTTPS_ERRORS === 'true',
    };
  }

  /** Ensures a required string is non-empty, else fails fast with context. */
  private static required(name: string, value: string | undefined): string {
    if (value === undefined || value.trim() === '') {
      throw new Error(
        `[ConfigManager] Missing required environment variable: ${name}`,
      );
    }
    return value;
  }

  /** Parses a numeric env var, falling back to a default; rejects NaN. */
  private static parseNumber(
    name: string,
    value: string | undefined,
    fallback: number,
  ): number {
    if (value === undefined || value.trim() === '') return fallback;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new Error(
        `[ConfigManager] Env var ${name} must be a number, got: "${value}"`,
      );
    }
    return parsed;
  }

  /** Validates a value is one of an allowed union; fails fast otherwise. */
  private static parseEnum<T extends string>(
    name: string,
    value: string,
    allowed: readonly T[],
  ): T {
    if (!allowed.includes(value as T)) {
      throw new Error(
        `[ConfigManager] Env var ${name} must be one of [${allowed.join(
          ', ',
        )}], got: "${value}"`,
      );
    }
    return value as T;
  }
}
