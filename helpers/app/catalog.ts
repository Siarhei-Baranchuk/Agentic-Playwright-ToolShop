import { expect } from '@playwright/test';
import { ApiEndpoints } from '../../enums/app/app';
import type { ApiRequestFn } from '../../fixtures/api/api-types';
import {
    Brand,
    BrandRequest,
    BrandSchema,
} from '../../fixtures/api/schemas/app/brandSchema';
import {
    Category,
    CategoryList,
    CategoryListSchema,
    CategoryRequest,
    CategorySchema,
} from '../../fixtures/api/schemas/app/categorySchema';
import {
    ImageList,
    ImageListSchema,
} from '../../fixtures/api/schemas/app/imageSchema';
import {
    PaginatedProducts,
    Product,
    ProductRequest,
    ProductSchema,
} from '../../fixtures/api/schemas/app/productSchema';
import {
    generateBrand,
    generateCategory,
    generateProduct,
} from '../../test-data/factories/app/catalog.factory';
import { fillPath, required } from '../util/util';

/*
 * Catalog seeding helpers for API setup / teardown (beforeAll / afterAll).
 * Every created record gets unique Faker data; delete it again with the
 * matching `delete*` helper, which uses the admin token.
 */

/**
 * Creates a brand via `POST /brands`.
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @param {Partial<BrandRequest>} overrides - Optional payload overrides.
 * @returns {Promise<Brand>} The created brand.
 */
export async function createBrand(
    apiRequest: ApiRequestFn,
    overrides?: Partial<BrandRequest>
): Promise<Brand> {
    const { status, body } = await apiRequest<Brand>({
        method: 'POST',
        url: ApiEndpoints.BRANDS,
        body: generateBrand(overrides),
    });
    expect(status).toBe(201);
    expect(BrandSchema.parse(body)).toBeTruthy();
    return body;
}

/**
 * Deletes a brand via `DELETE /brands/{brandId}` as the admin.
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @param {string | undefined} brandId - Id of the brand to delete.
 * @returns {Promise<void>} Resolves when the request completes.
 */
export async function deleteBrand(
    apiRequest: ApiRequestFn,
    brandId: string | undefined
): Promise<void> {
    await apiRequest({
        method: 'DELETE',
        url: fillPath(ApiEndpoints.BRAND, {
            brandId: required(brandId, 'brand id'),
        }),
        headers: process.env.ADMIN_ACCESS_TOKEN,
    });
}

/**
 * Creates a category via `POST /categories`.
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @param {Partial<CategoryRequest>} overrides - Optional payload overrides (e.g. `parent_id`).
 * @returns {Promise<Category>} The created category.
 */
export async function createCategory(
    apiRequest: ApiRequestFn,
    overrides?: Partial<CategoryRequest>
): Promise<Category> {
    const { status, body } = await apiRequest<Category>({
        method: 'POST',
        url: ApiEndpoints.CATEGORIES,
        body: generateCategory(overrides),
    });
    expect(status).toBe(201);
    expect(CategorySchema.parse(body)).toBeTruthy();
    return body;
}

/**
 * Deletes a category via `DELETE /categories/{categoryId}` as the admin.
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @param {string | undefined} categoryId - Id of the category to delete.
 * @returns {Promise<void>} Resolves when the request completes.
 */
export async function deleteCategory(
    apiRequest: ApiRequestFn,
    categoryId: string | undefined
): Promise<void> {
    await apiRequest({
        method: 'DELETE',
        url: fillPath(ApiEndpoints.CATEGORY, {
            categoryId: required(categoryId, 'category id'),
        }),
        headers: process.env.ADMIN_ACCESS_TOKEN,
    });
}

/**
 * Returns ids of an existing category and product image, which a new
 * product must reference.
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @returns {Promise<{ categoryId: string; imageId: string }>} Existing ids.
 */
export async function getProductReferences(
    apiRequest: ApiRequestFn
): Promise<{ categoryId: string; imageId: string }> {
    const categories = await apiRequest<CategoryList>({
        method: 'GET',
        url: ApiEndpoints.CATEGORIES,
    });
    expect(categories.status).toBe(200);
    expect(CategoryListSchema.parse(categories.body)).toBeTruthy();

    const images = await apiRequest<ImageList>({
        method: 'GET',
        url: ApiEndpoints.IMAGES,
    });
    expect(images.status).toBe(200);
    expect(ImageListSchema.parse(images.body)).toBeTruthy();

    return {
        categoryId: required(categories.body.at(0)?.id, 'category id'),
        imageId: required(images.body.at(0)?.id, 'image id'),
    };
}

/**
 * Creates a product via `POST /products`. Unless overridden, it uses the
 * given brand and the first existing category and image.
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @param {string} brandId - Id of the brand the product belongs to.
 * @param {Partial<ProductRequest>} overrides - Optional payload overrides.
 * @returns {Promise<Product>} The created product.
 */
export async function createProduct(
    apiRequest: ApiRequestFn,
    brandId: string,
    overrides?: Partial<ProductRequest>
): Promise<Product> {
    const { categoryId, imageId } = await getProductReferences(apiRequest);

    const { status, body } = await apiRequest<Product>({
        method: 'POST',
        url: ApiEndpoints.PRODUCTS,
        body: generateProduct(
            {
                brand_id: brandId,
                category_id: categoryId,
                product_image_id: imageId,
            },
            overrides
        ),
    });
    // The spec documents 200 for POST /products; the API answers 201 Created.
    expect(status).toBe(201);
    expect(ProductSchema.parse(body)).toBeTruthy();
    return body;
}

/**
 * Deletes a product via `DELETE /products/{productId}` as the admin.
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @param {string | undefined} productId - Id of the product to delete.
 * @returns {Promise<void>} Resolves when the request completes.
 */
export async function deleteProduct(
    apiRequest: ApiRequestFn,
    productId: string | undefined
): Promise<void> {
    await apiRequest({
        method: 'DELETE',
        url: fillPath(ApiEndpoints.PRODUCT, {
            productId: required(productId, 'product id'),
        }),
        headers: process.env.ADMIN_ACCESS_TOKEN,
    });
}

/**
 * Deletes every product (rental and non-rental) of a test-owned brand as
 * the admin. Use it before `deleteBrand` in `afterAll` of describes whose
 * negative tests might create products when the API wrongly accepts a
 * payload — it keeps the shared demo data clean even then.
 *
 * @param {ApiRequestFn} apiRequest - The `apiRequest` fixture.
 * @param {string | undefined} brandId - Id of the test-owned brand.
 * @returns {Promise<void>} Resolves when all products are deleted.
 */
export async function deleteProductsOfBrand(
    apiRequest: ApiRequestFn,
    brandId: string | undefined
): Promise<void> {
    for (const isRental of ['false', 'true']) {
        const { status, body } = await apiRequest<PaginatedProducts>({
            method: 'GET',
            url: ApiEndpoints.PRODUCTS,
            params: {
                by_brand: required(brandId, 'brand id'),
                is_rental: isRental,
            },
        });
        // Cleanup only: no schema check here — an empty page carries
        // `from` / `to` = null against the contract (docs/test-plan.md, defect #12),
        // which products.spec.ts covers with its own FIXME test.
        expect(status).toBe(200);

        for (const { id } of body.data ?? []) {
            await deleteProduct(apiRequest, id);
        }
    }
}
