import BN from 'bn.js';
import { addHexPrefix } from 'ethereumjs-util';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';

/**
 * Used to multiply a BN by a fraction
 *
 * @param {BigNumber} targetBN - The number to multiply by a fraction
 * @param {BigNumberish} numerator - The numerator of the fraction multiplier
 * @param {BigNumberish} denominator - The denominator of the fraction multiplier
 * @returns {BigNumber} The product of the multiplication
 *
 */
export const BnMultiplyByFraction = (
    targetBN: BigNumber,
    numerator: BigNumberish,
    denominator: BigNumberish
): BigNumber => {
    return BigNumber.from(targetBN).mul(numerator).div(denominator);
};

/**
 * Converts a BN object to a hex string with a '0x' prefix
 *
 * @param {BN} inputBn - The BN to convert to a hex string
 * @returns {string} - A '0x' prefixed hex string
 *
 */
export const bnToHex = (inputBn: BN): string => {
    return addHexPrefix(inputBn.toString(16));
};

/**
 * Checks if a big number is greater than zero
 *
 * @param {BigNumber} bn - BigNumber to check.
 * @returns {boolean} - if the BigNumber is greater than zero
 */
export const bnGreaterThanZero = (bn?: BigNumber): boolean => {
    if (!bn) {
        return false;
    }
    return (
        BigNumber.from(bn) &&
        !BigNumber.from(bn).isZero() &&
        !BigNumber.from(bn).isNegative()
    );
};
