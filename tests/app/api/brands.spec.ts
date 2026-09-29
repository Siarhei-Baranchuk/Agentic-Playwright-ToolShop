/* eslint-disable playwright/no-skipped-test -- documented contract gaps are kept as skipped tests with a FIXME */
import { ApiEndpoints, CatalogRules } from '../../../enums/app/app';
import {
    Brand,
    BrandList,
    BrandListSchema,
    BrandSchema,
} from '../../../fixtures/api/schemas/app/brandSchema';
import { Product } from '../../../fixtures/api/schemas/app/productSchema';
import {
    UpdateResponse,
    UpdateResponseSchema,
} from '../../../fixtures/api/schemas/util/commonResponseSchema';
import {
    ConflictResponse,
    ConflictResponseSchema,
    DuplicateConflictResponse,
    DuplicateConflictResponseSchema,
    ForbiddenResponse,
    ForbiddenResponseSchema,
    ItemNotFoundResponse,
    ItemNotFoundResponseSchema,
    MethodNotAllowedResponse,
    MethodNotAllowedResponseSchema,
    ResourceNotFoundResponse,
    ResourceNotFoundResponseSchema,
    UnauthorizedResponse,
    UnauthorizedResponseSchema,
    UnprocessableEntityResponse,
    UnprocessableEntityResponseSchema,
} from '../../../fixtures/api/schemas/util/errorResponseSchema';
import { expect, test } from '../../../fixtures/pom/test-options';
import {
    createBrand,
    createProduct,
    deleteBrand,
    deleteProduct,
} from '../../../helpers/app/catalog';
import { fillPath, required } from '../../../helpers/util/util';
import {
    generateBrand,
    generateSearchToken,
    generateSlug,
} from '../../../test-data/factories/app/catalog.factory';
import {
    INVALID_SLUGS,
    SUBSCRIPT_SUPERSCRIPT_NAMES,
} from '../../../test-data/static/app/invalidCatalog';
import { INVALID_PATH_IDS } from '../../../test-data/static/util/invalid-path-params';
import {
    INVALID_STRING_VALUES,
    PRIMARY_INVALID_VALUES,
} from '../../../test-data/static/util/invalid-values';

const BRAND_FIELDS = ['name', 'slug'] as const;
const TOO_LONG = 'a'.repeat(CatalogRules.NAME_AND_SLUG_MAX_LENGTH + 1);

test.describe('GET /brands', () => {
    test(
        'should return 200 and the list of brands',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<BrandList>({
                method: 'GET',
                url: ApiEndpoints.BRANDS,
            });

            expect(status).toBe(200);
            expect(BrandListSchema.parse(body)).toBeTruthy();
            expect(body.length).toBeGreaterThan(0);
        }
    );

    // FIXME: 404 "Resource not found" is documented for the brand list, but there is no way to make the list unavailable.
    test.skip(
        'should return 404 when the brand list is not available',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<ResourceNotFoundResponse>(
                {
                    method: 'GET',
                    url: ApiEndpoints.BRANDS,
                }
            );

            expect(status).toBe(404);
            expect(ResourceNotFoundResponseSchema.parse(body)).toBeTruthy();
        }
    );

    test(
        'should return 405 for an unsupported method on /brands',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<MethodNotAllowedResponse>(
                {
                    method: 'PATCH',
                    url: ApiEndpoints.BRANDS,
                }
            );

            expect(status).toBe(405);
            expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
        }
    );
});

test.describe('POST /brands', () => {
    const createdIds: string[] = [];

    test.afterAll(async ({ apiRequest }) => {
        for (const brandId of createdIds) {
            await deleteBrand(apiRequest, brandId);
        }
    });

    test(
        'should return 201 and the created brand',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const payload = generateBrand();

            const { status, body } = await apiRequest<Brand>({
                method: 'POST',
                url: ApiEndpoints.BRANDS,
                body: payload,
            });
            createdIds.push(required(body.id, 'brand id'));

            expect(status).toBe(201);
            expect(BrandSchema.parse(body)).toBeTruthy();
            expect(body).toMatchObject(payload);
        }
    );

    test(
        `should return 201 for a name of exactly ${CatalogRules.NAME_AND_SLUG_MAX_LENGTH} characters`,
        { tag: '@api' },
        async ({ apiRequest }) => {
            const payload = generateBrand({ name: TOO_LONG.slice(1) });

            const { status, body } = await apiRequest<Brand>({
                method: 'POST',
                url: ApiEndpoints.BRANDS,
                body: payload,
            });
            createdIds.push(required(body.id, 'brand id'));

            expect(status).toBe(201);
            expect(BrandSchema.parse(body)).toBeTruthy();
        }
    );

    test(
        'should return 409 when the slug is already taken',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const payload = generateBrand();

            await test.step('Create a brand via POST /brands', async () => {
                const { status, body } = await apiRequest<Brand>({
                    method: 'POST',
                    url: ApiEndpoints.BRANDS,
                    body: payload,
                });
                createdIds.push(required(body.id, 'brand id'));

                expect(status).toBe(201);
                expect(BrandSchema.parse(body)).toBeTruthy();
            });

            await test.step('Create a brand with the same slug via POST /brands', async () => {
                const { status, body } =
                    await apiRequest<DuplicateConflictResponse>({
                        method: 'POST',
                        url: ApiEndpoints.BRANDS,
                        body: generateBrand({ slug: payload.slug }),
                    });

                expect(status).toBe(409);
                expect(
                    DuplicateConflictResponseSchema.parse(body)
                ).toBeTruthy();
            });
        }
    );

    test(
        'should return 422 for an empty body',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } =
                await apiRequest<UnprocessableEntityResponse>({
                    method: 'POST',
                    url: ApiEndpoints.BRANDS,
                    body: {},
                });

            expect(status).toBe(422);
            expect(UnprocessableEntityResponseSchema.parse(body)).toBeTruthy();
        }
    );

    for (const field of BRAND_FIELDS) {
        test(
            `should return 422 when ${field} is missing`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { [field]: _omitted, ...payload } = generateBrand();

                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.BRANDS,
                        body: payload,
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
                expect(body).toHaveProperty(field);
            }
        );

        for (const invalidValue of INVALID_STRING_VALUES) {
            test(
                `should return 422 when ${field} is ${JSON.stringify(invalidValue)}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method: 'POST',
                            url: ApiEndpoints.BRANDS,
                            body: { ...generateBrand(), [field]: invalidValue },
                        });

                    expect(status).toBe(422);
                    expect(
                        UnprocessableEntityResponseSchema.parse(body)
                    ).toBeTruthy();
                }
            );
        }

        test(
            `should return 422 when ${field} is longer than ${CatalogRules.NAME_AND_SLUG_MAX_LENGTH} characters`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.BRANDS,
                        body: { ...generateBrand(), [field]: TOO_LONG },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    }

    for (const slug of INVALID_SLUGS) {
        test(
            `should return 422 when slug is not alpha-dash - "${slug}"`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.BRANDS,
                        body: generateBrand({ slug }),
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    }

    for (const name of SUBSCRIPT_SUPERSCRIPT_NAMES) {
        test(
            `should return 422 when name contains sub/superscript characters - "${name}"`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.BRANDS,
                        body: generateBrand({ name }),
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    }

    // FIXME: 404 "Requested item not found" is documented for POST /brands, but creating a brand references no other resource.
    test.skip(
        'should return 404 when creating a brand',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<ItemNotFoundResponse>({
                method: 'POST',
                url: ApiEndpoints.BRANDS,
                body: generateBrand(),
            });

            expect(status).toBe(404);
            expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
        }
    );
});

test.describe('GET /brands/{brandId}', () => {
    let brand: Brand;

    test.beforeAll(async ({ apiRequest }) => {
        brand = await createBrand(apiRequest);
    });

    test.afterAll(async ({ apiRequest }) => {
        await deleteBrand(apiRequest, brand.id);
    });

    test(
        'should return 200 and the brand',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<Brand>({
                method: 'GET',
                url: fillPath(ApiEndpoints.BRAND, {
                    brandId: required(brand.id, 'brand id'),
                }),
            });

            expect(status).toBe(200);
            expect(BrandSchema.parse(body)).toBeTruthy();
            expect(body).toEqual(brand);
        }
    );

    for (const { description, value } of INVALID_PATH_IDS) {
        test(
            `should return 404 for brandId - ${description}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'GET',
                        url: fillPath(ApiEndpoints.BRAND, { brandId: value }),
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            }
        );
    }

    test(
        'should return 405 for an unsupported method on /brands/{brandId}',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<MethodNotAllowedResponse>(
                {
                    method: 'POST',
                    url: fillPath(ApiEndpoints.BRAND, {
                        brandId: required(brand.id, 'brand id'),
                    }),
                    body: generateBrand(),
                }
            );

            expect(status).toBe(405);
            expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
        }
    );
});

for (const method of ['PUT', 'PATCH'] as const) {
    test.describe(`${method} /brands/{brandId}`, () => {
        let brand: Brand;
        let otherBrand: Brand;

        test.beforeAll(async ({ apiRequest }) => {
            brand = await createBrand(apiRequest);
            otherBrand = await createBrand(apiRequest);
        });

        test.afterAll(async ({ apiRequest }) => {
            await deleteBrand(apiRequest, brand.id);
            await deleteBrand(apiRequest, otherBrand.id);
        });

        test(
            'should return 200 and update the brand',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const update = generateBrand();

                await test.step(`Update the brand via ${method} /brands/{brandId}`, async () => {
                    const { status, body } = await apiRequest<UpdateResponse>({
                        method,
                        url: fillPath(ApiEndpoints.BRAND, {
                            brandId: required(brand.id, 'brand id'),
                        }),
                        body: update,
                    });

                    expect(status).toBe(200);
                    expect(UpdateResponseSchema.parse(body)).toBeTruthy();
                    expect(body.success).toBe(true);
                });

                await test.step('Read the brand via GET /brands/{brandId}', async () => {
                    const { status, body } = await apiRequest<Brand>({
                        method: 'GET',
                        url: fillPath(ApiEndpoints.BRAND, {
                            brandId: required(brand.id, 'brand id'),
                        }),
                    });

                    expect(status).toBe(200);
                    expect(BrandSchema.parse(body)).toBeTruthy();
                    expect(body).toMatchObject(update);
                });
            }
        );

        test(
            'should return 200 for a partial update',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UpdateResponse>({
                    method,
                    url: fillPath(ApiEndpoints.BRAND, {
                        brandId: required(brand.id, 'brand id'),
                    }),
                    body: { name: generateBrand().name },
                });

                expect(status).toBe(200);
                expect(UpdateResponseSchema.parse(body)).toBeTruthy();
            }
        );

        for (const field of BRAND_FIELDS) {
            test(
                `should return 422 when ${field} is ${JSON.stringify(PRIMARY_INVALID_VALUES.STRING)}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method,
                            url: fillPath(ApiEndpoints.BRAND, {
                                brandId: required(brand.id, 'brand id'),
                            }),
                            body: {
                                ...generateBrand(),
                                [field]: PRIMARY_INVALID_VALUES.STRING,
                            },
                        });

                    expect(status).toBe(422);
                    expect(
                        UnprocessableEntityResponseSchema.parse(body)
                    ).toBeTruthy();
                }
            );
        }

        test(
            'should return 409 when the slug belongs to another brand',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<DuplicateConflictResponse>({
                        method,
                        url: fillPath(ApiEndpoints.BRAND, {
                            brandId: required(brand.id, 'brand id'),
                        }),
                        body: generateBrand({ slug: otherBrand.slug }),
                    });

                expect(status).toBe(409);
                expect(
                    DuplicateConflictResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );

        for (const { description, value } of INVALID_PATH_IDS) {
            test(
                `should return 404 for brandId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method,
                            url: fillPath(ApiEndpoints.BRAND, {
                                brandId: value,
                            }),
                            body: generateBrand(),
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                }
            );
        }
    });
}

test.describe('DELETE /brands/{brandId}', () => {
    test(
        'should return 204 when an admin deletes an unused brand',
        { tag: '@api' },
        async ({ apiRequest }) => {
            let brandId = '';

            await test.step('Create a brand via POST /brands', async () => {
                const { status, body } = await apiRequest<Brand>({
                    method: 'POST',
                    url: ApiEndpoints.BRANDS,
                    body: generateBrand(),
                });

                expect(status).toBe(201);
                expect(BrandSchema.parse(body)).toBeTruthy();
                brandId = required(body.id, 'brand id');
            });

            await test.step('Delete the brand via DELETE /brands/{brandId}', async () => {
                const { status, body } = await apiRequest<null>({
                    method: 'DELETE',
                    url: fillPath(ApiEndpoints.BRAND, { brandId }),
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                });

                expect(status).toBe(204);
                expect(body).toBeNull();
            });

            await test.step('Check the brand is gone via GET /brands/{brandId}', async () => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'GET',
                        url: fillPath(ApiEndpoints.BRAND, { brandId }),
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            });
        }
    );

    test.describe('with an existing brand', () => {
        let brand: Brand;

        test.beforeAll(async ({ apiRequest }) => {
            brand = await createBrand(apiRequest);
        });

        test.afterAll(async ({ apiRequest }) => {
            await deleteBrand(apiRequest, brand.id);
        });

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method: 'DELETE',
                        url: fillPath(ApiEndpoints.BRAND, {
                            brandId: required(brand.id, 'brand id'),
                        }),
                    }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            }
        );

        // 403 is not listed in the spec for this operation; the route is restricted to the admin role.
        test(
            'should return 403 for a customer access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ForbiddenResponse>({
                    method: 'DELETE',
                    url: fillPath(ApiEndpoints.BRAND, {
                        brandId: required(brand.id, 'brand id'),
                    }),
                    headers: process.env.ACCESS_TOKEN,
                });

                expect(status).toBe(403);
                expect(ForbiddenResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });

    test.describe('with a brand used by a product', () => {
        let brand: Brand;
        let product: Product;

        test.beforeAll(async ({ apiRequest }) => {
            brand = await createBrand(apiRequest);
            product = await createProduct(
                apiRequest,
                required(brand.id, 'brand id')
            );
        });

        test.afterAll(async ({ apiRequest }) => {
            await deleteProduct(apiRequest, product.id);
            await deleteBrand(apiRequest, brand.id);
        });

        test(
            'should return 409 when the brand is used by a product',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ConflictResponse>({
                    method: 'DELETE',
                    url: fillPath(ApiEndpoints.BRAND, {
                        brandId: required(brand.id, 'brand id'),
                    }),
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                });

                expect(status).toBe(409);
                expect(ConflictResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });

    for (const { description, value } of INVALID_PATH_IDS) {
        test(
            `should return 404 for brandId - ${description}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'DELETE',
                        url: fillPath(ApiEndpoints.BRAND, { brandId: value }),
                        headers: process.env.ADMIN_ACCESS_TOKEN,
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            }
        );
    }

    // FIXME: 422 is documented for DELETE /brands/{brandId}; its only rule (`id` required) is always satisfied by the route.
    test.skip(
        'should return 422 when the brand id is missing',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } =
                await apiRequest<UnprocessableEntityResponse>({
                    method: 'DELETE',
                    url: fillPath(ApiEndpoints.BRAND, { brandId: '' }),
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                });

            expect(status).toBe(422);
            expect(UnprocessableEntityResponseSchema.parse(body)).toBeTruthy();
        }
    );
});

test.describe('GET /brands/search', () => {
    // Search is FULLTEXT (terms of 4+ chars) and cached per query for an hour — use a unique word
    const searchToken = generateSearchToken();
    let brand: Brand;

    test.beforeAll(async ({ apiRequest }) => {
        brand = await createBrand(apiRequest, { name: searchToken });
    });

    test.afterAll(async ({ apiRequest }) => {
        await deleteBrand(apiRequest, brand.id);
    });

    test(
        'should return 200 and the brands matching q',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<BrandList>({
                method: 'GET',
                url: ApiEndpoints.BRANDS_SEARCH,
                params: { q: searchToken },
            });

            expect(status).toBe(200);
            expect(BrandListSchema.parse(body)).toBeTruthy();
            expect(body).toContainEqual(brand);
        }
    );

    // FIXME: 404 "Resource not found" is documented for the brand search, but a search without matches returns 200 [].
    test.skip(
        'should return 404 when no brand matches q',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<ResourceNotFoundResponse>(
                {
                    method: 'GET',
                    url: ApiEndpoints.BRANDS_SEARCH,
                    params: { q: generateSlug() },
                }
            );

            expect(status).toBe(404);
            expect(ResourceNotFoundResponseSchema.parse(body)).toBeTruthy();
        }
    );

    test(
        'should return 405 for an unsupported method on /brands/search',
        { tag: '@api' },
        async ({ apiRequest }) => {
            // DELETE / PUT / PATCH are routed to /brands/{brandId} with brandId "search"
            const { status, body } = await apiRequest<MethodNotAllowedResponse>(
                {
                    method: 'POST',
                    url: ApiEndpoints.BRANDS_SEARCH,
                    body: generateBrand(),
                }
            );

            expect(status).toBe(405);
            expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
        }
    );
});

test.describe('QUERY /brands/search', () => {
    // Search is FULLTEXT (terms of 4+ chars) and cached per query for an hour — use a unique word
    const searchToken = generateSearchToken();
    let brand: Brand;

    test.beforeAll(async ({ apiRequest }) => {
        brand = await createBrand(apiRequest, { name: searchToken });
    });

    test.afterAll(async ({ apiRequest }) => {
        await deleteBrand(apiRequest, brand.id);
    });

    test(
        'should return 200 and the brands matching q',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<BrandList>({
                method: 'QUERY',
                url: ApiEndpoints.BRANDS_SEARCH,
                body: { q: searchToken },
            });

            expect(status).toBe(200);
            expect(BrandListSchema.parse(body)).toBeTruthy();
            expect(body).toContainEqual(brand);
        }
    );

    test(
        'should return 415 when the criteria are not sent as JSON',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status } = await apiRequest({
                method: 'QUERY',
                url: ApiEndpoints.BRANDS_SEARCH,
                body: `q=${searchToken}`,
                contentType: 'text/plain',
            });

            // The spec documents no body for 415.
            expect(status).toBe(415);
        }
    );
});
