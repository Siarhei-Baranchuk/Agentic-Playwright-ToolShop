import { ApiEndpoints } from '../../../enums/app/app';
import {
    TokenResponse,
    TokenResponseSchema,
} from '../../../fixtures/api/schemas/app/userSchema';
import {
    LoginErrorResponse,
    LoginErrorResponseSchema,
} from '../../../fixtures/api/schemas/util/errorResponseSchema';
import { expect, test } from '../../../fixtures/pom/test-options';
import { INVALID_LOGIN_ATTEMPTS } from '../../../test-data/static/app/invalidCredentials';

test.describe('api/login', () => {
    test(
        'should return 200 and user data for valid credentials',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<TokenResponse>({
                method: 'POST',
                url: ApiEndpoints.LOGIN,
                body: {
                    email: process.env.APP_EMAIL,
                    password: process.env.APP_PASSWORD,
                },
            });

            expect(status).toBe(200);
            expect(TokenResponseSchema.parse(body)).toBeTruthy();
        }
    );

    for (const { description, email, password } of INVALID_LOGIN_ATTEMPTS) {
        test(
            `should return 401 for invalid credentials - ${description} - email: ${email} - password: ${password}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<LoginErrorResponse>({
                    method: 'POST',
                    url: ApiEndpoints.LOGIN,
                    body: { email, password },
                });

                expect(status).toBe(401);
                expect(LoginErrorResponseSchema.parse(body)).toBeTruthy();
            }
        );
    }
});
