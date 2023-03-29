import { AccountResult } from "../components/account/AccountSearchResults"
import { resolveUDName } from "../context/commActions"
import { isAddress } from "@ethersproject/address"

export const supportedSuffixes = [
    "crypto",
    "nft",
    "x",
    "wallet",
    "bitcoin",
    "dao",
    "888",
    "coin",
    "zil",
    "polygon",
    "blockchain"
]

export const searchUD = async (
    search: string
): Promise<AccountResult | undefined> => {
    if (search === "") return undefined

    const _isAddress = isAddress(`${search}`)

    // Search from address
    if (_isAddress) {
        return undefined
    }

    let suffix

    search.includes(".")
        ? (suffix = search.split(".").pop()) // suffix last part of seach after dot
        : (suffix = undefined)

    if (!suffix || !supportedSuffixes.includes(suffix)) return undefined

    // Check result
    const result = await resolveUDName(search)
    return result ? { name: search, address: result } : undefined
}
