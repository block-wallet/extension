import { CurrencyAmountPair, KnownCurrencies } from '../../types';

/**
 * Blank derivation paths
 *
 * The derivation is based on the pair currency-amount.
 * Each pair has its own defined path where the next to last value is for the currency
 * and the last one for the amount(Incremented from lower to higher value)
 *
 * Paths are explicitly defined here to prevent corrupting the already existing
 * deposits if the `config.ts` file were to be updated and to have an historical
 * place to check about key derivations
 */
const BASE_PATH = "m/216'";

export const BLANK_DEPOSITS_DERIVATION_PATHS: {
    [key in KnownCurrencies]: { [instance: string]: string };
} = {
    [KnownCurrencies.ETH]: {
        '0.1': "0'/0",
        '1': "0'/1",
        '10': "0'/2",
        '100': "0'/3",
    },
    [KnownCurrencies.DAI]: {
        '100': "1'/0",
        '1000': "1'/1",
        '10000': "1'/2",
        '100000': "1'/3",
    },
    [KnownCurrencies.cDAI]: {
        '5000': "2'/0",
        '50000': "2'/1",
        '500000': "2'/2",
        '5000000': "2'/3",
    },
    [KnownCurrencies.USDC]: {
        '100': "3'/0",
        '1000': "3'/1",
    },
    [KnownCurrencies.USDT]: {
        '100': "4'/0",
        '1000': "4'/1",
    },
    [KnownCurrencies.WBTC]: {
        '0.1': "5'/0",
        '1': "5'/1",
        '10': "5'/2",
    },
    [KnownCurrencies.MATIC]: {
        '100': "6'/0",
        '1000': "6'/1",
        '10000': "6'/2",
        '100000': "6'/3",
    },
    [KnownCurrencies.BNB]: {
        '0.1': "7'/0",
        '1': "7'/1",
        '10': "7'/2",
        '100': "7'/3",
    },
    [KnownCurrencies.xDAI]: {
        '100': "8'/0",
        '1000': "8'/1",
        '10000': "8'/2",
        '100000': "8'/3",
    },
    [KnownCurrencies.AVAX]: {
        '10': "9'/0",
        '100': "9'/1",
        '500': "9'/2",
    },
};

export const getDerivationPath = (
    chainId: number,
    { currency, amount }: CurrencyAmountPair
): string => {
    if (
        !(
            currency in BLANK_DEPOSITS_DERIVATION_PATHS &&
            amount in BLANK_DEPOSITS_DERIVATION_PATHS[currency]
        )
    ) {
        throw new Error('Currency-amount pair is not supported');
    }

    const derivation = BLANK_DEPOSITS_DERIVATION_PATHS[currency][amount];
    return `${BASE_PATH}/${chainId}'/${derivation}`;
};
