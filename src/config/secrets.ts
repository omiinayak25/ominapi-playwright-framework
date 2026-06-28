/**
 * =============================================================================
 * secrets.ts — SecretsManager (read + MASK secrets)
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Secrets (tokens, API keys) must come from the environment (12-Factor), never
 *   be hardcoded, and never be printed in full. This manager reads secrets from
 *   process.env, FAILS FAST if a required one is missing, and provides mask() so
 *   logs/reports show "ab***yz" instead of the real value.
 *
 * SINGLETON: secrets access is global & read-only — one instance suffices.
 * =============================================================================
 */
export class SecretsManager {
  private static instance: SecretsManager | undefined;

  public static getInstance(): SecretsManager {
    SecretsManager.instance ??= new SecretsManager();
    return SecretsManager.instance;
  }

  /** Get a REQUIRED secret; throws (fail fast) if absent/empty. */
  public get(name: string): string {
    const value = process.env[name];
    if (value === undefined || value === '') {
      throw new Error(`[SecretsManager] Missing required secret: ${name}`);
    }
    return value;
  }

  /** Get an OPTIONAL secret, or undefined if not set. */
  public getOptional(name: string): string | undefined {
    const value = process.env[name];
    return value === undefined || value === '' ? undefined : value;
  }

  /** Mask a secret for safe logging: keep first/last 2 chars, hide the rest. */
  public mask(value: string): string {
    if (value.length <= 4) return '****';
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }
}
