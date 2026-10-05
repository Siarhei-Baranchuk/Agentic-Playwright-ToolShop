/* eslint-disable playwright/no-skipped-test -- documented contract gaps are kept as skipped tests with a FIXME */
import type { ZodType } from 'zod/v4';
import { ApiEndpoints } from '../../../enums/app/app';
import {
    AverageSalesPerMonth,
    AverageSalesPerMonthSchema,
    AverageSalesPerWeek,
    AverageSalesPerWeekSchema,
    CustomersByCountrySchema,
    TopPurchasedProductsSchema,
    TopSellingCategoriesSchema,
    TotalSalesOfYears,
    TotalSalesOfYearsSchema,
    TotalSalesPerCountrySchema,
} from '../../../fixtures/api/schemas/app/reportSchema';
import {
    ForbiddenResponse,
    ForbiddenResponseSchema,
    ItemNotFoundResponse,
    ItemNotFoundResponseSchema,
    UnauthorizedResponse,
    UnauthorizedResponseSchema,
} from '../../../fixtures/api/schemas/util/errorResponseSchema';
import { expect, test } from '../../../fixtures/pom/test-options';

const MONTHS_IN_YEAR = 12;
const WEEKS_IN_YEAR = 52;
const TOP_LIMIT = 10;

const REPORTS: { endpoint: ApiEndpoints; schema: ZodType }[] = [
    {
        endpoint: ApiEndpoints.REPORT_TOTAL_SALES_PER_COUNTRY,
        schema: TotalSalesPerCountrySchema,
    },
    {
        endpoint: ApiEndpoints.REPORT_TOP10_PURCHASED_PRODUCTS,
        schema: TopPurchasedProductsSchema,
    },
    {
        endpoint: ApiEndpoints.REPORT_TOP10_BEST_SELLING_CATEGORIES,
        schema: TopSellingCategoriesSchema,
    },
    {
        endpoint: ApiEndpoints.REPORT_TOTAL_SALES_OF_YEARS,
        schema: TotalSalesOfYearsSchema,
    },
    {
        endpoint: ApiEndpoints.REPORT_AVERAGE_SALES_PER_MONTH,
        schema: AverageSalesPerMonthSchema,
    },
    {
        endpoint: ApiEndpoints.REPORT_AVERAGE_SALES_PER_WEEK,
        schema: AverageSalesPerWeekSchema,
    },
    {
        endpoint: ApiEndpoints.REPORT_CUSTOMERS_BY_COUNTRY,
        schema: CustomersByCountrySchema,
    },
];

for (const { endpoint, schema } of REPORTS) {
    test.describe(`GET ${endpoint}`, () => {
        // FIXME: users registered without an address are reported with country = null; the contract types it as string. See docs/test-plan.md, defect #25.
        const countryIsNull =
            endpoint === ApiEndpoints.REPORT_CUSTOMERS_BY_COUNTRY;

        test(
            'should return 200 and the report for the admin',
            { tag: '@api' },
            async ({ apiRequest }) => {
                test.skip(
                    countryIsNull,
                    'FIXME: country = null — docs/test-plan.md, defect #25'
                );
                const { status, body } = await apiRequest<unknown[]>({
                    method: 'GET',
                    url: endpoint,
                    headers: process.env.ADMIN_ACCESS_TOKEN,
                });

                expect(status).toBe(200);
                expect(schema.parse(body)).toBeTruthy();
            }
        );

        test(
            'should return 401 without an access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<UnauthorizedResponse>(
                    { method: 'GET', url: endpoint }
                );

                expect(status).toBe(401);
                expect(UnauthorizedResponseSchema.parse(body)).toBeTruthy();
            }
        );

        // 403 is not documented for reports; they are restricted to the admin role.
        test(
            'should return 403 for a customer access token',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ForbiddenResponse>({
                    method: 'GET',
                    url: endpoint,
                    headers: process.env.ACCESS_TOKEN,
                });

                expect(status).toBe(403);
                expect(ForbiddenResponseSchema.parse(body)).toBeTruthy();
            }
        );

        // FIXME: 404 "Requested item not found" is documented for every report, but an empty report answers 200 [].
        test.skip(
            'should return 404 when the report is not available',
            { tag: '@api' },
            async ({ apiRequest }) => {
                const { status, body } = await apiRequest<ItemNotFoundResponse>(
                    {
                        method: 'GET',
                        url: endpoint,
                        headers: process.env.ADMIN_ACCESS_TOKEN,
                    }
                );

                expect(status).toBe(404);
                expect(ItemNotFoundResponseSchema.parse(body)).toBeTruthy();
            }
        );
    });
}

test.describe('report parameters', () => {
    test(
        'should return one entry per year for the last `years` years plus the current one',
        { tag: '@api' },
        async ({ apiRequest }) => {
            const years = 3;
            const { status, body } = await apiRequest<TotalSalesOfYears>({
                method: 'GET',
                url: ApiEndpoints.REPORT_TOTAL_SALES_OF_YEARS,
                headers: process.env.ADMIN_ACCESS_TOKEN,
                params: { years },
            });

            expect(status).toBe(200);
            expect(TotalSalesOfYearsSchema.parse(body)).toBeTruthy();
            const currentYear = new Date().getFullYear();
            expect(body.map(({ year }) => year)).toEqual(
                Array.from(
                    { length: years + 1 },
                    (_, index) => currentYear - years + index
                )
            );
        }
    );

    test(
        `should return ${MONTHS_IN_YEAR} monthly averages for a year`,
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<AverageSalesPerMonth>({
                method: 'GET',
                url: ApiEndpoints.REPORT_AVERAGE_SALES_PER_MONTH,
                headers: process.env.ADMIN_ACCESS_TOKEN,
                params: { year: new Date().getFullYear() },
            });

            expect(status).toBe(200);
            expect(AverageSalesPerMonthSchema.parse(body)).toBeTruthy();
            expect(body.map(({ month }) => month)).toEqual(
                Array.from({ length: MONTHS_IN_YEAR }, (_, index) => index + 1)
            );
        }
    );

    test(
        `should return ${WEEKS_IN_YEAR} weekly averages for a year`,
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<AverageSalesPerWeek>({
                method: 'GET',
                url: ApiEndpoints.REPORT_AVERAGE_SALES_PER_WEEK,
                headers: process.env.ADMIN_ACCESS_TOKEN,
                params: { year: new Date().getFullYear() },
            });

            expect(status).toBe(200);
            expect(AverageSalesPerWeekSchema.parse(body)).toBeTruthy();
            expect(body).toHaveLength(WEEKS_IN_YEAR);
        }
    );

    test(
        `should return at most ${TOP_LIMIT} top products, most purchased first`,
        { tag: '@api' },
        async ({ apiRequest }) => {
            const { status, body } = await apiRequest<
                { name?: string; count?: number }[]
            >({
                method: 'GET',
                url: ApiEndpoints.REPORT_TOP10_PURCHASED_PRODUCTS,
                headers: process.env.ADMIN_ACCESS_TOKEN,
            });

            expect(status).toBe(200);
            expect(TopPurchasedProductsSchema.parse(body)).toBeTruthy();
            expect(body.length).toBeLessThanOrEqual(TOP_LIMIT);
            const counts = body.map(({ count }) => count ?? 0);
            expect(counts).toEqual([...counts].sort((a, b) => b - a));
        }
    );
});
