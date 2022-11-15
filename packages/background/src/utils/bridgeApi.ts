import axios from 'axios';
import { IToken } from '../controllers/erc-20/Token';
import { IChain } from './types/chain';
import {
    GetLifiChainsResponse,
    GetLifiConnectionsResponse,
    GetLiFiQuoteResponse,
    GetLiFiStatusResponse,
    GetLifiTokensResponse,
    lifiBridgeStatusToBridgeStatus,
    lifiBridgeSubstatusToBridgeSubstatus,
    LiFiErrorResponse,
    lifiFeeCostsToIBridgeFeeCosts,
    lifiTokenToIToken,
    LIFI_BRIDGE_ENDPOINT,
} from './types/lifi';

const getMessageFromLiFiError = (errCode: string) => {
    if (errCode === 'AMOUNT_TOO_LOW') {
        return 'The amount is too low for executing this bridge.';
    }
    if (errCode === 'QUOTE_NOT_FOUND') {
        return "There isn't a quote for the requested parameters.";
    }
};

export class QuoteNotFoundError extends Error {
    details: LiFiErrorResponse;
    constructor(message: string | undefined, details: LiFiErrorResponse) {
        super();
        this.message =
            message || "There isn't a quote for the requested parameters.";
        this.name = 'QuoteNotFoundError';
        this.details = details;
    }
}

export const isQuoteNotFoundError = (e: Error): boolean =>
    'QuoteNotFoundError' === e.name;

export enum BridgeImplementation {
    LIFI_BRIDGE = 'LIFI_BRIDGE',
}

//So far this statuses has been done using Li.Fi convention.
//To learn how do they work, please refer to their documentation: https://docs.li.fi/products/more-integration-options/li.fi-api/checking-the-status-of-a-transaction
export enum BridgeStatus {
    NOT_FOUND = 'NOT_FOUND',
    INVALID = 'INVALID',
    PENDING = 'PENDING',
    DONE = 'DONE',
    FAILED = 'FAILED',
}

export enum BridgeSubstatus {
    //Substatus of Pending state
    WAIT_SOURCE_CONFIRMATIONS = 'WAIT_SOURCE_CONFIRMATIONS',
    WAIT_DESTINATION_TRANSACTION = 'WAIT_DESTINATION_TRANSACTION',
    BRIDGE_NOT_AVAILABLE = 'BRIDGE_NOT_AVAILABLE',
    CHAIN_NOT_AVAILABLE = 'CHAIN_NOT_AVAILABLE',
    NOT_PROCESSABLE_REFUND_NEEDED = 'NOT_PROCESSABLE_REFUND_NEEDED',
    REFUND_IN_PROGRESS = 'REFUND_IN_PROGRESS',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',

    //Substatus of Done state
    COMPLETED = 'COMPLETED',
    PARTIAL = 'PARTIAL',
    REFUNDED = 'REFUNDED',
}

export interface getBridgeRoutesRequest {
    fromChainId: number;
    fromTokenAddress: string;
    toChainId?: number;
    toTokenAddress?: string;
}

export interface IBridgeFeeCost {
    token: IToken;
    details: {
        name: string;
        description: string;
        amount: string;
        percentage: string;
    }[];
    total: string;
}

export interface getBridgeQuoteRequest {
    fromChainId: number;
    toChainId: number;
    fromTokenAddress: string;
    toTokenAddress: string;
    fromAmount: string;
    fromAddress: string;
    referrer?: string;
    slippage?: number;
}

export interface BridgeTransactionRequest {
    from: string;
    to: string;
    chainId: number;
    data: string;
    value: string;
    gasLimit: string;
    gasPrice: string;
}

export interface IBridgeQuote {
    spender: string;
    transactionRequest: BridgeTransactionRequest;
    fromAmount: string;
    toAmount: string;
    fromToken: IToken;
    toToken: IToken;
    fromChainId: number;
    toChainId: number;
    tool: string;
    feeCosts: IBridgeFeeCost[];
    slippage: number;
}

export interface IBridgeRoute {
    fromTokens: IToken[];
    toTokens: IToken[];
    fromChainId: number;
    toChainId: number;
}

export enum BridgeTransactionStatus {
    NOT_FOUND = 'NOT_FOUND',
    INVALID = 'INVALID',
    PENDING = 'PEDNING',
    DONE = 'DONE',
    FAILED = 'FAILED',
}

interface BridgeTransactionData {
    txHash: string;
    txLink: string;
    amount: string;
    token?: IToken;
    chainId: number;
}

export interface IBridgeStatus {
    sendTransaction: BridgeTransactionData;
    receiveTransaction?: BridgeTransactionData;
    status: BridgeStatus;
    substatus?: BridgeSubstatus;
    tool: string;
}

export interface getStatusRequest {
    tool: string;
    fromChainId: number;
    toChainId: number;
    sendTxHash: string;
}

export interface IBridge {
    getSupportedTokensForChain: (chainId: number) => Promise<IToken[]>;
    getSupportedChains: () => Promise<IChain[]>;
    getRoutes: (r: getBridgeRoutesRequest) => Promise<IBridgeRoute[]>;
    getQuote: (r: getBridgeQuoteRequest) => Promise<IBridgeQuote>;
    getStatus: (r: getStatusRequest) => Promise<IBridgeStatus>;
}

const LiFiBridge: IBridge = {
    getSupportedTokensForChain: async function (
        chainId: number
    ): Promise<IToken[]> {
        const response = await axios.get<GetLifiTokensResponse>(
            `${LIFI_BRIDGE_ENDPOINT}/tokens`
        );
        const chainTokens = response.data.tokens[chainId] || [];
        return chainTokens.map(lifiTokenToIToken);
    },
    getSupportedChains: async function (): Promise<IChain[]> {
        const response = await axios.get<GetLifiChainsResponse>(
            `${LIFI_BRIDGE_ENDPOINT}/chains`
        );
        const chains = response.data.chains || [];
        return chains.map((chain) => ({
            id: chain.id,
            logo: chain.logoURI,
            name: chain.name,
            test: !chain.mainnet,
        }));
    },
    getRoutes: async function (
        request: getBridgeRoutesRequest
    ): Promise<IBridgeRoute[]> {
        const response = await axios.get<GetLifiConnectionsResponse>(
            `${LIFI_BRIDGE_ENDPOINT}/connections`,
            {
                params: {
                    allowExchanges: '[]',
                    fromChain: request.fromChainId,
                    toChain: request.toChainId,
                    fromToken: request.fromTokenAddress,
                    toToken: request.toTokenAddress,
                },
            }
        );
        const result = response.data.connections;
        return result.map((connection) => ({
            fromChainId: connection.fromChainId,
            toChainId: connection.toChainId,
            fromTokens: connection.fromTokens.map(lifiTokenToIToken),
            toTokens: connection.toTokens.map(lifiTokenToIToken),
        }));
    },
    getQuote: async function (r: getBridgeQuoteRequest): Promise<IBridgeQuote> {
        try {
            const response = await axios.get<
                GetLiFiQuoteResponse | LiFiErrorResponse
            >(`${LIFI_BRIDGE_ENDPOINT}/quote`, {
                params: {
                    fromToken: r.fromTokenAddress,
                    toToken: r.toTokenAddress,
                    fromChain: r.fromChainId,
                    toChain: r.toChainId,
                    fromAmount: r.fromAmount,
                    fromAddress: r.fromAddress,
                    referrer: r.referrer,
                    integrator: 'blockwallet.io',
                    slippage: r.slippage,
                },
            });
            const responseData = response.data as GetLiFiQuoteResponse;
            return {
                spender: responseData.estimate.approvalAddress,
                transactionRequest: responseData.transactionRequest,
                fromAmount: responseData.estimate.fromAmount,
                toAmount: responseData.estimate.toAmount,
                fromChainId: responseData.action.fromChainId,
                toChainId: responseData.action.toChainId,
                fromToken: lifiTokenToIToken(responseData.action.fromToken),
                toToken: lifiTokenToIToken(responseData.action.toToken),
                tool: responseData.tool,
                slippage: responseData.action.slippage,
                feeCosts: lifiFeeCostsToIBridgeFeeCosts(
                    responseData.estimate.feeCosts
                ),
            };
        } catch (e) {
            if (e.response.status === 400) {
                throw new Error('Request parameters are invalid.');
            } else if (e.response.status === 404) {
                const err = e.response.data as LiFiErrorResponse;
                const errorCode = err.errors?.length
                    ? err.errors[0].code
                    : 'QUOTE_NOT_FOUND';
                const message = getMessageFromLiFiError(errorCode);
                throw new QuoteNotFoundError(message, err);
            }
            throw e;
        }
    },
    getStatus: async function (r: getStatusRequest): Promise<IBridgeStatus> {
        const response = await axios.get<
            GetLiFiStatusResponse | LiFiErrorResponse
        >(`${LIFI_BRIDGE_ENDPOINT}/status`, {
            params: {
                bridge: r.tool,
                fromChain: r.fromChainId,
                toChain: r.toChainId,
                txHash: r.sendTxHash,
            },
            headers: {
                'Cache-Control': 'no-cache',
            },
        });
        if (response.status === 400) {
            throw new Error('Request parameters are invalid.');
        }
        const responseData = response.data as GetLiFiStatusResponse;

        return {
            status: lifiBridgeStatusToBridgeStatus(responseData.status),
            substatus: responseData.substatus
                ? lifiBridgeSubstatusToBridgeSubstatus(responseData.substatus)
                : undefined,
            sendTransaction: {
                amount: responseData.sending.amount,
                chainId: responseData.sending.chainId,
                token: responseData.sending.token
                    ? lifiTokenToIToken(responseData.sending.token)
                    : undefined,
                txHash: responseData.sending.txHash,
                txLink: responseData.sending.txLink,
            },
            receiveTransaction: responseData.receiving?.txHash
                ? {
                      amount: responseData.receiving.amount,
                      chainId: responseData.receiving.chainId,
                      token: lifiTokenToIToken(responseData.receiving.token),
                      txHash: responseData.receiving.txHash,
                      txLink: responseData.receiving.txLink,
                  }
                : undefined,
            tool: responseData.tool,
        };
    },
};

const bridgeAPIs: Record<BridgeImplementation, IBridge> = {
    [BridgeImplementation.LIFI_BRIDGE]: LiFiBridge,
};

export default bridgeAPIs;
