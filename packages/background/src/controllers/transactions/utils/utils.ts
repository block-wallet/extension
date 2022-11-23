import { addHexPrefix, isHexString, isValidAddress } from 'ethereumjs-util';
import { BigNumber } from 'ethers';
import { TransactionMeta, TransactionParams, TransactionType } from './types';
import ensNamehash from 'eth-ens-namehash';
import {
    FeeMarketEIP1559Values,
    GasPriceValue,
} from '../TransactionController';

const normalizers: {
    [key in keyof TransactionParams]: (
        t: Exclude<TransactionParams[key], undefined>,
        ...args: any
    ) => Exclude<TransactionParams[key], undefined>;
} = {
    from: (from: string) => addHexPrefix(from).toLowerCase(),
    to: (to: string) => addHexPrefix(to).toLowerCase(),
    value: (t: BigNumber | string) => BigNumber.from(t || 0),
    gasPrice: (t: BigNumber | string) => BigNumber.from(t),
    maxFeePerGas: (t: BigNumber | string) => BigNumber.from(t),
    maxPriorityFeePerGas: (t: BigNumber | string) => BigNumber.from(t),
    gasLimit: (t: BigNumber | string) => BigNumber.from(t),
    data: (data: string) => addHexPrefix(data),
    type: (t: number | string | null) =>
        typeof t === 'string' ? parseInt(t) : t,
    nonce: (t: number | string) => (typeof t === 'string' ? parseInt(t) : t),
    chainId: (t: number | string) => (typeof t === 'string' ? parseInt(t) : t),
    v: (t: number | string) => (typeof t === 'string' ? parseInt(t) : t),
};

/**
 * Normalizes the given transaction
 *
 * @param {TransactionParams} transaction - The transaction params
 * @param {boolean} [lowerCase] - Whether to lowercase the 'to' and 'from' addresses.
 * @returns {TransactionParams} the normalized transaction params
 */
export function normalizeTransaction(
    transaction: TransactionParams
): TransactionParams {
    // Destructure only known parameters
    const normalizedTransactionParams = {
        accessList: transaction.accessList,
        type: transaction.type,
        data: transaction.data,
        gasLimit: transaction.gasLimit,
        gasPrice: transaction.gasPrice,
        maxFeePerGas: transaction.maxFeePerGas,
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
        nonce: transaction.nonce,
        value: transaction.value,
        to: transaction.to,
        chainId: transaction.chainId,
        from: transaction.from,
        hash: transaction.hash,
        r: transaction.r,
        s: transaction.s,
        v: transaction.v,
    } as TransactionParams;
    let key: keyof TransactionParams;
    for (key in normalizedTransactionParams) {
        const param = transaction[key];
        if (typeof param !== 'undefined' && param !== null) {
            const normalizer = normalizers[key] as any;
            if (normalizer) {
                normalizedTransactionParams[key] = normalizer(param);
            }
        } else {
            delete normalizedTransactionParams[key];
        }
    }
    return normalizedTransactionParams;
}

/**
 * Validates that the input is a hex address. This utility method is a thin
 * wrapper around ethereumjs-util.isValidAddress, with the exception that it
 * does not throw an error when provided values that are not hex strings. In
 * addition, and by default, this method will return true for hex strings that
 * meet the length requirement of a hex address, but are not prefixed with `0x`
 * Finally, if the mixedCaseUseChecksum flag is true and a mixed case string is
 * provided this method will validate it has the proper checksum formatting.
 *
 * @param possibleAddress - Input parameter to check against.
 * @param options - The validation options.
 * @param options.allowNonPrefixed - If true will first ensure '0x' is prepended to the string.
 * @returns Whether or not the input is a valid hex address.
 */
export function isValidHexAddress(
    possibleAddress: string,
    { allowNonPrefixed = true } = {}
): boolean {
    const addressToCheck = allowNonPrefixed
        ? addHexPrefix(possibleAddress)
        : possibleAddress;
    if (!isHexString(addressToCheck)) {
        return false;
    }

    return isValidAddress(addressToCheck);
}

/**
 * Validates that transaction parameters types are correct
 * @param transaction The transaction object to check
 */
export const validateFields = (transaction: TransactionParams): void => {
    let key: keyof TransactionParams;
    for (key in transaction) {
        if (Object.prototype.hasOwnProperty.call(transaction, key)) {
            const value = transaction[key];
            // validate types
            switch (key) {
                case 'chainId':
                case 'nonce':
                case 'type':
                case 'v':
                    if (typeof value !== 'number' || isNaN(value)) {
                        throw new Error(
                            `${key} in transactionParams is not a Number. got: (${value})`
                        );
                    }
                    break;
                case 'gasPrice':
                case 'gasLimit':
                case 'maxFeePerGas':
                case 'maxPriorityFeePerGas':
                    if (
                        typeof value !== 'string' &&
                        !(value instanceof BigNumber) &&
                        value != null
                    ) {
                        throw new Error(
                            `${key} in transactionParams gas value is not a string nor a BigNumber or null. got: (${value})`
                        );
                    }
                    break;
                default:
                    if (
                        typeof value !== 'string' &&
                        !(value instanceof BigNumber)
                    ) {
                        throw new Error(
                            `${key} in transactionParams is not a string nor a BigNumber. got: (${value})`
                        );
                    }
                    break;
            }
        }
    }
};

/**
 * Validates a Transaction object for required properties and throws in
 * the event of any validation error.
 *
 * @param transaction - Transaction object to validate.
 */
export function validateTransaction(transaction: TransactionParams): void {
    // Check that transaction is an object
    if (
        !transaction ||
        typeof transaction !== 'object' ||
        Array.isArray(transaction)
    ) {
        throw new Error('Invalid transaction: must be an object.');
    }

    validateFields(transaction);

    // Check that a valid address has been provided for "from"
    if (
        !transaction.from ||
        typeof transaction.from !== 'string' ||
        !isValidHexAddress(transaction.from)
    ) {
        throw new Error(
            `Invalid "from" address: ${transaction.from} must be a valid string.`
        );
    }

    // Check that "to" and "data" have been correctly provided
    if (transaction.to === '0x' || transaction.to === undefined) {
        if (transaction.data) {
            delete transaction.to;
        } else {
            throw new Error(
                `Invalid "to" address: ${transaction.to} must be a valid string.`
            );
        }
    } else if (
        transaction.to !== undefined &&
        !isValidHexAddress(transaction.to)
    ) {
        throw new Error(
            `Invalid "to" address: ${transaction.to} must be a valid string.`
        );
    }

    // Check that we've received a correct value
    if (transaction.value !== undefined) {
        // At this point value should be BigNumber, having passed all the safety checks.
        // We ensure nevertheless, that it is actually a valid BigNumber.
        if (!BigNumber.isBigNumber(transaction.value)) {
            throw new Error(
                `Invalid "value": ${transaction.value} is not a a valid BigNumber.`
            );
        }

        const value = transaction.value.toString();
        if (value.includes('-')) {
            throw new Error(
                `Invalid "value": ${value} is not a positive number.`
            );
        }
    }
}

/**
 * Validates that the specified gas values are BigNumber
 *
 * Mutates the object to force deserialization if valid BigNumber is provided.
 *
 * @param gasValues The gas values to validate
 */
export const validateGasValues = (
    gasValues: GasPriceValue | FeeMarketEIP1559Values
): void => {
    Object.keys(gasValues).forEach((key) => {
        const value = (gasValues as any)[key];

        if (!BigNumber.isBigNumber(value)) {
            throw new TypeError(
                `expected BigNumber for ${key} but received: ${value}`
            );
        }
        (gasValues as any)[key] = BigNumber.from(value);
    });
};

/**
 * compareAddresses
 *
 * Compares two addresses
 *
 * @param a First address
 * @param b Second address
 * @returns Whether or not the provided addresses are equal
 */
export const compareAddresses = (
    a: string | undefined,
    b: string | undefined
): boolean => {
    if (!a || !b) {
        return false;
    }

    return a.toLowerCase() === b.toLowerCase();
};

/**
 * isTransactionEIP1559
 *
 * @param transactionParams The transaction to check against
 * @returns Whether the transaction is of type EIP1559
 */
export const isTransactionEIP1559 = (
    transactionParams: TransactionParams
): boolean => {
    return !!(
        transactionParams.maxFeePerGas && transactionParams.maxPriorityFeePerGas
    );
};

/**
 * isGasPriceValue
 *
 * @param gasValues The gasValue to check
 * @returns Whether the provided object is of type GasPriceValue
 */
export const isGasPriceValue = (
    gasValues?: GasPriceValue | FeeMarketEIP1559Values
): gasValues is GasPriceValue =>
    (gasValues as GasPriceValue)?.gasPrice !== undefined;

/**
 * isFeeMarketEIP1559Values
 *
 * @param gasValues The gasValue to check
 * @returns Whether the provided object is of type FeeMarketEIP1559Values
 */
export const isFeeMarketEIP1559Values = (
    gasValues?: GasPriceValue | FeeMarketEIP1559Values
): gasValues is FeeMarketEIP1559Values =>
    (gasValues as FeeMarketEIP1559Values)?.maxFeePerGas !== undefined ||
    (gasValues as FeeMarketEIP1559Values)?.maxPriorityFeePerGas !== undefined;

/**
 * Validates that the proposed value is greater than or equal to the minimum value.
 *
 * @param proposed - The proposed value.
 * @param min - The minimum value.
 * @returns The proposed value.
 * @throws Will throw if the proposed value is too low.
 */
export function validateMinimumIncrease(
    proposed: BigNumber,
    min: BigNumber
): BigNumber {
    if (BigNumber.from(proposed).gte(min)) {
        return proposed;
    }
    const errorMsg = `The proposed value: ${proposed.toString()} should meet or exceed the minimum value: ${min.toString()}`;
    throw new Error(errorMsg);
}

/**
 * It determines the type of the transaction according to its parameters
 *
 * @param transactionParams The transaction to check against
 * @returns The transaction type
 */
export const getTransactionType = (
    transactionParams: TransactionParams
): TransactionType => {
    if (typeof transactionParams.accessList !== 'undefined') {
        return TransactionType.ACCESS_LIST_EIP2930;
    } else if (
        typeof transactionParams.maxPriorityFeePerGas !== 'undefined' &&
        typeof transactionParams.maxFeePerGas !== 'undefined'
    ) {
        return TransactionType.FEE_MARKET_EIP1559;
    } else {
        // Otherwise default to legacy
        return TransactionType.LEGACY;
    }
};

/**
 * Normalizes the given ENS name.
 *
 * @param {string} ensName - The ENS name
 *
 * @returns - the normalized ENS name string
 */
export function normalizeEnsName(ensName: string): string | null {
    if (ensName && typeof ensName === 'string') {
        try {
            const normalized = ensNamehash.normalize(ensName.trim());
            // this regex is only sufficient with the above call to ensNamehash.normalize
            if (normalized.match(/^(([\w\d-]+)\.)*[\w\d-]{7,}\.(eth|test)$/u)) {
                return normalized;
            }
        } catch (_) {
            // do nothing
        }
    }
    return null;
}

export function pruneTransaction(tx: TransactionMeta): TransactionMeta {
    if (tx.transactionReceipt) {
        return {
            ...tx,
            transactionReceipt: {
                ...tx.transactionReceipt,
                logs: [],
            },
        };
    }
    return tx;
}
