/* eslint-disable playwright/no-skipped-test -- documented contract gaps are kept as skipped tests with a FIXME */
import { ApiEndpoints } from '../../../enums/app/app';
import {
    ImageList,
    ImageListSchema,
} from '../../../fixtures/api/schemas/app/imageSchema';
import {
    ItemNotFoundResponse,
    ItemNotFoundResponseSchema,
    MethodNotAllowedResponse,
    MethodNotAllowedResponseSchema,
} from '../../../fixtures/api/schemas/util/errorResponseSchema';
import { expect, test } from '../../../fixtures/pom/test-options';

test.describe('GET /images', () => {
    test(
        'should return 200 and the list of product images',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<ImageList>({
                method: 'GET',
                url: ApiEndpoints.IMAGES,
            });

            expect(status).toBe(200);
            expect(ImageListSchema.parse(body)).toBeTruthy();
            expect(body.length).toBeGreaterThan(0);
            const ids = body.map(({ id }) => id);
            expect(new Set(ids).size).toBe(ids.length);
        }
    );

    // FIXME: 404 "Requested item not found" is documented for the image list, but there is no way to make the list unavailable.
    test.skip(
        'should return 404 when the image list is not available',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<ItemNotFoundResponse>({
                method: 'GET',
                url: ApiEndpoints.IMAGES,
            });

            expect(status).toBe(404);
            expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
        }
    );

    test(
        'should return 405 for an unsupported method on /images',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<MethodNotAllowedResponse>(
                {
                    method: 'POST',
                    url: ApiEndpoints.IMAGES,
                }
            );

            expect(status).toBe(405);
            expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
        }
    );
});
