import type { APIRequestContext } from '@playwright/test';
import type { ApiRequestParams } from './api-types';
import { appConfig } from '../../config/app';

/**
 * Simplified helper for making API requests and returning the status, parsed body and headers.
 * This helper automatically performs the request based on the provided method, URL, body, and headers.
 *
 * @param {Object} params - The parameters for the request.
 * @param {APIRequestContext} params.request - The Playwright request object, used to make the HTTP request.
 * @param {string} params.method - The HTTP method to use (POST, GET, PUT, DELETE, PATCH, QUERY).
 * @param {string} params.url - The URL to send the request to.
 * @param {string} [params.baseUrl] - The base URL to prepend to the request URL. Defaults to `API_URL`
 *   (`appConfig.apiUrl`); ignored when `url` is already absolute (`http(s)://...`).
 * @param {Record<string, unknown> | string | null} [params.body=null] - The body to send with the request;
 *   a string is sent as-is.
 * @param {Record<string, string | number | boolean>} [params.params] - Query string parameters.
 * @param {Record<string, string | MultipartFile>} [params.multipart] - multipart/form-data fields.
 *   Playwright sets the multipart Content-Type (with boundary) itself; `body` is ignored.
 * @param {string} [params.contentType='application/json'] - Content-Type of the request body.
 * @param {string} [params.headers] - Authentication token for the Authorization header.
 * @param {AuthType} [params.authType='Bearer'] - Authentication scheme to use (Bearer, Token, or Basic).
 * @returns {Promise<{ status: number; body: unknown; headers: Record<string, string> }>} - An object containing:
 *    - `status`: The HTTP status code returned by the server.
 *    - `body`: Parsed JSON, text for `text/*`, a Buffer for other non-empty content, `null` when empty.
 *    - `headers`: The response headers.
 */
export async function apiRequest({
    request,
    method,
    url,
    baseUrl,
    body = null,
    params,
    multipart,
    contentType = 'application/json',
    headers,
    authType = 'Bearer',
}: ApiRequestParams & { request: APIRequestContext }): Promise<{
    status: number;
    body: unknown;
    headers: Record<string, string>;
}> {
    const requestHeaders: Record<string, string> = {};
    if (headers) requestHeaders.Authorization = `${authType} ${headers}`;
    if (!multipart) requestHeaders['Content-Type'] = contentType;

    const resolvedBaseUrl = baseUrl ?? appConfig.apiUrl;
    const isAbsolute = /^https?:\/\//.test(url);
    const fullUrl =
        isAbsolute || !resolvedBaseUrl ? url : `${resolvedBaseUrl}${url}`;

    const response = await request.fetch(fullUrl, {
        method,
        headers: requestHeaders,
        params,
        ...(multipart ? { multipart } : body !== null ? { data: body } : {}),
    });

    const status = response.status();
    const responseHeaders = response.headers();
    const responseType = responseHeaders['content-type'] || '';

    let bodyData: unknown = null;
    try {
        if (responseType.includes('application/json')) {
            bodyData = await response.json();
        } else if (responseType.includes('text/')) {
            bodyData = await response.text();
        } else {
            const buffer = await response.body();
            if (buffer.length > 0) bodyData = buffer;
        }
    } catch (err) {
        // eslint-disable-next-line no-console -- Important to log parsing failures for debugging
        console.warn(
            `Failed to parse response body for status ${status}: ${err}`
        );
    }

    return { status, body: bodyData, headers: responseHeaders };
}
