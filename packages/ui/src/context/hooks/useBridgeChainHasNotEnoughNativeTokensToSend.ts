import {
    getAccountNativeTokenBalance,
    fetchLatestGasPrice,
} from "../commActions"
import { useMemo, useEffect } from "react"
import useAsyncInvoke, { Status } from "../../util/hooks/useAsyncInvoke"
import { BigNumber } from "ethers"
import { GasPriceData } from "@block-wallet/background/controllers/GasPricesController"

export enum EnoughNativeTokensToSend {
    UNKNOWN = "UNKNOWN",
    ENOUGH = "ENOUGH",
    NOT_ENOUGH = "NOT_ENOUGH",
}

interface NativeAndGasPrices {
    nativeTokenBalance: BigNumber | undefined
    gasPrices: GasPriceData | undefined
}

export const useAddressHasEnoughNativeTokensToSend = (
    chainId: number
): {
    isLoading: boolean
    result: EnoughNativeTokensToSend
} => {
    const { run, isLoading, data } = useAsyncInvoke<NativeAndGasPrices>({
        status: Status.PENDING,
    })

    useEffect(() => {
        run(
            new Promise<NativeAndGasPrices>(async (resolve) => {
                const [nativeTokenBalance, gasPrices] = await Promise.all([
                    getAccountNativeTokenBalance(chainId),
                    fetchLatestGasPrice(chainId),
                ])
                return resolve({
                    nativeTokenBalance,
                    gasPrices,
                })
            })
        )
    }, [run, chainId])

    return useMemo(() => {
        let result = EnoughNativeTokensToSend.UNKNOWN
        console.log(isLoading, data)
        if (!isLoading && data?.nativeTokenBalance && data.gasPrices) {
            result = EnoughNativeTokensToSend.ENOUGH //calculate(dataNativeToken, dataGasPrice)
        }
        return { isLoading, result }
    }, [isLoading, data])
}

// export const useBridgeChainHasNotEnoughNativeTokensToSend = (
//     address: string,
//     chainId: number
// ): EnoughNativeTokensToSend => {
// const userCanSend = useAddressHasEnoughNativeTokensToSend(
//     chainId
// )

// if (isNativeTokenAddress(address)) {
//     return EnoughNativeTokensToSend.ENOUGH
// }

// return userCanSend === undefined ? EnoughNativeTokensToSend.UNKNOWN : userCanSend ? EnoughNativeTokensToSend.ENOUGH : EnoughNativeTokensToSend.NOT_ENOUGH

//}

// userCanPayGasPrice(chainId, "send"){}
//
