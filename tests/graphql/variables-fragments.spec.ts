/**
 * =============================================================================
 * variables-fragments.spec.ts — GraphQL variables & fragments
 * -----------------------------------------------------------------------------
 * CONCEPTS:
 *   - VARIABLES: parameterize an operation ($code) instead of string-concatenating
 *     values into the query — safer, reusable, and the GraphQL-idiomatic way.
 *   - FRAGMENTS: a named, reusable set of fields applied to multiple selections —
 *     the DRY principle for GraphQL queries.
 * =============================================================================
 */
import { test, expect } from '../../src/fixtures/api.fixtures.js';
import { graphqlData } from '../../src/api-client/index.js';

interface Country {
  name: string;
  capital: string | null;
  currency: string | null;
}

// Suite: demonstrates GraphQL variables and fragments for reuse/parameterization.
test.describe('Phase 14 · Variables & fragments', () => {
  test.describe.configure({ retries: 2 }); // external GraphQL endpoint can blip
  // Scenario: run one parameterized query twice with different variable values.
  // Expected: each call returns the country matching its $code input.
  test('VARIABLES: same query, different inputs', async ({ countries }) => {
    const query = `
      query GetCountry($code: ID!) {
        country(code: $code) { name capital currency }
      }
    `;

    const us = graphqlData(
      await countries.query<{ country: Country }>(query, { code: 'US' }),
    );
    const jp = graphqlData(
      await countries.query<{ country: Country }>(query, { code: 'JP' }),
    );

    expect(us.country.name).toBe('United States');
    expect(jp.country.name).toBe('Japan');
    expect(jp.country.capital).toBe('Tokyo');
  });

  // Scenario: define a fragment once and apply it to two aliased selections.
  // Expected: both selections return the same fragment-defined fields.
  test('FRAGMENTS: a reusable field set applied to multiple countries', async ({
    countries,
  }) => {
    const query = `
      fragment CountryFields on Country {
        name
        capital
        currency
      }
      query {
        us: country(code: "US") { ...CountryFields }
        fr: country(code: "FR") { ...CountryFields }
      }
    `;

    const data = graphqlData(
      await countries.query<{ us: Country; fr: Country }>(query),
    );

    // Both selections came back with the SAME fragment-defined fields.
    expect(data.us.name).toBe('United States');
    expect(data.fr.name).toBe('France');
    expect(data.fr.capital).toBe('Paris');
    for (const c of [data.us, data.fr]) {
      expect(c).toHaveProperty('name');
      expect(c).toHaveProperty('capital');
      expect(c).toHaveProperty('currency');
    }
  });
});
