import { z } from 'zod/v4';
import type { output as zOutput } from 'zod/v4';

/*
 * Report schemas (`GET /reports/*`, admin only), built from the OpenAPI
 * contract. No `required` properties are listed, so every property is optional.
 */

export const TotalSalesPerCountrySchema = z.array(
    z.strictObject({
        billing_country: z.string().optional(),
        total_sales: z.string().optional(),
    })
);
export const TopPurchasedProductsSchema = z.array(
    z.strictObject({ name: z.string().optional(), count: z.int().optional() })
);
export const TopSellingCategoriesSchema = z.array(
    z.strictObject({
        category_name: z.string().optional(),
        total_earned: z.string().optional(),
    })
);
export const TotalSalesOfYearsSchema = z.array(
    z.strictObject({ year: z.int().optional(), total: z.number().optional() })
);
export const AverageSalesPerMonthSchema = z.array(
    z.strictObject({
        month: z.int().optional(),
        average: z.number().optional(),
        amount: z.number().optional(),
    })
);
export const AverageSalesPerWeekSchema = z.array(
    z.strictObject({
        week: z.int().optional(),
        average: z.number().optional(),
        amount: z.number().optional(),
    })
);
export const CustomersByCountrySchema = z.array(
    z.strictObject({
        amount: z.int().optional(),
        country: z.string().optional(),
    })
);

export type TotalSalesOfYears = zOutput<typeof TotalSalesOfYearsSchema>;
export type AverageSalesPerMonth = zOutput<typeof AverageSalesPerMonthSchema>;
export type AverageSalesPerWeek = zOutput<typeof AverageSalesPerWeekSchema>;
