import {
    TokenWithBalance,
    useTokensList,
} from "../../context/hooks/useTokensList"
import { isNativeTokenAddress } from "../tokenUtils"
const useGetAssetByTokenAddress = (
    tokenAddress: string
): TokenWithBalance | undefined => {
    const tokenList = useTokensList()

    const asset = isNativeTokenAddress(tokenAddress)
        ? tokenList.nativeToken
        : tokenList.currentNetworkTokens.find((t) => {
              return t.token.address === tokenAddress
          })

    if (!asset) return undefined

    return {
        ...(asset as TokenWithBalance),
    }
}

export default useGetAssetByTokenAddress
