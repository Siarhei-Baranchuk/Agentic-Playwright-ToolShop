/* eslint-disable playwright/no-skipped-test -- documented app defects are kept as skipped tests with a FIXME */
import { faker } from '@faker-js/faker';
import { expect, test } from '../../../fixtures/pom/test-options';
import { INVALID_EMAILS } from '../../../test-data/static/app/invalidCredentials';

test.describe('forgot password', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test.beforeEach(async ({ pm }) => {
        await pm.forgotPasswordPage.open();
    });

    // FIXME: defect #40 — after a successful request the page shows the raw
    // translation key "page.forgot-password.confirm" (the key in en.json is
    // "pages.forgot-password.confirm") instead of the confirmation text.
    test.skip(
        'should confirm a new password for a registered email',
        { tag: '@smoke' },
        async ({ pm, registeredUser }) => {
            await test.step('Preconditions: the forgot-password form is shown', async () => {
                await expect(pm.forgotPasswordPage.heading).toBeVisible();
            });

            await test.step('Steps: request a new password for a registered email', async () => {
                await pm.forgotPasswordPage.requestNewPassword(
                    registeredUser.email
                );
            });

            await test.step('Expected: the confirmation message is shown', async () => {
                await expect(
                    pm.forgotPasswordPage.successMessage
                ).toBeVisible();
            });
        }
    );

    test(
        'should require an email address',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the forgot-password form is shown', async () => {
                await expect(pm.forgotPasswordPage.heading).toBeVisible();
            });

            await test.step('Steps: submit the empty form', async () => {
                await pm.forgotPasswordPage.submitButton.click();
            });

            await test.step('Expected: the email required error is shown', async () => {
                await expect(
                    pm.forgotPasswordPage.emailRequiredError
                ).toBeVisible();
            });
        }
    );

    test(
        'should reject an email address that is not registered',
        { tag: '@regression' },
        async ({ pm }) => {
            const email = faker.internet
                .email({ provider: 'example.com' })
                .toLowerCase();

            await test.step('Preconditions: the forgot-password form is shown', async () => {
                await expect(pm.forgotPasswordPage.heading).toBeVisible();
            });

            await test.step('Steps: request a new password for an unknown email', async () => {
                await pm.forgotPasswordPage.requestNewPassword(email);
            });

            await test.step('Expected: the unknown email error is shown', async () => {
                await expect(
                    pm.forgotPasswordPage.unknownEmailError
                ).toBeVisible();
            });
        }
    );

    // FIXME: defect #41 — a malformed email shows an empty red error box: the
    // alert is rendered without any message.
    test.skip(
        'should reject a malformed email address',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the forgot-password form is shown', async () => {
                await expect(pm.forgotPasswordPage.heading).toBeVisible();
            });

            await test.step('Steps: request a new password for an email without "@"', async () => {
                await pm.forgotPasswordPage.requestNewPassword(
                    INVALID_EMAILS[1]
                );
            });

            await test.step('Expected: the email format error is shown', async () => {
                await expect(
                    pm.forgotPasswordPage.emailFormatError
                ).toBeVisible();
            });
        }
    );
});
