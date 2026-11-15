import { faker } from '@faker-js/faker';
import {
    UserRequest,
    UserRequestSchema,
} from '../../../fixtures/api/schemas/app/userSchema';
import { UserRules } from '../../../enums/app/app';
import type { RegistrationDetails } from '../../../pages/app/auth/register.page';
import { required } from '../../../helpers/util/util';
import { REGISTRATION_COUNTRY } from '../../static/app/auth';
import { FIVE_DIGIT_POSTCODE_COUNTRIES } from '../../static/app/checkout';

/**
 * Generates a password that satisfies the app's password policy:
 * at least 8 characters with uppercase, lowercase, a number and a symbol.
 *
 * @returns {string} A random policy-compliant password.
 */
export const generateStrongPassword = (): string =>
    [
        faker.string.alpha({ length: 4, casing: 'upper' }),
        faker.string.alpha({ length: 4, casing: 'lower' }),
        faker.string.numeric(3),
        faker.helpers.arrayElement(['!', '@', '#', '$', '%', '&', '*']),
    ].join('');

/**
 * Generates a valid registration payload (`UserRequest`) for
 * `POST /users/register` and the UI registration form. Every call yields
 * a unique email, so parallel tests never collide.
 *
 * @param {Partial<UserRequest>} overrides - Optional fields to override the generated values.
 * @returns {UserRequest} A valid payload matching `UserRequestSchema`.
 *
 * @example
 * // Random user
 * const user = generateUserRegistration();
 *
 * @example
 * // Without the optional address
 * const { address, ...minimal } = generateUserRegistration();
 */
export const generateUserRegistration = (
    overrides?: Partial<UserRequest>
): UserRequest => {
    const firstName = faker.person
        .firstName()
        .slice(0, UserRules.FIRST_NAME_MAX_LENGTH);
    const lastName = faker.person
        .lastName()
        .slice(0, UserRules.LAST_NAME_MAX_LENGTH);

    const defaultUser: UserRequest = {
        first_name: firstName,
        last_name: lastName,
        address: {
            street: faker.location.street(),
            house_number: faker.location.buildingNumber(),
            city: faker.location.city(),
            state: faker.location.state(),
            country: faker.helpers.arrayElement(FIVE_DIGIT_POSTCODE_COUNTRIES),
            postal_code: faker.string.numeric(5),
        },
        phone: faker.string.numeric(10),
        dob: faker.date
            // One year inside the allowed range, so the date never lands on a boundary
            .birthdate({
                mode: 'age',
                min: UserRules.MIN_AGE + 1,
                max: UserRules.MAX_AGE - 1,
            })
            .toISOString()
            .slice(0, 10),
        password: generateStrongPassword(),
        email: faker.internet
            .email({
                firstName: faker.string.alpha(8),
                lastName: faker.string.alphanumeric(8),
                provider: 'example.com',
            })
            .toLowerCase(),
    };

    return UserRequestSchema.parse({ ...defaultUser, ...overrides });
};

/**
 * Generates values for the UI registration form. Built on
 * `generateUserRegistration`, so the data passes the same API rules; the
 * country is `REGISTRATION_COUNTRY`, whose postcode lookup fills the street,
 * city and state.
 *
 * @param {Partial<RegistrationDetails>} overrides - Optional fields to override the generated values.
 * @returns {RegistrationDetails} Valid registration form values.
 */
export const generateRegistrationDetails = (
    overrides?: Partial<RegistrationDetails>
): RegistrationDetails => {
    const user = generateUserRegistration();

    return {
        firstName: user.first_name,
        lastName: user.last_name,
        dob: required(user.dob, 'dob'),
        country: REGISTRATION_COUNTRY.label,
        postalCode: faker.string.numeric(5),
        houseNumber: faker.location.buildingNumber(),
        phone: required(user.phone, 'phone'),
        email: user.email,
        password: user.password,
        ...overrides,
    };
};

/**
 * Generates a date of birth (YYYY-MM-DD) of a person younger than the
 * minimum customer age.
 *
 * @returns {string} A date of birth below `UserRules.MIN_AGE`.
 */
export const generateUnderageDob = (): string =>
    faker.date
        .birthdate({ mode: 'age', min: 10, max: UserRules.MIN_AGE - 1 })
        .toISOString()
        .slice(0, 10);

/**
 * Generates login credentials for testing purposes.
 * Creates a unique email and password combination.
 *
 * @param {object} overrides - Optional overrides for email and/or password.
 * @param {string} overrides.email - Override the generated email.
 * @param {string} overrides.password - Override the generated password.
 * @returns {{ email: string; password: string }} Valid login credentials.
 *
 * @example
 * // Generate random credentials
 * const creds = generateLoginCredentials();
 *
 * @example
 * // Generate credentials with specific email
 * const creds = generateLoginCredentials({ email: 'specific@test.com' });
 */
export const generateLoginCredentials = (
    overrides?: Partial<{ email: string; password: string }>
): { email: string; password: string } => {
    return {
        email: overrides?.email ?? faker.internet.email(),
        password:
            overrides?.password ??
            faker.internet.password({
                length: 12,
                memorable: false,
                pattern: /[A-Za-z0-9!@#$%]/,
            }),
    };
};
