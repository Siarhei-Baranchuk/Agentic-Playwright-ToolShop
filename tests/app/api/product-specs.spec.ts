/* eslint-disable playwright/no-skipped-test -- documented contract gaps are kept as skipped tests with a FIXME */
import { ApiEndpoints, CatalogRules } from '../../../enums/app/app';
import type { ApiRequestFn } from '../../../fixtures/api/api-types';
import { Brand } from '../../../fixtures/api/schemas/app/brandSchema';
import { Product } from '../../../fixtures/api/schemas/app/productSchema';
import {
    ProductSpec,
    ProductSpecList,
    ProductSpecListSchema,
    ProductSpecNameList,
    ProductSpecNameListSchema,
    ProductSpecSchema,
} from '../../../fixtures/api/schemas/app/productSpecSchema';
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
    createBrand,
    createProduct,
    deleteBrand,
    deleteProduct,
} from '../../../helpers/app/catalog';
import { fillPath, required } from '../../../helpers/util/util';
import { generateProductSpec } from '../../../test-data/factories/app/catalog.factory';
import { INVALID_PATH_IDS } from '../../../test-data/static/util/invalid-path-params';
import {
    INVALID_STRING_VALUES,
    PRIMARY_INVALID_VALUES,
} from '../../../test-data/static/util/invalid-values';

const REQUIRED_FIELDS = ['spec_name', 'spec_value'] as const;
const FIELD_LIMITS = [
    { field: 'spec_name', max: CatalogRules.SPEC_NAME_MAX_LENGTH },
    { field: 'spec_value', max: CatalogRules.SPEC_VALUE_MAX_LENGTH },
    { field: 'spec_unit', max: CatalogRules.SPEC_UNIT_MAX_LENGTH },
] as const;
/** spec_unit is `nullable|string` — null is valid there */
const INVALID_UNITS = INVALID_STRING_VALUES.filter((value) => value !== null);

/**
 * Creates a spec of a product via `POST /products/{productId}/specs` as the admin.
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @param {string} productId - Id of the product.
 * @returns {Promise<ProductSpec>} The created spec.
 */
async function createSpec(
    apiRequest: ApiRequestFn,
    productId: string
): Promise<ProductSpec> {
    const { status, body } = await apiRequest<ProductSpec>({
        method: 'POST',
        url: fillPath(ApiEndpoints.PRODUCT_SPECS, { productId }),
        headers: process.env.ADMIN_ACCESS_TOKEN,
        body: generateProductSpec(),
    });
    expect(status).toBe(201);
    expect(ProductSpecSchema.parse(body)).toBeTruthy();
    return body;
}

test.describe('product specs', () => {
    let brand: Brand;
    let product: Product;
    let productId: string;

    test.beforeAll(async ({ apiRequest }) => {
        brand = await createBrand(apiRequest);
        product = await createProduct(
            apiRequest,
            required(brand.id, 'brand id')
        );
        productId = required(product.id, 'product id');
    });

    test.afterAll(async ({ apiRequest }) => {
        // Specs are deleted together with their product
        await deleteProduct(apiRequest, product.id);
        await deleteBrand(apiRequest, brand.id);
    });

    test.describe('GET /products/{productId}/specs', () => {
        let spec: ProductSpec;

        test.beforeAll(async ({ apiRequest }) => {
            spec = await createSpec(apiRequest, productId);
        });

        test(
            'should return 200 and the specs of the product',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ProductSpecList>({
                    method: 'GET',
                    url: fillPath(ApiEndpoints.PRODUCT_SPECS, { productId }),
                });

                expect(status).toBe(200);
                expect(ProductSpecListSchema.parse(body)).toBeTruthy();
                expect(body).toContainEqual(spec);
                expect(
                    body.every((item) => item.product_id === productId)
                ).toBe(true);
            }
        );

        // FIXME: an unknown productId returns 200 [] instead of 404 (only 200 is documented).
        for (const { description, value } of INVALID_PATH_IDS) {
            test.skip(
                `should return 404 for productId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method: 'GET',
                            url: fillPath(ApiEndpoints.PRODUCT_SPECS, {
                                productId: value,
                            }),
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                }
            );
        }

        test(
            'should return 405 for an unsupported method on /products/{productId}/specs',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<MethodNotAllowedResponse>({
                        method: 'PATCH',
                        url: fillPath(ApiEndpoints.PRODUCT_SPECS, {
                            productId,
                        }),
                        headers: process.env.ADMIN_ACCESS_TOKEN,
                    });

                expect(status).toBe(405);
                expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });

    test.describe('POST /products/{productId}/specs', () => {
        // FIXME: validation errors answer 404 {"message":"Resource not found"} instead of 422 — every 422 test below is skipped. See docs/test-plan.md, defect #13.
        test(
            'should return 201 and the created spec',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const payload = generateProductSpec();

                const { status, body } = await apiRequest<ProductSpec>({
                    method: 'POST',
                    url: fillPath(ApiEndpoints.PRODUCT_SPECS, { productId }),
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                    body: payload,
                });

                expect(status).toBe(201);
                expect(ProductSpecSchema.parse(body)).toBeTruthy();
                expect(body).toMatchObject({
                    ...payload,
                    product_id: productId,
                });
            }
        );

        test(
            'should return 201 when the optional spec_unit is null',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ProductSpec>({
                    method: 'POST',
                    url: fillPath(ApiEndpoints.PRODUCT_SPECS, { productId }),
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                    body: generateProductSpec({ spec_unit: null }),
                });

                expect(status).toBe(201);
                expect(ProductSpecSchema.parse(body)).toBeTruthy();
                expect(body.spec_unit).toBeNull();
            }
        );

        test(
            'should return 201 when the optional spec_unit is omitted',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { spec_unit: _omitted, ...payload } =
                    generateProductSpec();

                const { status, body } = await apiRequest<ProductSpec>({
                    method: 'POST',
                    url: fillPath(ApiEndpoints.PRODUCT_SPECS, { productId }),
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                    body: payload,
                });

                expect(status).toBe(201);
                expect(ProductSpecSchema.parse(body)).toBeTruthy();
            }
        );

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method: 'POST',
                        url: fillPath(ApiEndpoints.PRODUCT_SPECS, {
                            productId,
                        }),
                        body: generateProductSpec(),
                    }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            }
        );

        test.skip(
            'should return 422 for an empty body',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: fillPath(ApiEndpoints.PRODUCT_SPECS, {
                            productId,
                        }),
                        headers: process.env.ADMIN_ACCESS_TOKEN,
                        body: {},
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );

        for (const field of REQUIRED_FIELDS) {
            test.skip(
                `should return 422 when ${field} is missing`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { [field]: _omitted, ...payload } =
                        generateProductSpec();

                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method: 'POST',
                            url: fillPath(ApiEndpoints.PRODUCT_SPECS, {
                                productId,
                            }),
                            headers: process.env.ADMIN_ACCESS_TOKEN,
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
                test.skip(
                    `should return 422 when ${field} is ${JSON.stringify(invalidValue)}`,
                    { tag: '@api' },
                    async ({ apiRequest }) => {
                        const { status, body } =
                            await apiRequest<UnprocessableEntityResponse>({
                                method: 'POST',
                                url: fillPath(ApiEndpoints.PRODUCT_SPECS, {
                                    productId,
                                }),
                                headers: process.env.ADMIN_ACCESS_TOKEN,
                                body: {
                                    ...generateProductSpec(),
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

        for (const invalidValue of INVALID_UNITS) {
            test.skip(
                `should return 422 when spec_unit is ${JSON.stringify(invalidValue)}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method: 'POST',
                            url: fillPath(ApiEndpoints.PRODUCT_SPECS, {
                                productId,
                            }),
                            headers: process.env.ADMIN_ACCESS_TOKEN,
                            body: {
                                ...generateProductSpec(),
                                spec_unit: invalidValue,
                            },
                        });

                    expect(status).toBe(422);
                    expect(
                        UnprocessableEntityResponseSchema.parse(body)
                    ).toBeTruthy();
                }
            );
        }

        for (const { field, max } of FIELD_LIMITS) {
            test.skip(
                `should return 422 when ${field} is longer than ${max} characters`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method: 'POST',
                            url: fillPath(ApiEndpoints.PRODUCT_SPECS, {
                                productId,
                            }),
                            headers: process.env.ADMIN_ACCESS_TOKEN,
                            body: {
                                ...generateProductSpec(),
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

        // FIXME: an unknown productId fails with 500 (DB foreign key) instead of 404. See docs/test-plan.md, defect #14.
        for (const { description, value } of INVALID_PATH_IDS) {
            test.skip(
                `should return 404 for productId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method: 'POST',
                            url: fillPath(ApiEndpoints.PRODUCT_SPECS, {
                                productId: value,
                            }),
                            headers: process.env.ADMIN_ACCESS_TOKEN,
                            body: generateProductSpec(),
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                }
            );
        }
    });

    test.describe('GET /products/{productId}/specs/{specId}', () => {
        let spec: ProductSpec;

        test.beforeAll(async ({ apiRequest }) => {
            spec = await createSpec(apiRequest, productId);
        });

        test(
            'should return 200 and the spec',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ProductSpec>({
                    method: 'GET',
                    url: fillPath(ApiEndpoints.PRODUCT_SPEC, {
                        productId,
                        specId: required(spec.id, 'spec id'),
                    }),
                });

                expect(status).toBe(200);
                expect(ProductSpecSchema.parse(body)).toBeTruthy();
                expect(body).toEqual(spec);
            }
        );

        for (const { description, value } of INVALID_PATH_IDS) {
            test(
                `should return 404 for specId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method: 'GET',
                            url: fillPath(ApiEndpoints.PRODUCT_SPEC, {
                                productId,
                                specId: value,
                            }),
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                }
            );
        }

        test(
            'should return 405 for an unsupported method on /products/{productId}/specs/{specId}',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<MethodNotAllowedResponse>({
                        method: 'POST',
                        url: fillPath(ApiEndpoints.PRODUCT_SPEC, {
                            productId,
                            specId: required(spec.id, 'spec id'),
                        }),
                        headers: process.env.ADMIN_ACCESS_TOKEN,
                        body: generateProductSpec(),
                    });

                expect(status).toBe(405);
                expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });

    test.describe('PUT /products/{productId}/specs/{specId}', () => {
        // FIXME: validation errors answer 404 {"message":"Resource not found"} instead of 422 — every 422 test below is skipped. See docs/test-plan.md, defect #13.
        let spec: ProductSpec;

        test.beforeAll(async ({ apiRequest }) => {
            spec = await createSpec(apiRequest, productId);
        });

        test(
            'should return 200 and update the spec',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const update = generateProductSpec();

                await test.step('Update the spec via PUT /products/{productId}/specs/{specId}', async () => {
                    const { status, body } = await apiRequest<UpdateResponse>({
                        method: 'PUT',
                        url: fillPath(ApiEndpoints.PRODUCT_SPEC, {
                            productId,
                            specId: required(spec.id, 'spec id'),
                        }),
                        headers: process.env.ADMIN_ACCESS_TOKEN,
                        body: update,
                    });

                    expect(status).toBe(200);
                    expect(UpdateResponseSchema.parse(body)).toBeTruthy();
                    expect(body.success).toBe(true);
                });

                await test.step('Read the spec via GET /products/{productId}/specs/{specId}', async () => {
                    const { status, body } = await apiRequest<ProductSpec>({
                        method: 'GET',
                        url: fillPath(ApiEndpoints.PRODUCT_SPEC, {
                            productId,
                            specId: required(spec.id, 'spec id'),
                        }),
                    });

                    expect(status).toBe(200);
                    expect(ProductSpecSchema.parse(body)).toBeTruthy();
                    expect(body).toMatchObject(update);
                });
            }
        );

        test(
            'should return 200 for a partial update',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UpdateResponse>({
                    method: 'PUT',
                    url: fillPath(ApiEndpoints.PRODUCT_SPEC, {
                        productId,
                        specId: required(spec.id, 'spec id'),
                    }),
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                    body: { spec_value: generateProductSpec().spec_value },
                });

                expect(status).toBe(200);
                expect(UpdateResponseSchema.parse(body)).toBeTruthy();
            }
        );

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method: 'PUT',
                        url: fillPath(ApiEndpoints.PRODUCT_SPEC, {
                            productId,
                            specId: required(spec.id, 'spec id'),
                        }),
                        body: generateProductSpec(),
                    }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            }
        );

        for (const field of [...REQUIRED_FIELDS, 'spec_unit'] as const) {
            test.skip(
                `should return 422 when ${field} is ${JSON.stringify(PRIMARY_INVALID_VALUES.STRING)}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method: 'PUT',
                            url: fillPath(ApiEndpoints.PRODUCT_SPEC, {
                                productId,
                                specId: required(spec.id, 'spec id'),
                            }),
                            headers: process.env.ADMIN_ACCESS_TOKEN,
                            body: {
                                ...generateProductSpec(),
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

        for (const { description, value } of INVALID_PATH_IDS) {
            test(
                `should return 404 for specId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method: 'PUT',
                            url: fillPath(ApiEndpoints.PRODUCT_SPEC, {
                                productId,
                                specId: value,
                            }),
                            headers: process.env.ADMIN_ACCESS_TOKEN,
                            body: generateProductSpec(),
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                }
            );
        }
    });

    test.describe('DELETE /products/{productId}/specs/{specId}', () => {
        test(
            'should return 204 and delete the spec',
            { tag: '@api' },
            async ({ apiRequest }) => {
                let specId = '';

                await test.step('Create a spec via POST /products/{productId}/specs', async () => {
                    const spec = await createSpec(apiRequest, productId);
                    specId = required(spec.id, 'spec id');
                });

                await test.step('Delete the spec via DELETE /products/{productId}/specs/{specId}', async () => {
                    const { status, body } = await apiRequest<null>({
                        method: 'DELETE',
                        url: fillPath(ApiEndpoints.PRODUCT_SPEC, {
                            productId,
                            specId,
                        }),
                        headers: process.env.ADMIN_ACCESS_TOKEN,
                    });

                    expect(status).toBe(204);
                    expect(body).toBeNull();
                });

                await test.step('Check the spec is gone via GET /products/{productId}/specs/{specId}', async () => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method: 'GET',
                            url: fillPath(ApiEndpoints.PRODUCT_SPEC, {
                                productId,
                                specId,
                            }),
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                });
            }
        );

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const spec =
                    await test.step('Create a spec via POST /products/{productId}/specs', async () =>
                        createSpec(apiRequest, productId));

                await test.step('Delete the spec without a token via DELETE /products/{productId}/specs/{specId}', async () => {
                    const { status, body } =
                        await apiRequest<UnauthorizedResponse>({
                            method: 'DELETE',
                            url: fillPath(ApiEndpoints.PRODUCT_SPEC, {
                                productId,
                                specId: required(spec.id, 'spec id'),
                            }),
                        });

                    expect(status).toBe(401);
                    expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
                });
            }
        );

        // FIXME: deleting an unknown spec returns 204 — the controller deletes by query without findOrFail (only 204/401 are documented).
        for (const { description, value } of INVALID_PATH_IDS) {
            test.skip(
                `should return 404 for specId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ItemNotFoundResponse>({
                            method: 'DELETE',
                            url: fillPath(ApiEndpoints.PRODUCT_SPEC, {
                                productId,
                                specId: value,
                            }),
                            headers: process.env.ADMIN_ACCESS_TOKEN,
                        });

                    expect(status).toBe(404);
                    expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
                }
            );
        }
    });
});

test.describe('GET /product-specs/names', () => {
    test(
        'should return 200 and the distinct spec names with their values',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<ProductSpecNameList>({
                method: 'GET',
                url: ApiEndpoints.PRODUCT_SPEC_NAMES,
            });

            expect(status).toBe(200);
            expect(ProductSpecNameListSchema.parse(body)).toBeTruthy();
            expect(body.length).toBeGreaterThan(0);
            const names = body.map(({ name }) => name);
            expect(new Set(names).size).toBe(names.length);
        }
    );

    test(
        'should return 405 for an unsupported method on /product-specs/names',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<MethodNotAllowedResponse>(
                {
                    method: 'POST',
                    url: ApiEndpoints.PRODUCT_SPEC_NAMES,
                }
            );

            expect(status).toBe(405);
            expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
        }
    );
});
