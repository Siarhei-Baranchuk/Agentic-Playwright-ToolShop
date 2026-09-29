/**
 * Universal invalid-value arrays for negative/validation API tests.
 *
 * Risk-based minimal sets: ONE value per validation branch of the type —
 * a value of the wrong type, plus `null` (the nullable / required branch).
 * Values that hit the same branch (e.g. `true` next to `123` for a string)
 * are left out on purpose; omission (`undefined`) is covered by the
 * per-field "missing" tests instead.
 *
 * - POST (create): loop over the arrays below, one test per value.
 * - PUT / PATCH: one test per field with `PRIMARY_INVALID_VALUES`.
 *
 * Import these in spec files — do NOT redefine them inline. Field-specific
 * boundary values may stay inline; see `.claude/skills/api-testing/SKILL.md`
 * (Phase 6). The file is `.ts` (not `.json`) so tuples keep narrow literal
 * types via `as const`.
 */

export const INVALID_STRING_VALUES = [123, null] as const;

/** `'123'` is kept: a numeric string passes lenient number validators */
export const INVALID_NUMBER_VALUES = ['string', '123', null] as const;

export const INVALID_BOOLEAN_VALUES = ['yes', null] as const;

export const INVALID_UUID_VALUES = ['not-a-uuid', null] as const;

export const INVALID_ENUM_VALUES = ['invalidValue', null] as const;

export const INVALID_ARRAY_VALUES = ['string', null] as const;

export const INVALID_OBJECT_VALUES = ['string', null] as const;

/**
 * The single most likely-to-break wrong-type value per field type — used
 * for the one invalid-type test per field on PUT / PATCH.
 */
export const PRIMARY_INVALID_VALUES = {
    STRING: 123,
    NUMBER: 'string',
    BOOLEAN: 'yes',
    UUID: 'not-a-uuid',
    ENUM: 'invalidValue',
    ARRAY: 'string',
    OBJECT: 'string',
} as const;
