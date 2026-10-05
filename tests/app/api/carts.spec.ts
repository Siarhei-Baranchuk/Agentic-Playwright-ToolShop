/* eslint-disable playwright/no-skipped-test -- documented contract gaps are kept as skipped tests with a FIXME */
import {
    ApiEndpoints,
    ApiMessages,
    CheckoutRules,
    SpecialProducts,
} from '../../../enums/app/app';
import {
    Cart,
    CartCreated,
    CartCreatedSchema,
    CartItemAdded,
    CartItemAddedSchema,
    CartSchema,
} from '../../../fixtures/api/schemas/app/cartSchema';
import {
    PaginatedProducts,
    PaginatedProductSchema,
} from '../../../fixtures/api/schemas/app/productSchema';
import {
    UpdateResponse,
    UpdateResponseSchema,
} from '../../../fixtures/api/schemas/util/commonResponseSchema';
import {
    ItemNotFoundResponse,
    ItemNotFoundResponseSchema,
    MethodNotAllowedResponse,
    MethodNotAllowedResponseSchema,
    ResourceNotFoundResponse,
    ResourceNotFoundResponseSchema,
    UnprocessableEntityResponse,
    UnprocessableEntityResponseSchema,
} from '../../../fixtures/api/schemas/util/errorResponseSchema';
import type { ApiRequestFn } from '../../../fixtures/api/api-types';
import { expect, test } from '../../../fixtures/pom/test-options';
import {
    addToCart,
    createCart,
    getCatalogProducts,
    type CatalogProducts,
} from '../../../helpers/app/checkout';
import { fillPath, required } from '../../../helpers/util/util';
import {
    GEO_DISCOUNT_LOCATIONS,
    NO_DISCOUNT_LOCATION,
} from '../../../test-data/static/app/checkout';
import { INVALID_PATH_IDS } from '../../../test-data/static/util/invalid-path-params';
import {
    INVALID_NUMBER_VALUES,
    INVALID_STRING_VALUES,
} from '../../../test-data/static/util/invalid-values';

const AMSTERDAM = GEO_DISCOUNT_LOCATIONS[3];

/**
 * Reads a cart via `GET /carts/{cartId}`.
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @param {string} cartId - The cart.
 * @returns {Promise<Cart>} The cart.
 */
async function readCart(
    apiRequest: ApiRequestFn,
    cartId: string
): Promise<Cart> {
    const { status, body } = await apiRequest<Cart>({
        method: 'GET',
        url: fillPath(ApiEndpoints.CART, { cartId }),
    });
    expect(status).toBe(200);
    expect(CartSchema.parse(body)).toBeTruthy();
    return body;
}

test.describe('carts', () => {
    let catalog: CatalogProducts;
    let productId: string;

    test.beforeAll(async ({ apiRequest }) => {
        catalog = await getCatalogProducts(apiRequest);
        productId = required(catalog.regular.at(0)?.id, 'regular product');
    });

    test.describe('POST /carts', () => {
        test(
            'should return 201 and the new cart id',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<CartCreated>({
                    method: 'POST',
                    url: ApiEndpoints.CARTS,
                });

                expect(status).toBe(201);
                expect(CartCreatedSchema.parse(body)).toBeTruthy();
                expect(body.id).toBeTruthy();
            }
        );

        test(
            'should return 201 and store the cart location',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const cartId =
                    await test.step('Create a cart via POST /carts', async () =>
                        createCart(apiRequest, {
                            lat: AMSTERDAM.lat,
                            lng: AMSTERDAM.lng,
                        }));

                await test.step('Read the cart via GET /carts/{cartId}', async () => {
                    const cart = await readCart(apiRequest, cartId);

                    expect(cart).toMatchObject({
                        lat: AMSTERDAM.lat,
                        lng: AMSTERDAM.lng,
                    });
                });
            }
        );

        // FIXME: 404 and 422 are documented for POST /carts, but creating a cart has no input that can fail.
        for (const code of [404, 422]) {
            test.skip(
                `should return ${code} when creating a cart`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status } = await apiRequest({
                        method: 'POST',
                        url: ApiEndpoints.CARTS,
                    });

                    expect(status).toBe(code);
                }
            );
        }

        test(
            'should return 405 for an unsupported method on /carts',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<MethodNotAllowedResponse>({
                        method: 'GET',
                        url: ApiEndpoints.CARTS,
                    });

                expect(status).toBe(405);
                expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });

    test.describe('POST /carts/{id}', () => {
        test(
            'should return 200 and add the product to the cart',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const cartId =
                    await test.step('Create a cart via POST /carts', async () =>
                        createCart(apiRequest));

                await test.step('Add a product via POST /carts/{id}', async () => {
                    const { status, body } = await apiRequest<CartItemAdded>({
                        method: 'POST',
                        url: fillPath(ApiEndpoints.CART, { cartId }),
                        body: { product_id: productId, quantity: 2 },
                    });

                    expect(status).toBe(200);
                    expect(CartItemAddedSchema.parse(body)).toBeTruthy();
                    expect(body.result).toBe(ApiMessages.ITEM_ADDED);
                });

                await test.step('Read the cart via GET /carts/{cartId}', async () => {
                    const cart = await readCart(apiRequest, cartId);

                    expect(
                        cart.cart_items?.map(({ product_id, quantity }) => ({
                            product_id,
                            quantity,
                        }))
                    ).toEqual([{ product_id: productId, quantity: 2 }]);
                });
            }
        );

        test(
            'should add up the quantity when the same product is added again',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const cartId =
                    await test.step('Create a cart with the product via POST /carts + /carts/{id}', async () => {
                        const id = await createCart(apiRequest);
                        await addToCart(apiRequest, id, productId, 1);
                        return id;
                    });

                await test.step('Add the same product via POST /carts/{id}', async () => {
                    await addToCart(apiRequest, cartId, productId, 2);
                });

                await test.step('Read the cart via GET /carts/{cartId}', async () => {
                    const cart = await readCart(apiRequest, cartId);

                    expect(cart.cart_items).toHaveLength(1);
                    expect(cart.cart_items?.at(0)?.quantity).toBe(3);
                });
            }
        );

        test(
            `should apply the ${AMSTERDAM.discount}% location discount for a cart in ${AMSTERDAM.city}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const offer = required(
                    catalog.locationOffer.at(0),
                    'location-offer product'
                );

                const cartId =
                    await test.step('Create a cart in Amsterdam via POST /carts', async () =>
                        createCart(apiRequest, {
                            lat: AMSTERDAM.lat,
                            lng: AMSTERDAM.lng,
                        }));

                await test.step('Add a location-offer product via POST /carts/{id}', async () => {
                    await addToCart(
                        apiRequest,
                        cartId,
                        required(offer.id, 'product id'),
                        1
                    );
                });

                await test.step('Read the discount via GET /carts/{cartId}', async () => {
                    const item = required(
                        (await readCart(apiRequest, cartId)).cart_items?.at(0),
                        'cart item'
                    );
                    const price = required(offer.price, 'price');

                    expect(item.discount_percentage).toBe(AMSTERDAM.discount);
                    expect(item.discounted_price).toBeCloseTo(
                        price * (1 - AMSTERDAM.discount / 100),
                        2
                    );
                });
            }
        );

        test(
            'should not apply a location discount far from the discount cities',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const offer = required(
                    catalog.locationOffer.at(0),
                    'location-offer product'
                );

                const cartId =
                    await test.step('Create a cart far away via POST /carts', async () =>
                        createCart(apiRequest, NO_DISCOUNT_LOCATION));

                await test.step('Add a location-offer product via POST /carts/{id}', async () => {
                    await addToCart(
                        apiRequest,
                        cartId,
                        required(offer.id, 'product id'),
                        1
                    );
                });

                await test.step('Read the cart via GET /carts/{cartId}', async () => {
                    const item = required(
                        (await readCart(apiRequest, cartId)).cart_items?.at(0),
                        'cart item'
                    );

                    expect(item.discount_percentage).toBe(0);
                    expect(item.discounted_price).toBeUndefined();
                });
            }
        );

        // 400 is not documented for this operation; the backend limits this product to one per cart.
        test(
            `should return 400 for more than one ${SpecialProducts.THOR_HAMMER}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                let hammerId = '';

                await test.step('Find the product via GET /products/search', async () => {
                    const { status, body } =
                        await apiRequest<PaginatedProducts>({
                            method: 'GET',
                            url: ApiEndpoints.PRODUCTS_SEARCH,
                            params: { q: SpecialProducts.THOR_HAMMER },
                        });
                    expect(status).toBe(200);
                    expect(PaginatedProductSchema.parse(body)).toBeTruthy();
                    hammerId = required(
                        body.data?.find(
                            ({ name }) => name === SpecialProducts.THOR_HAMMER
                        )?.id,
                        'Thor Hammer id'
                    );
                });

                const cartId =
                    await test.step('Create a cart via POST /carts', async () =>
                        createCart(apiRequest));

                await test.step('Add two of them via POST /carts/{id}', async () => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method: 'POST',
                            url: fillPath(ApiEndpoints.CART, { cartId }),
                            body: { product_id: hammerId, quantity: 2 },
                        });

                    expect(status).toBe(400);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                    expect(body.message).toBe(ApiMessages.ONE_THOR_HAMMER);
                });
            }
        );

        for (const { description, value } of INVALID_PATH_IDS) {
            test(
                `should return 404 for cart id - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method: 'POST',
                            url: fillPath(ApiEndpoints.CART, { cartId: value }),
                            body: { product_id: productId, quantity: 1 },
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                    expect(body.message).toBe(ApiMessages.CART_NOT_FOUND);
                }
            );
        }

        test.describe('validation', () => {
            let cartId: string;

            test.beforeAll(async ({ apiRequest }) => {
                cartId = await createCart(apiRequest);
            });

            // FIXME: validation errors of the cart answer 404 "Resource not found" instead of 422 — every test below is skipped. See docs/test-plan.md, defect #13.
            const cases: { name: string; body: Record<string, unknown> }[] = [
                { name: 'an empty body', body: {} },
                { name: 'product_id is missing', body: { quantity: 1 } },
                {
                    name: 'quantity is missing',
                    body: { product_id: 'PRODUCT' },
                },
                ...INVALID_STRING_VALUES.map((value) => ({
                    name: `product_id is ${JSON.stringify(value)}`,
                    body: { product_id: value, quantity: 1 },
                })),
                ...INVALID_NUMBER_VALUES.map((value) => ({
                    name: `quantity is ${JSON.stringify(value)}`,
                    body: { product_id: 'PRODUCT', quantity: value },
                })),
                {
                    name: 'quantity is 0',
                    body: { product_id: 'PRODUCT', quantity: 0 },
                },
                {
                    name: `quantity is above ${CheckoutRules.CART_MAX_QUANTITY}`,
                    body: {
                        product_id: 'PRODUCT',
                        quantity: CheckoutRules.CART_MAX_QUANTITY + 1,
                    },
                },
                {
                    name: 'the product does not exist',
                    body: {
                        product_id: INVALID_PATH_IDS[0].value,
                        quantity: 1,
                    },
                },
            ];
            for (const { name, body: payload } of cases) {
                test.skip(
                    `should return 422 when ${name}`,
                    { tag: '@api' },
                    async ({ apiRequest }) => {
                        const body = JSON.parse(
                            JSON.stringify(payload).replace(
                                '"PRODUCT"',
                                JSON.stringify(productId)
                            )
                        );
                        const response =
                            await apiRequest<UnprocessableEntityResponse>({
                                method: 'POST',
                                url: fillPath(ApiEndpoints.CART, { cartId }),
                                body,
                            });

                        expect(response.status).toBe(422);
                        expect(
                            UnprocessableEntityResponseSchema.parse(
                                response.body
                            )
                        ).toBeTruthy();
                    }
                );
            }
        });
    });

    test.describe('GET /carts/{cartId}', () => {
        test(
            `should apply the ${CheckoutRules.COMBINATION_DISCOUNT_PERCENTAGE}% combination discount for rental + regular items`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const cartId =
                    await test.step('Fill a cart with a regular and a rental product via POST /carts/{id}', async () => {
                        const id = await createCart(apiRequest);
                        await addToCart(apiRequest, id, productId, 1);
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

                await test.step('Read the cart via GET /carts/{cartId}', async () => {
                    const cart = await readCart(apiRequest, cartId);

                    expect(cart.cart_items).toHaveLength(2);
                    expect(cart.additional_discount_percentage).toBe(
                        CheckoutRules.COMBINATION_DISCOUNT_PERCENTAGE
                    );
                });
            }
        );

        test(
            'should apply no combination discount for regular items only',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const cartId =
                    await test.step('Fill a cart with a regular product via POST /carts/{id}', async () => {
                        const id = await createCart(apiRequest);
                        await addToCart(apiRequest, id, productId, 1);
                        return id;
                    });

                await test.step('Read the cart via GET /carts/{cartId}', async () => {
                    const cart = await readCart(apiRequest, cartId);

                    expect(cart.additional_discount_percentage).toBeNull();
                });
            }
        );

        for (const { description, value } of INVALID_PATH_IDS) {
            test(
                `should return 404 for cartId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method: 'GET',
                            url: fillPath(ApiEndpoints.CART, { cartId: value }),
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                }
            );
        }

        test(
            'should return 405 for an unsupported method on /carts/{cartId}',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<MethodNotAllowedResponse>({
                        method: 'PATCH',
                        url: fillPath(ApiEndpoints.CART, {
                            cartId: await createCart(apiRequest),
                        }),
                    });

                expect(status).toBe(405);
                expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });

    test.describe('PUT /carts/{cartId}/product/quantity', () => {
        // FIXME (body shape): the spec documents UpdateResponse {"success"}; the body is CartItemAddedResponse {"result"}. See docs/test-plan.md, defect #26.
        test(
            'should return 200 and set the quantity',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const cartId =
                    await test.step('Create a cart with the product via POST /carts + /carts/{id}', async () => {
                        const id = await createCart(apiRequest);
                        await addToCart(apiRequest, id, productId, 1);
                        return id;
                    });

                await test.step('Set the quantity via PUT /carts/{cartId}/product/quantity', async () => {
                    const { status, body } = await apiRequest<CartItemAdded>({
                        method: 'PUT',
                        url: fillPath(ApiEndpoints.CART_PRODUCT_QUANTITY, {
                            cartId,
                        }),
                        body: { product_id: productId, quantity: 5 },
                    });

                    expect(status).toBe(200);
                    expect(CartItemAddedSchema.parse(body)).toBeTruthy();
                });

                await test.step('Read the cart via GET /carts/{cartId}', async () => {
                    const cart = await readCart(apiRequest, cartId);

                    expect(cart.cart_items?.at(0)?.quantity).toBe(5);
                });
            }
        );

        test.skip(
            'should return the documented UpdateResponse body',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const cartId = await createCart(apiRequest);
                await addToCart(apiRequest, cartId, productId, 1);

                const { status, body } = await apiRequest<UpdateResponse>({
                    method: 'PUT',
                    url: fillPath(ApiEndpoints.CART_PRODUCT_QUANTITY, {
                        cartId,
                    }),
                    body: { product_id: productId, quantity: 2 },
                });

                expect(status).toBe(200);
                expect(UpdateResponseSchema.parse(body)).toBeTruthy();
            }
        );

        for (const { description, value } of INVALID_PATH_IDS) {
            test(
                `should return 404 for cartId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ResourceNotFoundResponse>({
                            method: 'PUT',
                            url: fillPath(ApiEndpoints.CART_PRODUCT_QUANTITY, {
                                cartId: value,
                            }),
                            body: { product_id: productId, quantity: 1 },
                        });

                    expect(status).toBe(404);
                    expect(
                        ResourceNotFoundResponseSchema.parse(body)
                    ).toBeTruthy();
                }
            );
        }

        // FIXME: validation errors of the cart answer 404 "Resource not found" instead of 422. See docs/test-plan.md, defect #13.
        for (const { name, quantity } of [
            { name: 'quantity is 0', quantity: 0 },
            {
                name: `quantity is ${JSON.stringify(INVALID_NUMBER_VALUES[0])}`,
                quantity: INVALID_NUMBER_VALUES[0],
            },
        ]) {
            test.skip(
                `should return 422 when ${name}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const cartId = await createCart(apiRequest);
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method: 'PUT',
                            url: fillPath(ApiEndpoints.CART_PRODUCT_QUANTITY, {
                                cartId,
                            }),
                            body: { product_id: productId, quantity },
                        });

                    expect(status).toBe(422);
                    expect(
                        UnprocessableEntityResponseSchema.parse(body)
                    ).toBeTruthy();
                }
            );
        }
    });

    test.describe('DELETE /carts/{cartId}', () => {
        test(
            'should return 204 and delete the cart',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const cartId =
                    await test.step('Create a cart via POST /carts', async () =>
                        createCart(apiRequest));

                await test.step('Delete it via DELETE /carts/{cartId}', async () => {
                    const { status, body } = await apiRequest<null>({
                        method: 'DELETE',
                        url: fillPath(ApiEndpoints.CART, { cartId }),
                    });

                    expect(status).toBe(204);
                    expect(body).toBeNull();
                });

                await test.step('Check it is gone via GET /carts/{cartId}', async () => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method: 'GET',
                            url: fillPath(ApiEndpoints.CART, { cartId }),
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                });
            }
        );

        for (const { description, value } of INVALID_PATH_IDS) {
            test(
                `should return 404 for cartId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ResourceNotFoundResponse>({
                            method: 'DELETE',
                            url: fillPath(ApiEndpoints.CART, { cartId: value }),
                        });

                    expect(status).toBe(404);
                    expect(
                        ResourceNotFoundResponseSchema.parse(body)
                    ).toBeTruthy();
                }
            );
        }

        // FIXME: 401, 409 and 422 are documented for DELETE /carts/{cartId}, but the endpoint is public and has no input that can fail.
        for (const code of [401, 409, 422]) {
            test.skip(
                `should return ${code} when deleting a cart`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status } = await apiRequest({
                        method: 'DELETE',
                        url: fillPath(ApiEndpoints.CART, {
                            cartId: await createCart(apiRequest),
                        }),
                    });

                    expect(status).toBe(code);
                }
            );
        }
    });

    test.describe('DELETE /carts/{cartId}/product/{productId}', () => {
        test(
            'should return 204 and remove the combination discount with the rental item',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const rentalId = required(
                    catalog.rental.at(0)?.id,
                    'rental product'
                );

                const cartId =
                    await test.step('Fill a cart with a regular and a rental product', async () => {
                        const id = await createCart(apiRequest);
                        await addToCart(apiRequest, id, productId, 1);
                        await addToCart(apiRequest, id, rentalId, 1);
                        return id;
                    });

                await test.step('Remove the rental item via DELETE /carts/{cartId}/product/{productId}', async () => {
                    const { status, body } = await apiRequest<null>({
                        method: 'DELETE',
                        url: fillPath(ApiEndpoints.CART_PRODUCT, {
                            cartId,
                            productId: rentalId,
                        }),
                    });

                    expect(status).toBe(204);
                    expect(body).toBeNull();
                });

                await test.step('Read the cart via GET /carts/{cartId}', async () => {
                    const cart = await readCart(apiRequest, cartId);

                    expect(
                        cart.cart_items?.map(({ product_id }) => product_id)
                    ).toEqual([productId]);
                    expect(cart.additional_discount_percentage).toBeNull();
                });
            }
        );

        for (const { description, value } of INVALID_PATH_IDS) {
            test(
                `should return 404 for cartId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ResourceNotFoundResponse>({
                            method: 'DELETE',
                            url: fillPath(ApiEndpoints.CART_PRODUCT, {
                                cartId: value,
                                productId,
                            }),
                        });

                    expect(status).toBe(404);
                    expect(
                        ResourceNotFoundResponseSchema.parse(body)
                    ).toBeTruthy();
                }
            );

            // FIXME: removing a product that is not in the cart answers 204 — the spec documents 404. See docs/test-plan.md, defect #28.
            test.skip(
                `should return 404 for productId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ResourceNotFoundResponse>({
                            method: 'DELETE',
                            url: fillPath(ApiEndpoints.CART_PRODUCT, {
                                cartId: await createCart(apiRequest),
                                productId: value,
                            }),
                        });

                    expect(status).toBe(404);
                    expect(
                        ResourceNotFoundResponseSchema.parse(body)
                    ).toBeTruthy();
                }
            );
        }

        // FIXME: 401, 409 and 422 are documented for this operation, but the endpoint is public and has no input that can fail.
        for (const code of [401, 409, 422]) {
            test.skip(
                `should return ${code} when removing a product`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status } = await apiRequest({
                        method: 'DELETE',
                        url: fillPath(ApiEndpoints.CART_PRODUCT, {
                            cartId: await createCart(apiRequest),
                            productId,
                        }),
                    });

                    expect(status).toBe(code);
                }
            );
        }
    });
});
