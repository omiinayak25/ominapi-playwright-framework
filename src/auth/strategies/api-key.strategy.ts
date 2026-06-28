/**
 * =============================================================================
 * api-key.strategy.ts — API Key Authentication (Strategy)
 * -----------------------------------------------------------------------------
 * CONCEPT:
 *   Many APIs authenticate via a static key in a custom header (e.g.
 *   `x-api-key: <key>`) or sometimes a query param. The key identifies the
 *   CALLING APPLICATION rather than a user. Simple, common for service-to-service.
 *
 * WHY CONFIGURABLE HEADER NAME:
 *   Different vendors use different header names (x-api-key, apikey, X-RapidAPI-Key).
 *   Parameterizing the name keeps ONE strategy reusable across all of them.
 * =============================================================================
 */
import type { AuthStrategy, AuthHeaders } from '../auth.types.js';

export class ApiKeyStrategy implements AuthStrategy {
  public readonly scheme = 'ApiKey';

  public constructor(
    private readonly headerName: string,
    private readonly key: string,
  ) {}

  public apply(): AuthHeaders {
    // Computed property name lets the caller choose the header (x-api-key, etc.).
    return { [this.headerName]: this.key };
  }
}
