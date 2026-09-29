import { Secret, TOTP } from 'otpauth';

/**
 * Generates the current 6-digit TOTP code for a base32 secret — the code an
 * authenticator app would show (SHA1, 30-second period).
 *
 * @param {string} secret - The base32 secret returned by `POST /totp/setup`.
 * @returns {string} The current 6-digit code.
 *
 * @example
 * ```ts
 * const code = generateTotpCode(setup.secret);
 * ```
 */
export function generateTotpCode(secret: string): string {
    return new TOTP({ secret: Secret.fromBase32(secret) }).generate();
}
