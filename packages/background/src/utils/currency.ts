import CURRENCIES from './constants/currencies.json';
export interface Currency {
    code: string;
    name?: string;
    symbol?: string;
}
export const getCurrencies = (): Currency[] => {
    return CURRENCIES.sort((a, b) => a.code.localeCompare(b.code));
};

export const isCurrencyCodeValid = (currencyCode: string): boolean => {
    return !!CURRENCIES.find(
        (c) => c.code.toLowerCase() === currencyCode.toLowerCase()
    );
};
