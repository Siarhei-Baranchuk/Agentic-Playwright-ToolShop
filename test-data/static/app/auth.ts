/**
 * Curated data for the UI authentication and account tests.
 *
 * - `REGISTRATION_COUNTRY` — the country picked in the registration form;
 *   the postcode lookup resolves any five-digit postcode for it.
 * - `NON_NUMERIC_PHONE` — a phone value with letters and a dash.
 * - `WRONG_TOTP_CODE` — a well-formed 6-digit code that is not the current one.
 *
 * Format: `.ts` with `as const` exports — literal values only.
 */

export const REGISTRATION_COUNTRY = { code: 'DE', label: 'Germany' } as const;

export const NON_NUMERIC_PHONE = 'abc-123';

export const WRONG_TOTP_CODE = '000000';
