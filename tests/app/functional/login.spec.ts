import type { Locator } from '@playwright/test';
import { AccountRules, ApiEndpoints, AppRoutes } from '../../../enums/app/app';
import { expect, test } from '../../../fixtures/pom/test-options';
import { startBrowserSession } from '../../../helpers/app/createStorageState';
import { enableTotp } from '../../../helpers/app/users';
import { generateTotpCode } from '../../../helpers/util/totp';
import { LoginPage } from '../../../pages/app/auth/login.page';
import { generateStrongPassword } from '../../../test-data/factories/app/user.factory';
import { WRONG_TOTP_CODE } from '../../../test-data/static/app/auth';
import { INVALID_LOGIN_ATTEMPTS } from '../../../test-data/static/app/invalidCredentials';

/** Origin of the Google sign-in page opened by "Sign in with Google" */
const GOOGLE_ACCOUNTS_URL = /^https:\/\/accounts\.google\.com\//;

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

test.describe('login — own accounts', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test.beforeEach(async ({ pm }) => {
        await pm.loginPage.open();
    });

    test(
        'should lock the account after too many failed attempts',
        { tag: '@regression' },
        async ({ pm, page, registeredUser }) => {
            await test.step('Preconditions: the login form is displayed', async () => {
                await expect(pm.loginPage.loginButton).toBeVisible();
            });

            await test.step(`Steps: sign in ${AccountRules.MAX_FAILED_LOGIN_ATTEMPTS} times with a wrong password`, async () => {
                for (
                    let attempt = 1;
                    attempt <= AccountRules.MAX_FAILED_LOGIN_ATTEMPTS;
                    attempt++
                ) {
                    // Each attempt must reach the API (a click before Angular hydrates the
                    // form sends nothing), so it is retried until the login request answers 401
                    await expect(async () => {
                        const rejected = page.waitForResponse(
                            (response) =>
                                response.url().includes(ApiEndpoints.LOGIN) &&
                                response.status() === 401,
                            { timeout: 3000 }
                        );
                        await pm.loginPage.login(
                            registeredUser.email,
                            generateStrongPassword()
                        );
                        await rejected;
                    }).toPass();
                }
            });

            await test.step('Steps: sign in with the correct password', async () => {
                await pm.loginPage.login(
                    registeredUser.email,
                    registeredUser.password
                );
            });

            await test.step('Expected: the account is reported as locked', async () => {
                await expect(pm.loginPage.accountLockedError).toBeVisible();
                await expect(pm.navComponent.userMenu).toBeHidden();
            });
        }
    );

    test(
        'should sign in with a TOTP code when two-factor authentication is on',
        { tag: '@smoke' },
        async ({ pm, registeredUser, apiRequest }) => {
            const secret = await enableTotp(apiRequest, registeredUser);

            await test.step('Preconditions: the login form is displayed', async () => {
                await expect(pm.loginPage.loginButton).toBeVisible();
            });

            await test.step('Steps: sign in with email and password', async () => {
                await pm.loginPage.login(
                    registeredUser.email,
                    registeredUser.password
                );
            });

            await test.step('Expected: the TOTP step replaces the form', async () => {
                await expect(pm.loginPage.totpInput).toBeVisible();
            });

            await test.step('Steps: enter the current TOTP code', async () => {
                await pm.loginPage.verifyTotp(generateTotpCode(secret));
            });

            await test.step('Expected: the account page is shown', async () => {
                await expect(pm.accountPage.heading).toBeVisible();
                await expect(pm.navComponent.userMenu).toBeVisible();
            });
        }
    );

    test(
        'should reject a wrong TOTP code',
        { tag: '@regression' },
        async ({ pm, registeredUser, apiRequest }) => {
            await enableTotp(apiRequest, registeredUser);

            await test.step('Preconditions: the TOTP step is shown after the password', async () => {
                await pm.loginPage.login(
                    registeredUser.email,
                    registeredUser.password
                );
                await expect(pm.loginPage.totpInput).toBeVisible();
            });

            await test.step('Steps: enter a wrong TOTP code', async () => {
                await pm.loginPage.verifyTotp(WRONG_TOTP_CODE);
            });

            await test.step('Expected: the invalid TOTP error is shown and the user stays signed out', async () => {
                await expect(pm.loginPage.invalidTotpError).toBeVisible();
                await expect(pm.navComponent.userMenu).toBeHidden();
            });
        }
    );

    test(
        'should sign out and close access to the account pages',
        { tag: '@smoke' },
        async ({ pm, page, registeredUser }) => {
            await test.step('Preconditions: the customer is signed in', async () => {
                await startBrowserSession(page, registeredUser.token);
                await pm.accountPage.open();
                await expect(pm.navComponent.userMenu).toBeVisible();
            });

            await test.step('Steps: sign out from the user menu', async () => {
                await pm.navComponent.signOut();
            });

            await test.step('Expected: the "Sign in" link is back', async () => {
                await expect(pm.navComponent.signInLink).toBeVisible();
            });

            await test.step('Steps: open the profile page directly', async () => {
                await pm.profilePage.open();
            });

            await test.step('Expected: the login page is shown instead', async () => {
                await expect(page).toHaveURL(
                    `${process.env.APP_URL!}${AppRoutes.LOGIN}`
                );
            });
        }
    );
});

test.describe('login — guest', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test(
        'should redirect a guest from the account pages to the login page',
        { tag: '@regression' },
        async ({ pm, page }) => {
            await test.step('Preconditions: the guest is not signed in', async () => {
                await pm.loginPage.open();
                await expect(pm.navComponent.signInLink).toBeVisible();
            });

            await test.step('Steps: open the account page directly', async () => {
                await pm.accountPage.open();
            });

            await test.step('Expected: the login page is shown', async () => {
                await expect(page).toHaveURL(
                    `${process.env.APP_URL!}${AppRoutes.LOGIN}`
                );
                await expect(pm.loginPage.heading).toBeVisible();
            });
        }
    );

    test(
        'should open the Google sign-in page in a popup',
        { tag: '@regression' },
        async ({ pm, page }) => {
            await test.step('Preconditions: the login form is displayed', async () => {
                await pm.loginPage.open();
                await expect(pm.loginPage.googleSignInButton).toBeVisible();
            });

            const popup =
                await test.step('Steps: click "Sign in with Google"', async () => {
                    const popupPromise = page.waitForEvent('popup');
                    await pm.loginPage.googleSignInButton.click();
                    return popupPromise;
                });

            await test.step('Expected: a popup with the Google accounts page opens', async () => {
                await expect(popup).toHaveURL(GOOGLE_ACCOUNTS_URL);
            });
        }
    );

    test(
        'should lead to the registration and forgot-password pages',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the login form is displayed', async () => {
                await pm.loginPage.open();
                await expect(pm.loginPage.registerLink).toBeVisible();
            });

            await test.step('Steps: follow "Register your account"', async () => {
                await pm.loginPage.registerLink.click();
            });

            await test.step('Expected: the registration form is shown', async () => {
                await expect(pm.registerPage.heading).toBeVisible();
            });

            await test.step('Steps: go back and follow "Forgot your Password?"', async () => {
                await pm.loginPage.open();
                await pm.loginPage.forgotPasswordLink.click();
            });

            await test.step('Expected: the forgot-password form is shown', async () => {
                await expect(pm.forgotPasswordPage.heading).toBeVisible();
            });
        }
    );
});
