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
