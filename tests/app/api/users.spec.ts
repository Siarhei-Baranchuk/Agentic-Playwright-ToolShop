/* eslint-disable playwright/no-skipped-test -- documented contract gaps are kept as skipped tests with a FIXME */
import { ApiEndpoints, ApiMessages, UserRules } from '../../../enums/app/app';
import {
    Favorite,
    FavoriteSchema,
} from '../../../fixtures/api/schemas/app/favoriteSchema';
import {
    PaginatedProducts,
    PaginatedProductSchema,
} from '../../../fixtures/api/schemas/app/productSchema';
import {
    PaginatedUsers,
    PaginatedUserSchema,
    User,
    UserList,
    UserListSchema,
    UserRequest,
    UserSchema,
} from '../../../fixtures/api/schemas/app/userSchema';
import {
    UpdateResponse,
    UpdateResponseSchema,
} from '../../../fixtures/api/schemas/util/commonResponseSchema';
import {
    ConflictResponse,
    ConflictResponseSchema,
    DuplicateConflictResponse,
    DuplicateConflictResponseSchema,
    ErrorFieldResponse,
    ErrorFieldResponseSchema,
    ForbiddenResponse,
    ForbiddenResponseSchema,
    ItemNotFoundResponse,
    ItemNotFoundResponseSchema,
    MethodNotAllowedResponse,
    MethodNotAllowedResponseSchema,
    UnauthorizedResponse,
    UnauthorizedResponseSchema,
    UnprocessableEntityResponse,
    UnprocessableEntityResponseSchema,
} from '../../../fixtures/api/schemas/util/errorResponseSchema';
import { expect, test } from '../../../fixtures/pom/test-options';
import { deleteUser, registerUser } from '../../../helpers/app/users';
import { fillPath, required } from '../../../helpers/util/util';
import { generateSearchToken } from '../../../test-data/factories/app/catalog.factory';
import { generateUserRegistration } from '../../../test-data/factories/app/user.factory';
import { SUBSCRIPT_SUPERSCRIPT_NAMES } from '../../../test-data/static/app/invalidCatalog';
import { WEAK_PASSWORDS } from '../../../test-data/static/app/invalidCredentials';
import { INVALID_PATH_IDS } from '../../../test-data/static/util/invalid-path-params';
import {
    INVALID_OBJECT_VALUES,
    INVALID_STRING_VALUES,
    PRIMARY_INVALID_VALUES,
} from '../../../test-data/static/util/invalid-values';

/** Required on POST /users/register (StoreCustomer) */
const REQUIRED_FIELDS = [
    'first_name',
    'last_name',
    'email',
    'password',
] as const;
const STRING_FIELDS = [
    'first_name',
    'last_name',
    'email',
    'password',
    'phone',
    'dob',
] as const;
const LENGTH_LIMITS = [
    { field: 'first_name', max: UserRules.FIRST_NAME_MAX_LENGTH },
    { field: 'last_name', max: UserRules.LAST_NAME_MAX_LENGTH },
    { field: 'phone', max: UserRules.PHONE_MAX_LENGTH },
] as const;

/**
 * Returns an ISO date (YYYY-MM-DD) `years` years before today.
 *
 * @param {number} years - Years to go back.
 * @returns {string} The date.
 */
function yearsAgo(years: number): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    return date.toISOString().slice(0, 10);
}

/**
 * The body of a full update (`PUT /users/{userId}`) for a user: everything
 * from the registration payload except the password.
 *
 * @param {string} email - The user's own (unchanged) email.
 * @returns {Omit<UserRequest, 'password'>} The update body.
 */
function generateUserUpdate(email: string): Omit<UserRequest, 'password'> {
    const { password: _password, ...update } = generateUserRegistration({
        email,
    });
    return update;
}

test.describe('POST /users/register', () => {
    const createdIds: string[] = [];

    test.afterAll(async ({ apiRequest }) => {
        for (const id of createdIds) {
            // A token is only needed to clear favorites; these users have none
            await deleteUser(apiRequest, { id, token: '' });
        }
    });

    test(
        'should return 201 and the registered user',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { password: _password, ...expected } =
                generateUserRegistration();

            const { status, body } = await apiRequest<User>({
                method: 'POST',
                url: ApiEndpoints.REGISTER,
                body: {
                    ...expected,
                    password: generateUserRegistration().password,
                },
            });
            createdIds.push(required(body.id, 'user id'));

            expect(status).toBe(201);
            expect(UserSchema.parse(body)).toBeTruthy();
            expect(body).toMatchObject(expected);
            expect(body).not.toHaveProperty('password');
        }
    );

    // FIXME: without an address the body returns street / city / country = null; UserResponse types them as string. See docs/test-plan.md, defect #25.
    test.skip(
        'should return 201 with only the required fields',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { first_name, last_name, email, password } =
                generateUserRegistration();

            const { status, body } = await apiRequest<User>({
                method: 'POST',
                url: ApiEndpoints.REGISTER,
                body: { first_name, last_name, email, password },
            });
            createdIds.push(required(body.id, 'user id'));

            expect(status).toBe(201);
            expect(UserSchema.parse(body)).toBeTruthy();
        }
    );

    test(
        'should return 409 when the email is already registered',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { status, body } =
                await apiRequest<DuplicateConflictResponse>({
                    method: 'POST',
                    url: ApiEndpoints.REGISTER,
                    body: generateUserRegistration({
                        email: registeredUser.email,
                    }),
                });

            expect(status).toBe(409);
            expect(DuplicateConflictResponseSchema.parse(body)).toBeTruthy();
        }
    );

    // Validation errors answer 422; the spec documents 400 "Bad Request" for this operation.
    test(
        'should return 422 for an empty body',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } =
                await apiRequest<UnprocessableEntityResponse>({
                    method: 'POST',
                    url: ApiEndpoints.REGISTER,
                    body: {},
                });

            expect(status).toBe(422);
            expect(UnprocessableEntityResponseSchema.parse(body)).toBeTruthy();
        }
    );

    for (const field of REQUIRED_FIELDS) {
        test(
            `should return 422 when ${field} is missing`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { [field]: _omitted, ...payload } =
                    generateUserRegistration();

                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.REGISTER,
                        body: payload,
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
                expect(body).toHaveProperty(field);
            }
        );
    }

    for (const field of STRING_FIELDS) {
        for (const invalidValue of INVALID_STRING_VALUES) {
            test(
                `should return 422 when ${field} is ${JSON.stringify(invalidValue)}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method: 'POST',
                            url: ApiEndpoints.REGISTER,
                            body: {
                                ...generateUserRegistration(),
                                [field]: invalidValue,
                            },
                        });

                    expect(status).toBe(422);
                    expect(
                        UnprocessableEntityResponseSchema.parse(body)
                    ).toBeTruthy();
                }
            );
        }
    }

    for (const invalidValue of INVALID_OBJECT_VALUES) {
        test(
            `should return 422 when address is ${JSON.stringify(invalidValue)}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.REGISTER,
                        body: {
                            ...generateUserRegistration(),
                            address: invalidValue,
                        },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    }

    for (const { rule, value } of WEAK_PASSWORDS) {
        test(
            `should return 422 for a password with ${rule}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.REGISTER,
                        body: {
                            ...generateUserRegistration(),
                            password: value,
                        },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
                expect(body).toHaveProperty('password');
            }
        );
    }

    for (const { description, dob } of [
        {
            description: 'younger than 18',
            dob: yearsAgo(UserRules.MIN_AGE - 1),
        },
        { description: 'not in YYYY-MM-DD format', dob: '05/05/1990' },
    ]) {
        test(
            `should return 422 when the date of birth is ${description}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.REGISTER,
                        body: { ...generateUserRegistration(), dob },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
                expect(body).toHaveProperty('dob');
            }
        );
    }

    // FIXME: the upper age bound is not enforced — both bounds are computed from one mutated date, so the effective limit is 93 years. See docs/test-plan.md, defect #24.
    test.skip(
        `should return 422 when the date of birth is older than ${UserRules.MAX_AGE}`,
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } =
                await apiRequest<UnprocessableEntityResponse>({
                    method: 'POST',
                    url: ApiEndpoints.REGISTER,
                    body: {
                        ...generateUserRegistration(),
                        dob: yearsAgo(UserRules.MAX_AGE + 1),
                    },
                });

            expect(status).toBe(422);
            expect(UnprocessableEntityResponseSchema.parse(body)).toBeTruthy();
        }
    );

    for (const { field, max } of LENGTH_LIMITS) {
        test(
            `should return 422 when ${field} is longer than ${max} characters`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.REGISTER,
                        body: {
                            ...generateUserRegistration(),
                            [field]: '1'.repeat(max + 1),
                        },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    }

    test(
        `should return 422 when email is longer than ${UserRules.EMAIL_MAX_LENGTH} characters`,
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } =
                await apiRequest<UnprocessableEntityResponse>({
                    method: 'POST',
                    url: ApiEndpoints.REGISTER,
                    body: {
                        ...generateUserRegistration(),
                        email: `${'a'.repeat(UserRules.EMAIL_MAX_LENGTH)}@example.com`,
                    },
                });

            expect(status).toBe(422);
            expect(UnprocessableEntityResponseSchema.parse(body)).toBeTruthy();
        }
    );

    test(
        'should return 422 when the first name contains sub/superscript characters',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } =
                await apiRequest<UnprocessableEntityResponse>({
                    method: 'POST',
                    url: ApiEndpoints.REGISTER,
                    body: {
                        ...generateUserRegistration(),
                        first_name: SUBSCRIPT_SUPERSCRIPT_NAMES[0],
                    },
                });

            expect(status).toBe(422);
            expect(UnprocessableEntityResponseSchema.parse(body)).toBeTruthy();
        }
    );

    // FIXME: the email format is not validated — "plaintext" is registered (201) although the contract types email as `format: email`. See docs/test-plan.md, defect #16.
    test.skip(
        'should return 422 for a malformed email',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } =
                await apiRequest<UnprocessableEntityResponse>({
                    method: 'POST',
                    url: ApiEndpoints.REGISTER,
                    body: { ...generateUserRegistration(), email: 'plaintext' },
                });

            expect(status).toBe(422);
            expect(UnprocessableEntityResponseSchema.parse(body)).toBeTruthy();
        }
    );

    // FIXME: 401 and 403 are documented for registration, but the endpoint is public and no request reproduces them.
    for (const code of [401, 403]) {
        test.skip(
            `should return ${code} for registration`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status } = await apiRequest({
                    method: 'POST',
                    url: ApiEndpoints.REGISTER,
                    body: generateUserRegistration(),
                });

                expect(status).toBe(code);
            }
        );
    }
});

test.describe('GET /users', () => {
    // FIXME: list items carry an undocumented `role` field. See docs/test-plan.md, defect #3.
    test.skip(
        'should return 200 and the paginated list of users (admin)',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<PaginatedUsers>({
                method: 'GET',
                url: ApiEndpoints.USERS,
                headers: process.env.ADMIN_ACCESS_TOKEN,
            });

            expect(status).toBe(200);
            expect(PaginatedUserSchema.parse(body)).toBeTruthy();
        }
    );

    test(
        'should return 401 without an access token',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<UnauthorizedResponse>({
                method: 'GET',
                url: ApiEndpoints.USERS,
            });

            expect(status).toBe(401);
            expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
        }
    );

    // 403 is not documented for this operation; the route is restricted to the admin role.
    test(
        'should return 403 for a customer access token',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { status, body } = await apiRequest<ForbiddenResponse>({
                method: 'GET',
                url: ApiEndpoints.USERS,
                headers: registeredUser.token,
            });

            expect(status).toBe(403);
            expect(ForbiddenResponseSchema.parse(body)).toBeTruthy();
        }
    );

    // FIXME: 400 "Bad Request" is documented for the user list, but no request reproduces it.
    test.skip(
        'should return 400 for a bad list request',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status } = await apiRequest({
                method: 'GET',
                url: ApiEndpoints.USERS,
                headers: process.env.ADMIN_ACCESS_TOKEN,
                params: { page: 'not-a-number' },
            });

            expect(status).toBe(400);
        }
    );
});

test.describe('GET /users/{userId}', () => {
    test(
        'should return 200 and the own user',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { status, body } = await apiRequest<User>({
                method: 'GET',
                url: fillPath(ApiEndpoints.USER, { userId: registeredUser.id }),
                headers: registeredUser.token,
            });

            expect(status).toBe(200);
            expect(UserSchema.parse(body)).toBeTruthy();
            expect(body).toMatchObject({
                id: registeredUser.id,
                email: registeredUser.email,
            });
        }
    );

    // FIXME: for the admin the body carries an undocumented `role` field. See docs/test-plan.md, defect #3.
    test.skip(
        'should return 200 and any user for the admin',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { status, body } = await apiRequest<User>({
                method: 'GET',
                url: fillPath(ApiEndpoints.USER, { userId: registeredUser.id }),
                headers: process.env.ADMIN_ACCESS_TOKEN,
            });

            expect(status).toBe(200);
            expect(UserSchema.parse(body)).toBeTruthy();
        }
    );

    // FIXME (body shape): 404 answers {"error": ...} instead of the documented ItemNotFoundResponse {"message": ...}. See docs/test-plan.md, defect #20.
    test(
        "should return 404 for another user's id",
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const other =
                await test.step('Register another user via POST /users/register', async () =>
                    registerUser(apiRequest));

            await test.step('Read the other user via GET /users/{userId}', async () => {
                const { status, body } = await apiRequest<ErrorFieldResponse>({
                    method: 'GET',
                    url: fillPath(ApiEndpoints.USER, { userId: other.id }),
                    headers: registeredUser.token,
                });

                expect(status).toBe(404);
                expect(ErrorFieldResponseSchema.parse(body)).toBeTruthy();
                expect(JSON.stringify(body)).not.toContain(other.email);
            });

            await test.step('Delete the other user via DELETE /users/{userId}', async () => {
                await deleteUser(apiRequest, other);
            });
        }
    );

    test(
        'should return 401 without an access token',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { status, body } = await apiRequest<UnauthorizedResponse>({
                method: 'GET',
                url: fillPath(ApiEndpoints.USER, { userId: registeredUser.id }),
            });

            expect(status).toBe(401);
            expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
        }
    );

    // FIXME (body shape): 404 answers {"error": ...} instead of the documented ItemNotFoundResponse. See docs/test-plan.md, defect #20.
    for (const { description, value } of INVALID_PATH_IDS) {
        test(
            `should return 404 for userId - ${description}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ErrorFieldResponse>({
                    method: 'GET',
                    url: fillPath(ApiEndpoints.USER, { userId: value }),
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                });

                expect(status).toBe(404);
                expect(ErrorFieldResponseSchema.parse(body)).toBeTruthy();
            }
        );
    }

    test(
        'should return 405 for an unsupported method on /users/{userId}',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { status, body } = await apiRequest<MethodNotAllowedResponse>(
                {
                    method: 'POST',
                    url: fillPath(ApiEndpoints.USER, {
                        userId: registeredUser.id,
                    }),
                    headers: registeredUser.token,
                }
            );

            expect(status).toBe(405);
            expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
        }
    );
});

test.describe('PUT /users/{userId}', () => {
    test(
        'should return 200 and update the own user',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const update = generateUserUpdate(registeredUser.email);

            await test.step('Update the user via PUT /users/{userId}', async () => {
                const { status, body } = await apiRequest<UpdateResponse>({
                    method: 'PUT',
                    url: fillPath(ApiEndpoints.USER, {
                        userId: registeredUser.id,
                    }),
                    headers: registeredUser.token,
                    body: update,
                });

                expect(status).toBe(200);
                expect(UpdateResponseSchema.parse(body)).toBeTruthy();
                expect(body.success).toBe(true);
            });

            await test.step('Read the user via GET /users/me', async () => {
                const { status, body } = await apiRequest<User>({
                    method: 'GET',
                    url: ApiEndpoints.CURRENT_USER,
                    headers: registeredUser.token,
                });

                expect(status).toBe(200);
                expect(UserSchema.parse(body)).toBeTruthy();
                expect(body).toMatchObject(update);
            });
        }
    );

    test(
        'should return 401 without an access token',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { status, body } = await apiRequest<UnauthorizedResponse>({
                method: 'PUT',
                url: fillPath(ApiEndpoints.USER, { userId: registeredUser.id }),
                body: generateUserUpdate(registeredUser.email),
            });

            expect(status).toBe(401);
            expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
        }
    );

    test(
        'should return 403 when updating another user',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const other =
                await test.step('Register another user via POST /users/register', async () =>
                    registerUser(apiRequest));

            await test.step('Update the other user via PUT /users/{userId}', async () => {
                const { status, body } = await apiRequest<ErrorFieldResponse>({
                    method: 'PUT',
                    url: fillPath(ApiEndpoints.USER, { userId: other.id }),
                    headers: registeredUser.token,
                    body: generateUserUpdate(other.email),
                });

                expect(status).toBe(403);
                expect(ErrorFieldResponseSchema.parse(body)).toBeTruthy();
                expect(body.error).toBe(ApiMessages.ONLY_OWN_DATA);
            });

            await test.step('Delete the other user via DELETE /users/{userId}', async () => {
                await deleteUser(apiRequest, other);
            });
        }
    );

    test(
        'should return 422 when a required field is missing',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { first_name: _omitted, ...update } = generateUserUpdate(
                registeredUser.email
            );

            const { status, body } =
                await apiRequest<UnprocessableEntityResponse>({
                    method: 'PUT',
                    url: fillPath(ApiEndpoints.USER, {
                        userId: registeredUser.id,
                    }),
                    headers: registeredUser.token,
                    body: update,
                });

            expect(status).toBe(422);
            expect(UnprocessableEntityResponseSchema.parse(body)).toBeTruthy();
            expect(body).toHaveProperty('first_name');
        }
    );

    for (const field of [
        'first_name',
        'last_name',
        'email',
        'phone',
        'dob',
    ] as const) {
        test(
            `should return 422 when ${field} is ${JSON.stringify(PRIMARY_INVALID_VALUES.STRING)}`,
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'PUT',
                        url: fillPath(ApiEndpoints.USER, {
                            userId: registeredUser.id,
                        }),
                        headers: registeredUser.token,
                        body: {
                            ...generateUserUpdate(registeredUser.email),
                            [field]: PRIMARY_INVALID_VALUES.STRING,
                        },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    }

    // FIXME: an email taken by another user answers 403 with the raw SQL error (SQLSTATE, table, query) instead of 409. See docs/test-plan.md, defect #21.
    test.skip(
        "should return 409 for another user's email",
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const other = await registerUser(apiRequest);

            const { status, body } =
                await apiRequest<DuplicateConflictResponse>({
                    method: 'PUT',
                    url: fillPath(ApiEndpoints.USER, {
                        userId: registeredUser.id,
                    }),
                    headers: registeredUser.token,
                    body: generateUserUpdate(other.email),
                });
            await deleteUser(apiRequest, other);

            expect(status).toBe(409);
            expect(DuplicateConflictResponseSchema.parse(body)).toBeTruthy();
        }
    );

    // FIXME: an unknown userId answers 403 {"error": "No query results ..."} instead of 404. See docs/test-plan.md, defect #20.
    for (const { description, value } of INVALID_PATH_IDS) {
        test.skip(
            `should return 404 for userId - ${description}`,
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'PUT',
                        url: fillPath(ApiEndpoints.USER, { userId: value }),
                        headers: process.env.ADMIN_ACCESS_TOKEN,
                        body: generateUserUpdate(registeredUser.email),
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            }
        );
    }
});

test.describe('PATCH /users/{userId}', () => {
    test(
        'should return 200 for a partial update',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { first_name } = generateUserRegistration();

            await test.step('Update the first name via PATCH /users/{userId}', async () => {
                const { status, body } = await apiRequest<UpdateResponse>({
                    method: 'PATCH',
                    url: fillPath(ApiEndpoints.USER, {
                        userId: registeredUser.id,
                    }),
                    headers: registeredUser.token,
                    body: { first_name },
                });

                expect(status).toBe(200);
                expect(UpdateResponseSchema.parse(body)).toBeTruthy();
            });

            await test.step('Read the user via GET /users/me', async () => {
                const { status, body } = await apiRequest<User>({
                    method: 'GET',
                    url: ApiEndpoints.CURRENT_USER,
                    headers: registeredUser.token,
                });

                expect(status).toBe(200);
                expect(UserSchema.parse(body)).toBeTruthy();
                expect(body).toMatchObject({
                    first_name,
                    last_name: registeredUser.last_name,
                });
            });
        }
    );

    test(
        'should not let a customer make itself an admin',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            await test.step('Send role=admin via PATCH /users/{userId}', async () => {
                const { status, body } = await apiRequest<UpdateResponse>({
                    method: 'PATCH',
                    url: fillPath(ApiEndpoints.USER, {
                        userId: registeredUser.id,
                    }),
                    headers: registeredUser.token,
                    body: { role: 'admin' },
                });

                // The field is ignored rather than rejected
                expect(status).toBe(200);
                expect(UpdateResponseSchema.parse(body)).toBeTruthy();
            });

            await test.step('Call an admin-only endpoint via GET /users', async () => {
                const { status, body } = await apiRequest<ForbiddenResponse>({
                    method: 'GET',
                    url: ApiEndpoints.USERS,
                    headers: registeredUser.token,
                });

                expect(status).toBe(403);
                expect(ForbiddenResponseSchema.parse(body)).toBeTruthy();
            });
        }
    );

    test(
        'should return 401 without an access token',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { status, body } = await apiRequest<UnauthorizedResponse>({
                method: 'PATCH',
                url: fillPath(ApiEndpoints.USER, { userId: registeredUser.id }),
                body: { first_name: generateUserRegistration().first_name },
            });

            expect(status).toBe(401);
            expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
        }
    );

    test(
        'should return 403 when updating another user',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const other =
                await test.step('Register another user via POST /users/register', async () =>
                    registerUser(apiRequest));

            await test.step('Update the other user via PATCH /users/{userId}', async () => {
                const { status, body } = await apiRequest<ErrorFieldResponse>({
                    method: 'PATCH',
                    url: fillPath(ApiEndpoints.USER, { userId: other.id }),
                    headers: registeredUser.token,
                    body: { first_name: generateUserRegistration().first_name },
                });

                expect(status).toBe(403);
                expect(ErrorFieldResponseSchema.parse(body)).toBeTruthy();
                expect(body.error).toBe(ApiMessages.ONLY_OWN_DATA);
            });

            await test.step('Delete the other user via DELETE /users/{userId}', async () => {
                await deleteUser(apiRequest, other);
            });
        }
    );

    for (const field of [
        'first_name',
        'last_name',
        'email',
        'phone',
    ] as const) {
        test(
            `should return 422 when ${field} is ${JSON.stringify(PRIMARY_INVALID_VALUES.STRING)}`,
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'PATCH',
                        url: fillPath(ApiEndpoints.USER, {
                            userId: registeredUser.id,
                        }),
                        headers: registeredUser.token,
                        body: { [field]: PRIMARY_INVALID_VALUES.STRING },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    }

    // FIXME: an unknown userId answers 403 {"error": "No query results ..."} instead of 404. See docs/test-plan.md, defect #20.
    for (const { description, value } of INVALID_PATH_IDS) {
        test.skip(
            `should return 404 for userId - ${description}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'PATCH',
                        url: fillPath(ApiEndpoints.USER, { userId: value }),
                        headers: process.env.ADMIN_ACCESS_TOKEN,
                        body: {
                            first_name: generateUserRegistration().first_name,
                        },
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            }
        );
    }
});

test.describe('DELETE /users/{userId}', () => {
    test(
        'should return 204 and delete the user (admin)',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const user =
                await test.step('Register a user via POST /users/register', async () =>
                    registerUser(apiRequest));

            await test.step('Delete the user via DELETE /users/{userId}', async () => {
                const { status, body } = await apiRequest<null>({
                    method: 'DELETE',
                    url: fillPath(ApiEndpoints.USER, { userId: user.id }),
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                });

                expect(status).toBe(204);
                expect(body).toBeNull();
            });

            await test.step('Check the user can no longer log in via POST /users/login', async () => {
                const { status, body } = await apiRequest<ErrorFieldResponse>({
                    method: 'POST',
                    url: ApiEndpoints.LOGIN,
                    body: { email: user.email, password: user.password },
                });

                expect(status).toBe(401);
                expect(ErrorFieldResponseSchema.parse(body)).toBeTruthy();
            });
        }
    );

    test(
        'should return 401 without an access token',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { status, body } = await apiRequest<UnauthorizedResponse>({
                method: 'DELETE',
                url: fillPath(ApiEndpoints.USER, { userId: registeredUser.id }),
            });

            expect(status).toBe(401);
            expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
        }
    );

    test(
        'should return 403 for a customer access token',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            const { status, body } = await apiRequest<ForbiddenResponse>({
                method: 'DELETE',
                url: fillPath(ApiEndpoints.USER, { userId: registeredUser.id }),
                headers: registeredUser.token,
            });

            expect(status).toBe(403);
            expect(ForbiddenResponseSchema.parse(body)).toBeTruthy();
        }
    );

    test(
        'should return 409 for a user that has favorites',
        { tag: '@api' },
        async ({ apiRequest, registeredUser }) => {
            await test.step('Add a favorite via POST /favorites', async () => {
                const products = await apiRequest<PaginatedProducts>({
                    method: 'GET',
                    url: ApiEndpoints.PRODUCTS,
                });
                expect(products.status).toBe(200);
                expect(
                    PaginatedProductSchema.parse(products.body)
                ).toBeTruthy();

                const { status, body } = await apiRequest<Favorite>({
                    method: 'POST',
                    url: ApiEndpoints.FAVORITES,
                    headers: registeredUser.token,
                    body: { product_id: products.body.data?.at(0)?.id },
                });
                expect(status).toBe(201);
                expect(FavoriteSchema.parse(body)).toBeTruthy();
            });

            await test.step('Delete the user via DELETE /users/{userId}', async () => {
                const { status, body } = await apiRequest<ConflictResponse>({
                    method: 'DELETE',
                    url: fillPath(ApiEndpoints.USER, {
                        userId: registeredUser.id,
                    }),
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                });

                expect(status).toBe(409);
                expect(ConflictResponseSchema.parse(body)).toBeTruthy();
            });
        }
    );

    // FIXME: an unknown userId fails with 500 instead of 404. See docs/test-plan.md, defect #2.
    for (const { description, value } of INVALID_PATH_IDS) {
        test.skip(
            `should return 404 for userId - ${description}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'DELETE',
                        url: fillPath(ApiEndpoints.USER, { userId: value }),
                        headers: process.env.ADMIN_ACCESS_TOKEN,
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            }
        );
    }
});

for (const method of ['GET', 'QUERY'] as const) {
    test.describe(`${method} /users/search`, () => {
        const searchToken = generateSearchToken();
        const criteria =
            method === 'GET'
                ? { params: { q: searchToken } }
                : { body: { q: searchToken } };

        // FIXME: the search answers a paginated object; the spec documents an array of UserResponse. See docs/test-plan.md, defect #15.
        test.skip(
            'should return 200 and the users matching q (admin)',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const user = await registerUser(apiRequest, {
                    first_name: searchToken,
                });

                const { status, body } = await apiRequest<UserList>({
                    method,
                    url: ApiEndpoints.USERS_SEARCH,
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                    ...criteria,
                });
                await deleteUser(apiRequest, user);

                expect(status).toBe(200);
                expect(UserListSchema.parse(body)).toBeTruthy();
            }
        );

        // FIXME: any customer can search all users and read their personal data (email, phone, address). See docs/test-plan.md, defect #22.
        test.skip(
            'should return 403 for a customer access token',
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status, body } = await apiRequest<ForbiddenResponse>({
                    method,
                    url: ApiEndpoints.USERS_SEARCH,
                    headers: registeredUser.token,
                    ...criteria,
                });

                expect(status).toBe(403);
                expect(ForbiddenResponseSchema.parse(body)).toBeTruthy();
            }
        );

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method,
                        url: ApiEndpoints.USERS_SEARCH,
                        ...criteria,
                    }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });
}

test.describe('QUERY /users/search - media type', () => {
    test(
        'should return 415 when the criteria are not sent as JSON',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status } = await apiRequest({
                method: 'QUERY',
                url: ApiEndpoints.USERS_SEARCH,
                headers: process.env.ADMIN_ACCESS_TOKEN,
                body: `q=${generateSearchToken()}`,
                contentType: 'text/plain',
            });

            // The spec documents no body for 415.
            expect(status).toBe(415);
        }
    );
});

// FIXME: 404 "Requested item not found" is documented for GET /users/search, but a search without matches answers 200.
test.describe('GET /users/search - not found', () => {
    test.skip(
        'should return 404 when no user matches q',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<ItemNotFoundResponse>({
                method: 'GET',
                url: ApiEndpoints.USERS_SEARCH,
                headers: process.env.ADMIN_ACCESS_TOKEN,
                params: { q: generateSearchToken() },
            });

            expect(status).toBe(404);
            expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
        }
    );
});
