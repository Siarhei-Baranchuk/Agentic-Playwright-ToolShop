/* eslint-disable playwright/no-skipped-test -- documented contract gaps are kept as skipped tests with a FIXME */
import {
    ApiEndpoints,
    ApiMessages,
    CheckoutRules,
    InvoiceStatuses,
    PaymentMethods,
} from '../../../enums/app/app';
import {
    Download,
    DownloadSchema,
    Invoice,
    InvoiceSchema,
    PaginatedInvoices,
    PaginatedInvoiceSchema,
} from '../../../fixtures/api/schemas/app/invoiceSchema';
import {
    UpdateResponse,
    UpdateResponseSchema,
} from '../../../fixtures/api/schemas/util/commonResponseSchema';
import {
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
import {
    addToCart,
    createCart,
    createCombinationCart,
    createInvoice,
    getCatalogProducts,
    lookupBillingAddress,
    type BillingAddress,
    type CatalogProducts,
} from '../../../helpers/app/checkout';
import {
    deleteUser,
    registerUser,
    type RegisteredUser,
} from '../../../helpers/app/users';
import { fillPath, required } from '../../../helpers/util/util';
import {
    generateGuestDetails,
    generatePaymentDetails,
} from '../../../test-data/factories/app/checkout.factory';
import { generateSearchToken } from '../../../test-data/factories/app/catalog.factory';
import { INVALID_PATH_IDS } from '../../../test-data/static/util/invalid-path-params';
import {
    INVALID_STRING_VALUES,
    PRIMARY_INVALID_VALUES,
} from '../../../test-data/static/util/invalid-values';

const REQUIRED_FIELDS = [
    'billing_street',
    'billing_city',
    'billing_country',
    'payment_method',
    'payment_details',
    'cart_id',
] as const;
const BILLING_FIELDS = [
    'billing_street',
    'billing_city',
    'billing_state',
    'billing_country',
    'billing_postal_code',
] as const;

test.describe('invoices', () => {
    let catalog: CatalogProducts;
    let address: BillingAddress;
    /** A second customer whose invoice the others must not reach */
    let owner: RegisteredUser;
    let ownersInvoice: Invoice;

    test.beforeAll(async ({ apiRequest }) => {
        catalog = await getCatalogProducts(apiRequest);
        address = await lookupBillingAddress(apiRequest);
        owner = await registerUser(apiRequest);
        ownersInvoice = await createInvoice(
            apiRequest,
            owner.token,
            await createCombinationCart(apiRequest, catalog)
        );
    });

    test.afterAll(async ({ apiRequest }) => {
        await deleteUser(apiRequest, owner);
    });

    test.describe('POST /invoices', () => {
        // The spec documents 200 for this operation; the API answers 201 Created.
        test(
            `should return 201 with the ${CheckoutRules.COMBINATION_DISCOUNT_PERCENTAGE}% combination discount applied`,
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const regular = required(
                    catalog.regular.at(0),
                    'regular product'
                );
                const rental = required(catalog.rental.at(0), 'rental product');

                const cartId =
                    await test.step('Fill a cart via POST /carts + /carts/{id}', async () => {
                        const id = await createCart(apiRequest);
                        await addToCart(
                            apiRequest,
                            id,
                            required(regular.id, 'id'),
                            2
                        );
                        await addToCart(
                            apiRequest,
                            id,
                            required(rental.id, 'id'),
                            1
                        );
                        return id;
                    });

                await test.step('Check out via POST /invoices', async () => {
                    const { status, body } = await apiRequest<Invoice>({
                        method: 'POST',
                        url: ApiEndpoints.INVOICES,
                        headers: registeredUser.token,
                        body: {
                            ...address,
                            payment_method: PaymentMethods.CASH_ON_DELIVERY,
                            payment_details: {},
                            cart_id: cartId,
                        },
                    });

                    expect(status).toBe(201);
                    expect(InvoiceSchema.parse(body)).toBeTruthy();
                    const subtotal =
                        2 * required(regular.price, 'price') +
                        required(rental.price, 'price');
                    const discount =
                        subtotal *
                        (CheckoutRules.COMBINATION_DISCOUNT_PERCENTAGE / 100);
                    expect(body).toMatchObject({
                        ...address,
                        user_id: registeredUser.id,
                    });
                    expect(body.invoice_number).toMatch(/^INV-\d+$/);
                    expect(body.subtotal).toBeCloseTo(subtotal, 2);
                    expect(body.additional_discount_percentage).toBe(
                        CheckoutRules.COMBINATION_DISCOUNT_PERCENTAGE
                    );
                    expect(body.additional_discount_amount).toBeCloseTo(
                        discount,
                        2
                    );
                    expect(body.total).toBeCloseTo(
                        subtotal -
                            discount -
                            required(body.eco_discount_amount, 'eco discount'),
                        2
                    );
                });
            }
        );

        test(
            `should add the ${CheckoutRules.ECO_DISCOUNT_PERCENTAGE}% eco discount when most items are eco-friendly`,
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const cartId =
                    await test.step('Fill a cart with 3 eco products and 1 rental', async () => {
                        const id = await createCart(apiRequest);
                        await addToCart(
                            apiRequest,
                            id,
                            required(catalog.eco.at(0)?.id, 'eco product'),
                            3
                        );
                        await addToCart(
                            apiRequest,
                            id,
                            required(
                                catalog.rental.at(0)?.id,
                                'rental product'
                            ),
                            1
                        );
                        return id;
                    });

                await test.step('Check out via POST /invoices', async () => {
                    const invoice = await createInvoice(
                        apiRequest,
                        registeredUser.token,
                        cartId
                    );
                    const afterCombination =
                        required(invoice.subtotal, 'subtotal') -
                        required(
                            invoice.additional_discount_amount,
                            'discount'
                        );

                    expect(invoice.eco_discount_percentage).toBe(
                        CheckoutRules.ECO_DISCOUNT_PERCENTAGE
                    );
                    expect(invoice.eco_discount_amount).toBeCloseTo(
                        afterCombination *
                            (CheckoutRules.ECO_DISCOUNT_PERCENTAGE / 100),
                        2
                    );
                });
            }
        );

        for (const method of Object.values(PaymentMethods)) {
            test(
                `should return 201 when paying by ${method}`,
                { tag: '@api' },
                async ({ apiRequest, registeredUser }) => {
                    const cartId =
                        await test.step('Fill a cart via POST /carts + /carts/{id}', async () =>
                            createCombinationCart(apiRequest, catalog));

                    await test.step('Check out via POST /invoices', async () => {
                        const { status, body } = await apiRequest<Invoice>({
                            method: 'POST',
                            url: ApiEndpoints.INVOICES,
                            headers: registeredUser.token,
                            body: {
                                ...address,
                                payment_method: method,
                                payment_details: generatePaymentDetails(method),
                                cart_id: cartId,
                            },
                        });

                        expect(status).toBe(201);
                        expect(InvoiceSchema.parse(body)).toBeTruthy();
                    });
                }
            );
        }

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method: 'POST',
                        url: ApiEndpoints.INVOICES,
                        body: {
                            ...address,
                            payment_method: PaymentMethods.CASH_ON_DELIVERY,
                            payment_details: {},
                            cart_id: await createCombinationCart(
                                apiRequest,
                                catalog
                            ),
                        },
                    }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            }
        );

        test.describe('validation', () => {
            let cartId: string;

            test.beforeAll(async ({ apiRequest }) => {
                cartId = await createCombinationCart(apiRequest, catalog);
            });

            const validBody = (): Record<string, unknown> => ({
                ...address,
                payment_method: PaymentMethods.CASH_ON_DELIVERY,
                payment_details: {},
                cart_id: cartId,
            });

            test(
                'should return 422 for an empty body',
                { tag: '@api' },
                async ({ apiRequest, registeredUser }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method: 'POST',
                            url: ApiEndpoints.INVOICES,
                            headers: registeredUser.token,
                            body: {},
                        });

                    expect(status).toBe(422);
                    expect(
                        UnprocessableEntityResponseSchema.parse(body)
                    ).toBeTruthy();
                }
            );

            for (const field of REQUIRED_FIELDS) {
                test(
                    `should return 422 when ${field} is missing`,
                    { tag: '@api' },
                    async ({ apiRequest, registeredUser }) => {
                        const { [field]: _omitted, ...payload } = validBody();

                        const { status, body } =
                            await apiRequest<UnprocessableEntityResponse>({
                                method: 'POST',
                                url: ApiEndpoints.INVOICES,
                                headers: registeredUser.token,
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

            for (const field of BILLING_FIELDS) {
                for (const invalidValue of INVALID_STRING_VALUES) {
                    test(
                        `should return 422 when ${field} is ${JSON.stringify(invalidValue)}`,
                        { tag: '@api' },
                        async ({ apiRequest, registeredUser }) => {
                            const { status, body } =
                                await apiRequest<UnprocessableEntityResponse>({
                                    method: 'POST',
                                    url: ApiEndpoints.INVOICES,
                                    headers: registeredUser.token,
                                    body: {
                                        ...validBody(),
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

            test(
                'should return 422 for an unknown payment method',
                { tag: '@api' },
                async ({ apiRequest, registeredUser }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method: 'POST',
                            url: ApiEndpoints.INVOICES,
                            headers: registeredUser.token,
                            body: {
                                ...validBody(),
                                payment_method: generateSearchToken(),
                            },
                        });

                    expect(status).toBe(422);
                    expect(
                        UnprocessableEntityResponseSchema.parse(body)
                    ).toBeTruthy();
                    expect(body).toHaveProperty('payment_method');
                }
            );

            test(
                'should return 422 when the city does not match the postcode',
                { tag: '@api' },
                async ({ apiRequest, registeredUser }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method: 'POST',
                            url: ApiEndpoints.INVOICES,
                            headers: registeredUser.token,
                            body: {
                                ...validBody(),
                                billing_city: generateSearchToken(),
                            },
                        });

                    expect(status).toBe(422);
                    expect(
                        UnprocessableEntityResponseSchema.parse(body)
                    ).toBeTruthy();
                    expect(body).toHaveProperty('billing_country');
                }
            );

            test(
                'should return 422 for a malformed gift card',
                { tag: '@api' },
                async ({ apiRequest, registeredUser }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method: 'POST',
                            url: ApiEndpoints.INVOICES,
                            headers: registeredUser.token,
                            body: {
                                ...validBody(),
                                payment_method: PaymentMethods.GIFT_CARD,
                                payment_details: {
                                    gift_card_number: '123',
                                    validation_code: '1',
                                },
                            },
                        });

                    expect(status).toBe(422);
                    expect(
                        UnprocessableEntityResponseSchema.parse(body)
                    ).toBeTruthy();
                }
            );

            test(
                'should return 404 for an unknown cart',
                { tag: '@api' },
                async ({ apiRequest, registeredUser }) => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method: 'POST',
                            url: ApiEndpoints.INVOICES,
                            headers: registeredUser.token,
                            body: {
                                ...validBody(),
                                cart_id: INVALID_PATH_IDS[0].value,
                            },
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                }
            );
        });

        test(
            'should return 405 for an unsupported method on /invoices',
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status, body } =
                    await apiRequest<MethodNotAllowedResponse>({
                        method: 'DELETE',
                        url: ApiEndpoints.INVOICES,
                        headers: registeredUser.token,
                    });

                expect(status).toBe(405);
                expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });

    test.describe('POST /invoices/guest', () => {
        // The spec documents 200 for this operation; the API answers 201 Created.
        // FIXME: a guest invoice has user_id = null; the contract types it as string. See docs/test-plan.md, defect #27.
        test.skip(
            'should return 201 and create a guest invoice',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<Invoice>({
                    method: 'POST',
                    url: ApiEndpoints.INVOICES_GUEST,
                    body: {
                        ...address,
                        ...generateGuestDetails(),
                        payment_method: PaymentMethods.CREDIT_CARD,
                        payment_details: generatePaymentDetails(
                            PaymentMethods.CREDIT_CARD
                        ),
                        cart_id: await createCombinationCart(
                            apiRequest,
                            catalog
                        ),
                    },
                });

                expect(status).toBe(201);
                expect(InvoiceSchema.parse(body)).toBeTruthy();
                expect(body.invoice_number).toMatch(/^INV-\d+$/);
            }
        );

        // FIXME: validation errors of the guest checkout answer 404 "Resource not found" instead of 422. See docs/test-plan.md, defect #13.
        for (const field of [
            'guest_email',
            'guest_first_name',
            'guest_last_name',
        ] as const) {
            test.skip(
                `should return 422 when ${field} is missing`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { [field]: _omitted, ...guest } =
                        generateGuestDetails();

                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method: 'POST',
                            url: ApiEndpoints.INVOICES_GUEST,
                            body: {
                                ...address,
                                ...guest,
                                payment_method: PaymentMethods.CASH_ON_DELIVERY,
                                payment_details: {},
                                cart_id: await createCombinationCart(
                                    apiRequest,
                                    catalog
                                ),
                            },
                        });

                    expect(status).toBe(422);
                    expect(
                        UnprocessableEntityResponseSchema.parse(body)
                    ).toBeTruthy();
                    expect(body).toHaveProperty(field);
                }
            );
        }

        // FIXME: validation errors of the guest checkout answer 404 "Resource not found" instead of 422. See docs/test-plan.md, defect #13.
        test.skip(
            'should return 422 for a malformed guest email',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.INVOICES_GUEST,
                        body: {
                            ...address,
                            ...generateGuestDetails(),
                            guest_email: 'plaintext',
                            payment_method: PaymentMethods.CASH_ON_DELIVERY,
                            payment_details: {},
                            cart_id: await createCombinationCart(
                                apiRequest,
                                catalog
                            ),
                        },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
                expect(body).toHaveProperty('guest_email');
            }
        );
    });

    test.describe('GET /invoices', () => {
        // FIXME: invoice lines carry discount_percentage = null and discounted_price as a string, status_message = null — the contract types them as number / string. See docs/test-plan.md, defect #27.
        test.skip(
            'should return 200 and only the own invoices',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<PaginatedInvoices>({
                    method: 'GET',
                    url: ApiEndpoints.INVOICES,
                    headers: owner.token,
                });

                expect(status).toBe(200);
                expect(PaginatedInvoiceSchema.parse(body)).toBeTruthy();
                expect(body.data?.map(({ id }) => id)).toContain(
                    ownersInvoice.id
                );
            }
        );

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method: 'GET',
                        url: ApiEndpoints.INVOICES,
                    }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            }
        );

        // FIXME: 404 is documented for the invoice list, but an empty list answers 200.
        test.skip(
            'should return 404 when the invoice list is not available',
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status } = await apiRequest({
                    method: 'GET',
                    url: ApiEndpoints.INVOICES,
                    headers: registeredUser.token,
                });

                expect(status).toBe(404);
            }
        );
    });

    test.describe('GET /invoices/{invoiceId}', () => {
        // FIXME: the body carries invoice lines with discount_percentage = null / discounted_price as a string and status_message = null. See docs/test-plan.md, defect #27.
        test.skip(
            'should return 200 and the own invoice with its lines and payment',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<Invoice>({
                    method: 'GET',
                    url: fillPath(ApiEndpoints.INVOICE, {
                        invoiceId: required(ownersInvoice.id, 'invoice id'),
                    }),
                    headers: owner.token,
                });

                expect(status).toBe(200);
                expect(InvoiceSchema.parse(body)).toBeTruthy();
                expect(body.invoicelines?.length).toBeGreaterThan(0);
            }
        );

        test(
            "should return 404 for another customer's invoice",
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'GET',
                        url: fillPath(ApiEndpoints.INVOICE, {
                            invoiceId: required(ownersInvoice.id, 'invoice id'),
                        }),
                        headers: registeredUser.token,
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            }
        );

        for (const { description, value } of INVALID_PATH_IDS) {
            test(
                `should return 404 for invoiceId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method: 'GET',
                            url: fillPath(ApiEndpoints.INVOICE, {
                                invoiceId: value,
                            }),
                            headers: owner.token,
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                }
            );
        }

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method: 'GET',
                        url: fillPath(ApiEndpoints.INVOICE, {
                            invoiceId: required(ownersInvoice.id, 'invoice id'),
                        }),
                    }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            }
        );

        test(
            'should return 405 for an unsupported method on /invoices/{invoiceId}',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<MethodNotAllowedResponse>({
                        method: 'DELETE',
                        url: fillPath(ApiEndpoints.INVOICE, {
                            invoiceId: required(ownersInvoice.id, 'invoice id'),
                        }),
                        headers: owner.token,
                    });

                expect(status).toBe(405);
                expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });

    for (const method of ['PUT', 'PATCH'] as const) {
        test.describe(`${method} /invoices/{invoiceId}`, () => {
            const update = (cartId: string): Record<string, unknown> =>
                method === 'PUT'
                    ? {
                          ...address,
                          payment_method: PaymentMethods.CASH_ON_DELIVERY,
                          payment_details: {},
                          cart_id: cartId,
                      }
                    : { billing_street: address.billing_street };

            test(
                'should return 200 and update the own invoice',
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } = await apiRequest<UpdateResponse>({
                        method,
                        url: fillPath(ApiEndpoints.INVOICE, {
                            invoiceId: required(ownersInvoice.id, 'invoice id'),
                        }),
                        headers: owner.token,
                        body: update(
                            await createCombinationCart(apiRequest, catalog)
                        ),
                    });

                    expect(status).toBe(200);
                    expect(UpdateResponseSchema.parse(body)).toBeTruthy();
                    expect(body.success).toBe(true);
                }
            );

            test(
                "should return 404 for another customer's invoice",
                { tag: '@api' },
                async ({ apiRequest, registeredUser }) => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method,
                            url: fillPath(ApiEndpoints.INVOICE, {
                                invoiceId: required(
                                    ownersInvoice.id,
                                    'invoice id'
                                ),
                            }),
                            headers: registeredUser.token,
                            body: update(
                                await createCombinationCart(apiRequest, catalog)
                            ),
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                }
            );

            test(
                `should return 422 when billing_city is ${JSON.stringify(PRIMARY_INVALID_VALUES.STRING)}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method,
                            url: fillPath(ApiEndpoints.INVOICE, {
                                invoiceId: required(
                                    ownersInvoice.id,
                                    'invoice id'
                                ),
                            }),
                            headers: owner.token,
                            body: {
                                ...update(
                                    await createCombinationCart(
                                        apiRequest,
                                        catalog
                                    )
                                ),
                                billing_city: PRIMARY_INVALID_VALUES.STRING,
                            },
                        });

                    expect(status).toBe(422);
                    expect(
                        UnprocessableEntityResponseSchema.parse(body)
                    ).toBeTruthy();
                }
            );

            test(
                'should return 401 without an access token',
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<UnauthorizedResponse>({
                            method,
                            url: fillPath(ApiEndpoints.INVOICE, {
                                invoiceId: required(
                                    ownersInvoice.id,
                                    'invoice id'
                                ),
                            }),
                            body: update(
                                await createCombinationCart(apiRequest, catalog)
                            ),
                        });

                    expect(status).toBe(401);
                    expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
                }
            );

            for (const { description, value } of INVALID_PATH_IDS) {
                test(
                    `should return 404 for invoiceId - ${description}`,
                    { tag: '@api' },
                    async ({ apiRequest }) => {
                        const { status, body } =
                            await apiRequest<ItemNotFoundResponse>({
                                method,
                                url: fillPath(ApiEndpoints.INVOICE, {
                                    invoiceId: value,
                                }),
                                headers: owner.token,
                                body: update(
                                    await createCombinationCart(
                                        apiRequest,
                                        catalog
                                    )
                                ),
                            });

                        expect(status).toBe(404);
                        expect(
                            ItemNotFoundResponseSchema.parse(body)
                        ).toBeTruthy();
                    }
                );
            }
        });
    }

    test.describe('PUT /invoices/{invoiceId}/status', () => {
        for (const status of Object.values(InvoiceStatuses)) {
            test(
                `should return 200 and set the status ${status} (admin)`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const response = await apiRequest<UpdateResponse>({
                        method: 'PUT',
                        url: fillPath(ApiEndpoints.INVOICE_STATUS, {
                            invoiceId: required(ownersInvoice.id, 'invoice id'),
                        }),
                        headers: process.env.ADMIN_ACCESS_TOKEN,
                        body: {
                            status,
                            status_message: `Status set to ${status}`.slice(
                                0,
                                50
                            ),
                        },
                    });

                    expect(response.status).toBe(200);
                    expect(
                        UpdateResponseSchema.parse(response.body)
                    ).toBeTruthy();
                }
            );
        }

        // FIXME: any customer can change the status of any invoice — there is no role or ownership check. See docs/test-plan.md, defect #29.
        test.skip(
            "should return 403 when a customer changes another customer's invoice status",
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status } = await apiRequest({
                    method: 'PUT',
                    url: fillPath(ApiEndpoints.INVOICE_STATUS, {
                        invoiceId: required(ownersInvoice.id, 'invoice id'),
                    }),
                    headers: registeredUser.token,
                    body: { status: InvoiceStatuses.SHIPPED },
                });

                expect(status).toBe(403);
            }
        );

        // FIXME: validation errors of the invoice status answer 404 "Resource not found" instead of 422. See docs/test-plan.md, defect #13.
        for (const { name, body: payload } of [
            { name: 'the status is unknown', body: { status: 'NOT_A_STATUS' } },
            {
                name: 'the status message is shorter than 5 characters',
                body: {
                    status: InvoiceStatuses.SHIPPED,
                    status_message: 'abc',
                },
            },
        ]) {
            test.skip(
                `should return 422 when ${name}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method: 'PUT',
                            url: fillPath(ApiEndpoints.INVOICE_STATUS, {
                                invoiceId: required(
                                    ownersInvoice.id,
                                    'invoice id'
                                ),
                            }),
                            headers: process.env.ADMIN_ACCESS_TOKEN,
                            body: payload,
                        });

                    expect(status).toBe(422);
                    expect(
                        UnprocessableEntityResponseSchema.parse(body)
                    ).toBeTruthy();
                }
            );
        }

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method: 'PUT',
                        url: fillPath(ApiEndpoints.INVOICE_STATUS, {
                            invoiceId: required(ownersInvoice.id, 'invoice id'),
                        }),
                        body: { status: InvoiceStatuses.SHIPPED },
                    }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            }
        );

        for (const { description, value } of INVALID_PATH_IDS) {
            test(
                `should return 404 for invoiceId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method: 'PUT',
                            url: fillPath(ApiEndpoints.INVOICE_STATUS, {
                                invoiceId: value,
                            }),
                            headers: process.env.ADMIN_ACCESS_TOKEN,
                            body: { status: InvoiceStatuses.SHIPPED },
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                    expect(body.message).toBe(ApiMessages.INVOICE_NOT_FOUND);
                }
            );
        }
    });

    test.describe('GET /invoices/{invoice_number}/download-pdf-status', () => {
        // FIXME: for a new invoice the status is 400 {"status": "NOT_INITIATED"} — the spec documents 200 (with an InvoiceResponse body) and no way to start the PDF generation. See docs/test-plan.md, defect #30.
        test.skip(
            'should return 200 and the PDF status',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<Download>({
                    method: 'GET',
                    url: fillPath(ApiEndpoints.INVOICE_DOWNLOAD_PDF_STATUS, {
                        invoice_number: required(
                            ownersInvoice.invoice_number,
                            'invoice number'
                        ),
                    }),
                    headers: owner.token,
                });

                expect(status).toBe(200);
                expect(DownloadSchema.parse(body)).toBeTruthy();
            }
        );

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method: 'GET',
                        url: fillPath(
                            ApiEndpoints.INVOICE_DOWNLOAD_PDF_STATUS,
                            {
                                invoice_number: required(
                                    ownersInvoice.invoice_number,
                                    'invoice number'
                                ),
                            }
                        ),
                    }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            }
        );

        // FIXME: an unknown invoice number answers 400 {"status": "NOT_INITIATED"} instead of 404. See docs/test-plan.md, defect #30.
        test.skip(
            'should return 404 for an unknown invoice number',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'GET',
                        url: fillPath(
                            ApiEndpoints.INVOICE_DOWNLOAD_PDF_STATUS,
                            { invoice_number: INVALID_PATH_IDS[0].value }
                        ),
                        headers: owner.token,
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });

    test.describe('GET /invoices/{invoice_number}/download-pdf', () => {
        // FIXME: the PDF is never generated through the API, so the download answers 404 "Document not created". See docs/test-plan.md, defect #30.
        test.skip(
            'should return 200 and the invoice PDF',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, headers } = await apiRequest({
                    method: 'GET',
                    url: fillPath(ApiEndpoints.INVOICE_DOWNLOAD_PDF, {
                        invoice_number: required(
                            ownersInvoice.invoice_number,
                            'invoice number'
                        ),
                    }),
                    headers: owner.token,
                });

                expect(status).toBe(200);
                expect(headers['content-type']).toContain('application/pdf');
            }
        );

        for (const { description, value } of INVALID_PATH_IDS) {
            test(
                `should return 404 for invoice_number - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method: 'GET',
                            url: fillPath(ApiEndpoints.INVOICE_DOWNLOAD_PDF, {
                                invoice_number: value,
                            }),
                            headers: owner.token,
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                    expect(body.message).toBe(ApiMessages.PDF_NOT_CREATED);
                }
            );
        }

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method: 'GET',
                        url: fillPath(ApiEndpoints.INVOICE_DOWNLOAD_PDF, {
                            invoice_number: required(
                                ownersInvoice.invoice_number,
                                'invoice number'
                            ),
                        }),
                    }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });

    for (const method of ['GET', 'QUERY'] as const) {
        test.describe(`${method} /invoices/search`, () => {
            const criteria = (q: string): Record<string, unknown> =>
                method === 'GET' ? { params: { q } } : { body: { q } };

            // FIXME: search results carry invoice lines with null / string values against the contract. See docs/test-plan.md, defect #27.
            test.skip(
                'should return 200 and the own invoice by its number',
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<PaginatedInvoices>({
                            method,
                            url: ApiEndpoints.INVOICES_SEARCH,
                            headers: owner.token,
                            ...criteria(
                                required(
                                    ownersInvoice.invoice_number,
                                    'invoice number'
                                )
                            ),
                        });

                    expect(status).toBe(200);
                    expect(PaginatedInvoiceSchema.parse(body)).toBeTruthy();
                    expect(body.data?.map(({ id }) => id)).toEqual([
                        ownersInvoice.id,
                    ]);
                }
            );

            test(
                'should return 401 without an access token',
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<UnauthorizedResponse>({
                            method,
                            url: ApiEndpoints.INVOICES_SEARCH,
                            ...criteria(
                                required(
                                    ownersInvoice.invoice_number,
                                    'invoice number'
                                )
                            ),
                        });

                    expect(status).toBe(401);
                    expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
                }
            );
        });
    }

    test.describe('QUERY /invoices/search - media type', () => {
        test(
            'should return 415 when the criteria are not sent as JSON',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status } = await apiRequest({
                    method: 'QUERY',
                    url: ApiEndpoints.INVOICES_SEARCH,
                    headers: owner.token,
                    body: `q=${ownersInvoice.invoice_number}`,
                    contentType: 'text/plain',
                });

                // The spec documents no body for 415.
                expect(status).toBe(415);
            }
        );
    });
});
