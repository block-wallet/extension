import { useDepositTokens } from "../../context/hooks/useDepositTokens"
import {
    TokenWithBalance,
    useTokensList,
} from "../../context/hooks/useTokensList"
import { isNativeTokenAddress } from "../tokenUtils"
const useGetAssetByTokenAddress = (
    tokenAddress: string
): (TokenWithBalance & { isDepositable: boolean }) | undefined => {
    const tokenList = useTokensList()
    const depositTokens = useDepositTokens()

    const asset = isNativeTokenAddress(tokenAddress)
        ? tokenList.nativeToken
        : tokenList.currentNetworkTokens.find((t) => {
              return t.token.address === tokenAddress
          })

    if (!asset) return undefined

    const isDepositable =
        depositTokens &&
        depositTokens.some((d) => d.token.symbol === asset.token.symbol)

    return {
        ...(asset as TokenWithBalance),
        isDepositable: isDepositable ?? false,
    }
}

export default useGetAssetByTokenAddress
