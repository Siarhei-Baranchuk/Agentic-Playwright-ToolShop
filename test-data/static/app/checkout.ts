/**
 * Checkout reference data, taken from the backend source.
 *
 * - `VALID_POSTCODE` — a country + postcode the postcode lookup resolves;
 *   invoices must use the city / state it returns (AddressMatchesCountry rule).
 * - `MISMATCHED_POSTCODE` — a postcode whose format does not fit the country.
 * - `GEO_DISCOUNT_LOCATIONS` — cart coordinates that earn a location discount
 *   on location-offer products (CartService::calculateDiscountPercentage).
 * - `NO_DISCOUNT_LOCATION` — coordinates far from every discount city.
 *
 * Format: `.ts` with `as const` exports — literal values only.
 */

export const VALID_POSTCODE = {
    country: 'NL',
    postcode: '1011AB',
    house_number: '1',
} as const;

export const MISMATCHED_POSTCODE = {
    country: 'AT',
    postcode: '1011AB',
} as const;

export const GEO_DISCOUNT_LOCATIONS = [
    { city: 'New York', lat: 41, lng: 74, discount: 5 },
    { city: 'Mumbai', lat: 19, lng: 73, discount: 10 },
    { city: 'Tokyo', lat: 35, lng: 139, discount: 15 },
    { city: 'Amsterdam', lat: 52, lng: 5, discount: 20 },
    { city: 'London', lat: 51, lng: 0, discount: 25 },
] as const;

export const NO_DISCOUNT_LOCATION = { lat: -45, lng: -120 } as const;
