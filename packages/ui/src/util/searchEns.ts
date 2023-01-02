import { isValidAddress } from "ethereumjs-util"
import { AccountResult } from "../components/account/AccountSearchResults"
import { resolveEnsName, lookupAddressEns } from "../context/commActions"

export const searchEns = async (
    search: string
): Promise<AccountResult | undefined> => {
    if (search === "") return undefined

    const isValid = isValidAddress(`${search}`)

    // Search from address
    if (isValid) {
        const result = await lookupAddressEns(search)
        return result ? { name: result, address: search } : undefined
    }
    // Search from ENS
    else {
        let suffixValue
        search.includes(".")
            ? (suffixValue = search)
            : (suffixValue = search + ".eth")

        // Check result
        const result = await resolveEnsName(suffixValue)
        return result ? { name: suffixValue, address: result } : undefined
    }
}
