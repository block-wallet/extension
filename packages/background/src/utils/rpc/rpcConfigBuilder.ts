export interface RPCChainConfig {
    initialERC20Block: number;
    batchMultiplier: number;
    maxBlockBatchSize: number;
}

const ERC20_INITIAL_BLOCKS: Record<number, number> = {
    1: 447767,
    3: 5943,
    4: 119945,
    5: 13543,
    10: 102,
    42: 32255,
    56: 57109,
    97: 235,
    100: 334457,
    137: 2764,
    250: 2323,
    42161: 60,
    43114: 20,
    80001: 136184,
};

export const DEFAULT_BATCH_MULTIPLIER = 20;

/**
 * Gets the multiplier for the max batch size
 * @param chainId
 * @returns
 */
function getChainBatchMultiplier(chainId: number): number {
    switch (chainId) {
        case 1:
        case 5:
        case 10:
        case 42:
        case 100:
        case 137:
        case 42161:
        case 43114:
        case 56:
        case 250:
            return DEFAULT_BATCH_MULTIPLIER;
        default:
            return 1;
    }
}

/**
 * Return the max safe block distance to fetch logs
 * @param chainId
 * @returns
 */
function getMaxBlockBatchSize(chainId: number): number {
    switch (chainId) {
        case 1:
        case 5:
        case 10:
        case 42:
        case 100:
        case 137:
        case 42161:
        case 43114:
            return 10000;
        case 56:
            return 5000;
        case 250:
            return 2000;
        default: // all the custom networks will be caught by this default because we don't know the quality of the RPCs
            return 100;
    }
}

export function buildRPCConfig(chainId: number): RPCChainConfig {
    return {
        batchMultiplier: getChainBatchMultiplier(chainId),
        initialERC20Block: ERC20_INITIAL_BLOCKS[chainId] ?? 0,
        maxBlockBatchSize: getMaxBlockBatchSize(chainId),
    };
}
