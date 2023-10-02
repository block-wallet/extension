import { INITIAL_NETWORKS } from '../constants/networks';
import { BasicToken } from './1inch';
import { retryHandling } from '../retryHandling';
import httpClient from './../http';
import { SwapQuote } from '@block-wallet/background/controllers/SwapController';


type OpenOceanNetworks = {
    // ChainId: Smart Contract (for allowance spender param)
    [chainId: number]: string;
}
/**
 * OpenOcean Supported Chains
 * https://docs.openocean.finance/dev/supported-chains
 */
export const OPENOCEAN_AGGREGATOR_NETWORKS: OpenOceanNetworks = {
    [INITIAL_NETWORKS.MAINNET.chainId]: "0x6352a56caadc4f1e25cd6c75970fa768a3304e64",
    [INITIAL_NETWORKS.BSC.chainId]: "0x6352a56caadc4f1e25cd6c75970fa768a3304e64",
    [INITIAL_NETWORKS.POLYGON.chainId]: "0x6352a56caadc4f1e25cd6c75970fa768a3304e64",
    [INITIAL_NETWORKS.OPTIMISM.chainId]: "0x6352a56caadc4f1e25cd6c75970fa768a3304e64",
    [INITIAL_NETWORKS.ARBITRUM.chainId]: "0x6352a56caadc4f1e25cd6c75970fa768a3304e64",
    [INITIAL_NETWORKS.AVALANCHEC.chainId]: "0x6352a56caadc4f1e25cd6c75970fa768a3304e64",
    [INITIAL_NETWORKS.FANTOM.chainId]: "0x6352a56caadc4f1e25cd6c75970fa768a3304e64",
    [INITIAL_NETWORKS.XDAI.chainId]: "0x6352a56caadc4f1e25cd6c75970fa768a3304e64",
    [INITIAL_NETWORKS.ZKSYNC_ERA_MAINNET.chainId]: "0x36A1aCbbCAfca2468b85011DDD16E7Cb4d673230",
    [INITIAL_NETWORKS.POLYGON_ZKEVM.chainId]: "0x6dd434082EAB5Cd134B33719ec1FF05fE985B97b",
    [8453]: "0x6352a56caadc4f1e25cd6c75970fa768a3304e64", //Base
    [59140]: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", //Linea
    [288]: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", //Boba Network
    [1285]: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", //Moonriver
    [1313161554]: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", //Aurora
    [25]: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", //Cronos
    [1666600000]: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", //Harmony
    [2222]: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", //Kava
    [1088]: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", //Metis Andromeda
    [42220]: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", //Celo
    [40]: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", //Telos
    [58]: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", //Ontology EVM
    [66]: "0xc0006Be82337585481044a7d11941c0828FFD2D4", //OKX Chain
    [128]: "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64", //HECO Chain
};

export const OPENOCEAN_AGGREGATOR_ENDPOINT =
    'https://open-api.openocean.finance/v3/';

// https://docs.openocean.finance/dev/aggregator-api-and-sdk/aggregator-api#api-reference

export interface OpenOceanSwapQuoteParams {
    chain: string;
    inTokenAddress: string;
    outTokenAddress: string;
    amount: number; // Please set token amount without decimals.
    gasPrice: number; // set the gas price in GWEI without decimals. TODO: Set default High from network.
    slippage?: number; // Define the acceptable slippage level by inputting a percentage value within the range of 0.05 to 50.
    enabledDexIds?: string; // https://docs.openocean.finance/dev/aggregator-api-and-sdk/aggregator-api#get-dexes-list
    disabledDexIds?: string; // enableDexIds has higher priority compare with disabledDexIds

}

export interface OpenOceanSwapQuoteResponse {
    inToken: BasicToken;
    outToken: BasicToken;
    inAmount: string;
    outAmount: string;
    estimatedGas: number;
    path: object
}


export const OpenOceanService = {
    getSpender(chainId: number): string {
        if (chainId in OPENOCEAN_AGGREGATOR_NETWORKS)
            return OPENOCEAN_AGGREGATOR_NETWORKS[chainId]

        throw new Error('Unable to fetch exchange spender');
    },
    async getSwapQuote(chainId: number, { inTokenAddress, outTokenAddress, amount, slippage = 1 }: OpenOceanSwapQuoteParams): Promise<SwapQuote> {
        try {
            const res = await retryHandling<OpenOceanSwapQuoteResponse>(() =>
                httpClient.request<OpenOceanSwapQuoteResponse>(
                    `${OPENOCEAN_AGGREGATOR_ENDPOINT}/${chainId}/quote`,
                    {
                        params: {
                            inTokenAddress,
                            outTokenAddress,
                            amount,
                            slippage,
                            gasPrice: 69034743641

                        }
                    }
                ));

            return {
                fromToken: res.inToken,
                fromTokenAmount: res.inAmount,
                toToken: res.outToken,
                toTokenAmount: res.outAmount,
                estimatedGas: res.estimatedGas,

            };
        } catch (error) {
            throw new Error("Error getting OpenOcean swap quote")
        }
    }
}

