/* eslint-disable playwright/no-skipped-test -- documented contract gaps are kept as skipped tests with a FIXME */
import { ApiEndpoints, ApiMessages } from '../../../enums/app/app';
import {
    TokenResponse,
    TokenResponseSchema,
    TotpRequiredLoginResponse,
    TotpRequiredLoginResponseSchema,
    User,
    UserSchema,
    LogoutResponse,
    LogoutResponseSchema,
} from '../../../fixtures/api/schemas/app/userSchema';
import {
    UpdateResponse,
    UpdateResponseSchema,
} from '../../../fixtures/api/schemas/util/commonResponseSchema';
import {
    ErrorFieldResponse,
    ErrorFieldResponseSchema,
    OperationFailedResponse,
    OperationFailedResponseSchema,
    UnauthorizedResponse,
    UnauthorizedResponseSchema,
    UnprocessableEntityResponse,
    UnprocessableEntityResponseSchema,
} from '../../../fixtures/api/schemas/util/errorResponseSchema';
import { expect, test } from '../../../fixtures/pom/test-options';
import { enableTotp } from '../../../helpers/app/users';
import { generateTotpCode } from '../../../helpers/util/totp';
import { fillPath } from '../../../helpers/util/util';
import {
    generateLoginCredentials,
    generateStrongPassword,
} from '../../../test-data/factories/app/user.factory';
import { WEAK_PASSWORDS } from '../../../test-data/static/app/invalidCredentials';
import { INVALID_STRING_VALUES } from '../../../test-data/static/util/invalid-values';

/** Failed logins after which a (non-admin) account is locked — backend `MAX_LOGIN_ATTEMPTS` */
const MAX_LOGIN_ATTEMPTS = 3;
const LOGIN_FIELDS = ['email', 'password'] as const;

test.describe('POST /users/login', () => {
    test(
        'should return 200 and a token for a registered user',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { status, body } = await apiRequest<TokenResponse>({
                method: 'POST',
                url: ApiEndpoints.LOGIN,
                body: {
                    email: registeredUser.email,
                    password: registeredUser.password,
                },
            });

            expect(status).toBe(200);
            expect(TokenResponseSchema.parse(body)).toBeTruthy();
        }
    );

    // Error codes below are not documented for login (the spec lists only 200); they follow the backend.
    test(
        'should return 401 for a wrong password',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { status, body } = await apiRequest<ErrorFieldResponse>({
                method: 'POST',
                url: ApiEndpoints.LOGIN,
                body: {
                    email: registeredUser.email,
                    password: generateStrongPassword(),
                },
            });

            expect(status).toBe(401);
            expect(ErrorFieldResponseSchema.parse(body)).toBeTruthy();
            expect(body.error).toBe(ApiMessages.UNAUTHORIZED);
        }
    );

    test(
        'should return 401 for an empty body',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<ErrorFieldResponse>({
                method: 'POST',
                url: ApiEndpoints.LOGIN,
                body: {},
            });

            expect(status).toBe(401);
            expect(ErrorFieldResponseSchema.parse(body)).toBeTruthy();
            expect(body.error).toBe(ApiMessages.INVALID_LOGIN_REQUEST);
        }
    );

    for (const field of LOGIN_FIELDS) {
        test(
            `should return 401 when ${field} is missing`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { [field]: _omitted, ...payload } =
                    generateLoginCredentials();

                const { status, body } = await apiRequest<ErrorFieldResponse>({
                    method: 'POST',
                    url: ApiEndpoints.LOGIN,
                    body: payload,
                });

                expect(status).toBe(401);
                expect(ErrorFieldResponseSchema.parse(body)).toBeTruthy();
                expect(body.error).toBe(ApiMessages.INVALID_LOGIN_REQUEST);
            }
        );

        for (const invalidValue of INVALID_STRING_VALUES) {
            test(
                `should return 401 when ${field} is ${JSON.stringify(invalidValue)}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ErrorFieldResponse>({
                            method: 'POST',
                            url: ApiEndpoints.LOGIN,
                            body: {
                                ...generateLoginCredentials(),
                                [field]: invalidValue,
                            },
                        });

                    expect(status).toBe(401);
                    expect(ErrorFieldResponseSchema.parse(body)).toBeTruthy();
                }
            );
        }
    }

    test(
        `should return 423 after ${MAX_LOGIN_ATTEMPTS} failed attempts, even with the right password`,
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            for (let attempt = 1; attempt <= MAX_LOGIN_ATTEMPTS; attempt++) {
                await test.step(`Fail login attempt ${attempt} via POST /users/login`, async () => {
                    const { status, body } =
                        await apiRequest<ErrorFieldResponse>({
                            method: 'POST',
                            url: ApiEndpoints.LOGIN,
                            body: {
                                email: registeredUser.email,
                                password: generateStrongPassword(),
                            },
                        });

                    expect(status).toBe(401);
                    expect(ErrorFieldResponseSchema.parse(body)).toBeTruthy();
                });
            }

            await test.step('Log in with the right password via POST /users/login', async () => {
                const { status, body } = await apiRequest<ErrorFieldResponse>({
                    method: 'POST',
                    url: ApiEndpoints.LOGIN,
                    body: {
                        email: registeredUser.email,
                        password: registeredUser.password,
                    },
                });

                expect(status).toBe(423);
                expect(ErrorFieldResponseSchema.parse(body)).toBeTruthy();
                expect(body.error).toBe(ApiMessages.ACCOUNT_LOCKED);
            });
        }
    );

    test(
        'should never lock the admin account',
        { tag: '@api' },
        async ({ apiRequest }) => {
            for (let attempt = 1; attempt <= MAX_LOGIN_ATTEMPTS; attempt++) {
                await test.step(`Fail admin login attempt ${attempt} via POST /users/login`, async () => {
                    const { status, body } =
                        await apiRequest<ErrorFieldResponse>({
                            method: 'POST',
                            url: ApiEndpoints.LOGIN,
                            body: {
                                email: process.env.ADMIN_EMAIL,
                                password: generateStrongPassword(),
                            },
                        });

                    expect(status).toBe(401);
                    expect(ErrorFieldResponseSchema.parse(body)).toBeTruthy();
                });
            }

            await test.step('Log in as the admin via POST /users/login', async () => {
                const { status, body } = await apiRequest<TokenResponse>({
                    method: 'POST',
                    url: ApiEndpoints.LOGIN,
                    body: {
                        email: process.env.ADMIN_EMAIL,
                        password: process.env.ADMIN_PASSWORD,
                    },
                });

                expect(status).toBe(200);
                expect(TokenResponseSchema.parse(body)).toBeTruthy();
            });
        }
    );

    test(
        'should return 403 for a disabled account',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            await test.step('Disable the account via PATCH /users/{userId} (admin)', async () => {
                const { status, body } = await apiRequest<UpdateResponse>({
                    method: 'PATCH',
                    url: fillPath(ApiEndpoints.USER, {
                        userId: registeredUser.id,
                    }),
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                    body: { enabled: false },
                });

                expect(status).toBe(200);
                expect(UpdateResponseSchema.parse(body)).toBeTruthy();
            });

            await test.step('Log in via POST /users/login', async () => {
                const { status, body } = await apiRequest<ErrorFieldResponse>({
                    method: 'POST',
                    url: ApiEndpoints.LOGIN,
                    body: {
                        email: registeredUser.email,
                        password: registeredUser.password,
                    },
                });

                expect(status).toBe(403);
                expect(ErrorFieldResponseSchema.parse(body)).toBeTruthy();
                expect(body.error).toBe(ApiMessages.ACCOUNT_DISABLED);
            });
        }
    );

    test.describe('with TOTP enabled', () => {
        test(
            'should require a TOTP code and log in with a valid one',
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const secret =
                    await test.step('Enable TOTP via POST /totp/setup + /totp/verify', async () =>
                        enableTotp(apiRequest, registeredUser));

                let restrictedToken = '';

                await test.step('Log in with the password via POST /users/login', async () => {
                    const { status, body } =
                        await apiRequest<TotpRequiredLoginResponse>({
                            method: 'POST',
                            url: ApiEndpoints.LOGIN,
                            body: {
                                email: registeredUser.email,
                                password: registeredUser.password,
                            },
                        });

                    expect(status).toBe(200);
                    expect(
                        TotpRequiredLoginResponseSchema.parse(body)
                    ).toBeTruthy();
                    expect(body.message).toBe(ApiMessages.TOTP_REQUIRED);
                    restrictedToken = body.access_token;
                });

                await test.step('Exchange the restricted token and a TOTP code via POST /users/login', async () => {
                    const { status, body } = await apiRequest<TokenResponse>({
                        method: 'POST',
                        url: ApiEndpoints.LOGIN,
                        body: {
                            access_token: restrictedToken,
                            totp: generateTotpCode(secret),
                        },
                    });

                    expect(status).toBe(200);
                    expect(TokenResponseSchema.parse(body)).toBeTruthy();
                });
            }
        );

        test(
            'should return 401 for an invalid TOTP code',
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                await test.step('Enable TOTP via POST /totp/setup + /totp/verify', async () => {
                    await enableTotp(apiRequest, registeredUser);
                });

                let restrictedToken = '';

                await test.step('Log in with the password via POST /users/login', async () => {
                    const { status, body } =
                        await apiRequest<TotpRequiredLoginResponse>({
                            method: 'POST',
                            url: ApiEndpoints.LOGIN,
                            body: {
                                email: registeredUser.email,
                                password: registeredUser.password,
                            },
                        });

                    expect(status).toBe(200);
                    expect(
                        TotpRequiredLoginResponseSchema.parse(body)
                    ).toBeTruthy();
                    restrictedToken = body.access_token;
                });

                await test.step('Send a wrong TOTP code via POST /users/login', async () => {
                    const { status, body } =
                        await apiRequest<ErrorFieldResponse>({
                            method: 'POST',
                            url: ApiEndpoints.LOGIN,
                            body: {
                                access_token: restrictedToken,
                                totp: '000000',
                            },
                        });

                    expect(status).toBe(401);
                    expect(ErrorFieldResponseSchema.parse(body)).toBeTruthy();
                    expect(body.error).toBe(ApiMessages.INVALID_TOTP);
                });
            }
        );
    });

    test(
        'should return 401 when a regular token is used as a TOTP token',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { status, body } = await apiRequest<ErrorFieldResponse>({
                method: 'POST',
                url: ApiEndpoints.LOGIN,
                body: { access_token: registeredUser.token, totp: '123456' },
            });

            expect(status).toBe(401);
            expect(ErrorFieldResponseSchema.parse(body)).toBeTruthy();
            expect(body.error).toBe(ApiMessages.UNAUTHORIZED_TOKEN_USAGE);
        }
    );

    test(
        'should return 400 for a malformed TOTP token',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<ErrorFieldResponse>({
                method: 'POST',
                url: ApiEndpoints.LOGIN,
                body: { access_token: 'not-a-jwt', totp: '123456' },
            });

            expect(status).toBe(400);
            expect(ErrorFieldResponseSchema.parse(body)).toBeTruthy();
            expect(body.error).toBe(ApiMessages.INVALID_OR_EXPIRED_TOKEN);
        }
    );
});

test.describe('GET /users/me', () => {
    test(
        'should return 200 and the current user',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { status, body } = await apiRequest<User>({
                method: 'GET',
                url: ApiEndpoints.CURRENT_USER,
                headers: registeredUser.token,
            });

            expect(status).toBe(200);
            expect(UserSchema.parse(body)).toBeTruthy();
            expect(body).toMatchObject({
                id: registeredUser.id,
                email: registeredUser.email,
                first_name: registeredUser.first_name,
                last_name: registeredUser.last_name,
            });
        }
    );

    test(
        'should return 401 without an access token',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<UnauthorizedResponse>({
                method: 'GET',
                url: ApiEndpoints.CURRENT_USER,
            });

            expect(status).toBe(401);
            expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
        }
    );

    test(
        'should return 401 for an invalid access token',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<UnauthorizedResponse>({
                method: 'GET',
                url: ApiEndpoints.CURRENT_USER,
                headers: 'not-a-jwt',
            });

            expect(status).toBe(401);
            expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
        }
    );
});

test.describe('GET /users/refresh', () => {
    test(
        'should return 200 and a new token that replaces the old one',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            let newToken = '';

            await test.step('Refresh the token via GET /users/refresh', async () => {
                const { status, body } = await apiRequest<TokenResponse>({
                    method: 'GET',
                    url: ApiEndpoints.REFRESH,
                    headers: registeredUser.token,
                });

                expect(status).toBe(200);
                expect(TokenResponseSchema.parse(body)).toBeTruthy();
                newToken = body.access_token;
            });

            await test.step('Use the new token via GET /users/me', async () => {
                const { status, body } = await apiRequest<User>({
                    method: 'GET',
                    url: ApiEndpoints.CURRENT_USER,
                    headers: newToken,
                });

                expect(status).toBe(200);
                expect(UserSchema.parse(body)).toBeTruthy();
            });

            await test.step('Reject the old token via GET /users/me', async () => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method: 'GET',
                        url: ApiEndpoints.CURRENT_USER,
                        headers: registeredUser.token,
                    }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            });
        }
    );

    // FIXME: refresh without a (valid) token fails with a 500 HTML error page instead of 401. See docs/test-plan.md, defect #19.
    test.skip(
        'should return 401 without an access token',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<UnauthorizedResponse>({
                method: 'GET',
                url: ApiEndpoints.REFRESH,
            });

            expect(status).toBe(401);
            expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
        }
    );

    // FIXME: 400 "Bad Request" is documented for refresh, but no request reproduces it.
    test.skip(
        'should return 400 for a bad refresh request',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status } = await apiRequest({
                method: 'GET',
                url: ApiEndpoints.REFRESH,
                headers: 'not-a-jwt',
            });

            expect(status).toBe(400);
        }
    );
});

test.describe('GET /users/logout', () => {
    test(
        'should return 200 and invalidate the token',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            await test.step('Log out via GET /users/logout', async () => {
                const { status, body } = await apiRequest<LogoutResponse>({
                    method: 'GET',
                    url: ApiEndpoints.LOGOUT,
                    headers: registeredUser.token,
                });

                expect(status).toBe(200);
                expect(LogoutResponseSchema.parse(body)).toBeTruthy();
                expect(body.message).toBe(ApiMessages.LOGGED_OUT);
            });

            await test.step('Reject the token via GET /users/me', async () => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method: 'GET',
                        url: ApiEndpoints.CURRENT_USER,
                        headers: registeredUser.token,
                    }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            });
        }
    );

    test(
        'should return 401 without an access token',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<UnauthorizedResponse>({
                method: 'GET',
                url: ApiEndpoints.LOGOUT,
            });

            expect(status).toBe(401);
            expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
        }
    );

    // FIXME: 400 "Bad Request" is documented for logout, but no request reproduces it.
    test.skip(
        'should return 400 for a bad logout request',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status } = await apiRequest({
                method: 'GET',
                url: ApiEndpoints.LOGOUT,
                headers: 'not-a-jwt',
            });

            expect(status).toBe(400);
        }
    );
});

test.describe('POST /users/forgot-password', () => {
    test(
        'should return 200 and replace the password',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            await test.step('Request a new password via POST /users/forgot-password', async () => {
                const { status, body } = await apiRequest<UpdateResponse>({
                    method: 'POST',
                    url: ApiEndpoints.FORGOT_PASSWORD,
                    body: { email: registeredUser.email },
                });

                expect(status).toBe(200);
                expect(UpdateResponseSchema.parse(body)).toBeTruthy();
                expect(body.success).toBe(true);
            });

            await test.step('Reject the old password via POST /users/login', async () => {
                const { status, body } = await apiRequest<ErrorFieldResponse>({
                    method: 'POST',
                    url: ApiEndpoints.LOGIN,
                    body: {
                        email: registeredUser.email,
                        password: registeredUser.password,
                    },
                });

                expect(status).toBe(401);
                expect(ErrorFieldResponseSchema.parse(body)).toBeTruthy();
            });
        }
    );

    // FIXME: an unknown email answers 404 "Resource not found" (validation errors are mapped to 404) instead of the documented 400. See docs/test-plan.md, defect #13.
    test.skip(
        'should return 400 for an unknown email',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status } = await apiRequest({
                method: 'POST',
                url: ApiEndpoints.FORGOT_PASSWORD,
                body: { email: generateLoginCredentials().email },
            });

            expect(status).toBe(400);
        }
    );

    // FIXME: 401 and 403 are documented for forgot-password, but the endpoint is public and no request reproduces them.
    for (const code of [401, 403]) {
        test.skip(
            `should return ${code} for forgot-password`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status } = await apiRequest({
                    method: 'POST',
                    url: ApiEndpoints.FORGOT_PASSWORD,
                    body: { email: generateLoginCredentials().email },
                });

                expect(status).toBe(code);
            }
        );
    }
});

test.describe('POST /users/change-password', () => {
    test(
        'should return 200 and change the password',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const newPassword = generateStrongPassword();

            await test.step('Change the password via POST /users/change-password', async () => {
                const { status, body } = await apiRequest<UpdateResponse>({
                    method: 'POST',
                    url: ApiEndpoints.CHANGE_PASSWORD,
                    headers: registeredUser.token,
                    body: {
                        current_password: registeredUser.password,
                        new_password: newPassword,
                        new_password_confirmation: newPassword,
                    },
                });

                expect(status).toBe(200);
                expect(UpdateResponseSchema.parse(body)).toBeTruthy();
                expect(body.success).toBe(true);
            });

            await test.step('Log in with the new password via POST /users/login', async () => {
                const { status, body } = await apiRequest<TokenResponse>({
                    method: 'POST',
                    url: ApiEndpoints.LOGIN,
                    body: {
                        email: registeredUser.email,
                        password: newPassword,
                    },
                });

                expect(status).toBe(200);
                expect(TokenResponseSchema.parse(body)).toBeTruthy();
            });
        }
    );

    test(
        'should return 401 without an access token',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const newPassword = generateStrongPassword();
            const { status, body } = await apiRequest<UnauthorizedResponse>({
                method: 'POST',
                url: ApiEndpoints.CHANGE_PASSWORD,
                body: {
                    current_password: generateStrongPassword(),
                    new_password: newPassword,
                    new_password_confirmation: newPassword,
                },
            });

            expect(status).toBe(401);
            expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
        }
    );

    // Rejections below answer 400 — not documented for this operation (the spec lists 200 and 401 only).
    test(
        'should return 400 for a wrong current password',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const newPassword = generateStrongPassword();
            const { status, body } = await apiRequest<OperationFailedResponse>({
                method: 'POST',
                url: ApiEndpoints.CHANGE_PASSWORD,
                headers: registeredUser.token,
                body: {
                    current_password: generateStrongPassword(),
                    new_password: newPassword,
                    new_password_confirmation: newPassword,
                },
            });

            expect(status).toBe(400);
            expect(OperationFailedResponseSchema.parse(body)).toBeTruthy();
            expect(body.message).toBe(ApiMessages.WRONG_CURRENT_PASSWORD);
        }
    );

    test(
        'should return 400 when the new password equals the current one',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { status, body } = await apiRequest<OperationFailedResponse>({
                method: 'POST',
                url: ApiEndpoints.CHANGE_PASSWORD,
                headers: registeredUser.token,
                body: {
                    current_password: registeredUser.password,
                    new_password: registeredUser.password,
                    new_password_confirmation: registeredUser.password,
                },
            });

            expect(status).toBe(400);
            expect(OperationFailedResponseSchema.parse(body)).toBeTruthy();
            expect(body.message).toBe(ApiMessages.SAME_NEW_PASSWORD);
        }
    );

    // FIXME: validation errors of change-password answer 404 "Resource not found" instead of 422. See docs/test-plan.md, defect #13.
    for (const { rule, value } of WEAK_PASSWORDS) {
        test.skip(
            `should return 422 for a new password with ${rule}`,
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.CHANGE_PASSWORD,
                        headers: registeredUser.token,
                        body: {
                            current_password: registeredUser.password,
                            new_password: value,
                            new_password_confirmation: value,
                        },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    }

    // FIXME: validation errors of change-password answer 404 "Resource not found" instead of 422. See docs/test-plan.md, defect #13.
    test.skip(
        'should return 422 when the confirmation does not match',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { status, body } =
                await apiRequest<UnprocessableEntityResponse>({
                    method: 'POST',
                    url: ApiEndpoints.CHANGE_PASSWORD,
                    headers: registeredUser.token,
                    body: {
                        current_password: registeredUser.password,
                        new_password: generateStrongPassword(),
                        new_password_confirmation: generateStrongPassword(),
                    },
                });

            expect(status).toBe(422);
            expect(UnprocessableEntityResponseSchema.parse(body)).toBeTruthy();
        }
    );
});
