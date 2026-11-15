/* eslint-disable playwright/no-skipped-test -- documented app defects are kept as skipped tests with a FIXME */
import { faker } from '@faker-js/faker';
import { Messages } from '../../../enums/app/app';
import { expect, test } from '../../../fixtures/pom/test-options';
import { startBrowserSession } from '../../../helpers/app/createStorageState';
import { generateTotpCode } from '../../../helpers/util/totp';
import { required } from '../../../helpers/util/util';
import { generateStrongPassword } from '../../../test-data/factories/app/user.factory';
import { WRONG_TOTP_CODE } from '../../../test-data/static/app/auth';
import { WEAK_PASSWORDS } from '../../../test-data/static/app/invalidCredentials';

test.describe('profile', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test.beforeEach(async ({ page, pm, registeredUser }) => {
        await startBrowserSession(page, registeredUser.token);
        await pm.profilePage.open();
        // The form is usable once the customer's data has been loaded into it
        await expect(pm.profilePage.firstNameInput).toHaveValue(
            registeredUser.first_name
        );
    });

    test.describe('personal data', () => {
        test(
            "should show the customer's registration data",
            { tag: '@smoke' },
            async ({ pm, registeredUser }) => {
                const address = required(registeredUser.address, 'address');

                await test.step('Preconditions: the profile page is open', async () => {
                    await expect(pm.profilePage.heading).toBeVisible();
                });

                await test.step('Steps: scroll to the personal data form', async () => {
                    await pm.profilePage.updateProfileButton.scrollIntoViewIfNeeded();
                });

                await test.step('Expected: every field holds the registered value', async () => {
                    await expect(pm.profilePage.lastNameInput).toHaveValue(
                        registeredUser.last_name
                    );
                    await expect(pm.profilePage.emailInput).toHaveValue(
                        registeredUser.email
                    );
                    await expect(pm.profilePage.phoneInput).toHaveValue(
                        required(registeredUser.phone, 'phone')
                    );
                    await expect(pm.profilePage.streetInput).toHaveValue(
                        required(address.street, 'street')
                    );
                    await expect(pm.profilePage.postalCodeInput).toHaveValue(
                        required(address.postal_code, 'postal code')
                    );
                    await expect(pm.profilePage.cityInput).toHaveValue(
                        required(address.city, 'city')
                    );
                    await expect(pm.profilePage.countryInput).toHaveValue(
                        required(address.country, 'country')
                    );
                    await expect(pm.profilePage.emailInput).not.toBeEditable();
                });
            }
        );

        test(
            'should save a changed name',
            { tag: '@regression' },
            async ({ pm, page }) => {
                const firstName = faker.person.firstName();

                await test.step('Preconditions: the profile page is open', async () => {
                    await expect(pm.profilePage.heading).toBeVisible();
                });

                await test.step('Steps: change the first name and save', async () => {
                    await pm.profilePage.firstNameInput.fill(firstName);
                    await pm.profilePage.updateProfile();
                });

                await test.step('Expected: the update is confirmed', async () => {
                    await expect(
                        pm.profilePage.profileUpdatedMessage
                    ).toBeVisible();
                });

                await test.step('Steps: reload the page', async () => {
                    await page.reload();
                });

                await test.step('Expected: the new first name is kept', async () => {
                    await expect(pm.profilePage.firstNameInput).toHaveValue(
                        firstName
                    );
                });
            }
        );

        test(
            'should not save the profile without a phone number',
            { tag: '@regression' },
            async ({ pm }) => {
                await test.step('Preconditions: the profile page is open', async () => {
                    await expect(pm.profilePage.heading).toBeVisible();
                });

                await test.step('Steps: clear the phone and save', async () => {
                    await pm.profilePage.phoneInput.clear();
                    await pm.profilePage.updateProfile();
                });

                await test.step('Expected: the form asks to correct the fields', async () => {
                    await expect(
                        pm.profilePage.profileInvalidMessage
                    ).toBeVisible();
                    await expect(
                        pm.profilePage.profileUpdatedMessage
                    ).toBeHidden();
                });
            }
        );

        // FIXME: defect #43 — after a saved name change the user menu keeps the
        // old name until the page is reloaded.
        test.skip(
            'should show the changed name in the user menu',
            { tag: '@regression' },
            async ({ pm }) => {
                const firstName = faker.person.firstName();

                await test.step('Preconditions: the profile page is open', async () => {
                    await expect(pm.profilePage.heading).toBeVisible();
                });

                await test.step('Steps: change the first name and save', async () => {
                    await pm.profilePage.firstNameInput.fill(firstName);
                    await pm.profilePage.updateProfile();
                    await expect(
                        pm.profilePage.profileUpdatedMessage
                    ).toBeVisible();
                });

                await test.step('Expected: the user menu shows the new name', async () => {
                    await expect(pm.navComponent.userMenu).toContainText(
                        firstName
                    );
                });
            }
        );
    });

    test.describe('password', () => {
        test(
            'should change the password and accept it at the next login',
            { tag: '@smoke' },
            async ({ pm, registeredUser }) => {
                const newPassword = generateStrongPassword();

                await test.step('Preconditions: the password form is shown', async () => {
                    await expect(
                        pm.profilePage.changePasswordButton
                    ).toBeVisible();
                });

                await test.step('Steps: enter the current and a new password and save', async () => {
                    await pm.profilePage.changePassword(
                        registeredUser.password,
                        newPassword
                    );
                });

                await test.step('Expected: the change is confirmed', async () => {
                    await expect(
                        pm.profilePage.passwordUpdatedMessage
                    ).toBeVisible();
                });

                await test.step('Steps: sign in with the new password', async () => {
                    await pm.loginPage.open();
                    await pm.loginPage.login(registeredUser.email, newPassword);
                });

                await test.step('Expected: the account page is shown', async () => {
                    await expect(pm.accountPage.heading).toBeVisible();
                });
            }
        );

        test(
            'should reject a wrong current password',
            { tag: '@regression' },
            async ({ pm }) => {
                await test.step('Preconditions: the password form is shown', async () => {
                    await expect(
                        pm.profilePage.changePasswordButton
                    ).toBeVisible();
                });

                await test.step('Steps: enter a wrong current password and a new one', async () => {
                    await pm.profilePage.changePassword(
                        generateStrongPassword(),
                        generateStrongPassword()
                    );
                });

                await test.step('Expected: the wrong current password error is shown', async () => {
                    await expect(
                        pm.profilePage.passwordError(
                            Messages.WRONG_CURRENT_PASSWORD
                        )
                    ).toBeVisible();
                });
            }
        );

        test(
            'should reject a new password equal to the current one',
            { tag: '@regression' },
            async ({ pm, registeredUser }) => {
                await test.step('Preconditions: the password form is shown', async () => {
                    await expect(
                        pm.profilePage.changePasswordButton
                    ).toBeVisible();
                });

                await test.step('Steps: enter the current password as the new one', async () => {
                    await pm.profilePage.changePassword(
                        registeredUser.password,
                        registeredUser.password
                    );
                });

                await test.step('Expected: the same-password error is shown', async () => {
                    await expect(
                        pm.profilePage.passwordError(Messages.SAME_NEW_PASSWORD)
                    ).toBeVisible();
                });
            }
        );

        test(
            'should reject a confirmation that differs from the new password',
            { tag: '@regression' },
            async ({ pm, registeredUser }) => {
                await test.step('Preconditions: the password form is shown', async () => {
                    await expect(
                        pm.profilePage.changePasswordButton
                    ).toBeVisible();
                });

                await test.step('Steps: confirm the new password with another value', async () => {
                    await pm.profilePage.changePassword(
                        registeredUser.password,
                        generateStrongPassword(),
                        generateStrongPassword()
                    );
                });

                await test.step('Expected: the confirmation mismatch error is shown', async () => {
                    await expect(
                        pm.profilePage.passwordError(
                            Messages.PASSWORD_CONFIRMATION_MISMATCH
                        )
                    ).toBeVisible();
                });
            }
        );

        test(
            'should reject a new password without mixed case',
            { tag: '@regression' },
            async ({ pm, registeredUser }) => {
                await test.step('Preconditions: the password form is shown', async () => {
                    await expect(
                        pm.profilePage.changePasswordButton
                    ).toBeVisible();
                });

                await test.step('Steps: enter an all-lowercase new password', async () => {
                    await pm.profilePage.changePassword(
                        registeredUser.password,
                        WEAK_PASSWORDS[1].value
                    );
                });

                await test.step('Expected: the mixed-case rule is reported', async () => {
                    await expect(
                        pm.profilePage.passwordError(
                            Messages.NEW_PASSWORD_NO_MIXED_CASE
                        )
                    ).toBeVisible();
                });
            }
        );
    });

    test.describe('two-factor authentication', () => {
        test(
            'should enable TOTP with a code from the shown secret',
            { tag: '@smoke' },
            async ({ pm }) => {
                let secret = '';

                await test.step('Preconditions: the TOTP setup shows a secret key', async () => {
                    await expect(pm.profilePage.totpSecret).toHaveText(/\w+/);
                    secret = await pm.profilePage.totpSecret.innerText();
                });

                await test.step('Steps: enter the current code for the secret', async () => {
                    await pm.profilePage.verifyTotp(generateTotpCode(secret));
                });

                await test.step('Expected: TOTP is reported as enabled', async () => {
                    await expect(
                        pm.profilePage.totpEnabledMessage
                    ).toContainText(Messages.TOTP_ENABLED);
                });
            }
        );

        test(
            'should reject a wrong TOTP code',
            { tag: '@regression' },
            async ({ pm }) => {
                await test.step('Preconditions: the TOTP setup shows a secret key', async () => {
                    await expect(pm.profilePage.totpSecret).toHaveText(/\w+/);
                });

                await test.step('Steps: enter a wrong code', async () => {
                    await pm.profilePage.verifyTotp(WRONG_TOTP_CODE);
                });

                await test.step('Expected: the invalid code error is shown', async () => {
                    await expect(pm.profilePage.totpErrorMessage).toContainText(
                        Messages.TOTP_SETUP_INVALID
                    );
                    await expect(
                        pm.profilePage.totpEnabledMessage
                    ).toBeHidden();
                });
            }
        );

        // FIXME: defect #42 — after a wrong code the whole TOTP setup (secret,
        // code field, button) disappears; the user must reload the page to retry.
        test.skip(
            'should let the customer retry after a wrong TOTP code',
            { tag: '@regression' },
            async ({ pm }) => {
                await test.step('Preconditions: the TOTP setup shows a secret key', async () => {
                    await expect(pm.profilePage.totpSecret).toHaveText(/\w+/);
                });

                await test.step('Steps: enter a wrong code', async () => {
                    await pm.profilePage.verifyTotp(WRONG_TOTP_CODE);
                });

                await test.step('Expected: the code field is still available', async () => {
                    await expect(pm.profilePage.totpErrorMessage).toBeVisible();
                    await expect(pm.profilePage.totpCodeInput).toBeVisible();
                });
            }
        );
    });
});
