import { getAccountNativeTokenBalance, fetchLatestGasPrice } from "../commActions";
import { useMemo, useEffect } from "react";
import useAsyncInvoke, { Status } from "../../util/hooks/useAsyncInvoke";

export enum EnoughNativeTokensToSend {
    UNKNOWN = 'UNKNOWN',
    ENOUGH = 'ENOUGH',
    NOT_ENOUGH = 'NOT_ENOUGH',
}

export const useAddressHasEnoughNativeTokensToSend = (
    chainId: number
) => {
    const { run: runNativeToken, isLoading: isLoadingNativeToken, data: dataNativeToken } = useAsyncInvoke({ status: Status.PENDING })
    const { run: runGasPrice, isLoading: isLoadingGasPrice, data: dataGasPrice } = useAsyncInvoke({ status: Status.PENDING })

    useEffect(() => {
        runNativeToken(getAccountNativeTokenBalance(chainId))
        runGasPrice(fetchLatestGasPrice(chainId))


    }, []);

    return useMemo(() => {
        const isLoading = isLoadingGasPrice || isLoadingNativeToken
        let result = EnoughNativeTokensToSend.UNKNOWN
        console.log(isLoading, dataGasPrice, dataNativeToken)
        if (!isLoading && dataNativeToken && dataGasPrice) {
            result = EnoughNativeTokensToSend.ENOUGH//calculate(dataNativeToken, dataGasPrice)
        }
        return { isLoading, result };
    }, [isLoadingGasPrice, isLoadingNativeToken, dataNativeToken, dataGasPrice])
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