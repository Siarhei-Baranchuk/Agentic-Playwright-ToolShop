/* eslint-disable playwright/no-skipped-test -- documented contract gaps are kept as skipped tests with a FIXME */
import { ApiEndpoints, CatalogRules } from '../../../enums/app/app';
import { Brand } from '../../../fixtures/api/schemas/app/brandSchema';
import {
    Category,
    CategoryList,
    CategoryListSchema,
    CategorySchema,
    CategoryTree,
    CategoryTreeList,
    CategoryTreeListSchema,
    CategoryTreeSchema,
} from '../../../fixtures/api/schemas/app/categorySchema';
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
    createCategory,
    createProduct,
    deleteBrand,
    deleteCategory,
    deleteProduct,
} from '../../../helpers/app/catalog';
import { fillPath, required } from '../../../helpers/util/util';
import {
    generateCategory,
    generateSearchToken,
} from '../../../test-data/factories/app/catalog.factory';
import {
    INVALID_SLUGS,
    SUBSCRIPT_SUPERSCRIPT_NAMES,
} from '../../../test-data/static/app/invalidCatalog';
import { INVALID_PATH_IDS } from '../../../test-data/static/util/invalid-path-params';
import { INVALID_STRING_VALUES } from '../../../test-data/static/util/invalid-values';

const REQUIRED_FIELDS = ['name', 'slug'] as const;
const TOO_LONG = 'a'.repeat(CatalogRules.NAME_AND_SLUG_MAX_LENGTH + 1);
/** On PUT / PATCH every field is optional — an omitted (`undefined`) value is valid there */
const INVALID_OPTIONAL_STRING_VALUES = INVALID_STRING_VALUES.filter(
    (value) => value !== undefined
);
/** `parent_id` is `string|nullable` — null and an omitted value are both valid */
const INVALID_PARENT_IDS = INVALID_STRING_VALUES.filter(
    (value) => value !== undefined && value !== null
);
const NON_EXISTENT_ID = INVALID_PATH_IDS[0].value;

test.describe('GET /categories', () => {
    test(
        'should return 200 and the list of categories',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<CategoryList>({
                method: 'GET',
                url: ApiEndpoints.CATEGORIES,
            });

            expect(status).toBe(200);
            expect(CategoryListSchema.parse(body)).toBeTruthy();
            expect(body.length).toBeGreaterThan(0);
        }
    );

    // FIXME: 404 "Resource not found" is documented for the category list, but there is no way to make the list unavailable.
    test.skip(
        'should return 404 when the category list is not available',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<ResourceNotFoundResponse>(
                {
                    method: 'GET',
                    url: ApiEndpoints.CATEGORIES,
                }
            );

            expect(status).toBe(404);
            expect(ResourceNotFoundResponseSchema.parse(body)).toBeTruthy();
        }
    );

    test(
        'should return 405 for an unsupported method on /categories',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<MethodNotAllowedResponse>(
                {
                    method: 'PATCH',
                    url: ApiEndpoints.CATEGORIES,
                }
            );

            expect(status).toBe(405);
            expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
        }
    );
});

test.describe('POST /categories', () => {
    const createdIds: string[] = [];
    let parent: Category;

    test.beforeAll(async ({ apiRequest }) => {
        parent = await createCategory(apiRequest);
    });

    test.afterAll(async ({ apiRequest }) => {
        // Children first: a parent with sub-categories cannot be deleted
        for (const categoryId of createdIds.reverse()) {
            await deleteCategory(apiRequest, categoryId);
        }
        await deleteCategory(apiRequest, parent.id);
    });

    test(
        'should return 201 and the created top-level category',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const payload = generateCategory();

            const { status, body } = await apiRequest<Category>({
                method: 'POST',
                url: ApiEndpoints.CATEGORIES,
                body: payload,
            });
            createdIds.push(required(body.id, 'category id'));

            expect(status).toBe(201);
            expect(CategorySchema.parse(body)).toBeTruthy();
            expect(body).toMatchObject(payload);
        }
    );

    test(
        'should return 201 and create a sub-category of an existing parent',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const payload = generateCategory({ parent_id: parent.id });
            let childId = '';

            await test.step('Create the sub-category via POST /categories', async () => {
                const { status, body } = await apiRequest<Category>({
                    method: 'POST',
                    url: ApiEndpoints.CATEGORIES,
                    body: payload,
                });
                childId = required(body.id, 'category id');
                createdIds.push(childId);

                expect(status).toBe(201);
                expect(CategorySchema.parse(body)).toBeTruthy();
                expect(body).toMatchObject(payload);
            });

            await test.step('Read the parent via GET /categories/tree/{categoryId}', async () => {
                const { status, body } = await apiRequest<CategoryTree>({
                    method: 'GET',
                    url: fillPath(ApiEndpoints.CATEGORY_TREE, {
                        categoryId: required(parent.id, 'category id'),
                    }),
                });

                expect(status).toBe(200);
                expect(CategoryTreeSchema.parse(body)).toBeTruthy();
                expect(body.sub_categories?.map(({ id }) => id)).toContain(
                    childId
                );
            });
        }
    );

    test(
        'should return 409 when the slug is already taken',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } =
                await apiRequest<DuplicateConflictResponse>({
                    method: 'POST',
                    url: ApiEndpoints.CATEGORIES,
                    body: generateCategory({ slug: parent.slug }),
                });

            expect(status).toBe(409);
            expect(DuplicateConflictResponseSchema.parse(body)).toBeTruthy();
        }
    );

    // FIXME: API returns 500 {"message":"Something went wrong"} instead of 404 — a non-existent parent_id is not validated and fails on the DB foreign key. See docs/test-plan.md, defect #4.
    test.skip(
        'should return 404 when the parent category does not exist',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<ItemNotFoundResponse>({
                method: 'POST',
                url: ApiEndpoints.CATEGORIES,
                body: generateCategory({ parent_id: NON_EXISTENT_ID }),
            });

            expect(status).toBe(404);
            expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
        }
    );

    test(
        'should return 422 for an empty body',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } =
                await apiRequest<UnprocessableEntityResponse>({
                    method: 'POST',
                    url: ApiEndpoints.CATEGORIES,
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
                const { [field]: _omitted, ...payload } = generateCategory();

                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.CATEGORIES,
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
                            url: ApiEndpoints.CATEGORIES,
                            body: {
                                ...generateCategory(),
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

        test(
            `should return 422 when ${field} is longer than ${CatalogRules.NAME_AND_SLUG_MAX_LENGTH} characters`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.CATEGORIES,
                        body: { ...generateCategory(), [field]: TOO_LONG },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    }

    for (const invalidValue of INVALID_PARENT_IDS) {
        test(
            `should return 422 when parent_id is ${JSON.stringify(invalidValue)}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.CATEGORIES,
                        body: {
                            ...generateCategory(),
                            parent_id: invalidValue,
                        },
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
                        url: ApiEndpoints.CATEGORIES,
                        body: generateCategory({ slug }),
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
                        url: ApiEndpoints.CATEGORIES,
                        body: generateCategory({ name }),
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    }
});

test.describe('GET /categories/tree', () => {
    test(
        'should return 200 and the category tree',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<CategoryTreeList>({
                method: 'GET',
                url: ApiEndpoints.CATEGORIES_TREE,
            });

            expect(status).toBe(200);
            expect(CategoryTreeListSchema.parse(body)).toBeTruthy();
            expect(body.length).toBeGreaterThan(0);
            expect(body.every(({ parent_id }) => parent_id === null)).toBe(
                true
            );
        }
    );

    test.describe('filtered by slug', () => {
        let parent: Category;
        let child: Category;

        test.beforeAll(async ({ apiRequest }) => {
            parent = await createCategory(apiRequest);
            child = await createCategory(apiRequest, { parent_id: parent.id });
        });

        test.afterAll(async ({ apiRequest }) => {
            await deleteCategory(apiRequest, child.id);
            await deleteCategory(apiRequest, parent.id);
        });

        test(
            'should return 200 and only the tree of by_category_slug',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<CategoryTreeList>({
                    method: 'GET',
                    url: ApiEndpoints.CATEGORIES_TREE,
                    params: {
                        by_category_slug: required(
                            parent.slug,
                            'category slug'
                        ),
                    },
                });

                expect(status).toBe(200);
                expect(CategoryTreeListSchema.parse(body)).toBeTruthy();
                expect(body.map(({ id }) => id)).toEqual([parent.id]);
                expect(body.at(0)?.sub_categories?.map(({ id }) => id)).toEqual(
                    [child.id]
                );
            }
        );
    });

    // FIXME: 404 "Resource not found" is documented for the category tree, but there is no way to make it unavailable.
    test.skip(
        'should return 404 when the category tree is not available',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<ResourceNotFoundResponse>(
                {
                    method: 'GET',
                    url: ApiEndpoints.CATEGORIES_TREE,
                }
            );

            expect(status).toBe(404);
            expect(ResourceNotFoundResponseSchema.parse(body)).toBeTruthy();
        }
    );

    test(
        'should return 405 for an unsupported method on /categories/tree',
        { tag: '@api' },
        async ({ apiRequest }) => {
            // DELETE / PUT / PATCH are routed to /categories/{categoryId} with categoryId "tree"
            const { status, body } = await apiRequest<MethodNotAllowedResponse>(
                {
                    method: 'POST',
                    url: ApiEndpoints.CATEGORIES_TREE,
                    body: generateCategory(),
                }
            );

            expect(status).toBe(405);
            expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
        }
    );
});

test.describe('QUERY /categories/tree', () => {
    let parent: Category;

    test.beforeAll(async ({ apiRequest }) => {
        parent = await createCategory(apiRequest);
    });

    test.afterAll(async ({ apiRequest }) => {
        await deleteCategory(apiRequest, parent.id);
    });

    test(
        'should return 200 and only the tree of by_category_slug',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<CategoryTreeList>({
                method: 'QUERY',
                url: ApiEndpoints.CATEGORIES_TREE,
                body: { by_category_slug: parent.slug },
            });

            expect(status).toBe(200);
            expect(CategoryTreeListSchema.parse(body)).toBeTruthy();
            expect(body.map(({ id }) => id)).toEqual([parent.id]);
        }
    );

    test(
        'should return 415 when the criteria are not sent as JSON',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status } = await apiRequest({
                method: 'QUERY',
                url: ApiEndpoints.CATEGORIES_TREE,
                body: `by_category_slug=${parent.slug}`,
                contentType: 'text/plain',
            });

            // The spec documents no body for 415.
            expect(status).toBe(415);
        }
    );
});

test.describe('GET /categories/tree/{categoryId}', () => {
    let parent: Category;
    let child: Category;

    test.beforeAll(async ({ apiRequest }) => {
        parent = await createCategory(apiRequest);
        child = await createCategory(apiRequest, { parent_id: parent.id });
    });

    test.afterAll(async ({ apiRequest }) => {
        await deleteCategory(apiRequest, child.id);
        await deleteCategory(apiRequest, parent.id);
    });

    test(
        'should return 200 and the category with its sub-categories',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<CategoryTree>({
                method: 'GET',
                url: fillPath(ApiEndpoints.CATEGORY_TREE, {
                    categoryId: required(parent.id, 'category id'),
                }),
            });

            expect(status).toBe(200);
            expect(CategoryTreeSchema.parse(body)).toBeTruthy();
            expect(body).toMatchObject({
                id: parent.id,
                name: parent.name,
                slug: parent.slug,
            });
            expect(body.sub_categories?.map(({ id }) => id)).toEqual([
                child.id,
            ]);
        }
    );

    for (const { description, value } of INVALID_PATH_IDS) {
        test(
            `should return 404 for categoryId - ${description}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'GET',
                        url: fillPath(ApiEndpoints.CATEGORY_TREE, {
                            categoryId: value,
                        }),
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            }
        );
    }

    test(
        'should return 405 for an unsupported method on /categories/tree/{categoryId}',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<MethodNotAllowedResponse>(
                {
                    method: 'DELETE',
                    url: fillPath(ApiEndpoints.CATEGORY_TREE, {
                        categoryId: required(parent.id, 'category id'),
                    }),
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                }
            );

            expect(status).toBe(405);
            expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
        }
    );
});

test.describe('GET /categories/search', () => {
    // Search caches results per query — a unique searchable name keeps it exact
    const searchToken = generateSearchToken();
    let category: Category;

    test.beforeAll(async ({ apiRequest }) => {
        category = await createCategory(apiRequest, { name: searchToken });
    });

    test.afterAll(async ({ apiRequest }) => {
        await deleteCategory(apiRequest, category.id);
    });

    test(
        'should return 200 and the categories matching q',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<CategoryList>({
                method: 'GET',
                url: ApiEndpoints.CATEGORIES_SEARCH,
                params: { q: searchToken },
            });

            expect(status).toBe(200);
            expect(CategoryListSchema.parse(body)).toBeTruthy();
            expect(body.map(({ id }) => id)).toEqual([category.id]);
        }
    );

    // FIXME: 404 "Resource not found" is documented for the category search, but a search without matches returns 200 [].
    test.skip(
        'should return 404 when no category matches q',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<ResourceNotFoundResponse>(
                {
                    method: 'GET',
                    url: ApiEndpoints.CATEGORIES_SEARCH,
                    params: { q: generateSearchToken() },
                }
            );

            expect(status).toBe(404);
            expect(ResourceNotFoundResponseSchema.parse(body)).toBeTruthy();
        }
    );

    test(
        'should return 405 for an unsupported method on /categories/search',
        { tag: '@api' },
        async ({ apiRequest }) => {
            // DELETE / PUT / PATCH are routed to /categories/{categoryId} with categoryId "search"
            const { status, body } = await apiRequest<MethodNotAllowedResponse>(
                {
                    method: 'POST',
                    url: ApiEndpoints.CATEGORIES_SEARCH,
                    body: generateCategory(),
                }
            );

            expect(status).toBe(405);
            expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
        }
    );
});

test.describe('QUERY /categories/search', () => {
    const searchToken = generateSearchToken();
    let category: Category;

    test.beforeAll(async ({ apiRequest }) => {
        category = await createCategory(apiRequest, { name: searchToken });
    });

    test.afterAll(async ({ apiRequest }) => {
        await deleteCategory(apiRequest, category.id);
    });

    test(
        'should return 200 and the categories matching q',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<CategoryList>({
                method: 'QUERY',
                url: ApiEndpoints.CATEGORIES_SEARCH,
                body: { q: searchToken },
            });

            expect(status).toBe(200);
            expect(CategoryListSchema.parse(body)).toBeTruthy();
            expect(body.map(({ id }) => id)).toEqual([category.id]);
        }
    );

    test(
        'should return 415 when the criteria are not sent as JSON',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status } = await apiRequest({
                method: 'QUERY',
                url: ApiEndpoints.CATEGORIES_SEARCH,
                body: `q=${searchToken}`,
                contentType: 'text/plain',
            });

            // The spec documents no body for 415.
            expect(status).toBe(415);
        }
    );
});

for (const method of ['PUT', 'PATCH'] as const) {
    test.describe(`${method} /categories/{categoryId}`, () => {
        let category: Category;
        let otherCategory: Category;

        test.beforeAll(async ({ apiRequest }) => {
            category = await createCategory(apiRequest);
            otherCategory = await createCategory(apiRequest);
        });

        test.afterAll(async ({ apiRequest }) => {
            await deleteCategory(apiRequest, category.id);
            await deleteCategory(apiRequest, otherCategory.id);
        });

        test(
            'should return 200 and update the category',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { parent_id: _topLevel, ...update } = generateCategory();

                await test.step(`Update the category via ${method} /categories/{categoryId}`, async () => {
                    const { status, body } = await apiRequest<UpdateResponse>({
                        method,
                        url: fillPath(ApiEndpoints.CATEGORY, {
                            categoryId: required(category.id, 'category id'),
                        }),
                        body: update,
                    });

                    expect(status).toBe(200);
                    expect(UpdateResponseSchema.parse(body)).toBeTruthy();
                    expect(body.success).toBe(true);
                });

                await test.step('Read the category via GET /categories/tree/{categoryId}', async () => {
                    const { status, body } = await apiRequest<CategoryTree>({
                        method: 'GET',
                        url: fillPath(ApiEndpoints.CATEGORY_TREE, {
                            categoryId: required(category.id, 'category id'),
                        }),
                    });

                    expect(status).toBe(200);
                    expect(CategoryTreeSchema.parse(body)).toBeTruthy();
                    expect(body).toMatchObject(update);
                });
            }
        );

        for (const field of [...REQUIRED_FIELDS, 'parent_id'] as const) {
            test(
                `should return 200 when only ${field} is omitted`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { [field]: _omitted, ...payload } =
                        generateCategory();

                    const { status, body } = await apiRequest<UpdateResponse>({
                        method,
                        url: fillPath(ApiEndpoints.CATEGORY, {
                            categoryId: required(category.id, 'category id'),
                        }),
                        body: payload,
                    });

                    expect(status).toBe(200);
                    expect(UpdateResponseSchema.parse(body)).toBeTruthy();
                }
            );
        }

        for (const field of REQUIRED_FIELDS) {
            for (const invalidValue of INVALID_OPTIONAL_STRING_VALUES) {
                test(
                    `should return 422 when ${field} is ${JSON.stringify(invalidValue)}`,
                    { tag: '@api' },
                    async ({ apiRequest }) => {
                        const { status, body } =
                            await apiRequest<UnprocessableEntityResponse>({
                                method,
                                url: fillPath(ApiEndpoints.CATEGORY, {
                                    categoryId: required(
                                        category.id,
                                        'category id'
                                    ),
                                }),
                                body: {
                                    ...generateCategory(),
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

            test(
                `should return 422 when ${field} is longer than ${CatalogRules.NAME_AND_SLUG_MAX_LENGTH} characters`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method,
                            url: fillPath(ApiEndpoints.CATEGORY, {
                                categoryId: required(
                                    category.id,
                                    'category id'
                                ),
                            }),
                            body: { ...generateCategory(), [field]: TOO_LONG },
                        });

                    expect(status).toBe(422);
                    expect(
                        UnprocessableEntityResponseSchema.parse(body)
                    ).toBeTruthy();
                }
            );
        }

        for (const invalidValue of INVALID_PARENT_IDS) {
            test(
                `should return 422 when parent_id is ${JSON.stringify(invalidValue)}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method,
                            url: fillPath(ApiEndpoints.CATEGORY, {
                                categoryId: required(
                                    category.id,
                                    'category id'
                                ),
                            }),
                            body: {
                                ...generateCategory(),
                                parent_id: invalidValue,
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
            'should return 409 when the slug belongs to another category',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<DuplicateConflictResponse>({
                        method,
                        url: fillPath(ApiEndpoints.CATEGORY, {
                            categoryId: required(category.id, 'category id'),
                        }),
                        body: generateCategory({ slug: otherCategory.slug }),
                    });

                expect(status).toBe(409);
                expect(
                    DuplicateConflictResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );

        for (const { description, value } of INVALID_PATH_IDS) {
            test(
                `should return 404 for categoryId - ${description}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<ResourceNotFoundResponse>({
                            method,
                            url: fillPath(ApiEndpoints.CATEGORY, {
                                categoryId: value,
                            }),
                            body: generateCategory(),
                        });

                    expect(status).toBe(404);
                    expect(
                        ResourceNotFoundResponseSchema.parse(body)
                    ).toBeTruthy();
                }
            );
        }
    });
}

test.describe('DELETE /categories/{categoryId}', () => {
    test(
        'should return 204 when an admin deletes an unused category',
        { tag: '@api' },
        async ({ apiRequest }) => {
            let categoryId = '';

            await test.step('Create a category via POST /categories', async () => {
                const { status, body } = await apiRequest<Category>({
                    method: 'POST',
                    url: ApiEndpoints.CATEGORIES,
                    body: generateCategory(),
                });

                expect(status).toBe(201);
                expect(CategorySchema.parse(body)).toBeTruthy();
                categoryId = required(body.id, 'category id');
            });

            await test.step('Delete the category via DELETE /categories/{categoryId}', async () => {
                const { status, body } = await apiRequest<null>({
                    method: 'DELETE',
                    url: fillPath(ApiEndpoints.CATEGORY, { categoryId }),
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                });

                expect(status).toBe(204);
                expect(body).toBeNull();
            });

            await test.step('Check the category is gone via GET /categories/tree/{categoryId}', async () => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'GET',
                        url: fillPath(ApiEndpoints.CATEGORY_TREE, {
                            categoryId,
                        }),
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            });
        }
    );

    test.describe('with an existing category', () => {
        let category: Category;

        test.beforeAll(async ({ apiRequest }) => {
            category = await createCategory(apiRequest);
        });

        test.afterAll(async ({ apiRequest }) => {
            await deleteCategory(apiRequest, category.id);
        });

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    {
                        method: 'DELETE',
                        url: fillPath(ApiEndpoints.CATEGORY, {
                            categoryId: required(category.id, 'category id'),
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
                    url: fillPath(ApiEndpoints.CATEGORY, {
                        categoryId: required(category.id, 'category id'),
                    }),
                    headers: process.env.ACCESS_TOKEN,
                });

                expect(status).toBe(403);
                expect(ForbiddenResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });

    test.describe('with a category that has a sub-category', () => {
        let parent: Category;
        let child: Category;

        test.beforeAll(async ({ apiRequest }) => {
            parent = await createCategory(apiRequest);
            child = await createCategory(apiRequest, { parent_id: parent.id });
        });

        test.afterAll(async ({ apiRequest }) => {
            await deleteCategory(apiRequest, child.id);
            await deleteCategory(apiRequest, parent.id);
        });

        test(
            'should return 409 when the category has a sub-category',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ConflictResponse>({
                    method: 'DELETE',
                    url: fillPath(ApiEndpoints.CATEGORY, {
                        categoryId: required(parent.id, 'category id'),
                    }),
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                });

                expect(status).toBe(409);
                expect(ConflictResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });

    test.describe('with a category used by a product', () => {
        let brand: Brand;
        let category: Category;
        let product: Product;

        test.beforeAll(async ({ apiRequest }) => {
            brand = await createBrand(apiRequest);
            category = await createCategory(apiRequest);
            product = await createProduct(
                apiRequest,
                required(brand.id, 'brand id'),
                {
                    category_id: category.id,
                }
            );
        });

        test.afterAll(async ({ apiRequest }) => {
            await deleteProduct(apiRequest, product.id);
            await deleteCategory(apiRequest, category.id);
            await deleteBrand(apiRequest, brand.id);
        });

        test(
            'should return 409 when the category is used by a product',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ConflictResponse>({
                    method: 'DELETE',
                    url: fillPath(ApiEndpoints.CATEGORY, {
                        categoryId: required(category.id, 'category id'),
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
            `should return 404 for categoryId - ${description}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'DELETE',
                        url: fillPath(ApiEndpoints.CATEGORY, {
                            categoryId: value,
                        }),
                        headers: process.env.ADMIN_ACCESS_TOKEN,
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            }
        );
    }

    // FIXME: 422 is documented for DELETE /categories/{categoryId}; its only rule (`id` required) is always satisfied by the route.
    test.skip(
        'should return 422 when the category id is missing',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } =
                await apiRequest<UnprocessableEntityResponse>({
                    method: 'DELETE',
                    url: fillPath(ApiEndpoints.CATEGORY, { categoryId: '' }),
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                });

            expect(status).toBe(422);
            expect(UnprocessableEntityResponseSchema.parse(body)).toBeTruthy();
        }
    );
});
