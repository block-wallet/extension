/**
 *  1Inch Aggregation Protocol v4.0
 *
 *  These types are defined following their public documentation
 *
 *  https://docs.1inch.io/docs/aggregation-protocol/introduction
 */
import { SwapQuote } from '@block-wallet/background/controllers/SwapController';
import { INITIAL_NETWORKS } from '../constants/networks';
import { retryHandling } from '../retryHandling';
import httpClient from './../http';
import { get1InchErrorMessageFromResponse, map1InchErrorMessage } from './1inchError';
import { BigNumber } from 'ethers';

const KLAYTN_MAINNET_CHAIN_ID = 8217;
const AURORA_MAINNET_CHAIN_ID = 1313161554;

// List of supported networks chain IDs
export const ONEINCH_SWAPS_NETWORKS: number[] = [
    INITIAL_NETWORKS.MAINNET.chainId,
    INITIAL_NETWORKS.BSC.chainId,
    INITIAL_NETWORKS.POLYGON.chainId,
    INITIAL_NETWORKS.OPTIMISM.chainId,
    INITIAL_NETWORKS.ARBITRUM.chainId,
    INITIAL_NETWORKS.AVALANCHEC.chainId,
    INITIAL_NETWORKS.FANTOM.chainId,
    INITIAL_NETWORKS.XDAI.chainId,
    INITIAL_NETWORKS.ZKSYNC_ERA_MAINNET.chainId,
    KLAYTN_MAINNET_CHAIN_ID,
    AURORA_MAINNET_CHAIN_ID,
];

/**
 * Swap Fees Config
 */
export const BASE_SWAP_FEE = 0.5;
export const REFERRER_ADDRESS = '0x3110a855333bfb922aeCB1B3542ba2fdE28d204F';

// API Recommended gas limit increase
export const GAS_LIMIT_INCREASE = 1.25;

// Base endpoint
export const ONEINCH_SWAPS_ENDPOINT = 'https://api-blockwallet.1inch.io/v5.0/';

// This address makes reference to the native asset
export const ONEINCH_NATIVE_ADDRESS =
    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

// Spender API response
export interface OneInchSpenderRes {
    address: string;
}

// API response token interface
export interface BasicToken {
    symbol: string;
    name: string;
    decimals: number;
    address: string;
    logoURI: string;
    tags: string[];
}

export interface OneInchSwapQuoteParams {
    fromTokenAddress: string; // Contract address of a token to sell
    toTokenAddress: string; // Contract address of a token to buy
    amount: string; // Amount of a token to sell, set in minimal divisible units
    fee?: number; // This percentage of fromTokenAddress token amount will be sent to referrerAddress
    protocols?: string; // Specify liquidity protocols to use. If not set, all liquidity protocols will be used
    gasPrice?: string; // 1inch takes in account gas expenses to determine exchange route. It is important to use the same gas price on the quote and swap methods - in wei
    complexityLevel?: string; // Maximum number of token-connectors to be used in a transaction. The more is used — the longer route estimation will take, the more complex route might be as a result.
    connectorTokens?: string; // Token-connectors can be specified via this parameter. Should be the same for a quote and swap
    gasLimit?: number; // Maximum amount of gas for a swap - Should be the same for a quote and swap
    mainRouteParts?: number; //	Limit maximum number of main route parts - Should be the same for a quote and swap
    parts?: number; // Limit maximum number of parts each main route part can be split into - Should be the same for a quote and swap
}

export interface OneInchSwapQuoteResponse {
    fromToken: BasicToken;
    toToken: BasicToken;
    fromTokenAmount: string; //	Input amount of fromToken in minimal divisible units
    toTokenAmount: string; // Result amount of toToken in minimal divisible units
    protocols: unknown[]; // Route of the trade
    estimatedGas: number; // Rough estimated amount of the gas limit for used protocols do not use estimatedGas from the quote method as the gas limit of a transaction
}

export interface OneInchSwapRequestParams {
    fromTokenAddress: string; // Contract address of a token to sell
    toTokenAddress: string; // Contract address of a token to buy
    amount: string; // Amount of a token to sell, set in minimal divisible units
    fromAddress: string; //	Address of a seller, make sure that this address has approved to spend fromTokenAddress in needed amount
    slippage: number; // Limit of price slippage you are willing to accept in percentage, may be set with decimals
    protocols?: string; // Specify liquidity protocols
    destReceiver?: string; // Recipient address of a purchased token
    referrerAddress?: string; // Referrer's address
    fee?: number; // This percentage of fromTokenAddress token amount will be sent to referrerAddress, the rest will be used as input for a swap
    gasPrice?: string; // 1inch takes in account gas expenses to determine exchange route. It is important to use the same gas price on the quote and swap methods. - in wei
    permit?: string; //	https://eips.ethereum.org/EIPS/eip-2612
    burnChi?: boolean; // If true, CHI will be burned from fromAddress to compensate gas.
    complexityLevel?: string; // Maximum number of token-connectors to be used in a transaction.
    connectorTokens?: string; // Token-connectors can be specified via this parameter. Should be the same for a quote and swap
    allowPartialFill?: boolean; // If true, the algorithm can cancel part of the route, if the rate has become less attractive. Unswapped tokens will return to the fromAddress - default: true
    disableEstimate?: boolean; // If true, disable most of the checks - default: false
    gasLimit?: number; // Maximum amount of gas for a swap
    mainRouteParts?: number; //	Limit maximum number of main route parts - Should be the same for a quote and swap
    parts?: number; // Limit maximum number of parts each main route parts can be split into; should be the same for a quote and swap
}

export interface OneInchSwapRequestResponse {
    fromToken: BasicToken;
    toToken: BasicToken;
    fromTokenAmount: string; // Input amount of fromToken in minimal divisible units
    toTokenAmount: string; // Result amount of toToken in minimal divisible units
    protocols: unknown[]; // Route of the trade
    tx: {
        from: string; // Transactions will be sent from this address
        to: string; // Transactions will be sent to our contract address
        data: string; // Bytes of call data
        value: string; // Amount of ETH (in wei) will be sent to the contract address
        gas: number; // Estimated amount of the gas limit, increase this value by 25%
        gasPrice: string; // Gas price in wei
    };
}


export const OneInchService = {
    async getSpender(chainId: number): Promise<string> {
        try {
            // 1Inch router contract address
            const res = await retryHandling<OneInchSpenderRes>(() =>
                httpClient.request<OneInchSpenderRes>(
                    `${ONEINCH_SWAPS_ENDPOINT}${chainId}/approve/spender`
                )
            );

            return res.address;

        } catch (error) {
            throw new Error('Unable to fetch exchange spender');
        }
    },
    async getSwapQuote(chainId: number, {
        fromTokenAddress,
        toTokenAddress,
        amount,
    }: OneInchSwapQuoteParams): Promise<SwapQuote> {
        try {
            const res = await retryHandling<OneInchSwapQuoteResponse>(() =>
                httpClient.request<OneInchSwapQuoteResponse>(
                    `${ONEINCH_SWAPS_ENDPOINT}${chainId}/quote`,
                    {
                        params: {
                            fromTokenAddress:
                                fromTokenAddress === '0x0'
                                    ? ONEINCH_NATIVE_ADDRESS
                                    : fromTokenAddress,
                            toTokenAddress:
                                toTokenAddress === '0x0'
                                    ? ONEINCH_NATIVE_ADDRESS
                                    : toTokenAddress,
                            amount,
                            fee: BASE_SWAP_FEE,
                        },
                    }
                )
            );

            return {
                ...res,
                blockWalletFee: BigNumber.from(res.fromTokenAmount)
                    .mul(BASE_SWAP_FEE * 10)
                    .div(1000),
                estimatedGas: Math.round(res.estimatedGas * GAS_LIMIT_INCREASE),
            };
        } catch (error) {
            const errMessage = map1InchErrorMessage(
                get1InchErrorMessageFromResponse(error) // Error should be of type RequestError
            );
            throw new Error(errMessage || 'Error getting 1Inch swap quote');
        }
    }
}