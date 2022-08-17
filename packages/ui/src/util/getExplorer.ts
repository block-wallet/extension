import {
    Network,
    Networks,
} from "@block-wallet/background/utils/constants/networks"
import {
    createCustomExplorerLink,
    createCustomAccountLink,
} from "@block-wallet/explorer-link"
import { capitalize } from "./capitalize"

export const getChainIdFromNetwork = (networks: Networks, network?: String) => {
    if (!network) {
        return undefined
    }

    return Object.values(networks).find((i) => i.name === network)?.chainId
}

export const getNetworkFromChainId = (
    networks: Networks,
    chainId: number
): Network | undefined => {
    return Object.values(networks).find((i) => i.chainId === chainId)
}

/**
 * Util to return a formatted network name from a given chain id
 *
 * @param chainId - Chain id hex string
 * @returns Chain name or 'Unknown'
 */
export const getNetworkNameFromChainId = (
    networks: Networks,
    chainId: number,
    nameOrDesc: "name" | "desc" = "name"
): string => {
    const network = Object.values(networks).find((i) => i.chainId === chainId)

    const networkName = network !== undefined ? network[nameOrDesc] : undefined

    if (networkName) {
        return capitalize(networkName)
    } else {
        return "Unknown"
    }
}

export const generateExplorerLink = (
    networks: Networks,
    networkName: string,
    value: string,
    type: "tx" | "address"
) => {
    const chainId = getChainIdFromNetwork(networks, networkName)
    if (!chainId) {
        return undefined
    }

    const network = getNetworkFromChainId(networks, chainId)
    if (!network) {
        return undefined
    }

    if (!network.blockExplorerUrls || network.blockExplorerUrls.length < 1) {
        return undefined
    }

    if (type === "tx") {
        return createCustomExplorerLink(value, network.blockExplorerUrls[0])
    } else if (type === "address") {
        return createCustomAccountLink(value, network.blockExplorerUrls[0])
    }
}

export const getExplorerTitle = (networks: Networks, networkName: string) => {
    const chainId = getChainIdFromNetwork(networks, networkName)

    if (!chainId) {
        return "Explorer"
    }

    const network = getNetworkFromChainId(networks, chainId)
    if (!networkName) {
        return "Explorer"
    }

    return network?.blockExplorerName || "Explorer"
}
