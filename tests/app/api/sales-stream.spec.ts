import { ApiEndpoints } from '../../../enums/app/app';
import { SaleEventSchema } from '../../../fixtures/api/schemas/app/salesStreamSchema';
import { expect, test } from '../../../fixtures/pom/test-options';
import { parseSseEvents } from '../../../helpers/util/util';

/** Stream parameters: a few quick events, deterministic with a seed */
const STREAM = { limit: 3, interval: 100, seed: 42 } as const;

test.describe('GET /sales-stream', () => {
    test(
        'should return an SSE stream: open, the requested number of sales, end',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, headers, body } = await apiRequest<string>({
                method: 'GET',
                url: ApiEndpoints.SALES_STREAM,
                params: { ...STREAM },
            });

            // The contract types the body as a plain SSE string — there is no JSON schema to parse.
            expect(status).toBe(200);
            expect(headers['content-type']).toContain('text/event-stream');
            const events = parseSseEvents(body);
            expect(events.at(0)?.event).toBe('open');
            const sales = events.filter(({ event }) => event === 'sale');
            expect(sales).toHaveLength(STREAM.limit);
            for (const { data } of sales) {
                expect(
                    SaleEventSchema.parse(JSON.parse(data ?? ''))
                ).toBeTruthy();
            }
            expect(events.at(-1)?.event).toBe('end');
        }
    );

    test(
        'should return the same sales for the same seed',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const salesOf = async (): Promise<unknown[]> => {
                const { status, body } = await apiRequest<string>({
                    method: 'GET',
                    url: ApiEndpoints.SALES_STREAM,
                    params: { ...STREAM },
                });
                expect(status).toBe(200);
                return parseSseEvents(body)
                    .filter(({ event }) => event === 'sale')
                    .map(({ data }) => {
                        const { product_id, quantity } = SaleEventSchema.parse(
                            JSON.parse(data ?? '')
                        );
                        return { product_id, quantity };
                    });
            };

            const first = await test.step(
                'Read the stream via GET /sales-stream',
                salesOf
            );

            const second = await test.step(
                'Read the stream again via GET /sales-stream',
                salesOf
            );

            expect(second).toEqual(first);
        }
    );
});
