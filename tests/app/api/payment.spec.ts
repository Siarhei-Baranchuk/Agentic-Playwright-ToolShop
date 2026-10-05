/* eslint-disable playwright/no-skipped-test -- documented contract gaps are kept as skipped tests with a FIXME */
import {
    ApiEndpoints,
    ApiMessages,
    PaymentMethods,
} from '../../../enums/app/app';
import {
    PaymentResponse,
    PaymentResponseSchema,
} from '../../../fixtures/api/schemas/app/invoiceSchema';
import {
    UnprocessableEntityResponse,
    UnprocessableEntityResponseSchema,
} from '../../../fixtures/api/schemas/util/errorResponseSchema';
import { expect, test } from '../../../fixtures/pom/test-options';
import { generatePaymentDetails } from '../../../test-data/factories/app/checkout.factory';
import { generateSearchToken } from '../../../test-data/factories/app/catalog.factory';

/** One invalid detail per payment method (each breaks one backend rule) */
const INVALID_DETAILS = [
    {
        method: PaymentMethods.BANK_TRANSFER,
        field: 'account_number',
        value: 'not-digits',
    },
    {
        method: PaymentMethods.CREDIT_CARD,
        field: 'credit_card_number',
        value: '1234',
    },
    {
        method: PaymentMethods.CREDIT_CARD,
        field: 'expiration_date',
        value: '01/2020',
    },
    {
        method: PaymentMethods.BUY_NOW_PAY_LATER,
        field: 'monthly_installments',
        value: 'monthly',
    },
    {
        method: PaymentMethods.GIFT_CARD,
        field: 'gift_card_number',
        value: '123',
    },
] as const;

test.describe('POST /payment/check', () => {
    for (const method of Object.values(PaymentMethods)) {
        test(
            `should return 200 for valid ${method} details`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<PaymentResponse>({
                    method: 'POST',
                    url: ApiEndpoints.PAYMENT_CHECK,
                    body: {
                        payment_method: method,
                        payment_details: generatePaymentDetails(method),
                    },
                });

                expect(status).toBe(200);
                expect(PaymentResponseSchema.parse(body)).toBeTruthy();
                expect(body.message).toBe(ApiMessages.PAYMENT_SUCCESSFUL);
            }
        );
    }

    // FIXME: validation errors of the payment check answer 404 "Resource not found" instead of 422 (only 200 is documented). See docs/test-plan.md, defect #13.
    for (const { method, field, value } of INVALID_DETAILS) {
        test.skip(
            `should return 422 for ${method} when ${field} is ${JSON.stringify(value)}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.PAYMENT_CHECK,
                        body: {
                            payment_method: method,
                            payment_details: {
                                ...generatePaymentDetails(method),
                                [field]: value,
                            },
                        },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    }

    // FIXME: an unknown payment method (or none) is reported as "Payment was successful" — the method is not validated. See docs/test-plan.md, defect #31.
    for (const { name, body: payload } of [
        {
            name: 'an unknown payment method',
            body: {
                payment_method: generateSearchToken(),
                payment_details: {},
            },
        },
        { name: 'an empty body', body: {} },
    ]) {
        test.skip(
            `should return 422 for ${name}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.PAYMENT_CHECK,
                        body: payload,
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    }
});
