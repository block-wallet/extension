import { GasPriceData } from "@block-wallet/background/controllers/GasPricesController"
import { useBlankState } from "../background/backgroundHooks"
import { useSelectedNetwork } from "./useSelectedNetwork"
import { useEffect, useState } from "react"
import { subscribeGasPriceLevels } from "../commActions"

export const useGasPriceData = () => {
    const { gasPriceData } = useBlankState()!
    const { chainId } = useSelectedNetwork()

    const [levels, setLevels] = useState<GasPriceData["gasPricesLevels"] | null>(null)

    useEffect(() => {
        let mounted = true
        subscribeGasPriceLevels((l) => {
            if (mounted) setLevels(l)
        })
        return () => {
            mounted = false
        }
    }, [])

    if (levels) {
        return { gasPricesLevels: levels } as GasPriceData
    }

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
