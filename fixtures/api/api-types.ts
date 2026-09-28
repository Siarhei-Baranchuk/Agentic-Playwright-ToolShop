/** Supported authentication schemes for API requests */
export type AuthType = 'Bearer' | 'Token' | 'Basic';

/**
 * Supported HTTP methods. `QUERY` is the safe, body-carrying read method
 * (IETF draft) the demo API exposes on its search/list endpoints.
 */
export type HttpMethod = 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH' | 'QUERY';

/** A file part of a multipart/form-data request */
export type MultipartFile = {
    name: string;
    mimeType: string;
    buffer: Buffer;
};

/**
 * Parameters for making an API request.
 * @typedef {Object} ApiRequestParams
 * @property {HttpMethod} method - The HTTP method to use.
 * @property {string} url - The endpoint URL for the request.
 * @property {string} [baseUrl] - The base URL to prepend to the endpoint (defaults to `API_URL`).
 * @property {Record<string, unknown> | string | null} [body] - The request payload; a string is sent as-is (e.g. to test unsupported media types).
 * @property {Record<string, string | number | boolean>} [params] - Query string parameters.
 * @property {Record<string, string | MultipartFile>} [multipart] - multipart/form-data fields; replaces `body`.
 * @property {string} [contentType] - Overrides the default `application/json` Content-Type.
 * @property {string} [headers] - Authentication token for the Authorization header.
 * @property {AuthType} [authType] - Authentication scheme to use (default: 'Bearer').
 */
export type ApiRequestParams = {
    method: HttpMethod;
    url: string;
    baseUrl?: string;
    body?: Record<string, unknown> | string | null;
    params?: Record<string, string | number | boolean>;
    multipart?: Record<string, string | MultipartFile>;
    contentType?: string;
    headers?: string;
    authType?: AuthType;
};

/**
 * Response from an API request.
 * @template T
 * @typedef {Object} ApiRequestResponse
 * @property {number} status - The HTTP status code of the response.
 * @property {T} body - The response body: parsed JSON, text, a Buffer for binary content, or `null` when empty.
 * @property {Record<string, string>} headers - The response headers (lower-cased names).
 */
export type ApiRequestResponse<T = unknown> = {
    status: number;
    body: T;
    headers: Record<string, string>;
};

// define the function signature as a type
export type ApiRequestFn = <T = unknown>(
    params: ApiRequestParams
) => Promise<ApiRequestResponse<T>>;

// grouping them all together
export type ApiRequestMethods = {
    apiRequest: ApiRequestFn;
};
