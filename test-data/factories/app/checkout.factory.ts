import { faker } from '@faker-js/faker';
import { ContactSubjects, PaymentMethods } from '../../../enums/app/app';
import {
    ContactRequest,
    ContactRequestSchema,
} from '../../../fixtures/api/schemas/app/contactSchema';

/** Payment details accepted by the backend for each payment method. */
export type PaymentDetails = Record<string, string>;

/**
 * Generates valid payment details for a payment method, matching the
 * backend rules (PaymentController / GiftCard).
 *
 * @param {PaymentMethods} method - The payment method.
 * @returns {PaymentDetails} Details for `payment_details`.
 *
 * @example
 * const details = generatePaymentDetails(PaymentMethods.CREDIT_CARD);
 */
export const generatePaymentDetails = (
    method: PaymentMethods
): PaymentDetails => {
    const holder =
        `${faker.person.firstName()} ${faker.person.lastName()}`.replace(
            /[^a-zA-Z ]/g,
            ''
        );
    const future = faker.date.future({
        years: 5,
        refDate: faker.date.soon({ days: 60 }),
    });
    switch (method) {
        case PaymentMethods.BANK_TRANSFER:
            return {
                bank_name:
                    faker.company.name().replace(/[^a-zA-Z ]/g, '') || 'Bank',
                account_name: holder,
                account_number: faker.finance.accountNumber(10),
            };
        case PaymentMethods.CREDIT_CARD:
            return {
                credit_card_number: Array.from({ length: 4 }, () =>
                    faker.string.numeric(4)
                ).join('-'),
                expiration_date: `${String(future.getMonth() + 1).padStart(2, '0')}/${future.getFullYear()}`,
                cvv: faker.string.numeric(3),
                card_holder_name: holder,
            };
        case PaymentMethods.BUY_NOW_PAY_LATER:
            return {
                monthly_installments: faker.helpers.arrayElement([
                    '3',
                    '6',
                    '9',
                    '12',
                ]),
            };
        case PaymentMethods.GIFT_CARD:
            return {
                gift_card_number: faker.string.alphanumeric(16),
                validation_code: faker.string.alphanumeric(4),
            };
        case PaymentMethods.CASH_ON_DELIVERY:
            return {};
    }
};

/**
 * Generates guest details for `POST /invoices/guest`.
 *
 * @returns {{ guest_email: string; guest_first_name: string; guest_last_name: string }} Guest fields.
 */
export const generateGuestDetails = (): {
    guest_email: string;
    guest_first_name: string;
    guest_last_name: string;
} => ({
    guest_email: faker.internet
        .email({ provider: 'example.com' })
        .toLowerCase(),
    guest_first_name: faker.person.firstName(),
    guest_last_name: faker.person.lastName(),
});

/**
 * Generates a valid contact message (`ContactRequest`) for `POST /messages`.
 * Name and email are set for guests; logged-in users omit them.
 *
 * @param {Partial<ContactRequest>} overrides - Optional fields to override the generated values.
 * @returns {ContactRequest} A valid payload matching `ContactRequestSchema`.
 */
export const generateContactMessage = (
    overrides?: Partial<ContactRequest>
): ContactRequest => {
    const defaults: ContactRequest = {
        name: faker.person.fullName(),
        email: faker.internet.email({ provider: 'example.com' }).toLowerCase(),
        subject: faker.helpers.enumValue(ContactSubjects),
        message: faker.lorem.sentences(3).slice(0, 240).padEnd(60, '.'),
    };

    return ContactRequestSchema.parse({ ...defaults, ...overrides });
};
