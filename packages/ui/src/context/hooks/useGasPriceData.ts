import { GasPriceData } from "@block-wallet/background/controllers/GasPricesController"
import { useBlankState } from "../background/backgroundHooks"
import { useSelectedNetwork } from "./useSelectedNetwork"

export const useGasPriceData = () => {
    const { gasPriceData } = useBlankState()!
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
