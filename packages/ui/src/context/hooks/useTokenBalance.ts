import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { BigNumber } from "@ethersproject/bignumber"
import { useTokensList } from "./useTokensList"

export const useTokenBalance = (
    token: Token | string | undefined
): BigNumber => {
    const { currentNetworkTokens, nativeToken } = useTokensList()
    const defaultAssetList = currentNetworkTokens.concat(nativeToken)

    if (!token) {
        return BigNumber.from(0)
    }

    const addr = typeof token === "string" ? token : token.address

    return BigNumber.from(
        defaultAssetList.find((element) => element.token.address === addr)
            ?.balance || 0
    )
}
