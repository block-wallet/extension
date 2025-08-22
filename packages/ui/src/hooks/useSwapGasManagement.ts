import { useState, useEffect, useRef } from "react"
import { BigNumber } from "@ethersproject/bignumber"
import { SwapParameters } from "@block-wallet/background/controllers/SwapController"
import { getLatestGasPrice, getSwapTransactionGasLimit } from "../context/commActions"
import { createGasBigNumber } from "../util/bigNumberUtils"

interface UseSwapGasManagementProps {
    swapParameters: SwapParameters | undefined
    isEIP1559Compatible: boolean
    defaultGasPrices: {
        gasPrice?: string | number | BigNumber | null
        maxPriorityFeePerGas?: string | number | BigNumber | null
        maxFeePerGas?: string | number | BigNumber | null
    }
    hasBalance: boolean
}

interface GasState {
    gasPrice: BigNumber
    gasLimit: BigNumber
}

interface GasFeesState {
    maxPriorityFeePerGas: BigNumber
    maxFeePerGas: BigNumber
}

interface UseSwapGasManagementReturn {
    defaultGas: GasState
    selectedFees: GasFeesState
    selectedGasPrice: BigNumber
    selectedGasLimit: BigNumber
    isGasLoading: boolean
    gasError: string | undefined
    setSelectedFees: (fees: GasFeesState) => void
    setSelectedGasPrice: (gasPrice: BigNumber) => void
    setSelectedGasLimit: (gasLimit: BigNumber) => void
}

export const useSwapGasManagement = ({
    swapParameters,
    isEIP1559Compatible,
    defaultGasPrices,
    hasBalance
}: UseSwapGasManagementProps): UseSwapGasManagementReturn => {
    const [defaultGas, setDefaultGas] = useState<GasState>({
        gasPrice: createGasBigNumber(defaultGasPrices.gasPrice ?? "0"),
        gasLimit: createGasBigNumber(0),
    })

    const [selectedFees, setSelectedFees] = useState<GasFeesState>({
        maxPriorityFeePerGas: createGasBigNumber(defaultGasPrices.maxPriorityFeePerGas ?? "0"),
        maxFeePerGas: createGasBigNumber(defaultGasPrices.maxFeePerGas ?? "0"),
    })

    const [selectedGasPrice, setSelectedGasPrice] = useState(
        createGasBigNumber(defaultGasPrices.gasPrice ?? "0")
    )

    const [selectedGasLimit, setSelectedGasLimit] = useState(createGasBigNumber(0))
    const [isGasLoading, setIsGasLoading] = useState<boolean>(true)
    const [gasError, setGasError] = useState<string | undefined>(undefined)

    const isGasInitialized = useRef<boolean>(false)

    useEffect(() => {
        const initializeGas = async () => {
            if ((!swapParameters && gasError) || !hasBalance) {
                setIsGasLoading(false)
                return
            }

            if (swapParameters && !isGasInitialized.current) {
                setIsGasLoading(true)
                setGasError(undefined)

                try {
                    let gasPrice: BigNumber = createGasBigNumber(0)

                    if (!isEIP1559Compatible) {
                        const latestGasPrice = await getLatestGasPrice()
                        gasPrice = createGasBigNumber(latestGasPrice)
                    }

                    const gasLimitEstimation = await getSwapTransactionGasLimit(swapParameters.tx)

                    const newDefaultGas: GasState = {
                        gasPrice,
                        gasLimit: createGasBigNumber(gasLimitEstimation.gasLimit),
                    }

                    setDefaultGas(newDefaultGas)
                    setSelectedGasLimit(newDefaultGas.gasLimit)

                    if (!isEIP1559Compatible) {
                        setSelectedGasPrice(gasPrice)
                    }

                    isGasInitialized.current = true
                } catch (error: any) {
                    setGasError("Error fetching gas estimates")
                    console.error("Gas estimation error:", error)
                } finally {
                    setIsGasLoading(false)
                }
            }
        }

        initializeGas()
    }, [swapParameters, gasError, hasBalance, isEIP1559Compatible])

    useEffect(() => {
        isGasInitialized.current = false
    }, [swapParameters?.tx.data, swapParameters?.tx.to])

    return {
        defaultGas,
        selectedFees,
        selectedGasPrice,
        selectedGasLimit,
        isGasLoading,
        gasError,
        setSelectedFees,
        setSelectedGasPrice,
        setSelectedGasLimit,
    }
}
