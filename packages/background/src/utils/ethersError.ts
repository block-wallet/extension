import { JSONRPCResponse } from '@block-wallet/provider/types';

/**
 * It parses the response error from the JSON-RPC server.
 *
 * @param error The response error
 * @returns The parsed error message from the node response
 */
export const ethersError = (error: {
    body?: string;
}): JSONRPCResponse['error'] | undefined => {
    try {
        const errBody =
            'body' in error && error.body
                ? (JSON.parse(error.body) as JSONRPCResponse)
                : undefined;
        return errBody ? errBody.error : undefined;
    } catch {
        return undefined;
    }
};

/**
 * It checks if the error is a rate limit error.
 * @param error The error to parse
 * @returns Whether the error is a rate limit error
 */
export const checkIfRateLimitError = (error: {
    body?: string;
    status?: number;
}): boolean => {
    const errBody = ethersError(error);
    // If there's no parsable error, return false
    if (!errBody) {
        if (error.status) {
            return error.status === 429;
        } else {
            return false;
        }
    }

    return errBody.code === 429;
};

/**
 * It checks if the error is a method not allowed error.
 * @param error The error to parse
 * @returns Whether the error is a not allowed error
 */
export const checkIfNotAllowedError = (error: {
    body?: string;
    status?: number;
}): boolean => {
    const errBody = ethersError(error);
    // If there's no parsable error, return false
    if (!errBody) {
        if (error.status) {
            return error.status === 403;
        } else {
            return false;
        }
    }

    return errBody.code === 403;
};

/**
 * It checks if the error is a server or internal error.
 *
 * @param error The error to check
 */
export const checkIfServerOrInternalError = (error: {
    body?: string;
}): boolean => {
    const errBody = ethersError(error);
    // If there's no parsable error, return false
    if (!errBody) {
        return false;
    }

    // If the returned error is between -32000 and -32099, it is a server error
    // -32603 is the code for "Internal error"
    if (
        (errBody.code >= -32099 && errBody.code <= -32000) ||
        errBody.code === -32603
    ) {
        return true;
    }

    return false;
};
