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
    cache: RequestCache = 'default'
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

    // Fetch with timeout
    const response = await fetchWithTimeout(url, options);

    // If response ok, we assume data is JSON type
    if (response.ok) {
        return response.json() as Promise<T>;
    }

    // If response is not ok, check if content-type is json before converting.
    const json = response.headers
        .get('content-type')
        ?.includes('application/json');

    const data = json && (await response.json());

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

const get = async <
    T,
    P extends Record<string, any> | undefined = Record<string, any>
>(
    url: string,
    params?: P,
    timeout?: number,
    cache?: RequestCache
) => request<T>(url, params, GET, timeout, cache);

const post = async <
    T,
    P extends Record<string, any> | undefined = Record<string, any>
>(
    url: string,
    params?: P,
    timeout?: number,
    cache?: RequestCache
) => request<T>(url, params, POST, timeout, cache);

interface HttpClient {
    /**
     * Performs an HTTP GET request
     *
     * @param url the URL
     * @param params query parameters
     * @returns The parsed JSON response
     */
    get<T, P extends Record<string, any> | undefined = Record<string, any>>(
        url: string,
        params?: P,
        timeout?: number,
        cache?: RequestCache
    ): Promise<T>;

    /**
     * Performs an HTTP POST request
     *
     * @param url the URL
     * @param params The body content
     * @returns The parsed JSON response
     */
    post<T, P extends Record<string, any> | undefined = Record<string, any>>(
        url: string,
        params?: P,
        timeout?: number,
        cache?: RequestCache
    ): Promise<T>;
}

export default {
    get,
    post,
} as HttpClient;
