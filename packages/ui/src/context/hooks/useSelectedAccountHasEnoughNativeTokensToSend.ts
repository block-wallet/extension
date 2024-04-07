import {
    getAccountNativeTokenBalanceForChain,
    fetchLatestGasPriceForChain,
} from "../commActions"
import { useMemo, useCallback, useState } from "react"
import useAsyncInvoke, { Status } from "../../util/hooks/useAsyncInvoke"
import { BigNumber } from "@ethersproject/bignumber"
import { GasPriceData } from "@block-wallet/background/controllers/GasPricesController"
import { hasEnoughFundsToPayTheGasInSendTransaction } from "../../util/bridgeUtils"
import { useBlankState } from "../background/backgroundHooks"

export enum EnoughNativeTokensToSend {
    UNKNOWN = "UNKNOWN",
    ENOUGH = "ENOUGH",
    NOT_ENOUGH = "NOT_ENOUGH",
}

interface NativeAndGasPrices {
    nativeTokenBalance: BigNumber | undefined
    gasPrices: GasPriceData | undefined
}

interface EnoughNativeTokenToSend {
    check: () => Promise<any>
    result: EnoughNativeTokensToSend | undefined
    isLoading: boolean
}

/**
 * useSelectedAccountHasEnoughNativeTokensToSend
 *
 * This hooks checks the native token balance on the destination network (defined by chainId parameter) and @returns:
 *
 * check(): callback that checks the native token in the destination network and the gas prices of that network
 *
 * result: undefined if the check didn't run, "ENOUGH"/"NOT_ENOUGH" if the user has/hasn't enough balance to perform a send tx in the destination network, "UNKNOWN" if we can't verify the native token balance in the destination network (due to an external error or because he/she doesn't have the network in his wallet)
 *
 * isLoading: false if the check didn't run or it finished and true if it's still runinng.
 */
export const useSelectedAccountHasEnoughNativeTokensToSend = (
    chainId: number
): EnoughNativeTokenToSend => {
    const { run, isLoading, data } = useAsyncInvoke<NativeAndGasPrices>({
        status: Status.IDLE,
    })
    const [hasStarted, setHasStarted] = useState<boolean>(false)
    const { isEIP1559Compatible } = useBlankState()!

    const check = useCallback(() => {
        return run(
            new Promise<NativeAndGasPrices>(async (resolve) => {
                setHasStarted(true)
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
    }, [chainId, run])

    return useMemo(() => {
        let result = undefined
        if (hasStarted && !isLoading) {
            if (!data || !data.nativeTokenBalance || !data.gasPrices) {
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
        return { isLoading, result, check }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, data, check])
}
