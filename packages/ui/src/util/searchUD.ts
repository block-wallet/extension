import { utils } from "ethers"
import { resolveUDName } from "../context/commActions"

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
]

export type UDResult = {
    name: string
    address: any
}

export const searchUD = async (
    search: string,
    setUDSearch: React.Dispatch<React.SetStateAction<string>>,
    setUDResult: React.Dispatch<React.SetStateAction<UDResult | undefined>>
) => {
    if (search === "") return setUDResult(undefined)

    setUDSearch(search)
    const isAddress = utils.isAddress(`${search}`)

    // Search from address
    if (isAddress) {
        return setUDResult(undefined)
    }

    let suffix

    search.includes(".")
        ? (suffix = search.split(".").pop()) // suffix last part of seach after dot
        : (suffix = undefined)

    if (!suffix || !supportedSuffixes.includes(suffix))
        return setUDResult(undefined)

    // Check result
    const result = await resolveUDName(search)
    if (result) return setUDResult({ name: search, address: result })
    else setUDResult(undefined)
}
