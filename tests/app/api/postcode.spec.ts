/* eslint-disable playwright/no-skipped-test -- documented contract gaps are kept as skipped tests with a FIXME */
import { ApiEndpoints, ApiMessages } from '../../../enums/app/app';
import {
    PostcodeLookup,
    PostcodeLookupSchema,
} from '../../../fixtures/api/schemas/app/postcodeSchema';
import {
    MessageResponse,
    MessageResponseSchema,
    MethodNotAllowedResponse,
    MethodNotAllowedResponseSchema,
    UnprocessableEntityResponse,
    UnprocessableEntityResponseSchema,
} from '../../../fixtures/api/schemas/util/errorResponseSchema';
import { expect, test } from '../../../fixtures/pom/test-options';
import {
    MISMATCHED_POSTCODE,
    VALID_POSTCODE,
} from '../../../test-data/static/app/checkout';

test.describe('GET /postcode-lookup', () => {
    test(
        'should return 200 and the address for a postcode and house number',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<PostcodeLookup>({
                method: 'GET',
                url: ApiEndpoints.POSTCODE_LOOKUP,
                params: { ...VALID_POSTCODE },
            });

            expect(status).toBe(200);
            expect(PostcodeLookupSchema.parse(body)).toBeTruthy();
            expect(body).toMatchObject({
                country: VALID_POSTCODE.country,
                postcode: VALID_POSTCODE.postcode,
                house_number: VALID_POSTCODE.house_number,
            });
            expect(body.city).toBeTruthy();
        }
    );

    test(
        'should return 200 without the optional house number',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { country, postcode } = VALID_POSTCODE;

            const { status, body } = await apiRequest<PostcodeLookup>({
                method: 'GET',
                url: ApiEndpoints.POSTCODE_LOOKUP,
                params: { country, postcode },
            });

            expect(status).toBe(200);
            expect(PostcodeLookupSchema.parse(body)).toBeTruthy();
        }
    );

    test(
        'should return 422 when the postcode does not fit the country',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<MessageResponse>({
                method: 'GET',
                url: ApiEndpoints.POSTCODE_LOOKUP,
                params: { ...MISMATCHED_POSTCODE },
            });

            expect(status).toBe(422);
            expect(MessageResponseSchema.parse(body)).toBeTruthy();
            expect(body.message).toBe(ApiMessages.POSTCODE_FORMAT_INVALID);
        }
    );

    // FIXME: validation errors of the postcode lookup answer 404 "Resource not found" instead of 422. See docs/test-plan.md, defect #13.
    for (const { name, params } of [
        {
            name: 'country is missing',
            params: { postcode: VALID_POSTCODE.postcode },
        },
        {
            name: 'postcode is missing',
            params: { country: VALID_POSTCODE.country },
        },
        {
            name: 'postcode is longer than 10 characters',
            params: {
                country: VALID_POSTCODE.country,
                postcode: '1'.repeat(11),
            },
        },
    ]) {
        test.skip(
            `should return 422 when ${name}`,
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } =
                    await apiRequest<UnprocessableEntityResponse>({
                        method: 'GET',
                        url: ApiEndpoints.POSTCODE_LOOKUP,
                        params,
                    });

                expect(status).toBe(422);
                expect(
                    UnprocessableEntityResponseSchema.parse(body)
                ).toBeTruthy();
            }
        );
    }

    // FIXME: 502 "Upstream lookup failure" is documented, but the upstream service cannot be made to fail from a test.
    test.skip(
        'should return 502 when the upstream lookup fails',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status } = await apiRequest({
                method: 'GET',
                url: ApiEndpoints.POSTCODE_LOOKUP,
                params: { ...VALID_POSTCODE },
            });

            expect(status).toBe(502);
        }
    );

    test(
        'should return 405 for an unsupported method on /postcode-lookup',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<MethodNotAllowedResponse>(
                {
                    method: 'POST',
                    url: ApiEndpoints.POSTCODE_LOOKUP,
                    body: { ...VALID_POSTCODE },
                }
            );

            expect(status).toBe(405);
            expect(MethodNotAllowedResponseSchema.parse(body)).toBeTruthy();
        }
    );
});
