/* eslint-disable playwright/no-skipped-test -- documented contract gaps are kept as skipped tests with a FIXME */
import { ApiEndpoints, CatalogRules, Co2Ratings } from '../../../enums/app/app';
import type { ApiRequestFn } from '../../../fixtures/api/api-types';
import { Brand } from '../../../fixtures/api/schemas/app/brandSchema';
import { Category } from '../../../fixtures/api/schemas/app/categorySchema';
import {
    PaginatedProducts,
    PaginatedProductSchema,
    Product,
    ProductList,
    ProductListSchema,
    ProductRequest,
    ProductSchema,
} from '../../../fixtures/api/schemas/app/productSchema';
import {
    UpdateResponse,
    UpdateResponseSchema,
} from '../../../fixtures/api/schemas/util/commonResponseSchema';
import {
    ConflictResponse,
    ConflictResponseSchema,
    ForbiddenResponse,
    ForbiddenResponseSchema,
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
    createBrand,
    createCategory,
    createProduct,
    deleteBrand,
    deleteCategory,
    deleteProduct,
    deleteProductsOfBrand,
    getProductReferences,
} from '../../../helpers/app/catalog';
import { fillPath, required } from '../../../helpers/util/util';
import {
    generateProduct,
    generateSearchToken,
} from '../../../test-data/factories/app/catalog.factory';
import { SUBSCRIPT_SUPERSCRIPT_NAMES } from '../../../test-data/static/app/invalidCatalog';
import { INVALID_PATH_IDS } from '../../../test-data/static/util/invalid-path-params';
import {
    INVALID_BOOLEAN_VALUES,
    INVALID_NUMBER_VALUES,
    INVALID_STRING_VALUES,
} from '../../../test-data/static/util/invalid-values';

/** Required on POST /products (StoreProduct) */
const REQUIRED_FIELDS = [
    'name',
    'price',
    'category_id',
    'brand_id',
    'product_image_id',
    'is_location_offer',
    'is_rental',
] as const;
const OPTIONAL_FIELDS = ['description', 'co2_rating'] as const;
/** String fields with a `string` validation rule (co2_rating has none — see defect #7) */
const STRING_FIELDS = ['name', 'description', 'product_image_id'] as const;
const BOOLEAN_FIELDS = ['is_location_offer', 'is_rental'] as const;
const NON_EXISTENT_ID = INVALID_PATH_IDS[0].value;
const SORT_OPTIONS = [
    { sort: 'name,asc', key: 'name', direction: 1 },
    { sort: 'name,desc', key: 'name', direction: -1 },
    { sort: 'price,asc', key: 'price', direction: 1 },
    { sort: 'price,desc', key: 'price', direction: -1 },
] as const;
/** On PUT / PATCH every field is optional — an omitted (`undefined`) value is valid there */
const withoutUndefined = <T>(values: readonly T[]): T[] =>
    values.filter((value) => value !== undefined);
/** Laravel `boolean` accepts 1 / 0, and the contract's own examples use them — they are valid */
const INVALID_BOOLEANS = withoutUndefined(INVALID_BOOLEAN_VALUES).filter(
    (value) => value !== 1 && value !== 0
);
/** A numeric string passes Laravel `numeric`; covered by a separate FIXME test (defect #11) */
const NUMERIC_STRING_PRICE = '123';
const INVALID_PRICES = withoutUndefined(INVALID_NUMBER_VALUES).filter(
    (value) => value !== NUMERIC_STRING_PRICE
);

/**
 * Reads a product through the paginated list filtered by its (test-owned) brand.
 * `GET /products/{productId}` is not used for read-back because its body carries
 * an undocumented `specs` field (see the FIXME on that endpoint).
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @param {string} brandId - Id of the brand that owns only this product.
 * @returns {Promise<Product>} The product.
 */
async function readProductByBrand(
    apiRequest: ApiRequestFn,
    brandId: string
): Promise<Product> {
    const { status, body } = await apiRequest<PaginatedProducts>({
        method: 'GET',
        url: ApiEndpoints.PRODUCTS,
        params: { by_brand: brandId },
    });
    expect(status).toBe(200);
    expect(PaginatedProductSchema.parse(body)).toBeTruthy();
    return required(body.data?.at(0), 'product');
}

/**
 * Returns the fields a `ProductResponse` should echo back from a `ProductRequest`.
 *
 * @param {ProductRequest} payload - The request body.
 * @returns {Partial<Product>} Fields to compare with `toMatchObject`.
 */
function expectedProduct(payload: ProductRequest): Partial<Product> {
    const {
        category_id: _c,
        brand_id: _b,
        product_image_id: _i,
        ...echoed
    } = payload;
    return echoed;
}

test.describe('GET /products', () => {
    test(
        'should return 200 and the first page of products',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<PaginatedProducts>({
                method: 'GET',
                url: ApiEndpoints.PRODUCTS,
            });

            expect(status).toBe(200);
            expect(PaginatedProductSchema.parse(body)).toBeTruthy();
            expect(body.current_page).toBe(1);
            expect(body.data?.length).toBeGreaterThan(0);
        }
    );

    test(
        'should return 200 and the requested page',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<PaginatedProducts>({
                method: 'GET',
                url: ApiEndpoints.PRODUCTS,
                params: { page: 2 },
            });

            expect(status).toBe(200);
            expect(PaginatedProductSchema.parse(body)).toBeTruthy();
            expect(body.current_page).toBe(2);
        }
    );

    for (const { sort, key, direction } of SORT_OPTIONS) {
        test(
            `should return 200 and products sorted by ${sort}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<PaginatedProducts>({
                    method: 'GET',
                    url: ApiEndpoints.PRODUCTS,
                    params: { sort },
                });

                expect(status).toBe(200);
                expect(PaginatedProductSchema.parse(body)).toBeTruthy();
                const values = required(body.data, 'data').map(
                    (product) => product[key]
                );
                const sorted = [...values].sort((a, b) =>
                    typeof a === 'number' && typeof b === 'number'
                        ? (a - b) * direction
                        : String(a).localeCompare(String(b)) * direction
                );
                expect(values).toEqual(sorted);
            }
        );
    }

    // FIXME: an empty page returns `from` / `to` = null; PaginatedProductResponse types them as integer. See docs/test-plan.md, defect #12.
    test.skip(
        'should return 200 and a valid empty page when nothing matches the filter',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<PaginatedProducts>({
                method: 'GET',
                url: ApiEndpoints.PRODUCTS,
                params: { by_brand: NON_EXISTENT_ID },
            });

            expect(status).toBe(200);
            expect(PaginatedProductSchema.parse(body)).toBeTruthy();
            expect(body.data).toHaveLength(0);
        }
    );

    test.describe('filtered by test-owned data', () => {
        let brand: Brand;
        let category: Category;
        let cheap: Product;
        let rental: Product;

        test.beforeAll(async ({ apiRequest }) => {
            brand = await createBrand(apiRequest);
            category = await createCategory(apiRequest);
            const brandId = required(brand.id, 'brand id');
            cheap = await createProduct(apiRequest, brandId, {
                price: 10,
                category_id: category.id,
            });
            rental = await createProduct(apiRequest, brandId, {
                price: 90,
                is_rental: true,
            });
        });

        test.afterAll(async ({ apiRequest }) => {
            await deleteProduct(apiRequest, cheap.id);
            await deleteProduct(apiRequest, rental.id);
            await deleteCategory(apiRequest, category.id);
            await deleteBrand(apiRequest, brand.id);
        });

        test(
            'should return 200 and only products of by_brand',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<PaginatedProducts>({
                    method: 'GET',
                    url: ApiEndpoints.PRODUCTS,
                    params: {
                        by_brand: required(brand.id, 'brand id'),
                        sort: 'price,asc',
                    },
                });

                expect(status).toBe(200);
                expect(PaginatedProductSchema.parse(body)).toBeTruthy();
                // Rental products are listed only with is_rental=true
                expect(body.data?.map(({ id }) => id)).toEqual([cheap.id]);
            }
        );

        test(
            'should return 200 and only products of by_category',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<PaginatedProducts>({
                    method: 'GET',
                    url: ApiEndpoints.PRODUCTS,
                    params: {
                        by_category: required(category.id, 'category id'),
                    },
                });

                expect(status).toBe(200);
                expect(PaginatedProductSchema.parse(body)).toBeTruthy();
                expect(body.data?.map(({ id }) => id)).toEqual([cheap.id]);
            }
        );

        test(
            'should return 200 and only rental products for is_rental=true',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<PaginatedProducts>({
                    method: 'GET',
                    url: ApiEndpoints.PRODUCTS,
                    params: {
                        by_brand: required(brand.id, 'brand id'),
                        is_rental: 'true',
                    },
                });

                expect(status).toBe(200);
                expect(PaginatedProductSchema.parse(body)).toBeTruthy();
                expect(body.data?.map(({ id }) => id)).toEqual([rental.id]);
            }
        );

        test(
            'should return 200 and only products priced within between',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<PaginatedProducts>({
                    method: 'GET',
                    url: ApiEndpoints.PRODUCTS,
                    params: {
                        by_brand: required(brand.id, 'brand id'),
                        between: 'price,1,50',
                    },
                });

                expect(status).toBe(200);
                expect(PaginatedProductSchema.parse(body)).toBeTruthy();
                expect(body.data?.map(({ id }) => id)).toEqual([cheap.id]);
            }
        );
    });

    // FIXME: 404 "Requested item not found" is documented for the product list, but there is no way to make the list unavailable.
    test.skip(
        'should return 404 when the product list is not available',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<ItemNotFoundResponse>({
                method: 'GET',
                url: ApiEndpoints.PRODUCTS,
            });

            expect(status).toBe(404);
            expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
        }
    );

    test(
        'should return 405 for an unsupported method on /products',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<MethodNotAllowedResponse>(
                {
                    method: 'PATCH',
                    url: ApiEndpoints.PRODUCTS,
                }
            );

            expect(status).toBe(405);
            expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
        }
    );
});

test.describe('QUERY /products', () => {
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
        'should return 200 and the products matching the criteria',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<PaginatedProducts>({
                method: 'QUERY',
                url: ApiEndpoints.PRODUCTS,
                body: { by_brand: brand.id, sort: 'price,asc', page: '1' },
            });

            expect(status).toBe(200);
            expect(PaginatedProductSchema.parse(body)).toBeTruthy();
            expect(body.data?.map(({ id }) => id)).toEqual([product.id]);
        }
    );

    test(
        'should return 415 when the criteria are not sent as JSON',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status } = await apiRequest({
                method: 'QUERY',
                url: ApiEndpoints.PRODUCTS,
                body: `by_brand=${brand.id}`,
                contentType: 'text/plain',
            });

            // The spec documents no body for 415.
            expect(status).toBe(415);
        }
    );
});

test.describe('POST /products', () => {
    let brand: Brand;
    let refs: {
        category_id: string;
        brand_id: string;
        product_image_id: string;
    };

    test.beforeAll(async ({ apiRequest }) => {
        brand = await createBrand(apiRequest);
        const { categoryId, imageId } = await getProductReferences(apiRequest);
        refs = {
            category_id: categoryId,
            brand_id: required(brand.id, 'brand id'),
            product_image_id: imageId,
        };
    });

    test.afterAll(async ({ apiRequest }) => {
        // Every product posted here belongs to this brand — including any a
        // negative test created because the API wrongly accepted the payload
        await deleteProductsOfBrand(apiRequest, brand.id);
        await deleteBrand(apiRequest, brand.id);
    });

    // The spec documents 200 for this operation; the API answers 201 Created.
    test(
        'should return 201 and the created product',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const payload = generateProduct(refs);

            const { status, body } = await apiRequest<Product>({
                method: 'POST',
                url: ApiEndpoints.PRODUCTS,
                body: payload,
            });

            expect(status).toBe(201);
            expect(ProductSchema.parse(body)).toBeTruthy();
            expect(body).toMatchObject(expectedProduct(payload));
        }
    );

    for (const field of OPTIONAL_FIELDS) {
        test(
            `should return 201 when the optional ${field} is omitted`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { [field]: _omitted, ...payload } = generateProduct(refs);

                const { status, body } = await apiRequest<Product>({
                    method: 'POST',
                    url: ApiEndpoints.PRODUCTS,
                    body: payload,
                });

                expect(status).toBe(201);
                expect(ProductSchema.parse(body)).toBeTruthy();
            }
        );
    }

    test(
        'should return 422 for an empty body',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } =
                await apiRequest<UnprocessableEntityResponse>({
                    method: 'POST',
                    url: ApiEndpoints.PRODUCTS,
                    body: {},
                });

            expect(status).toBe(422);
            expect(UnprocessableEntityResponseSchema.parse(body)).toBeTruthy();
        }
    );

    for (const field of REQUIRED_FIELDS) {
        test(
            `should return 422 when ${field} is missing`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { [field]: _omitted, ...payload } = generateProduct(refs);

                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.PRODUCTS,
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

    for (const field of STRING_FIELDS) {
        for (const invalidValue of withoutUndefined(INVALID_STRING_VALUES)) {
            test(
                `should return 422 when ${field} is ${JSON.stringify(invalidValue)}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method: 'POST',
                            url: ApiEndpoints.PRODUCTS,
                            body: {
                                ...generateProduct(refs),
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

    // FIXME: price is typed `number` in the contract, but a numeric string passes Laravel `numeric` (201). See docs/test-plan.md, defect #11.
    test.skip(
        `should return 422 when price is ${JSON.stringify(NUMERIC_STRING_PRICE)}`,
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } =
                await apiRequest<UnprocessableEntityResponse>({
                    method: 'POST',
                    url: ApiEndpoints.PRODUCTS,
                    body: {
                        ...generateProduct(refs),
                        price: NUMERIC_STRING_PRICE,
                    },
                });

            expect(status).toBe(422);
            expect(UnprocessableEntityResponseSchema.parse(body)).toBeTruthy();
        }
    );

    for (const invalidValue of INVALID_PRICES) {
        test(
            `should return 422 when price is ${JSON.stringify(invalidValue)}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.PRODUCTS,
                        body: { ...generateProduct(refs), price: invalidValue },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    }

    for (const field of BOOLEAN_FIELDS) {
        for (const invalidValue of INVALID_BOOLEANS) {
            test(
                `should return 422 when ${field} is ${JSON.stringify(invalidValue)}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method: 'POST',
                            url: ApiEndpoints.PRODUCTS,
                            body: {
                                ...generateProduct(refs),
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

    // FIXME: category_id / brand_id are only `required` — a wrong type or a non-existent id is not validated and fails with 500 on the DB foreign key. See docs/test-plan.md, defect #6.
    for (const field of ['category_id', 'brand_id'] as const) {
        for (const invalidValue of withoutUndefined(INVALID_STRING_VALUES)) {
            test.skip(
                `should return 422 when ${field} is ${JSON.stringify(invalidValue)}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method: 'POST',
                            url: ApiEndpoints.PRODUCTS,
                            body: {
                                ...generateProduct(refs),
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

        test.skip(
            `should return 404 when ${field} does not exist`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'POST',
                        url: ApiEndpoints.PRODUCTS,
                        body: {
                            ...generateProduct(refs),
                            [field]: NON_EXISTENT_ID,
                        },
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            }
        );
    }

    // FIXME: co2_rating has no validation rule — 123 fails with 500, true / null are stored (201). See docs/test-plan.md, defect #7.
    for (const invalidValue of withoutUndefined(INVALID_STRING_VALUES)) {
        test.skip(
            `should return 422 when co2_rating is ${JSON.stringify(invalidValue)}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.PRODUCTS,
                        body: {
                            ...generateProduct(refs),
                            co2_rating: invalidValue,
                        },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    }

    for (const { field, max } of [
        { field: 'name', max: CatalogRules.NAME_AND_SLUG_MAX_LENGTH },
        { field: 'description', max: CatalogRules.DESCRIPTION_MAX_LENGTH },
    ] as const) {
        test(
            `should return 422 when ${field} is longer than ${max} characters`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.PRODUCTS,
                        body: {
                            ...generateProduct(refs),
                            [field]: 'a'.repeat(max + 1),
                        },
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
                        url: ApiEndpoints.PRODUCTS,
                        body: generateProduct(refs, { name }),
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    }
});

test.describe('GET /products/{productId}', () => {
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

    // FIXME: the body carries an undocumented `specs` array that ProductResponse does not declare. See docs/test-plan.md, defect #5.
    test.skip(
        'should return 200 and the product',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<Product>({
                method: 'GET',
                url: fillPath(ApiEndpoints.PRODUCT, {
                    productId: required(product.id, 'product id'),
                }),
            });

            expect(status).toBe(200);
            expect(ProductSchema.parse(body)).toBeTruthy();
            expect(body).toMatchObject({
                id: product.id,
                name: product.name,
                price: product.price,
            });
        }
    );

    for (const { description, value } of INVALID_PATH_IDS) {
        test(
            `should return 404 for productId - ${description}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'GET',
                        url: fillPath(ApiEndpoints.PRODUCT, {
                            productId: value,
                        }),
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            }
        );
    }

    test(
        'should return 405 for an unsupported method on /products/{productId}',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<MethodNotAllowedResponse>(
                {
                    method: 'POST',
                    url: fillPath(ApiEndpoints.PRODUCT, {
                        productId: required(product.id, 'product id'),
                    }),
                }
            );

            expect(status).toBe(405);
            expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
        }
    );
});

for (const method of ['PUT', 'PATCH'] as const) {
    test.describe(`${method} /products/{productId}`, () => {
        let brand: Brand;
        let product: Product;
        let refs: {
            category_id: string;
            brand_id: string;
            product_image_id: string;
        };

        test.beforeAll(async ({ apiRequest }) => {
            brand = await createBrand(apiRequest);
            product = await createProduct(
                apiRequest,
                required(brand.id, 'brand id')
            );
            const { categoryId, imageId } =
                await getProductReferences(apiRequest);
            refs = {
                category_id: categoryId,
                brand_id: required(brand.id, 'brand id'),
                product_image_id: imageId,
            };
        });

        test.afterAll(async ({ apiRequest }) => {
            await deleteProduct(apiRequest, product.id);
            await deleteBrand(apiRequest, brand.id);
        });

        test(
            'should return 200 and update the product',
            { tag: '@api' },
            async ({ apiRequest }) => {
                // co2_rating is covered by its own test below (PATCH ignores it — defect #9)
                const update = generateProduct(refs, {
                    co2_rating: product.co2_rating,
                });

                await test.step(`Update the product via ${method} /products/{productId}`, async () => {
                    const { status, body } = await apiRequest<UpdateResponse>({
                        method,
                        url: fillPath(ApiEndpoints.PRODUCT, {
                            productId: required(product.id, 'product id'),
                        }),
                        body: update,
                    });

                    expect(status).toBe(200);
                    expect(UpdateResponseSchema.parse(body)).toBeTruthy();
                    expect(body.success).toBe(true);
                });

                await test.step('Read the product via GET /products?by_brand', async () => {
                    const updated = await readProductByBrand(
                        apiRequest,
                        refs.brand_id
                    );

                    expect(updated).toMatchObject(expectedProduct(update));
                });
            }
        );

        // FIXME: PATCH silently ignores co2_rating (no rule in PatchProduct, so validated() drops it). See docs/test-plan.md, defect #9.
        test(
            'should return 200 and update co2_rating',
            { tag: '@api' },
            async ({ apiRequest }) => {
                test.skip(
                    method === 'PATCH',
                    'FIXME: PATCH ignores co2_rating — docs/test-plan.md, defect #9'
                );
                const co2Rating = required(
                    Object.values(Co2Ratings).find(
                        (rating) => rating !== product.co2_rating
                    ),
                    'another co2 rating'
                );

                await test.step(`Update co2_rating via ${method} /products/{productId}`, async () => {
                    const { status, body } = await apiRequest<UpdateResponse>({
                        method,
                        url: fillPath(ApiEndpoints.PRODUCT, {
                            productId: required(product.id, 'product id'),
                        }),
                        body: generateProduct(refs, { co2_rating: co2Rating }),
                    });

                    expect(status).toBe(200);
                    expect(UpdateResponseSchema.parse(body)).toBeTruthy();
                });

                await test.step('Read the product via GET /products?by_brand', async () => {
                    const updated = await readProductByBrand(
                        apiRequest,
                        refs.brand_id
                    );

                    expect(updated.co2_rating).toBe(co2Rating);
                });
            }
        );

        for (const field of [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].filter(
            (f) => f !== 'brand_id'
        )) {
            test(
                `should return 200 when only ${field} is omitted`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { [field]: _omitted, ...payload } =
                        generateProduct(refs);

                    const { status, body } = await apiRequest<UpdateResponse>({
                        method,
                        url: fillPath(ApiEndpoints.PRODUCT, {
                            productId: required(product.id, 'product id'),
                        }),
                        body: payload,
                    });

                    expect(status).toBe(200);
                    expect(UpdateResponseSchema.parse(body)).toBeTruthy();
                }
            );
        }

        for (const field of ['name', 'description'] as const) {
            for (const invalidValue of withoutUndefined(
                INVALID_STRING_VALUES
            )) {
                test(
                    `should return 422 when ${field} is ${JSON.stringify(invalidValue)}`,
                    { tag: '@api' },
                    async ({ apiRequest }) => {
                        const { status, body } =
                            await apiRequest<UnprocessableEntityResponse>({
                                method,
                                url: fillPath(ApiEndpoints.PRODUCT, {
                                    productId: required(
                                        product.id,
                                        'product id'
                                    ),
                                }),
                                body: {
                                    ...generateProduct(refs),
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

        // FIXME: price is typed `number` in the contract, but a numeric string passes Laravel `numeric`. See docs/test-plan.md, defect #11.
        test.skip(
            `should return 422 when price is ${JSON.stringify(NUMERIC_STRING_PRICE)}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method,
                        url: fillPath(ApiEndpoints.PRODUCT, {
                            productId: required(product.id, 'product id'),
                        }),
                        body: {
                            ...generateProduct(refs),
                            price: NUMERIC_STRING_PRICE,
                        },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );

        for (const invalidValue of INVALID_PRICES) {
            // FIXME: PUT has no rule for price ("string" / null fail with 500, true is stored). See docs/test-plan.md, defect #8.
            test(
                `should return 422 when price is ${JSON.stringify(invalidValue)}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    test.skip(
                        method === 'PUT',
                        'FIXME: PUT does not validate price — docs/test-plan.md, defect #8'
                    );
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method,
                            url: fillPath(ApiEndpoints.PRODUCT, {
                                productId: required(product.id, 'product id'),
                            }),
                            body: {
                                ...generateProduct(refs),
                                price: invalidValue,
                            },
                        });

                    expect(status).toBe(422);
                    expect(
                        UnprocessableEntityResponseSchema.parse(body)
                    ).toBeTruthy();
                }
            );
        }

        for (const field of BOOLEAN_FIELDS) {
            for (const invalidValue of INVALID_BOOLEANS) {
                test(
                    `should return 422 when ${field} is ${JSON.stringify(invalidValue)}`,
                    { tag: '@api' },
                    async ({ apiRequest }) => {
                        const { status, body } =
                            await apiRequest<UnprocessableEntityResponse>({
                                method,
                                url: fillPath(ApiEndpoints.PRODUCT, {
                                    productId: required(
                                        product.id,
                                        'product id'
                                    ),
                                }),
                                body: {
                                    ...generateProduct(refs),
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

        for (const { description, value } of INVALID_PATH_IDS) {
            test(
                `should return 404 for productId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method,
                            url: fillPath(ApiEndpoints.PRODUCT, {
                                productId: value,
                            }),
                            body: generateProduct(refs),
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                }
            );
        }
    });
}

test.describe('DELETE /products/{productId}', () => {
    let brand: Brand;

    test.beforeAll(async ({ apiRequest }) => {
        brand = await createBrand(apiRequest);
    });

    test.afterAll(async ({ apiRequest }) => {
        await deleteBrand(apiRequest, brand.id);
    });

    test(
        'should return 204 when an admin deletes an unused product',
        { tag: '@api' },
        async ({ apiRequest }) => {
            let productId = '';

            await test.step('Create a product via POST /products', async () => {
                const product = await createProduct(
                    apiRequest,
                    required(brand.id, 'brand id')
                );
                productId = required(product.id, 'product id');
            });

            await test.step('Delete the product via DELETE /products/{productId}', async () => {
                const { status, body } = await apiRequest<null>({
                    method: 'DELETE',
                    url: fillPath(ApiEndpoints.PRODUCT, { productId }),
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                });

                expect(status).toBe(204);
                expect(body).toBeNull();
            });

            await test.step('Check the product is gone via GET /products/{productId}', async () => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'GET',
                        url: fillPath(ApiEndpoints.PRODUCT, { productId }),
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            });
        }
    );

    test.describe('with an existing product', () => {
        let product: Product;

        test.beforeAll(async ({ apiRequest }) => {
            product = await createProduct(
                apiRequest,
                required(brand.id, 'brand id')
            );
        });

        test.afterAll(async ({ apiRequest }) => {
            await deleteProduct(apiRequest, product.id);
        });

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method: 'DELETE',
                        url: fillPath(ApiEndpoints.PRODUCT, {
                            productId: required(product.id, 'product id'),
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
                    url: fillPath(ApiEndpoints.PRODUCT, {
                        productId: required(product.id, 'product id'),
                    }),
                    headers: process.env.ACCESS_TOKEN,
                });

                expect(status).toBe(403);
                expect(ForbiddenResponseSchema.parse(body)).toBeTruthy();
            }
        );

        test(
            'should return 409 when the product is in a favorites list',
            { tag: '@api' },
            async ({ apiRequest, registeredUser }) => {
                let favoriteId = '';

                await test.step('Add the product to favorites via POST /favorites', async () => {
                    const { status, body } = await apiRequest<{ id?: string }>({
                        method: 'POST',
                        url: ApiEndpoints.FAVORITES,
                        headers: registeredUser.token,
                        body: { product_id: product.id },
                    });

                    // Setup only — the favorites contract is covered in favorites.spec.ts.
                    expect([200, 201]).toContain(status);
                    favoriteId = required(body.id, 'favorite id');
                });

                await test.step('Delete the product via DELETE /products/{productId}', async () => {
                    const { status, body } = await apiRequest<ConflictResponse>(
                        {
                            method: 'DELETE',
                            url: fillPath(ApiEndpoints.PRODUCT, {
                                productId: required(product.id, 'product id'),
                            }),
                            headers: process.env.ADMIN_ACCESS_TOKEN,
                        }
                    );

                    expect(status).toBe(409);
                    expect(ConflictResponseSchema.parse(body)).toBeTruthy();
                });

                await test.step('Remove the favorite via DELETE /favorites/{favoriteId}', async () => {
                    const { status } = await apiRequest({
                        method: 'DELETE',
                        url: fillPath(ApiEndpoints.FAVORITE, { favoriteId }),
                        headers: registeredUser.token,
                    });

                    // Cleanup — lets the product and the user be deleted afterwards.
                    expect(status).toBe(204);
                });
            }
        );
    });

    for (const { description, value } of INVALID_PATH_IDS) {
        test(
            `should return 404 for productId - ${description}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'DELETE',
                        url: fillPath(ApiEndpoints.PRODUCT, {
                            productId: value,
                        }),
                        headers: process.env.ADMIN_ACCESS_TOKEN,
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            }
        );
    }

    // FIXME: 422 is documented for DELETE /products/{productId}; its only rule (`id` required) is always satisfied by the route.
    test.skip(
        'should return 422 when the product id is missing',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } =
                await apiRequest<UnprocessableEntityResponse>({
                    method: 'DELETE',
                    url: fillPath(ApiEndpoints.PRODUCT, { productId: '' }),
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                });

            expect(status).toBe(422);
            expect(UnprocessableEntityResponseSchema.parse(body)).toBeTruthy();
        }
    );
});

test.describe('GET /products/{productId}/related', () => {
    let productId: string;

    test.beforeAll(async ({ apiRequest }) => {
        const { status, body } = await apiRequest<PaginatedProducts>({
            method: 'GET',
            url: ApiEndpoints.PRODUCTS,
        });
        expect(status).toBe(200);
        expect(PaginatedProductSchema.parse(body)).toBeTruthy();
        productId = required(body.data?.at(0)?.id, 'product id');
    });

    test(
        'should return 200 and related products of the same category',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<ProductList>({
                method: 'GET',
                url: fillPath(ApiEndpoints.PRODUCT_RELATED, { productId }),
            });

            expect(status).toBe(200);
            expect(ProductListSchema.parse(body)).toBeTruthy();
            expect(body.length).toBeGreaterThan(0);
            expect(body.map(({ id }) => id)).not.toContain(productId);
        }
    );

    // FIXME: an unknown productId fails with 500 instead of 404. See docs/test-plan.md, defect #10.
    for (const { description, value } of INVALID_PATH_IDS) {
        test.skip(
            `should return 404 for productId - ${description}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'GET',
                        url: fillPath(ApiEndpoints.PRODUCT_RELATED, {
                            productId: value,
                        }),
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            }
        );
    }

    test(
        'should return 405 for an unsupported method on /products/{productId}/related',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<MethodNotAllowedResponse>(
                {
                    method: 'POST',
                    url: fillPath(ApiEndpoints.PRODUCT_RELATED, { productId }),
                }
            );

            expect(status).toBe(405);
            expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
        }
    );
});

test.describe('GET /products/search', () => {
    // Search is FULLTEXT and cached per query — a unique searchable name keeps it exact
    const searchToken = generateSearchToken();
    let brand: Brand;
    let product: Product;

    test.beforeAll(async ({ apiRequest }) => {
        brand = await createBrand(apiRequest);
        product = await createProduct(
            apiRequest,
            required(brand.id, 'brand id'),
            { name: searchToken }
        );
    });

    test.afterAll(async ({ apiRequest }) => {
        await deleteProduct(apiRequest, product.id);
        await deleteBrand(apiRequest, brand.id);
    });

    test(
        'should return 200 and the products matching q',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<PaginatedProducts>({
                method: 'GET',
                url: ApiEndpoints.PRODUCTS_SEARCH,
                params: { q: searchToken, page: 1 },
            });

            expect(status).toBe(200);
            expect(PaginatedProductSchema.parse(body)).toBeTruthy();
            expect(body.data?.map(({ id }) => id)).toEqual([product.id]);
        }
    );

    // FIXME: 404 "Requested item not found" is documented for the product search, but a search without matches returns 200 with empty data.
    test.skip(
        'should return 404 when no product matches q',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<ItemNotFoundResponse>({
                method: 'GET',
                url: ApiEndpoints.PRODUCTS_SEARCH,
                params: { q: generateSearchToken() },
            });

            expect(status).toBe(404);
            expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
        }
    );

    test(
        'should return 405 for an unsupported method on /products/search',
        { tag: '@api' },
        async ({ apiRequest }) => {
            // DELETE / PUT / PATCH are routed to /products/{productId} with productId "search"
            const { status, body } = await apiRequest<MethodNotAllowedResponse>(
                {
                    method: 'POST',
                    url: ApiEndpoints.PRODUCTS_SEARCH,
                }
            );

            expect(status).toBe(405);
            expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
        }
    );
});

test.describe('QUERY /products/search', () => {
    const searchToken = generateSearchToken();
    let brand: Brand;
    let product: Product;

    test.beforeAll(async ({ apiRequest }) => {
        brand = await createBrand(apiRequest);
        product = await createProduct(
            apiRequest,
            required(brand.id, 'brand id'),
            { name: searchToken }
        );
    });

    test.afterAll(async ({ apiRequest }) => {
        await deleteProduct(apiRequest, product.id);
        await deleteBrand(apiRequest, brand.id);
    });

    test(
        'should return 200 and the products matching q',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<PaginatedProducts>({
                method: 'QUERY',
                url: ApiEndpoints.PRODUCTS_SEARCH,
                body: { q: searchToken, page: '1' },
            });

            expect(status).toBe(200);
            expect(PaginatedProductSchema.parse(body)).toBeTruthy();
            expect(body.data?.map(({ id }) => id)).toEqual([product.id]);
        }
    );

    test(
        'should return 415 when the criteria are not sent as JSON',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status } = await apiRequest({
                method: 'QUERY',
                url: ApiEndpoints.PRODUCTS_SEARCH,
                body: `q=${searchToken}`,
                contentType: 'text/plain',
            });

            // The spec documents no body for 415.
            expect(status).toBe(415);
        }
    );
});
