import { parseUnits } from "@ethersproject/units"
import { stripHexPrefix } from "ethereumjs-util"

/**
 * Given a token unit and the token decimals, it returns a hex string
 * in total asset value (e.g. wei for eth)
 *
 * @param allowance plain allowance stated in token units
 * @param decimals token decimals
 */
export const parseAllowance = (allowance: string, decimals: number) => {
    const parsedCustomAllowance = parseUnits(allowance, decimals)._hex

    if (stripHexPrefix(parsedCustomAllowance).length > 64) {
        throw new Error("Custom allowance is larger than u256")
    }

    return parsedCustomAllowance
}
