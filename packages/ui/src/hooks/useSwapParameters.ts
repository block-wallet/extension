import { useState, useCallback, useEffect } from "react"
import { SwapParameters, SwapRequestParams, SwapQuoteResponse } from "@block-wallet/background/controllers/SwapController"
import { getExchangeParameters } from "../context/commActions"
import { DEFAULT_EXCHANGE_TYPE } from "../util/exchangeUtils"
import { capitalize } from "../util/capitalize"

interface UseSwapParametersProps {
    fromAddress: string
    swapQuote: SwapQuoteResponse
    slippage: number
    shouldFetch: boolean
    refreshInterval?: number
}

interface UseSwapParametersReturn {
    swapParameters: SwapParameters | undefined
    error: string | undefined
    isLoading: boolean
    refetch: () => Promise<void>
    timeoutStart: number | undefined
}

export const useSwapParameters = ({
    fromAddress,
    swapQuote,
    slippage,
    shouldFetch,
    refreshInterval = 15000
}: UseSwapParametersProps): UseSwapParametersReturn => {
    const [swapParameters, setSwapParameters] = useState<SwapParameters | undefined>(undefined)
    const [error, setError] = useState<string | undefined>(undefined)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [timeoutStart, setTimeoutStart] = useState<number | undefined>(undefined)

    const fetchSwapParameters = useCallback(async () => {
        setError(undefined)
        setIsLoading(true)

        const params: SwapRequestParams = {
            fromAddress,
            fromToken: swapQuote.fromToken,
            toToken: swapQuote.toToken,
            amount: swapQuote.fromTokenAmount,
            slippage,
        }

        try {
            const swapParams = await getExchangeParameters(DEFAULT_EXCHANGE_TYPE, params)
            setSwapParameters(swapParams)
            setTimeoutStart(new Date().getTime())
        } catch (err: any) {
            setError(capitalize(err.message || "Error fetching swap"))
            setSwapParameters(undefined)
        } finally {
            setIsLoading(false)
        }
    }, [fromAddress, slippage, swapQuote.fromToken, swapQuote.fromTokenAmount, swapQuote.toToken])

    useEffect(() => {
        if (!shouldFetch) {
            setTimeoutStart(undefined)
            return
        }

        let timeoutRef: ReturnType<typeof setTimeout>

        const fetchWithInterval = async () => {
            await fetchSwapParameters()
            timeoutRef = setTimeout(fetchWithInterval, refreshInterval)
        }

        fetchWithInterval()

        return () => {
            if (timeoutRef) clearTimeout(timeoutRef)
        }
    }, [fetchSwapParameters, shouldFetch, refreshInterval])

    return {
        swapParameters,
        error,
        isLoading,
        refetch: fetchSwapParameters,
        timeoutStart
    }
}
