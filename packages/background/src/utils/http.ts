import { isNil } from 'lodash';

export class RequestError extends Error {
    public readonly status: number;
    public readonly response: any;
    constructor(statusText: string, status: number, response: any) {
        super(statusText);
        this.name = 'RequestError';
        this.status = status;
        this.response = response;
    }
}

const GET = 'GET';
const POST = 'POST';

function isJsonResponse(r: Response) {
    return r.headers.get('content-type')?.includes('application/json');
}

function parseResponseBody<T>(response: Response): Promise<T | string> {
    if (isJsonResponse(response)) {
        return response.json() as Promise<T>;
    }

    return response.text() as Promise<string>;
}

const fetchWithTimeout = async (
    url: string,
    options: RequestInit & { timeout?: number } = {}
) => {
    const { timeout = 60000 } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, {
        ...options,
        signal: controller.signal,
    });
    clearTimeout(id);
    return response;
};

const request = async <T>(
    url: string,
    params: Record<string, any> | undefined,
    method = GET,
    timeout = 60000,
    cache: RequestCache = 'default',
    headers: HeadersInit | undefined
): Promise<T> => {
    const options: RequestInit & { timeout?: number } = {
        method,
        timeout,
        cache,
    };

    // Check the method and set the options accordingly
    if (method === GET) {
        const safeParams = Object.entries(params || {}).reduce(
            (acc, [key, value]) => {
                if (isNil(value)) {
                    return acc;
                }
                return {
                    ...acc,
                    [key]: value,
                };
            },
            {}
        );
        url += '?' + new URLSearchParams(safeParams).toString();
    } else {
        options.body = JSON.stringify(params);
    }
    if (headers !== undefined) {
        options.headers = headers;
    }
    // Fetch with timeout
    const response = await fetchWithTimeout(url, options);

    // If response ok, we assume data is JSON type
    if (response.ok) {
        return parseResponseBody(response) as Promise<T>;
    }

    // If response is not ok, check if content-type is json before converting.
    const data = isJsonResponse(response) && (await response.json());

    // Check if there's an 'error' or err' key in the response
    const errMessage =
        'error' in data ? data.error : 'err' in data ? data.err : undefined;

    // Throw the request error
    throw new RequestError(
        errMessage || response.statusText,
        response.status,
        data
    );
};

const get = async <T>(url: string, options: RequestOptions) =>
    request<T>(
        url,
        options.params,
        GET,
        options.timeout,
        options.cache,
        options.headers
    );

const post = async <T>(url: string, options: RequestOptions) =>
    request<T>(
        url,
        options.params,
        POST,
        options.timeout,
        options.cache,
        options.headers
    );

export interface RequestOptions extends RequestInit {
    params?: Record<string, any> | undefined;
    timeout?: number;
}

interface HttpClient {
    /**
     * Performs an HTTP GET request
     *
     * @param url the URL
     * @param options options of the request
     * @returns The parsed JSON response
     */
    get<T>(url: string, options?: RequestOptions): Promise<T>;

    /**
     * Performs an HTTP POST request
     *
     * @param url the URL
     * @param  options options of the request
     * @returns The parsed JSON response
     */
    post<T>(url: string, options?: RequestOptions): Promise<T>;
}

export default {
    get,
    post,
} as HttpClient;
