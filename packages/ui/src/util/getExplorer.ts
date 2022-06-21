import { Networks } from "@block-wallet/background/utils/constants/networks"
import {
    createExplorerLink,
    createAccountLink,
    getExplorerName,
} from "@block-wallet/explorer-link"
import { capitalize } from "./capitalize"

export const getChainIdFromNetwork = (networks: Networks, network?: String) => {
    if (!network) {
        return undefined
    }

    return Object.values(networks).find((i) => i.name === network)?.chainId
}

/**
 * Util to return a formatted network name from a given chain id
 *
 * @param chainId - Chain id hex string
 * @returns Chain name or 'Unknown'
 */
export const getNetworkFromChainId = (
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
    network: string,
    value: string,
    type: "tx" | "address"
) => {
    const chainId = String(getChainIdFromNetwork(networks, network))

    if (type === "tx") {
        return createExplorerLink(value, chainId)
    } else if (type === "address") {
        return createAccountLink(value, chainId)
    }
}

export const getExplorerTitle = (networks: Networks, network: string) => {
    const chainId = String(getChainIdFromNetwork(networks, network))

    return getExplorerName(chainId)
}
