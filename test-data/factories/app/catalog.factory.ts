import { faker } from '@faker-js/faker';
import {
    BrandRequest,
    BrandRequestSchema,
} from '../../../fixtures/api/schemas/app/brandSchema';
import {
    CategoryRequest,
    CategoryRequestSchema,
} from '../../../fixtures/api/schemas/app/categorySchema';
import {
    ProductRequest,
    ProductRequestSchema,
} from '../../../fixtures/api/schemas/app/productSchema';
import {
    ProductSpecRequest,
    ProductSpecRequestSchema,
} from '../../../fixtures/api/schemas/app/productSpecSchema';
import { Co2Ratings } from '../../../enums/app/app';

/**
 * Generates a unique slug (letters, digits and hyphens — the backend
 * `alpha_dash:ascii` rule). The random suffix keeps parallel tests apart,
 * since slugs of brands and categories must be unique.
 *
 * @returns {string} A unique, valid slug.
 */
export const generateSlug = (): string =>
    `${faker.lorem.slug(2)}-${faker.string.alphanumeric({ length: 10, casing: 'lower' })}`;

/**
 * Generates a unique lowercase word to use as a searchable name and as the
 * search query. The catalog search is FULLTEXT (terms of 4+ characters)
 * and caches results per query, so a fresh word keeps searches exact.
 *
 * @returns {string} A 12-letter random word.
 */
export const generateSearchToken = (): string =>
    faker.string.alpha({ length: 12, casing: 'lower' });

/**
 * Generates a valid brand payload (`BrandRequest`) for POST / PUT `/brands`.
 *
 * @param {Partial<BrandRequest>} overrides - Optional fields to override the generated values.
 * @returns {BrandRequest} A valid payload matching `BrandRequestSchema`.
 *
 * @example
 * const brand = generateBrand();
 */
export const generateBrand = (
    overrides?: Partial<BrandRequest>
): BrandRequest => {
    const defaults: BrandRequest = {
        name: faker.company.name(),
        slug: generateSlug(),
    };

    return BrandRequestSchema.parse({ ...defaults, ...overrides });
};

/**
 * Generates a valid category payload (`CategoryRequest`) for POST / PUT `/categories`.
 * The category is top-level unless `parent_id` is overridden.
 *
 * @param {Partial<CategoryRequest>} overrides - Optional fields to override the generated values.
 * @returns {CategoryRequest} A valid payload matching `CategoryRequestSchema`.
 *
 * @example
 * const child = generateCategory({ parent_id: parent.id });
 */
export const generateCategory = (
    overrides?: Partial<CategoryRequest>
): CategoryRequest => {
    const defaults: CategoryRequest = {
        name: faker.commerce.department(),
        slug: generateSlug(),
        parent_id: null,
    };

    return CategoryRequestSchema.parse({ ...defaults, ...overrides });
};

/**
 * Generates a valid product payload (`ProductRequest`) for POST / PUT `/products`.
 * Brand, category and image must reference existing records, so they are
 * passed in by the caller.
 *
 * @param {object} refs - Ids of existing records the product points to.
 * @param {string} refs.category_id - Existing category id.
 * @param {string} refs.brand_id - Existing brand id.
 * @param {string} refs.product_image_id - Existing image id.
 * @param {Partial<ProductRequest>} overrides - Optional fields to override the generated values.
 * @returns {ProductRequest} A valid payload matching `ProductRequestSchema`.
 *
 * @example
 * const product = generateProduct({ category_id, brand_id, product_image_id });
 */
export const generateProduct = (
    refs: Required<
        Pick<ProductRequest, 'category_id' | 'brand_id' | 'product_image_id'>
    >,
    overrides?: Partial<ProductRequest>
): ProductRequest => {
    const defaults: ProductRequest = {
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: faker.number.float({ min: 1, max: 500, fractionDigits: 2 }),
        is_location_offer: false,
        is_rental: false,
        co2_rating: faker.helpers.enumValue(Co2Ratings),
        ...refs,
    };

    return ProductRequestSchema.parse({ ...defaults, ...overrides });
};

/**
 * Generates a valid product spec payload for `POST /products/{productId}/specs`.
 *
 * @param {Partial<ProductSpecRequest>} overrides - Optional fields to override the generated values.
 * @returns {ProductSpecRequest} A valid payload matching `ProductSpecRequestSchema`.
 *
 * @example
 * const spec = generateProductSpec({ spec_unit: null });
 */
export const generateProductSpec = (
    overrides?: Partial<ProductSpecRequest>
): ProductSpecRequest => {
    const defaults: ProductSpecRequest = {
        spec_name: faker.commerce.productMaterial(),
        spec_value: String(
            faker.number.float({ min: 0.1, max: 99, fractionDigits: 1 })
        ),
        spec_unit: faker.helpers.arrayElement(['kg', 'mm', 'cm', 'W', 'V']),
    };

    return ProductSpecRequestSchema.parse({ ...defaults, ...overrides });
};
