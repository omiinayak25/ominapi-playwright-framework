/**
 * auth/index.ts — Barrel export for the authentication layer.
 */
export type { AuthStrategy, AuthHeaders } from './auth.types.js';
export { BasicAuthStrategy } from './strategies/basic-auth.strategy.js';
export { BearerTokenStrategy } from './strategies/bearer-token.strategy.js';
export { ApiKeyStrategy } from './strategies/api-key.strategy.js';
export { CookieTokenStrategy } from './strategies/cookie-token.strategy.js';
export { NoAuthStrategy } from './strategies/no-auth.strategy.js';
export { AuthService } from './auth.service.js';
