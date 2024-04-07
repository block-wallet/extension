import { FixedNumber } from "@ethersproject/bignumber"

/**
 * Receives a string containing numbers with decimals and applies round according to param.
 * @param value string to round
 * @param decimals number of decimals to round. Defaults to 4.
 * @returns rounded string
 */
export const formatRounded = (value: string, decimals: number = 4): string => {
    return FixedNumber.fromString(value).round(decimals).toString()
}

/**
 * Receives a string containing numbers with decimals and applies ceil according to param.
 * @param value string to ceil
 * @param decimals number of decimals to ceil. Defaults to 4.
 * @returns ceiled string
 * @example
 * formatRoundedUp('1.00009', 4) // '1.0001'
 * formatRoundedUp('1.001', 2) // '1.01'
 */
export const formatRoundedUp = (
    value: string,
    decimals: number = 4
): string => {
    const fixedNum = FixedNumber.fromString(value)
    const factor = FixedNumber.from(Math.pow(10, decimals))
    const roundedNum = fixedNum.mulUnsafe(factor).ceiling().divUnsafe(factor)
    return roundedNum.toString()
}
