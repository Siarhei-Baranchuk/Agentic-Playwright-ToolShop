# Per-Field Negative Testing — Patterns and Three-Tier Data Rule

Long-form examples + invalid-value reference for `api-testing/SKILL.md` Phase 6. The Critical rules and the priority model stay inline in `SKILL.md`; this file holds the per-field patterns, the universal `INVALID_*` constants table, and the three-tier rule for _where_ invalid arrays live.

**Guiding rule: one test per validation branch.** A second value that hits the same rule (e.g. `true` next to `123` for a `string` field) finds the same defects and only adds run time — do not write it.

## Type-specific invalid values (universal arrays)

Universal type-mismatch sets live as `as const` exports in `test-data/static/util/invalid-values.ts` and **must** be imported — never redefined inline. Each array holds one value per validation branch: a value of the wrong type, plus `null` (the required / nullable branch). Omission (`undefined`) is covered by the per-field "missing" tests, not by these arrays.

| Field Type        | POST loop (`for...of`)   | Values                    | PUT / PATCH (one test)           |
| ----------------- | ------------------------ | ------------------------- | -------------------------------- |
| `string`          | `INVALID_STRING_VALUES`  | `[123, null]`             | `PRIMARY_INVALID_VALUES.STRING`  |
| `string` (uuid)   | `INVALID_UUID_VALUES`    | `['not-a-uuid', null]`    | `PRIMARY_INVALID_VALUES.UUID`    |
| `number`          | `INVALID_NUMBER_VALUES`  | `['string', '123', null]` | `PRIMARY_INVALID_VALUES.NUMBER`  |
| `boolean`         | `INVALID_BOOLEAN_VALUES` | `['yes', null]`           | `PRIMARY_INVALID_VALUES.BOOLEAN` |
| `enum`            | `INVALID_ENUM_VALUES`    | `['invalidValue', null]`  | `PRIMARY_INVALID_VALUES.ENUM`    |
| `array`           | `INVALID_ARRAY_VALUES`   | `['string', null]`        | `PRIMARY_INVALID_VALUES.ARRAY`   |
| `object` (nested) | `INVALID_OBJECT_VALUES`  | `['string', null]`        | `PRIMARY_INVALID_VALUES.OBJECT`  |

`'123'` stays in the number set on purpose: a numeric string passes lenient validators (Laravel `numeric`), which is a separate branch.

For a field whose contract allows `null` (`nullable`), filter it out inline: `INVALID_STRING_VALUES.filter((value) => value !== null)`.

For `string` (email) fields, combine `INVALID_STRING_VALUES` (type mismatch) with domain-specific email-format violations from `test-data/static/{area}/` — two separate `for...of` loops.

## Pattern: `for...of` with spread-and-override

Used on **POST** (create). A valid payload is the base; one field at a time is overridden with invalid values, which isolates the field under test:

```typescript
import { generateProduct } from '../../../test-data/factories/app/product.factory';
import {
    UnprocessableEntityResponse,
    UnprocessableEntityResponseSchema,
} from '../../../fixtures/api/schemas/util/errorResponseSchema';
import {
    INVALID_NUMBER_VALUES,
    INVALID_STRING_VALUES,
} from '../../../test-data/static/util/invalid-values';

test.describe('POST /products - validation', () => {
    for (const invalidValue of INVALID_STRING_VALUES) {
        test(
            `should return 422 when name is ${JSON.stringify(invalidValue)}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.PRODUCTS,
                        headers: process.env.ACCESS_TOKEN,
                        body: { ...generateProduct(), name: invalidValue },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    }

    for (const invalidValue of INVALID_NUMBER_VALUES) {
        test(
            `should return 422 when price is ${JSON.stringify(invalidValue)}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.PRODUCTS,
                        headers: process.env.ACCESS_TOKEN,
                        body: { ...generateProduct(), price: invalidValue },
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    }

    // Inline is acceptable here: a boundary of exactly one field.
    // Boundaries are tested on POST only — PUT/PATCH share the same limits.
    test(
        'should return 422 when name is longer than 120 characters',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } =
                await apiRequest<UnprocessableEntityResponse>({
                    method: 'POST',
                    url: ApiEndpoints.PRODUCTS,
                    headers: process.env.ACCESS_TOKEN,
                    body: { ...generateProduct(), name: 'a'.repeat(121) },
                });

            expect(status).toBe(422);
            expect(UnprocessableEntityResponseSchema.parse(body)).toBeTruthy();
        }
    );
});
```

## Pattern: omitting required fields

Used on **POST**. Each required field is omitted once, via destructure + rest:

```typescript
test.describe('POST /products - missing required fields', () => {
    const requiredFields = ['name', 'price', 'category_id'] as const;

    for (const field of requiredFields) {
        test(
            `should return 422 when ${field} is missing`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { [field]: _omitted, ...payload } = generateProduct();

                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'POST',
                        url: ApiEndpoints.PRODUCTS,
                        headers: process.env.ACCESS_TOKEN,
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
});
```

## Pattern: PUT / PATCH — one primary value per field

On **PUT / PATCH** the same validation rules usually apply, so each field gets **one** wrong-type test with its `PRIMARY_INVALID_VALUES` entry, and the endpoint gets **one** partial-update test (instead of one omission test per field):

```typescript
import { PRIMARY_INVALID_VALUES } from '../../../test-data/static/util/invalid-values';

for (const method of ['PUT', 'PATCH'] as const) {
    test.describe(`${method} /products/{productId}`, () => {
        test(
            'should return 200 for a partial update',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UpdateResponse>({
                    method,
                    url: fillPath(ApiEndpoints.PRODUCT, { productId }),
                    body: { name: generateProduct().name },
                });

                expect(status).toBe(200);
                expect(UpdateResponseSchema.parse(body)).toBeTruthy();
            }
        );

        for (const { field, value } of [
            { field: 'name', value: PRIMARY_INVALID_VALUES.STRING },
            { field: 'price', value: PRIMARY_INVALID_VALUES.NUMBER },
            { field: 'is_rental', value: PRIMARY_INVALID_VALUES.BOOLEAN },
        ] as const) {
            test(
                `should return 422 when ${field} is ${JSON.stringify(value)}`,
                { tag: '@api' },
                async ({ apiRequest }) => {
                    const { status, body } =
                        await apiRequest<UnprocessableEntityResponse>({
                            method,
                            url: fillPath(ApiEndpoints.PRODUCT, { productId }),
                            body: { ...generateProduct(), [field]: value },
                        });

                    expect(status).toBe(422);
                    expect(
                        UnprocessableEntityResponseSchema.parse(body)
                    ).toBeTruthy();
                }
            );
        }
    });
}
```

## Pattern: path parameter validation

For every endpoint with a path parameter (e.g., `/products/{productId}`), loop over `INVALID_PATH_IDS` from `test-data/static/util/invalid-path-params.ts` — a well-formed id that does not exist and a malformed one:

```typescript
import { INVALID_PATH_IDS } from '../../../test-data/static/util/invalid-path-params';

for (const { description, value } of INVALID_PATH_IDS) {
    test(
        `should return 404 for productId - ${description}`,
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<ItemNotFoundResponse>({
                method: 'GET',
                url: fillPath(ApiEndpoints.PRODUCT, { productId: value }),
            });

            expect(status).toBe(404);
            expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
        }
    );
}
```

This is **not optional**. Every path parameter needs these tests regardless of whether the OpenAPI spec mentions them.

## Three-tier rule — where invalid-value arrays live

1. **Universal type-mismatch arrays** (values that are wrong for any field of a given primitive type) — **must** live in `test-data/static/util/invalid-values.ts` as exported `as const` tuples (`INVALID_STRING_VALUES`, `INVALID_NUMBER_VALUES`, `INVALID_BOOLEAN_VALUES`, `INVALID_UUID_VALUES`, `INVALID_ENUM_VALUES`, `INVALID_ARRAY_VALUES`, `INVALID_OBJECT_VALUES`) plus the `PRIMARY_INVALID_VALUES` object. Path-parameter values live in `test-data/static/util/invalid-path-params.ts` (`INVALID_PATH_IDS`). Spec files import and iterate — **never** redefine inline.
2. **Domain-specific curated invalid values** (invalid email formats, password policy violations, invalid slugs, etc.) — live under `test-data/static/{area}/` as `.ts` with `as const` exports, following the existing `invalidCredentials.ts` precedent. Keep them minimal too: one value per rule they violate. Also imported, never inline. Never `.json`.
3. **Field-specific boundary / constraint values** (e.g., the `max + 1` length of one field) — **may stay inline** in the spec file when the value is meaningful to exactly one field. If the same boundary set is needed in 2+ fields or spec files, promote it to static data.

A single validation describe typically combines tier 1 and tier 3 in separate `for...of` loops: one iterating `INVALID_NUMBER_VALUES` for type mismatch, another covering the field's range boundary.
