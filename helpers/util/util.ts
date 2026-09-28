/**
 * Formats a date as a long US-English string, e.g. "January 5, 2026".
 *
 * @param {number | string} value - A timestamp or any string `Date` can parse.
 * @returns {string} The formatted date.
 *
 * @example
 * ```ts
 * formatDate('2026-01-05'); // "January 5, 2026"
 * ```
 */
export function formatDate(value: number | string): string {
    return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * Fills the placeholders of a route or endpoint template with values.
 * Supports both placeholder styles used in `enums/`: `{name}` (OpenAPI)
 * and `:name` (Angular router). Values are URI-encoded.
 *
 * @param {string} template - Path with placeholders, e.g. `ApiEndpoints.PRODUCT`.
 * @param {Record<string, string | number>} params - Placeholder name → value.
 * @returns {string} The path with every placeholder replaced.
 * @throws {Error} When a placeholder in the template has no value in `params`.
 *
 * @example
 * ```ts
 * fillPath(ApiEndpoints.PRODUCT, { productId: '01ABC' }); // "/products/01ABC"
 * fillPath(AppRoutes.PRODUCT, { id: '01ABC' }); // "/product/01ABC"
 * ```
 */
export function fillPath(
    template: string,
    params: Record<string, string | number>
): string {
    return template.replace(
        /\{(\w+)\}|:(\w+)/g,
        (placeholder: string, braced?: string, colon?: string): string => {
            const name = braced ?? colon ?? '';
            const value = params[name];
            if (value === undefined) {
                throw new Error(
                    `fillPath: no value for "${placeholder}" in "${template}"`
                );
            }
            return encodeURIComponent(String(value));
        }
    );
}
