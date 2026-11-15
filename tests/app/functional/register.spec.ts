/* eslint-disable playwright/no-skipped-test -- documented app defects are kept as skipped tests with a FIXME */
import {
    ApiEndpoints,
    AppRoutes,
    Messages,
    PasswordStrengths,
} from '../../../enums/app/app';
import { User, UserSchema } from '../../../fixtures/api/schemas/app/userSchema';
import { expect, test } from '../../../fixtures/pom/test-options';
import { loginViaApi } from '../../../helpers/app/createStorageState';
import { deleteUser } from '../../../helpers/app/users';
import { required } from '../../../helpers/util/util';
import {
    generateRegistrationDetails,
    generateUnderageDob,
} from '../../../test-data/factories/app/user.factory';
import { NON_NUMERIC_PHONE } from '../../../test-data/static/app/auth';
import {
    INVALID_EMAILS,
    WEAK_PASSWORDS,
} from '../../../test-data/static/app/invalidCredentials';

/** Every required-field error shown when the empty form is submitted */
const REQUIRED_FIELD_ERRORS = [
    Messages.FIRST_NAME_REQUIRED,
    Messages.LAST_NAME_REQUIRED,
    Messages.DOB_REQUIRED,
    Messages.COUNTRY_REQUIRED,
    Messages.POSTCODE_REQUIRED,
    Messages.HOUSE_NUMBER_REQUIRED,
    Messages.STREET_REQUIRED,
    Messages.CITY_REQUIRED,
    Messages.STATE_REQUIRED,
    Messages.PHONE_REQUIRED,
    Messages.EMAIL_REQUIRED,
    Messages.PASSWORD_REQUIRED,
] as const;

test.describe('registration', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test.beforeEach(async ({ pm }) => {
        await pm.registerPage.open();
    });

    test.describe('new account', () => {
        /** Credentials of the account a test registered through the UI */
        let registered: { email: string; password: string } | undefined;

        test.afterEach(async ({ apiRequest }) => {
            if (!registered) return;
            const token = await loginViaApi(
                registered.email,
                registered.password
            );
            const { status, body } = await apiRequest<User>({
                method: 'GET',
                url: ApiEndpoints.CURRENT_USER,
                headers: token,
            });
            expect(status).toBe(200);
            expect(UserSchema.parse(body)).toBeTruthy();
            await deleteUser(apiRequest, {
                id: required(body.id, 'user id'),
                token,
            });
            registered = undefined;
        });

        test(
            'should register a new customer and let them sign in',
            { tag: '@smoke' },
            async ({ pm, page }) => {
                const details = generateRegistrationDetails();

                await test.step('Preconditions: the registration form is shown', async () => {
                    await expect(pm.registerPage.heading).toBeVisible();
                });

                await test.step('Steps: fill in every field and register', async () => {
                    await pm.registerPage.fillForm(details);
                    await pm.registerPage.submit();
                    registered = details;
                });

                await test.step('Expected: the login page is shown', async () => {
                    await expect(page).toHaveURL(
                        `${process.env.APP_URL!}${AppRoutes.LOGIN}`
                    );
                });

                await test.step('Steps: sign in with the new credentials', async () => {
                    await pm.loginPage.login(details.email, details.password);
                });

                await test.step('Expected: the account page greets the new customer', async () => {
                    await expect(pm.accountPage.heading).toBeVisible();
                    await expect(pm.navComponent.userMenu).toContainText(
                        `${details.firstName} ${details.lastName}`
                    );
                });
            }
        );
    });

    test(
        'should fill street, city and state from the postcode lookup',
        { tag: '@regression' },
        async ({ pm }) => {
            const { country, postalCode, houseNumber } =
                generateRegistrationDetails();

            await test.step('Preconditions: the address fields are empty', async () => {
                await expect(pm.registerPage.streetInput).toHaveValue('');
            });

            await test.step('Steps: choose the country, enter postal code and house number', async () => {
                await pm.registerPage.fillAddressLookup(
                    country,
                    postalCode,
                    houseNumber
                );
            });

            await test.step('Expected: street, city and state are filled in', async () => {
                await expect(pm.registerPage.streetInput).toHaveValue(/\S/);
                await expect(pm.registerPage.cityInput).toHaveValue(/\S/);
                await expect(pm.registerPage.stateInput).toHaveValue(/\S/);
            });
        }
    );

    test(
        'should show a required error for every field of the empty form',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the registration form is shown', async () => {
                await expect(pm.registerPage.heading).toBeVisible();
            });

            await test.step('Steps: submit the empty form', async () => {
                await pm.registerPage.submit();
            });

            await test.step('Expected: each field reports that it is required', async () => {
                for (const message of REQUIRED_FIELD_ERRORS) {
                    await expect(
                        pm.registerPage.validationError(message)
                    ).toBeVisible();
                }
            });
        }
    );

    test(
        'should reject a malformed email address',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the registration form is shown', async () => {
                await expect(pm.registerPage.heading).toBeVisible();
            });

            await test.step('Steps: enter an email without "@" and submit', async () => {
                await pm.registerPage.emailInput.fill(INVALID_EMAILS[1]);
                await pm.registerPage.submit();
            });

            await test.step('Expected: the email format error is shown', async () => {
                await expect(
                    pm.registerPage.validationError(
                        Messages.EMAIL_FORMAT_INVALID
                    )
                ).toBeVisible();
            });
        }
    );

    test(
        'should reject a phone number with non-digit characters',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the registration form is shown', async () => {
                await expect(pm.registerPage.heading).toBeVisible();
            });

            await test.step('Steps: enter letters into the phone field and submit', async () => {
                await pm.registerPage.phoneInput.fill(NON_NUMERIC_PHONE);
                await pm.registerPage.submit();
            });

            await test.step('Expected: the digits-only error is shown', async () => {
                await expect(
                    pm.registerPage.validationError(Messages.PHONE_DIGITS_ONLY)
                ).toBeVisible();
            });
        }
    );

    test(
        'should not register with a password shorter than 8 characters',
        { tag: '@regression' },
        async ({ pm, page }) => {
            const details = generateRegistrationDetails({
                password: WEAK_PASSWORDS[0].value,
            });

            await test.step('Preconditions: the registration form is shown', async () => {
                await expect(pm.registerPage.heading).toBeVisible();
            });

            await test.step('Steps: fill in the form with a 7-character password and register', async () => {
                await pm.registerPage.fillForm(details);
                await pm.registerPage.submit();
            });

            await test.step('Expected: a password error is shown and the form stays open', async () => {
                await expect(pm.registerPage.passwordError).toBeVisible();
                await expect(page).toHaveURL(
                    `${process.env.APP_URL!}${AppRoutes.REGISTER}`
                );
            });
        }
    );

    // FIXME: defect #38 — the error for a 7-character password says
    // "Password must be minimal 6 characters long." while the policy (and the
    // hint under the field) requires 8 characters.
    test.skip(
        'should state the 8-character minimum for a short password',
        { tag: '@regression' },
        async ({ pm }) => {
            await test.step('Preconditions: the registration form is shown', async () => {
                await expect(pm.registerPage.heading).toBeVisible();
            });

            await test.step('Steps: type a 7-character password and submit', async () => {
                await pm.registerPage.typePassword(WEAK_PASSWORDS[0].value);
                await pm.registerPage.submit();
            });

            await test.step('Expected: the error names the 8-character minimum', async () => {
                await expect(pm.registerPage.passwordError).not.toContainText(
                    Messages.PASSWORD_TOO_SHORT
                );
            });
        }
    );

    test(
        'should reject an email address that is already registered',
        { tag: '@regression' },
        async ({ pm, registeredUser }) => {
            const details = generateRegistrationDetails({
                email: registeredUser.email,
            });

            await test.step('Preconditions: the registration form is shown', async () => {
                await expect(pm.registerPage.heading).toBeVisible();
            });

            await test.step('Steps: register with the email of an existing customer', async () => {
                await pm.registerPage.fillForm(details);
                await pm.registerPage.submit();
            });

            await test.step('Expected: the duplicate email error is shown', async () => {
                await expect(pm.registerPage.registerError).toHaveText(
                    Messages.EMAIL_ALREADY_EXISTS
                );
            });
        }
    );

    test(
        'should reject a customer younger than 18',
        { tag: '@regression' },
        async ({ pm }) => {
            const details = generateRegistrationDetails({
                dob: generateUnderageDob(),
            });

            await test.step('Preconditions: the registration form is shown', async () => {
                await expect(pm.registerPage.heading).toBeVisible();
            });

            await test.step('Steps: register with an underage date of birth', async () => {
                await pm.registerPage.fillForm(details);
                await pm.registerPage.submit();
            });

            await test.step('Expected: the minimum age error is shown', async () => {
                await expect(pm.registerPage.registerError).toHaveText(
                    Messages.CUSTOMER_UNDERAGE
                );
            });
        }
    );

    // FIXME: defect #39 — the strength indicator is not re-rendered while
    // typing: it keeps the rating of an earlier value and only refreshes on
    // some later UI event, so it cannot be relied on (here: a password that
    // meets all five rules stays at no rating).
    test.skip(
        'should rate a password that meets every rule as Excellent',
        { tag: '@regression' },
        async ({ pm }) => {
            const { password } = generateRegistrationDetails();

            await test.step('Preconditions: the registration form is shown', async () => {
                await expect(pm.registerPage.heading).toBeVisible();
            });

            await test.step('Steps: type a password that meets every rule', async () => {
                await pm.registerPage.typePassword(password);
            });

            await test.step('Expected: the strength indicator shows "Excellent"', async () => {
                await expect(
                    pm.registerPage.passwordStrength(
                        PasswordStrengths.EXCELLENT
                    )
                ).toHaveClass(/active/);
            });
        }
    );
});
