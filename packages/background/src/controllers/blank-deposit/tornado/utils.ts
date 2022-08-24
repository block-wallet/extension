/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { bigInt } from 'snarkjs';
import {
    CurrencyAmountPair,
    KnownCurrencies,
    NativeKnownCurrencies,
} from '../types';
import { IBlankDeposit } from '../BlankDeposit';
import TornadoConfig from './config/config';

/**
 * currencyAmountPairToMapKey
 *
 * It returns a key from a currency/amount pair
 *
 * @param tornadoContractAddress The tornado contract address
 */
export function keyToCurrencyAmountPair(key: string): CurrencyAmountPair {
    const values = key.split('-');
    return {
        currency: values[0] as KnownCurrencies,
        amount: values[1] as any,
    };
}

/**
 * currencyAmountPairToMapKey
 *
 * It returns a key from a currency/amount pair
 *
 * @param tornadoContractAddress The tornado contract address
 */
export function currencyAmountPairToMapKey(
    currencyAmountPair: CurrencyAmountPair
): string {
    return `${currencyAmountPair.currency}-${currencyAmountPair.amount}`;
}

/** BigNumber to hex string of specified length */
export function toHex(number: any, length = 32): string {
    const str =
        number instanceof Buffer
            ? number.toString('hex')
            : bigInt(number).toString(16);
    return '0x' + str.padStart(length * 2, '0');
}

export const compareDepositsByPair = (
    a: IBlankDeposit,
    b: IBlankDeposit
): 0 | 1 | -1 => {
    if (a.pair.currency > b.pair.currency) {
        return 1;
    } else if (a.pair.currency < b.pair.currency) {
        return -1;
    } else {
        if (a.pair.amount > b.pair.amount) {
            return 1;
        } else if (a.pair.amount < b.pair.amount) {
            return -1;
        }

        return 0;
    }
};

export const parseRelayerError = (
    failedReason: string | undefined
): string | undefined => {
    let part: string | undefined = (failedReason as string).split(
        '"body":"'
    )[1];
    part = part
        ? part.substring(0, part.indexOf('}}') + 2).replace(/\\/g, '')
        : undefined;

    const parsedFailedReason =
        (part ? JSON.parse(part).error?.message : failedReason) ?? failedReason;

    return parsedFailedReason;
};

/**
 * isNativeCurrency
 *
 * Checks if the provided currency is a native one
 *
 * @param currency The currency to check against
 * @returns Whether the provided currency is a native currency or not(ERC20)
 */
export const isNativeCurrency = (
    currency: KnownCurrencies
): currency is NativeKnownCurrencies => {
    return [
        KnownCurrencies.ETH,
        KnownCurrencies.MATIC,
        KnownCurrencies.AVAX,
        KnownCurrencies.xDAI,
        KnownCurrencies.BNB,
    ].includes(currency);
};

/**
 * getTokenDecimals
 *
 * Obtains the decimal numbers of a pair token
 *
 * @param chainId The note chainId
 * @param pair The note pair
 * @returns The pair token decimals
 */
export const getTornadoTokenDecimals = (
    chainId: number,
    pair: CurrencyAmountPair
): number => {
    const currencies = TornadoConfig.deployments[
        `netId${chainId}` as keyof typeof TornadoConfig.deployments
    ].currencies as unknown as { [c in KnownCurrencies]: { decimals: number } };
    return currencies[pair.currency.toLowerCase() as KnownCurrencies].decimals;
};
