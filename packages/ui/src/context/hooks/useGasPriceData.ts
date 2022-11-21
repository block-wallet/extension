import { GasPriceData } from "@block-wallet/background/controllers/GasPricesController"
import { useGasPricesState } from "../background/useGasPricesState"
import { useSelectedNetwork } from "./useSelectedNetwork"

export const useGasPriceData = () => {
    const {
        state: { gasPriceData },
    } = useGasPricesState()
    const { chainId } = useSelectedNetwork()
    if (chainId in gasPriceData) {
        return gasPriceData[chainId]
    }

    return {
        gasPricesLevels: {
            slow: {
                gasPrice: null,
                maxFeePerGas: null,
                maxPriorityFeePerGas: null,
            },
            average: {
                gasPrice: null,
                maxFeePerGas: null,
                maxPriorityFeePerGas: null,
            },
            fast: {
                gasPrice: null,
                maxFeePerGas: null,
                maxPriorityFeePerGas: null,
            },
        },
    } as GasPriceData
}
