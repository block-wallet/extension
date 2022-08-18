import { Network } from "@block-wallet/background/utils/constants/networks"
const MAINNET_CHAIN_ID = 1

const sortNetworksByOrder = (n1: Network, n2: Network) => {
    return n1.order - n2.order
}

const getFirstUrl = (urls: string[] | undefined) => {
    if (!urls || !urls?.length) {
        return ""
    }
    return urls[0]
}

const canDeleteNetwork = (network: Network) => {
    return network.chainId !== MAINNET_CHAIN_ID
}

/**
 * Parses the given parameter as Int so that users can specify the ID in decimals or hex.
 * @param chainId Chain ID expressed in decimal or hexadecimal notation.
 * @returns the chain ID specified in decimal notation
 */
const parseChainId = (chainId?: string): number | undefined => {
    return chainId ? parseInt(chainId) : undefined
}

export { getFirstUrl, sortNetworksByOrder, canDeleteNetwork, parseChainId }
