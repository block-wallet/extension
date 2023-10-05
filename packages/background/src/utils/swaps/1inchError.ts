import { RequestError } from '../http';

const EXACT_MATCH_ERRORS = ['Insufficient liquidity', 'Cannot estimate'];
const NOT_ENOUGH_BALANCE = `Balance too low to cover swap and gas cost.`;

const MAPPED_ERRORS: { regex: RegExp; errorMessage: string }[] = [
    {
        regex: /balance for gas fee/i,
        errorMessage: NOT_ENOUGH_BALANCE,
    },
    {
        regex: /may not have enough ETH balance/i,
        errorMessage: NOT_ENOUGH_BALANCE,
    },
    {
        regex: /forget about miner fee./i,
        errorMessage: NOT_ENOUGH_BALANCE,
    },
    {
        regex: /enough balance/i,
        errorMessage: NOT_ENOUGH_BALANCE,
    },
    {
        regex: /not enough/i,
        errorMessage: NOT_ENOUGH_BALANCE,
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
