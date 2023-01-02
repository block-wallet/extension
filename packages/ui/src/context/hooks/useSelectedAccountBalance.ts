import { BigNumber } from "@ethersproject/bignumber"
import { useTokensList } from "./useTokensList"

export const useSelectedAccountBalance = () => {
    const { nativeToken } = useTokensList()
    return nativeToken ? nativeToken.balance : BigNumber.from(0)
}
