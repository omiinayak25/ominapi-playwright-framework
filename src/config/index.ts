/**
 * =============================================================================
 * config/index.ts — Convenience barrel for configuration
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   Lets every consumer write `import { config } from '@config/index'` and get
 *   the ready-validated config object directly, instead of repeating
 *   `ConfigManager.getInstance().config` everywhere (DRY + readability).
 * =============================================================================
 */
import { ConfigManager } from './config.manager.js';

/** The single, validated, immutable framework configuration. */
export const config = ConfigManager.getInstance().config;

export { ConfigManager } from './config.manager.js';
