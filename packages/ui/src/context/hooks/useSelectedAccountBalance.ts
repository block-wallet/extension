import { BigNumber } from "ethers"
import { useTokensList } from "./useTokensList"

export const useSelectedAccountBalance = () => {
    const { nativeToken } = useTokensList()
    return nativeToken ? nativeToken.balance : BigNumber.from(0)
}
