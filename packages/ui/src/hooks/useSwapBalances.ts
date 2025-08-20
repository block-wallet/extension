import { useMemo } from "react"
import { BigNumber } from "@ethersproject/bignumber"
import { Token } from "@block-wallet/background/controllers/erc-20/Token"
import { SwapParameters, SwapQuoteResponse } from "@block-wallet/background/controllers/SwapController"
import { useHasSufficientBalance } from "../context/hooks/useHasSufficientBalance"
import { isSwapNativeTokenAddress } from "../util/exchangeUtils"
import { createTokenBigNumber } from "../util/bigNumberUtils"

interface UseSwapBalancesProps {
    swapParameters: SwapParameters | undefined
    swapQuote: SwapQuoteResponse
    fromToken: Token
    nativeToken: Token
    fee: BigNumber
}

interface UseSwapBalancesReturn {
    fromTokenAmount: BigNumber
    total: BigNumber
    hasNativeAssetBalance: boolean
    hasFromTokenBalance: boolean
    hasBalance: boolean
    isSwappingNativeToken: boolean
}

export const useSwapBalances = ({
    swapParameters,
    swapQuote,
    fromToken,
    nativeToken,
    fee
}: UseSwapBalancesProps): UseSwapBalancesReturn => {
    const isSwappingNativeToken = useMemo(() => {
        const tokenAddress = swapParameters?.fromToken.address || swapQuote.fromToken.address
        return isSwapNativeTokenAddress(tokenAddress)
    }, [swapParameters?.fromToken.address, swapQuote.fromToken.address])

    const fromTokenAmount = useMemo(() => {
        const amount = swapParameters?.fromTokenAmount || swapQuote.fromTokenAmount
        const decimals = swapParameters?.fromToken.decimals || swapQuote.fromToken.decimals
        return createTokenBigNumber(amount, decimals)
    }, [
        swapParameters?.fromTokenAmount,
        swapParameters?.fromToken.decimals,
        swapQuote.fromTokenAmount,
        swapQuote.fromToken.decimals
    ])

    const total = useMemo(() => {
        return isSwappingNativeToken ? fromTokenAmount.add(fee) : fee
    }, [isSwappingNativeToken, fromTokenAmount, fee])

    const hasNativeAssetBalance = useHasSufficientBalance(total, nativeToken)

    const hasFromTokenBalance = useHasSufficientBalance(fromTokenAmount, fromToken)

    const hasBalance = useMemo(() => {
        return isSwappingNativeToken
            ? hasNativeAssetBalance
            : hasNativeAssetBalance && hasFromTokenBalance
    }, [isSwappingNativeToken, hasNativeAssetBalance, hasFromTokenBalance])

    return {
        fromTokenAmount,
        total,
        hasNativeAssetBalance,
        hasFromTokenBalance,
        hasBalance,
        isSwappingNativeToken
    }
}
