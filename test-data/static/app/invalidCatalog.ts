/**
 * Domain-specific invalid values for catalog entities (brands, categories,
 * products), derived from the backend validation rules.
 *
 * - `INVALID_SLUGS` — violate `alpha_dash:ascii` (only letters, digits, `-`, `_`):
 *   a separator character and a non-ASCII letter.
 * - `SUBSCRIPT_SUPERSCRIPT_NAMES` — violate the backend `SubscriptSuperscriptRule`
 *   (no characters from the Unicode block U+2070–U+209F; note that Latin-1
 *   `²` / `³` are outside that block and are accepted).
 *
 * Format: `.ts` with `as const` exports — literal values only.
 */

export const INVALID_SLUGS = ['with space', 'ünïcödé'] as const;

export const SUBSCRIPT_SUPERSCRIPT_NAMES = ['H₂O Tools', 'Tools⁴'] as const;
