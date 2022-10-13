import {
    getAccountNativeTokenBalanceForChain,
    fetchLatestGasPriceForChain,
} from "../commActions"
import { useMemo, useEffect } from "react"
import useAsyncInvoke, { Status } from "../../util/hooks/useAsyncInvoke"
import { BigNumber } from "ethers"
import { GasPriceData } from "@block-wallet/background/controllers/GasPricesController"
import { hasEnoughFundsToPayTheGasInSendTransaction } from "../../util/bridgeUtils"
import { useBlankState } from "../../context/background/backgroundHooks"
import { isNativeTokenAddress } from "../../util/tokenUtils"

export enum EnoughNativeTokensToSend {
    UNKNOWN = "UNKNOWN",
    ENOUGH = "ENOUGH",
    NOT_ENOUGH = "NOT_ENOUGH",
}

interface NativeAndGasPrices {
    nativeTokenBalance: BigNumber | undefined
    gasPrices: GasPriceData | undefined
}

// Checks the native token balance on the destination network when performing a bridge.
// Returns "ENOUGH" if the user has enough balance to perform a send tx or he/she's briding to the native token in the destination network
// Returns "NOT_ENOUGH" if the user hasn't enough balance to perform a send tx in the destination network and he/she isn't bridging to the destination network
// Returns "UNKNOWN" if we can't verify the native token balance in the destination network (due to an external error or because he/she doesn't have the network in his wallet)
// or we can't verify the gas prices
export const useAddressHasEnoughNativeTokensToSend = (
    chainId: number,
    tokenAddress: string
): {
    isLoading: boolean
    result: EnoughNativeTokensToSend
} => {
    const nativeTokenBridge = isNativeTokenAddress(tokenAddress)

    const { run, isLoading, data } = useAsyncInvoke<NativeAndGasPrices>({
        status: nativeTokenBridge ? Status.IDLE : Status.PENDING,
    })
    const { isEIP1559Compatible } = useBlankState()!

    useEffect(() => {
        if (!nativeTokenBridge) {
            run(
                new Promise<NativeAndGasPrices>(async (resolve) => {
                    const [nativeTokenBalance, gasPrices] = await Promise.all([
                        getAccountNativeTokenBalanceForChain(chainId),
                        fetchLatestGasPriceForChain(chainId),
                    ])
                    return resolve({
                        nativeTokenBalance,
                        gasPrices,
                    })
                })
            )
        }
    }, [run, chainId])

    return useMemo(() => {
        let result = EnoughNativeTokensToSend.UNKNOWN
        if (!isLoading) {
            if (nativeTokenBridge) {
                result = EnoughNativeTokensToSend.ENOUGH
            } else if (!data || !data.nativeTokenBalance || !data.gasPrices) {
                result = EnoughNativeTokensToSend.UNKNOWN
            } else {
                const hasEnoughFunds =
                    hasEnoughFundsToPayTheGasInSendTransaction(
                        !!isEIP1559Compatible[chainId],
                        data.nativeTokenBalance,
                        data.gasPrices
                    )
                if (hasEnoughFunds === undefined) {
                    result = EnoughNativeTokensToSend.UNKNOWN
                } else {
                    result = hasEnoughFunds
                        ? EnoughNativeTokensToSend.ENOUGH
                        : EnoughNativeTokensToSend.NOT_ENOUGH
                }
            }
        }
        return { isLoading, result }
    }, [isLoading, data])
}
