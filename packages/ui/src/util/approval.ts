import { parseUnits, formatUnits } from "@ethersproject/units"
import { stripHexPrefix } from "ethereumjs-util"
import { MaxUint256 } from "@ethersproject/constants"

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
        console.warn(
            `Custom allowance is larger than u256. Fallbacking to: ${MaxUint256}`
        )
        const maxAllowance = parseUnits(
            formatUnits(MaxUint256, decimals),
            decimals
        )._hex
        return maxAllowance
    }

    return parsedCustomAllowance
}
