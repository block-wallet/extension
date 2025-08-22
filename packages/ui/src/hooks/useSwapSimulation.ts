import { useState, useEffect } from "react"
import { SwapParameters } from "@block-wallet/background/controllers/SwapController"
import { SimulationResult } from "@block-wallet/background/controllers/SimulationController"
import { simulateTransaction } from "../context/commActions"
import { createEtherBigNumber, createGasBigNumber } from "../util/bigNumberUtils"
import { parseUnits } from "@ethersproject/units"
import { BigNumber } from "@ethersproject/bignumber"

interface UseSwapSimulationProps {
    swapParameters: SwapParameters | undefined
    isSimulationEnabled: boolean
}

interface UseSwapSimulationReturn {
    simulation: SimulationResult | undefined
    simulationError: string | undefined
    isSimulating: boolean
}

export const useSwapSimulation = ({
    swapParameters,
    isSimulationEnabled
}: UseSwapSimulationProps): UseSwapSimulationReturn => {
    const [simulation, setSimulation] = useState<SimulationResult | undefined>(undefined)
    const [simulationError, setSimulationError] = useState<string | undefined>(undefined)
    const [isSimulating, setIsSimulating] = useState<boolean>(false)

    useEffect(() => {
        const runSimulation = async () => {
            if (!swapParameters) {
                setSimulation(undefined)
                setSimulationError(undefined)
                return
            }

            if (!isSimulationEnabled) {
                setSimulation(undefined)
                setSimulationError(undefined)
                return
            }

            setIsSimulating(true)
            setSimulationError(undefined)

            try {
                let normalizedGasPrice = undefined as ReturnType<typeof createGasBigNumber> | undefined
                try {
                    const gp: any = (swapParameters as any).tx?.gasPrice
                    if (gp !== undefined && gp !== null) {
                        if (typeof gp === 'string' && !gp.startsWith('0x') && gp.length <= 10) {
                            normalizedGasPrice = createGasBigNumber(parseUnits(gp, 'gwei').toString())
                        } else {
                            normalizedGasPrice = createGasBigNumber(gp)
                        }

                        const minReasonableWei = BigNumber.from(parseUnits('1', 'gwei'))
                        if (normalizedGasPrice.lt(minReasonableWei)) {
                            normalizedGasPrice = undefined
                        }
                    }
                } catch (_) {
                    normalizedGasPrice = undefined
                }

                const simulationParams = {
                    from: swapParameters.tx.from,
                    to: swapParameters.tx.to,
                    data: swapParameters.tx.data,
                    value: createEtherBigNumber(swapParameters.tx.value),
                    gasLimit: createGasBigNumber(swapParameters.tx.gas || 0),
                    gasPrice: normalizedGasPrice,
                }

                const result = await simulateTransaction(simulationParams)

                if (!result.success) {
                    const errorMessage = result.revertReason || result.errorMessage || "Simulation failed"
                    setSimulationError(errorMessage)
                    setSimulation(undefined)
                } else {
                    setSimulation(result)
                    setSimulationError(undefined)
                }
            } catch (error: any) {
                const errorMessage = error?.message || "Simulation error"
                setSimulationError(errorMessage)
                setSimulation(undefined)
            } finally {
                setIsSimulating(false)
            }
        }

        runSimulation()
    }, [swapParameters, isSimulationEnabled])

    return {
        simulation,
        simulationError,
        isSimulating
    }
}
