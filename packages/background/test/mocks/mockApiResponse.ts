import { AxiosResponse } from 'axios';

export function mockApiResponse<T>(body: T) {
    return {
        headers: { 'Content-type': 'application/json' },
        status: 200,
        ok: true,
        json: () => body,
    };
}

export function mockErrorApiResponse(statusText: string) {
    return {
        headers: { 'Content-type': 'application/json' },
        status: 500,
        ok: false,
        statusText,
    };
}

export function mockAxiosResponse<T>(data: T): Promise<AxiosResponse<T>> {
    return new Promise((resolve) => {
        resolve({
            data: data,
            status: 200,
            statusText: '200',
            headers: {},
            config: {},
            request: {},
        });
    });
}
