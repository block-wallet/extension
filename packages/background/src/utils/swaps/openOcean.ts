import { INITIAL_NETWORKS } from '../constants/networks';
import {
    BASE_SWAP_FEE,
    BasicToken,
    REFERRER_ADDRESS,
    SWAP_NATIVE_ADDRESS,
} from './1inch';
import { retryHandling } from '../retryHandling';
import httpClient from './../http';
import {
    SwapParameters,
    SwapQuoteParams,
    SwapQuoteResponse,
    SwapRequestParams,
} from '@block-wallet/background/controllers/SwapController';
import { formatUnits } from 'ethers/lib/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { ContractSignatureParser } from '@block-wallet/background/controllers/transactions/ContractSignatureParser';

type OpenOceanNetworks = {
    // ChainId: Smart Contract (for allowance spender param)
    [chainId: number]: string;
};
/**
 * OpenOcean Supported Chains
 * https://docs.openocean.finance/dev/supported-chains
 */
export const OPENOCEAN_AGGREGATOR_NETWORKS: OpenOceanNetworks = {
    [INITIAL_NETWORKS.MAINNET.chainId]:
        '0x6352a56caadc4f1e25cd6c75970fa768a3304e64',
    [INITIAL_NETWORKS.BSC.chainId]:
        '0x6352a56caadc4f1e25cd6c75970fa768a3304e64',
    [INITIAL_NETWORKS.POLYGON.chainId]:
        '0x6352a56caadc4f1e25cd6c75970fa768a3304e64',
    [INITIAL_NETWORKS.OPTIMISM.chainId]:
        '0x6352a56caadc4f1e25cd6c75970fa768a3304e64',
    [INITIAL_NETWORKS.ARBITRUM.chainId]:
        '0x6352a56caadc4f1e25cd6c75970fa768a3304e64',
    [INITIAL_NETWORKS.AVALANCHEC.chainId]:
        '0x6352a56caadc4f1e25cd6c75970fa768a3304e64',
    [INITIAL_NETWORKS.FANTOM.chainId]:
        '0x6352a56caadc4f1e25cd6c75970fa768a3304e64',
    [INITIAL_NETWORKS.XDAI.chainId]:
        '0x6352a56caadc4f1e25cd6c75970fa768a3304e64',
    [INITIAL_NETWORKS.ZKSYNC_ERA_MAINNET.chainId]:
        '0x36A1aCbbCAfca2468b85011DDD16E7Cb4d673230',
    [INITIAL_NETWORKS.POLYGON_ZKEVM.chainId]:
        '0x6dd434082EAB5Cd134B33719ec1FF05fE985B97b',
    [8453]: '0x6352a56caadc4f1e25cd6c75970fa768a3304e64', //Base
    [59140]: '0x6352a56caadC4F1E25CD6c75970Fa768A3304e64', //Linea
    [288]: '0x6352a56caadC4F1E25CD6c75970Fa768A3304e64', //Boba Network
    [1285]: '0x6352a56caadC4F1E25CD6c75970Fa768A3304e64', //Moonriver
    [1313161554]: '0x6352a56caadC4F1E25CD6c75970Fa768A3304e64', //Aurora
    [25]: '0x6352a56caadC4F1E25CD6c75970Fa768A3304e64', //Cronos
    [1666600000]: '0x6352a56caadC4F1E25CD6c75970Fa768A3304e64', //Harmony
    [2222]: '0x6352a56caadC4F1E25CD6c75970Fa768A3304e64', //Kava
    [1088]: '0x6352a56caadC4F1E25CD6c75970Fa768A3304e64', //Metis Andromeda
    [42220]: '0x6352a56caadC4F1E25CD6c75970Fa768A3304e64', //Celo
    [40]: '0x6352a56caadC4F1E25CD6c75970Fa768A3304e64', //Telos
    [58]: '0x6352a56caadC4F1E25CD6c75970Fa768A3304e64', //Ontology EVM
    [66]: '0xc0006Be82337585481044a7d11941c0828FFD2D4', //OKX Chain
    [128]: '0x6352a56caadC4F1E25CD6c75970Fa768A3304e64', //HECO Chain
    [204]: '0x6352a56caadC4F1E25CD6c75970Fa768A3304e64', //opBNB
    [5000]: '0x6352a56caadC4F1E25CD6c75970Fa768A3304e64', //Mantle
    [169]: '0x6352a56caadC4F1E25CD6c75970Fa768A3304e64', //Manta
    [534352]: '0x6352a56caadc4f1e25cd6c75970fa768a3304e64', //Scroll
};

export const OPENOCEAN_AGGREGATOR_ENDPOINT =
    'https://open-api.openocean.finance/v3/';

export const OPENOCEAN_GAS_LIMIT_INCREASE = 1.4;

// https://docs.openocean.finance/dev/aggregator-api-and-sdk/aggregator-api#api-reference

export interface OpenOceanSwapQuoteParams {
    chain: string;
    inTokenAddress: string;
    outTokenAddress: string;
    amount: string; // Please set token amount without decimals.e.g.   -1.00 ETH set as 1  -1.23 USDC set as 1.23
    gasPrice?: number; // set the gas price in GWEI without decimals.
    slippage?: number; // Define the acceptable slippage level by inputting a percentage value within the range of 0.05 to 50.
    enabledDexIds?: string; // https://docs.openocean.finance/dev/aggregator-api-and-sdk/aggregator-api#get-dexes-list
    disabledDexIds?: string; // enableDexIds has higher priority compare with disabledDexIds
}

export interface OpenOceanSwapQuoteResponse {
    code: number;
    data: {
        inToken: BasicToken;
        outToken: BasicToken;
        inAmount: string;
        outAmount: string;
        estimatedGas: number;
        path: object;
    };
}

export interface OpenOceanSwapRequestParams {
    chain: string;
    inTokenAddress: string;
    outTokenAddress: string;
    amount: string; // Please set token amount without decimals.e.g.   -1.00 ETH set as 1  -1.23 USDC set as 1.23
    gasPrice: number; // set the gas price in GWEI without decimals.
    slippage: number; // Define the acceptable slippage level by inputting a percentage value within the range of 0.05 to 50.
    account: string; // seller's address, please ensure that it has been approved to spend the necessary amount of inTokenAddress
    referrer: string; // the wallet address used to be mark as partners and receive an extra referrerFee from user.
    referrerFee: number; // Specify the percentage of in-token you wish to receive from the transaction, within the range of 0% to 3%, with 1% represented as '1'.
}

export interface OpenOceanSwapRequestResponse {
    code: number;
    data: {
        inToken: BasicToken;
        outToken: BasicToken;
        inAmount: string;
        outAmount: string;
        estimatedGas: number;
        from: string;
        to: string;
        value: string;
        data: string;
    };
}

export const OpenOceanService = {
    parseQuoteParams(
        chainId: number,
        { fromToken, toToken, amount, gasPrice }: SwapQuoteParams
    ): OpenOceanSwapQuoteParams {
        return {
            chain: chainId.toString(),
            inTokenAddress:
                fromToken.address === '0x0'
                    ? SWAP_NATIVE_ADDRESS
                    : fromToken.address,
            outTokenAddress:
                toToken.address === '0x0'
                    ? SWAP_NATIVE_ADDRESS
                    : toToken.address,
            amount: formatUnits(amount, fromToken.decimals),
            gasPrice: parseFloat(gasPrice ?? '0'),
            slippage: 1,
        };
    },
    parseSwapParams(
        chainId: number,
        {
            fromToken,
            toToken,
            fromAddress,
            amount,
            gasPrice,
            slippage,
        }: SwapRequestParams
    ): OpenOceanSwapRequestParams {
        return {
            chain: chainId.toString(),
            account: fromAddress,
            inTokenAddress: fromToken.address,
            outTokenAddress: toToken.address,
            amount: formatUnits(amount, fromToken.decimals),
            gasPrice: parseFloat(gasPrice ?? '0'),
            slippage,
            referrer: REFERRER_ADDRESS,
            referrerFee: BASE_SWAP_FEE,
        };
    },
    getSpender(chainId: number): string {
        if (chainId in OPENOCEAN_AGGREGATOR_NETWORKS)
            return OPENOCEAN_AGGREGATOR_NETWORKS[chainId];

        throw new Error('Unable to fetch exchange spender');
    },
    async getSwapQuote(
        chainId: number,
        params: SwapQuoteParams
    ): Promise<SwapQuoteResponse> {
        const {
            chain,
            inTokenAddress,
            outTokenAddress,
            amount,
            slippage,
            gasPrice,
        } = this.parseQuoteParams(chainId, params);
        const res = await retryHandling<OpenOceanSwapQuoteResponse>(() =>
            httpClient.request<OpenOceanSwapQuoteResponse>(
                `${OPENOCEAN_AGGREGATOR_ENDPOINT}${chainId}/swap_quote`,
                {
                    params: {
                        chain,
                        account: params.fromAddress,
                        referrer: REFERRER_ADDRESS,
                        referrerFee: BASE_SWAP_FEE,
                        inTokenAddress,
                        outTokenAddress,
                        amount,
                        slippage,
                        gasPrice,
                    },
                }
            )
        );

        if (res.code !== 200)
            throw new Error(
                'Could not find a quote for the swap. Try a different amount or token and check you have enough funds for the gas.'
            );

        return {
            fromToken: res.data.inToken,
            fromTokenAmount: res.data.inAmount,
            toToken: res.data.outToken,
            toTokenAmount: res.data.outAmount,
            blockWalletFee: BigNumber.from(res.data.inAmount)
                .mul(BASE_SWAP_FEE * 10)
                .div(1000),
            estimatedGas: Math.round(
                res.data.estimatedGas * OPENOCEAN_GAS_LIMIT_INCREASE
            ),
        };
    },
    async getSwapParameters(
        chainId: number,
        signatureParser: ContractSignatureParser,
        swapParams: SwapRequestParams
    ): Promise<SwapParameters> {
        const params = this.parseSwapParams(chainId, swapParams);
        const { code, data } =
            await retryHandling<OpenOceanSwapRequestResponse>(() =>
                httpClient.request<OpenOceanSwapRequestResponse>(
                    `${OPENOCEAN_AGGREGATOR_ENDPOINT}${chainId}/swap_quote`,
                    {
                        params: {
                            ...params,
                        },
                    }
                )
            );

        if (code !== 200)
            throw new Error(
                'There was a problem fetching the quote. Please try again.'
            );

        const methodSignature = await signatureParser.getMethodSignature(
            data.data,
            data.to
        );

        return {
            fromToken: data.inToken,
            toToken: data.outToken,
            fromTokenAmount: data.inAmount,
            toTokenAmount: data.outAmount,
            methodSignature,
            tx: {
                data: data.data,
                from: data.from,
                to: data.to,
                gas: Math.round(
                    data.estimatedGas * OPENOCEAN_GAS_LIMIT_INCREASE
                ),
                value: data.value,
                gasPrice: params.gasPrice.toString(),
            },
            blockWalletFee: BigNumber.from(data.inAmount)
                .mul(BASE_SWAP_FEE * 10)
                .div(1000),
        };
    },
};
