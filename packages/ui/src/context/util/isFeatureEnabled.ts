import { Network } from "@block-wallet/background/utils/constants/networks"

export const isFeatureEnabled = (
    network: Network,
    feature: string
): boolean => {
    return network.features.some((f) => f === feature)
}
