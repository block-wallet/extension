import { MaxUint256 as UNLIMITED_ALLOWANCE } from "@ethersproject/constants"
import { formatUnits } from "ethers/lib/utils"
import { formatNumberLength } from "./formatNumberLength"

/**
 *
 * Convert allowance hex to a readable number or "Unlimited" depending on the value
 * @param allowanceHex The allowance hex value
 * @returns The allowance value in a readable format or "Unlimited" if the allowance is unlimited
 *
 */
export const getAllowanceValue = (allowanceHex: string) => {
    console.log("allowanceHex", allowanceHex)
    console.log("Unlimited", UNLIMITED_ALLOWANCE._hex)
    console.log(UNLIMITED_ALLOWANCE._hex === allowanceHex)
    if (UNLIMITED_ALLOWANCE._hex === allowanceHex) return "Unlimited"
    else return formatNumberLength(formatUnits(allowanceHex), 10)
}
