/* eslint-disable playwright/no-skipped-test -- documented contract gaps are kept as skipped tests with a FIXME */
import { ApiEndpoints, ApiMessages } from '../../../enums/app/app';
import {
    Favorite,
    FavoriteSchema,
    FavoriteWithProductList,
    FavoriteWithProductListSchema,
} from '../../../fixtures/api/schemas/app/favoriteSchema';
import {
    PaginatedProducts,
    PaginatedProductSchema,
} from '../../../fixtures/api/schemas/app/productSchema';
import {
    DuplicateConflictResponse,
    DuplicateConflictResponseSchema,
    ItemNotFoundResponse,
    ItemNotFoundResponseSchema,
    MethodNotAllowedResponse,
    MethodNotAllowedResponseSchema,
    UnauthorizedResponse,
    UnauthorizedResponseSchema,
    UnprocessableEntityResponse,
    UnprocessableEntityResponseSchema,
} from '../../../fixtures/api/schemas/util/errorResponseSchema';
import type { ApiRequestFn } from '../../../fixtures/api/api-types';
import { expect, test } from '../../../fixtures/pom/test-options';
import {
    deleteUser,
    registerUser,
    type RegisteredUser,
} from '../../../helpers/app/users';
import { fillPath, required } from '../../../helpers/util/util';
import { INVALID_PATH_IDS } from '../../../test-data/static/util/invalid-path-params';
import { INVALID_STRING_VALUES } from '../../../test-data/static/util/invalid-values';

/**
 * Returns the ids of the first products of the catalog (favorites only
 * reference products, they do not change them).
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @returns {Promise<string[]>} Product ids.
 */
async function getProductIds(apiRequest: ApiRequestFn): Promise<string[]> {
    const { status, body } = await apiRequest<PaginatedProducts>({
        method: 'GET',
        url: ApiEndpoints.PRODUCTS,
    });
    expect(status).toBe(200);
    expect(PaginatedProductSchema.parse(body)).toBeTruthy();
    return required(body.data, 'products').map(({ id }) =>
        required(id, 'product id')
    );
}

/**
 * Adds a product to the user's favorites via `POST /favorites`.
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @param {string} token - The user's access token.
 * @param {string} productId - The product to add.
 * @returns {Promise<Favorite>} The created favorite.
 */
async function addFavorite(
    apiRequest: ApiRequestFn,
    token: string,
    productId: string
): Promise<Favorite> {
    const { status, body } = await apiRequest<Favorite>({
        method: 'POST',
        url: ApiEndpoints.FAVORITES,
        headers: token,
        body: { product_id: productId },
    });
    expect(status).toBe(201);
    expect(FavoriteSchema.parse(body)).toBeTruthy();
    return body;
}

test.describe('favorites', () => {
    let productIds: string[];

    test.beforeAll(async ({ apiRequest }) => {
        productIds = await getProductIds(apiRequest);
    });

    test.describe('GET /favorites', () => {
        test(
            'should return 200 and an empty list for a new user',
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status, body } =
                    await apiRequest<FavoriteWithProductList>({
                        method: 'GET',
                        url: ApiEndpoints.FAVORITES,
                        headers: registeredUser.token,
                    });

                expect(status).toBe(200);
                expect(FavoriteWithProductListSchema.parse(body)).toBeTruthy();
                expect(body).toHaveLength(0);
            }
        );

        test(
            'should return 200 and only the own favorites with their products',
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const favorite =
                    await test.step('Add a favorite via POST /favorites', async () =>
                        addFavorite(
                            apiRequest,
                            registeredUser.token,
                            productIds[0]
                        ));

                await test.step('List favorites via GET /favorites', async () => {
                    const { status, body } =
                        await apiRequest<FavoriteWithProductList>({
                            method: 'GET',
                            url: ApiEndpoints.FAVORITES,
                            headers: registeredUser.token,
                        });

                    expect(status).toBe(200);
                    expect(
                        FavoriteWithProductListSchema.parse(body)
                    ).toBeTruthy();
                    expect(body.map(({ id }) => id)).toEqual([favorite.id]);
                    expect(body[0].product?.id).toBe(productIds[0]);
                    expect(body[0].user_id).toBe(registeredUser.id);
                });
            }
        );

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method: 'GET',
                        url: ApiEndpoints.FAVORITES,
                    }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            }
        );

        // FIXME: 404 "Requested item not found" is documented for the favorites list, but an empty list answers 200 [].
        test.skip(
            'should return 404 when the favorites list is not available',
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'GET',
                        url: ApiEndpoints.FAVORITES,
                        headers: registeredUser.token,
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            }
        );

        test(
            'should return 405 for an unsupported method on /favorites',
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status, body } =
                    await apiRequest<MethodNotAllowedResponse>({
                        method: 'PATCH',
                        url: ApiEndpoints.FAVORITES,
                        headers: registeredUser.token,
                    });

                expect(status).toBe(405);
                expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });

    test.describe('POST /favorites', () => {
        // The spec documents 200 for this operation; the API answers 201 Created.
        test(
            'should return 201 and the created favorite',
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status, body } = await apiRequest<Favorite>({
                    method: 'POST',
                    url: ApiEndpoints.FAVORITES,
                    headers: registeredUser.token,
                    body: { product_id: productIds[0] },
                });

                expect(status).toBe(201);
                expect(FavoriteSchema.parse(body)).toBeTruthy();
                expect(body).toMatchObject({
                    product_id: productIds[0],
                    user_id: registeredUser.id,
                });
            }
        );

        test(
            'should return 409 when the product is already a favorite',
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                await test.step('Add a favorite via POST /favorites', async () => {
                    await addFavorite(
                        apiRequest,
                        registeredUser.token,
                        productIds[0]
                    );
                });

                await test.step('Add the same product again via POST /favorites', async () => {
                    const { status, body } =
                        await apiRequest<DuplicateConflictResponse>({
                            method: 'POST',
                            url: ApiEndpoints.FAVORITES,
                            headers: registeredUser.token,
                            body: { product_id: productIds[0] },
                        });

                    expect(status).toBe(409);
                    expect(
                        DuplicateConflictResponseSchema.parse(body)
                    ).toBeTruthy();
                    expect(body).toEqual({
                        message: ApiMessages.DUPLICATE_ENTRY,
                    });
                });
            }
        );

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method: 'POST',
                        url: ApiEndpoints.FAVORITES,
                        body: { product_id: productIds[0] },
                    }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            }
        );

        test(
            'should return 422 when product_id is missing',
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.FAVORITES,
                        headers: registeredUser.token,
                        body: {},
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
                expect(body).toHaveProperty('product_id');
            }
        );

        for (const invalidValue of INVALID_STRING_VALUES) {
            test(
                `should return 422 when product_id is ${JSON.stringify(invalidValue)}`,
                { tag: '@api' },
                async ({ apiRequest, registeredUser }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method: 'POST',
                            url: ApiEndpoints.FAVORITES,
                            headers: registeredUser.token,
                            body: { product_id: invalidValue },
                        });

                    expect(status).toBe(422);
                    expect(
                        UnprocessableEntityResponseSchema.parse(body)
                    ).toBeTruthy();
                }
            );
        }

        // FIXME: a non-existent product answers 422 (exists rule) — the spec documents 404 "Requested item not found".
        test.skip(
            'should return 404 when the product does not exist',
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'POST',
                        url: ApiEndpoints.FAVORITES,
                        headers: registeredUser.token,
                        body: { product_id: INVALID_PATH_IDS[0].value },
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });

    test.describe('GET /favorites/{favoriteId}', () => {
        let owner: RegisteredUser;
        let favorite: Favorite;

        test.beforeAll(async ({ apiRequest }) => {
            owner = await registerUser(apiRequest);
            favorite = await addFavorite(
                apiRequest,
                owner.token,
                productIds[0]
            );
        });

        test.afterAll(async ({ apiRequest }) => {
            await deleteUser(apiRequest, owner);
        });

        test(
            'should return 200 and the own favorite',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<Favorite>({
                    method: 'GET',
                    url: fillPath(ApiEndpoints.FAVORITE, {
                        favoriteId: required(favorite.id, 'favorite id'),
                    }),
                    headers: owner.token,
                });

                expect(status).toBe(200);
                expect(FavoriteSchema.parse(body)).toBeTruthy();
                expect(body).toEqual(favorite);
            }
        );

        // FIXME: any user can read another user's favorite (no ownership check — IDOR). See docs/test-plan.md, defect #17.
        test.skip(
            "should return 404 for another user's favorite",
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'GET',
                        url: fillPath(ApiEndpoints.FAVORITE, {
                            favoriteId: required(favorite.id, 'favorite id'),
                        }),
                        headers: registeredUser.token,
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            }
        );

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method: 'GET',
                        url: fillPath(ApiEndpoints.FAVORITE, {
                            favoriteId: required(favorite.id, 'favorite id'),
                        }),
                    }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            }
        );

        for (const { description, value } of INVALID_PATH_IDS) {
            test(
                `should return 404 for favoriteId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method: 'GET',
                            url: fillPath(ApiEndpoints.FAVORITE, {
                                favoriteId: value,
                            }),
                            headers: owner.token,
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                }
            );
        }

        test(
            'should return 405 for an unsupported method on /favorites/{favoriteId}',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<MethodNotAllowedResponse>({
                        method: 'PATCH',
                        url: fillPath(ApiEndpoints.FAVORITE, {
                            favoriteId: required(favorite.id, 'favorite id'),
                        }),
                        headers: owner.token,
                    });

                expect(status).toBe(405);
                expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });

    test.describe('DELETE /favorites/{favoriteId}', () => {
        test(
            'should return 204 and delete the own favorite',
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const favorite =
                    await test.step('Add a favorite via POST /favorites', async () =>
                        addFavorite(
                            apiRequest,
                            registeredUser.token,
                            productIds[0]
                        ));

                await test.step('Delete it via DELETE /favorites/{favoriteId}', async () => {
                    const { status, body } = await apiRequest<null>({
                        method: 'DELETE',
                        url: fillPath(ApiEndpoints.FAVORITE, {
                            favoriteId: required(favorite.id, 'favorite id'),
                        }),
                        headers: registeredUser.token,
                    });

                    expect(status).toBe(204);
                    expect(body).toBeNull();
                });

                await test.step('Check the list is empty via GET /favorites', async () => {
                    const { status, body } =
                        await apiRequest<FavoriteWithProductList>({
                            method: 'GET',
                            url: ApiEndpoints.FAVORITES,
                            headers: registeredUser.token,
                        });

                    expect(status).toBe(200);
                    expect(
                        FavoriteWithProductListSchema.parse(body)
                    ).toBeTruthy();
                    expect(body).toHaveLength(0);
                });
            }
        );

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const favorite =
                    await test.step('Add a favorite via POST /favorites', async () =>
                        addFavorite(
                            apiRequest,
                            registeredUser.token,
                            productIds[0]
                        ));

                await test.step('Delete it without a token via DELETE /favorites/{favoriteId}', async () => {
                    const { status, body } =
                        await apiRequest<UnauthorizedResponse>({
                            method: 'DELETE',
                            url: fillPath(ApiEndpoints.FAVORITE, {
                                favoriteId: required(
                                    favorite.id,
                                    'favorite id'
                                ),
                            }),
                        });

                    expect(status).toBe(401);
                    expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
                });
            }
        );

        // FIXME: deleting another user's favorite answers 204 and silently does nothing — the spec documents 404. See docs/test-plan.md, defect #18.
        test.skip(
            "should return 404 for another user's favorite",
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                const owner = await registerUser(apiRequest);
                const favorite = await addFavorite(
                    apiRequest,
                    owner.token,
                    productIds[0]
                );

                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'DELETE',
                        url: fillPath(ApiEndpoints.FAVORITE, {
                            favoriteId: required(favorite.id, 'favorite id'),
                        }),
                        headers: registeredUser.token,
                    }
                );
                await deleteUser(apiRequest, owner);

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            }
        );

        // FIXME: deleting an unknown favorite answers 204 — the spec documents 404. See docs/test-plan.md, defect #18.
        for (const { description, value } of INVALID_PATH_IDS) {
            test.skip(
                `should return 404 for favoriteId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest, registeredUser }) => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method: 'DELETE',
                            url: fillPath(ApiEndpoints.FAVORITE, {
                                favoriteId: value,
                            }),
                            headers: registeredUser.token,
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                }
            );
        }

        // FIXME: 409 and 422 are documented for DELETE /favorites/{favoriteId}, but no request reproduces them.
        for (const code of [409, 422]) {
            test.skip(
                `should return ${code} when deleting a favorite`,
                { tag: '@api' },
                async ({ apiRequest, registeredUser }) => {
                    const { status } = await apiRequest({
                        method: 'DELETE',
                        url: fillPath(ApiEndpoints.FAVORITE, {
                            favoriteId: INVALID_PATH_IDS[0].value,
                        }),
                        headers: registeredUser.token,
                    });

                    expect(status).toBe(code);
                }
            );
        }
    });
});
