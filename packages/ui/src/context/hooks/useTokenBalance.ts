import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { BigNumber } from "@ethersproject/bignumber"
import { useTokensList } from "./useTokensList"
import { useEffect, useMemo, useState } from "react"
import { subscribeSelectedAccountChainBalance } from "../commActions"
import { AccountBalance } from "@block-wallet/background/controllers/AccountTrackerController"

export const useTokenBalance = (
    token: Token | string | undefined
): BigNumber => {
    const { currentNetworkTokens, nativeToken } = useTokensList()
    const defaultAssetList = currentNetworkTokens.concat(nativeToken)
    const [chainBalance, setChainBalance] = useState<AccountBalance | null>(null)

    useEffect(() => {
        let mounted = true
        subscribeSelectedAccountChainBalance((b) => {
            if (mounted) setChainBalance(b)
        })
        return () => {
            mounted = false
        }
    }, [])

    if (!token) {
        return BigNumber.from(0)
    }

    const addr = typeof token === "string" ? token : token.address
    const fallbackBalance = BigNumber.from(
        defaultAssetList.find((element) => element.token.address === addr)?.balance || 0
    )
    if (!chainBalance) return fallbackBalance
    if (addr === "0x0") return chainBalance.nativeTokenBalance
    return BigNumber.from(chainBalance.tokens[addr]?.balance || 0)
}
