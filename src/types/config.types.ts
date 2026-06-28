/**
 * =============================================================================
 * config.types.ts — The TYPE CONTRACT for all framework configuration
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Defines the exact shape of validated config the rest of the framework can
 *   rely on. Once env vars pass through ConfigManager, everything downstream
 *   consumes this strongly-typed object instead of touching `process.env`
 *   (which is always `string | undefined` and unsafe).
 *
 * BEST PRACTICE:
 *   Centralize the "single source of truth" type so a new config field is added
 *   in exactly ONE place and the compiler flags every spot that must handle it.
 * =============================================================================
 */

/** Supported deployment/test environments. A union type = compile-time safety. */
export type Environment = 'dev' | 'staging' | 'prod';

/** Winston-compatible log levels, most-severe to most-verbose. */
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug';

/**
 * Base URLs for every public API the framework targets across all phases.
 * Grouped together so a URL change happens in one obvious place.
 */
export interface ApiEndpoints {
  readonly booker: string;
  readonly dummyJson: string;
  readonly reqres: string;
  readonly jsonPlaceholder: string;
  readonly httpbin: string;
  readonly postmanEcho: string;
}

/** Demo credentials for the auth phases (public sandbox APIs only). */
export interface Credentials {
  readonly username: string;
  readonly password: string;
}

/**
 * The fully-validated application configuration.
 * `readonly` everywhere = config is immutable after load (no accidental mutation).
 */
export interface AppConfig {
  readonly env: Environment;
  readonly baseUrl: string;
  readonly endpoints: ApiEndpoints;
  readonly credentials: Credentials;
  readonly logLevel: LogLevel;
  readonly timeoutMs: number;
  readonly ignoreHttpsErrors: boolean;
}
