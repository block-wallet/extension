import { RequestError } from './http';

const EXACT_MATCH_ERRORS = ['Insufficient liquidity', 'Cannot estimate'];

const MAPPED_ERRORS: { regex: RegExp; errorMessage: string }[] = [
    {
        regex: /balance for gas fee/i,
        errorMessage: "You don't have enough balance for covering gas costs.",
    },
    {
        regex: /forget about miner fee./i,
        errorMessage: "You don't have enough balance for covering gas costs.",
    },
    {
        regex: /enough balance/i,
        errorMessage: 'Insufficient funds.',
    },
    {
        regex: /not enough/i,
        errorMessage: 'Insufficient funds.',
    },
    {
        regex: /enough allowance/i,
        errorMessage: "You don't have enough allowance to perform this swap.",
    },
];

const formatStr = (text: string) => (text || '').toLowerCase().trim();

const errorsAreEqual = (e1: string, e2: string) => {
    return formatStr(e1) === formatStr(e2);
};

export const map1InchErrorMessage = (
    errorDescription: string | undefined
): string | undefined => {
    if (!errorDescription) return undefined;
    if (EXACT_MATCH_ERRORS.some((e) => errorsAreEqual(errorDescription, e))) {
        return errorDescription;
    }

    const err = MAPPED_ERRORS.find((e) => e.regex.test(errorDescription));

    return err?.errorMessage;
};

export const get1InchErrorMessageFromResponse = (
    error: RequestError
): string | undefined => {
    if (
        'response' in error &&
        error.response &&
        'description' in error.response
    ) {
        return error.response.description;
    }
    return undefined;
};
