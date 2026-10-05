/**
 * Catalog search data for the UI shop tests.
 *
 * - `KNOWN_SEARCH_TERM` — matches several seeded product names.
 * - `CATEGORY_SLUGS` — `/category/:slug` route parameter per seeded category.
 * - `DEFAULT_PRICE_RANGE` — the price range the catalog applies by default (AC10).
 * - `PRICE_FILTER_MAX` — an upper bound for the price slider below the default 100.
 *
 * Format: `.ts` with `as const` exports — literal values only.
 */

export const KNOWN_SEARCH_TERM = 'pliers';

export const CATEGORY_SLUGS = {
    'Hand Tools': 'hand-tools',
    'Power Tools': 'power-tools',
    Other: 'other',
    'Special Tools': 'special-tools',
} as const;

export const DEFAULT_PRICE_RANGE = { min: 1, max: 100 } as const;

export const PRICE_FILTER_MAX = 20;
