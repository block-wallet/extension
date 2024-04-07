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

export function isHttpsURL(url: string): boolean {
    return url.startsWith('https://');
}

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

const defaultOptions = {
    method: GET,
    timeout: 60000,
    cache: 'default' as RequestCache,
};
const request = async <T>(
    url: string,
    options: RequestOptions = defaultOptions
): Promise<T> => {
    const safeOptions: RequestOptions = {
        ...defaultOptions,
        ...options,
    };

    // Check the method and set the options accordingly
    if (safeOptions.method === GET) {
        const safeParams = Object.entries(safeOptions.params || {}).reduce(
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
    }

    // Fetch with timeout
    const response = await fetchWithTimeout(url, safeOptions);

    // If response ok, we assume data is JSON type
    if (response.ok) {
        return parseResponseBody(response) as Promise<T>;
    }

    // If response is not ok, check if content-type is json before converting.
    const data = isJsonResponse(response) ? await response.json() : undefined;

    // Check if there's an 'error' or err' key in the response
    let errMessage = '';
    if (data && typeof data === 'object') {
        for (const prop in data) {
            if (['err', 'error'].includes(prop)) {
                errMessage = data[prop];
                break;
            }
        }
    }

    // Throw the request error
    throw new RequestError(
        errMessage || response.statusText,
        response.status,
        data
    );
};

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
    request<T>(url: string, options?: RequestOptions): Promise<T>;
}

export default {
    request,
} as HttpClient;
