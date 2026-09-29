/**
 * Universal invalid values for resource-id path parameters.
 *
 * Every endpoint with a path parameter is fuzzed with these values — the
 * API must answer 404 for each (see `.claude/skills/api-testing/SKILL.md`,
 * Phase 6, "Path-parameter validation"). Two branches are enough: a
 * well-formed id that does not exist, and a malformed one. Spec files
 * `encodeURIComponent` the value (`fillPath` does it) before putting it
 * into the URL.
 *
 * Format: `.ts` with `as const` exports — literal values only.
 */

export const INVALID_PATH_IDS = [
    { description: 'non-existent id', value: '01ZZZZZZZZZZZZZZZZZZZZZZZZ' },
    { description: 'malformed id', value: "<script>' OR '1'='1" },
] as const;
