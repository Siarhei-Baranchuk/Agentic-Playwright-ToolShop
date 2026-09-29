/* eslint-disable playwright/no-skipped-test -- documented contract gaps are kept as skipped tests with a FIXME */
import { ApiEndpoints, ApiMessages } from '../../../enums/app/app';
import {
    TotpErrorResponse,
    TotpErrorResponseSchema,
    TotpSetupResponse,
    TotpSetupResponseSchema,
    TotpVerifyResponse,
    TotpVerifyResponseSchema,
} from '../../../fixtures/api/schemas/app/totpSchema';
import {
    ErrorFieldResponse,
    ErrorFieldResponseSchema,
    UnauthorizedResponse,
    UnauthorizedResponseSchema,
    UnprocessableEntityResponse,
    UnprocessableEntityResponseSchema,
} from '../../../fixtures/api/schemas/util/errorResponseSchema';
import { expect, test } from '../../../fixtures/pom/test-options';
import { enableTotp } from '../../../helpers/app/users';
import { generateTotpCode } from '../../../helpers/util/totp';
import { required } from '../../../helpers/util/util';
import { INVALID_STRING_VALUES } from '../../../test-data/static/util/invalid-values';

test.describe('POST /totp/setup', () => {
    test(
        'should return 200 with a secret and an otpauth QR code URL',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { status, body } = await apiRequest<TotpSetupResponse>({
                method: 'POST',
                url: ApiEndpoints.TOTP_SETUP,
                headers: registeredUser.token,
            });

            expect(status).toBe(200);
            expect(TotpSetupResponseSchema.parse(body)).toBeTruthy();
            expect(body.qrCodeUrl).toContain(`secret=${body.secret}`);
        }
    );

    test(
        'should return 400 when TOTP is already enabled',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            await test.step('Enable TOTP via POST /totp/setup + /totp/verify', async () => {
                await enableTotp(apiRequest, registeredUser);
            });

            await test.step('Set up TOTP again via POST /totp/setup', async () => {
                const { status, body } = await apiRequest<TotpErrorResponse>({
                    method: 'POST',
                    url: ApiEndpoints.TOTP_SETUP,
                    headers: registeredUser.token,
                });

                expect(status).toBe(400);
                expect(TotpErrorResponseSchema.parse(body)).toBeTruthy();
                expect(body.error).toBe(ApiMessages.TOTP_ALREADY_ENABLED);
            });
        }
    );

    // 403 is not documented for this operation; the backend refuses TOTP for the shared demo accounts.
    test(
        'should return 403 for a shared demo account',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<ErrorFieldResponse>({
                method: 'POST',
                url: ApiEndpoints.TOTP_SETUP,
                headers: process.env.ACCESS_TOKEN,
            });

            expect(status).toBe(403);
            expect(ErrorFieldResponseSchema.parse(body)).toBeTruthy();
            expect(body.error).toBe(ApiMessages.TOTP_NOT_ALLOWED);
        }
    );

    test(
        'should return 401 without an access token',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<UnauthorizedResponse>({
                method: 'POST',
                url: ApiEndpoints.TOTP_SETUP,
            });

            expect(status).toBe(401);
            expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
        }
    );
});

test.describe('POST /totp/verify', () => {
    test(
        'should return 200 and enable TOTP for a valid code',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            let secret = '';

            await test.step('Set up TOTP via POST /totp/setup', async () => {
                const { status, body } = await apiRequest<TotpSetupResponse>({
                    method: 'POST',
                    url: ApiEndpoints.TOTP_SETUP,
                    headers: registeredUser.token,
                });

                expect(status).toBe(200);
                expect(TotpSetupResponseSchema.parse(body)).toBeTruthy();
                secret = required(body.secret, 'TOTP secret');
            });

            await test.step('Verify a code via POST /totp/verify', async () => {
                const { status, body } = await apiRequest<TotpVerifyResponse>({
                    method: 'POST',
                    url: ApiEndpoints.TOTP_VERIFY,
                    headers: registeredUser.token,
                    body: { totp: generateTotpCode(secret) },
                });

                expect(status).toBe(200);
                expect(TotpVerifyResponseSchema.parse(body)).toBeTruthy();
                expect(body.message).toBe(ApiMessages.TOTP_ENABLED);
            });
        }
    );

    test(
        'should return 400 for an invalid code',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            await test.step('Set up TOTP via POST /totp/setup', async () => {
                const { status, body } = await apiRequest<TotpSetupResponse>({
                    method: 'POST',
                    url: ApiEndpoints.TOTP_SETUP,
                    headers: registeredUser.token,
                });

                expect(status).toBe(200);
                expect(TotpSetupResponseSchema.parse(body)).toBeTruthy();
            });

            await test.step('Verify a wrong code via POST /totp/verify', async () => {
                const { status, body } = await apiRequest<TotpErrorResponse>({
                    method: 'POST',
                    url: ApiEndpoints.TOTP_VERIFY,
                    headers: registeredUser.token,
                    body: { totp: '000000' },
                });

                expect(status).toBe(400);
                expect(TotpErrorResponseSchema.parse(body)).toBeTruthy();
                expect(body.error).toBe(ApiMessages.INVALID_TOTP);
            });
        }
    );

    test(
        'should return 401 without an access token',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<UnauthorizedResponse>({
                method: 'POST',
                url: ApiEndpoints.TOTP_VERIFY,
                body: { totp: '123456' },
            });

            expect(status).toBe(401);
            expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
        }
    );

    // FIXME: validation errors of /totp/verify answer 404 "Resource not found" instead of 422. See docs/test-plan.md, defect #13.
    test.skip(
        'should return 422 when totp is missing',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { status, body } =
                await apiRequest<UnprocessableEntityResponse>({
                    method: 'POST',
                    url: ApiEndpoints.TOTP_VERIFY,
                    headers: registeredUser.token,
                    body: {},
                });

            expect(status).toBe(422);
            expect(UnprocessableEntityResponseSchema.parse(body)).toBeTruthy();
        }
    );

    // FIXME: validation errors of /totp/verify answer 404 "Resource not found" instead of 422. See docs/test-plan.md, defect #13.
    for (const invalidValue of [...INVALID_STRING_VALUES, '12345']) {
        test.skip(
            `should return 422 when totp is ${JSON.stringify(invalidValue)}`,
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.TOTP_VERIFY,
                        headers: registeredUser.token,
                        body: { totp: invalidValue },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    }
});
