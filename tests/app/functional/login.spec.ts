import type { Locator } from '@playwright/test';
import { expect, test } from '../../../fixtures/pom/test-options';
import { LoginPage } from '../../../pages/app/login.page';
import { INVALID_LOGIN_ATTEMPTS } from '../../../test-data/static/app/invalidCredentials';

/** Maps an expected-error kind from the static data to its page-object locator. */
const errorLocator = (
    loginPage: LoginPage,
    kind: (typeof INVALID_LOGIN_ATTEMPTS)[number]['expectedErrors'][number]
): Locator => {
    switch (kind) {
        case 'invalid-credentials':
            return loginPage.errorMessage;
        case 'email-format':
            return loginPage.emailFormatError;
        case 'email-required':
            return loginPage.emailRequiredError;
        case 'password-required':
            return loginPage.passwordRequiredError;
    }
};

/**
 * Example functional test suite for login functionality.
 * Replace this with your actual login tests.
 */
test.describe('functional login', () => {
    test.beforeEach(async ({ resetStorageState, pm }) => {
        await resetStorageState();
        await pm.loginPage.open();
    });

    test(
        'should login successfully with valid credentials',
        { tag: '@smoke' },
        async ({ pm }) => {
            await test.step('Preconditions: the login form is displayed', async () => {
                await expect(pm.loginPage.loginButton).toBeVisible();
            });

            await test.step('Steps: user enters valid credentials', async () => {
                await pm.loginPage.login(
                    process.env.APP_EMAIL!,
                    process.env.APP_PASSWORD!
                );
            });

            await test.step('Expected: the user menu is displayed', async () => {
                await expect(pm.navComponent.userMenu).toBeVisible();
            });
        }
    );

    for (const {
        description,
        email,
        password,
        expectedErrors,
    } of INVALID_LOGIN_ATTEMPTS) {
        test(
            `should show error for invalid credentials - ${description}`,
            { tag: '@regression' },
            async ({ pm }) => {
                await test.step('Preconditions: the login form is displayed', async () => {
                    await expect(pm.loginPage.loginButton).toBeVisible();
                });

                await test.step(`Steps: user enters invalid credentials - email: ${email}`, async () => {
                    await pm.loginPage.login(email, password);
                });

                await test.step('Expected: the matching validation errors are displayed', async () => {
                    for (const kind of expectedErrors) {
                        await expect(
                            errorLocator(pm.loginPage, kind)
                        ).toBeVisible();
                    }
                });
            }
        );
    }
});
