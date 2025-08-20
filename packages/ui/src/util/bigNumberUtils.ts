import { BigNumber } from "@ethersproject/bignumber"
import { parseUnits } from "@ethersproject/units"

/**
 * Represents a value that can be converted to BigNumber
 */
type BigNumberLike = string | number | BigNumber | null | undefined

/**
 * Represents a serialized BigNumber object from JSON
 */
interface SerializedBigNumber {
    type: 'BigNumber'
    hex: string
}

/**
 * Type guard to check if value is a serialized BigNumber
 */
const isSerializedBigNumber = (value: any): value is SerializedBigNumber =>
    typeof value === 'object' &&
    value !== null &&
    value.type === 'BigNumber' &&
    typeof value.hex === 'string'

/**
 * Type guard to check if value is a BigNumber-like object with hex property
 */
const isBigNumberLike = (value: any): value is { hex: string } | { _hex: string } =>
    typeof value === 'object' &&
    value !== null &&
    (typeof value.hex === 'string' || typeof value._hex === 'string')

/**
 * Safely converts various value types to BigNumber with proper error handling
 *
 * @param value - The value to convert
 * @param decimals - Number of decimals for decimal string conversion (default: 18)
 * @returns BigNumber representation of the value, or BigNumber.from(0) if conversion fails
 */
export const safeBigNumber = (
    value: BigNumberLike | SerializedBigNumber | any,
    decimals: number = 18
): BigNumber => {
    if (!value || value === "0" || value === 0) {
        return BigNumber.from(0)
    }

    if (BigNumber.isBigNumber(value)) {
        return value
    }

    if (isSerializedBigNumber(value)) {
        try {
            return BigNumber.from(value.hex)
        } catch (error) {
            console.warn(`Failed to parse serialized BigNumber with hex "${value.hex}":`, error)
            return BigNumber.from(0)
        }
    }

    if (isBigNumberLike(value)) {
        const hex = 'hex' in value ? value.hex : value._hex
        try {
            return BigNumber.from(hex)
        } catch (error) {
            console.warn(`Failed to parse BigNumber-like object with hex "${hex}":`, error)
            return BigNumber.from(0)
        }
    }

    if (typeof value === 'object' && typeof value.toString === 'function') {
        const stringValue = value.toString()
        if (stringValue && stringValue !== '[object Object]') {
            try {
                return BigNumber.from(stringValue)
            } catch (error) {
                console.warn(`Failed to parse object toString() "${stringValue}":`, error)
                return BigNumber.from(0)
            }
        }
        console.warn('Received unparseable object:', value)
        return BigNumber.from(0)
    }

    return parseStringValue(String(value), decimals)
}

/**
 * Parses string values to BigNumber with decimal support
 */
const parseStringValue = (valueStr: string, decimals: number): BigNumber => {
    if (valueStr.includes('.')) {
        return parseDecimalValue(valueStr, decimals)
    }

    try {
        return BigNumber.from(valueStr)
    } catch (error) {
        console.warn(`Failed to parse integer value "${valueStr}":`, error)
        return BigNumber.from(0)
    }
}

/**
 * Parses decimal string values to BigNumber
 */
const parseDecimalValue = (valueStr: string, decimals: number): BigNumber => {
    try {
        if (decimals === 0) {
            const floatValue = parseFloat(valueStr)
            if (isNaN(floatValue)) {
                console.warn(`Invalid decimal value "${valueStr}" cannot be converted to number`)
                return BigNumber.from(0)
            }
            return BigNumber.from(Math.floor(floatValue).toString())
        }

        return parseUnits(valueStr, decimals)
    } catch (error) {
        console.warn(`Failed to parse decimal value "${valueStr}" with ${decimals} decimals:`, error)
        return BigNumber.from(0)
    }
}

/**
 * Creates a BigNumber from token amount with proper decimals
 */
export const createTokenBigNumber = (
    amount: BigNumberLike,
    tokenDecimals: number
): BigNumber => safeBigNumber(amount, tokenDecimals)

/**
 * Creates a BigNumber for gas-related values (no decimals)
 */
export const createGasBigNumber = (
    gasValue: BigNumberLike
): BigNumber => safeBigNumber(gasValue, 0)

/**
 * Creates a BigNumber for native token values (18 decimals)
 */
export const createEtherBigNumber = (
    etherValue: BigNumberLike
): BigNumber => safeBigNumber(etherValue, 18)
