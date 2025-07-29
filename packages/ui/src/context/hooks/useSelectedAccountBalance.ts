import { BigNumber } from "@ethersproject/bignumber"
import { useTokensList } from "./useTokensList"
import { useEffect, useState } from "react"
import { subscribeSelectedNativeBalance } from "../commActions"

export const useSelectedAccountBalance = () => {
    const { nativeToken } = useTokensList()
    const [balance, setBalance] = useState<BigNumber | null>(null)

    useEffect(() => {
        let mounted = true
        subscribeSelectedNativeBalance((b) => {
            if (mounted) setBalance(b)
        })
        return () => {
            mounted = false
        }
    }, [])

    return balance ?? (nativeToken ? nativeToken.balance : BigNumber.from(0))
}
