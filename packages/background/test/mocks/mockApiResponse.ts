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
