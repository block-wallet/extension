import { IToken } from '@block-wallet/background/controllers/erc-20/Token';
import { BridgeStatus, BridgeSubstatus } from '../bridgeApi';

/**
 * Fees Config
 */
export const BASE_BRIDGE_FEE = 0;
export const BRIDGE_REFERRER_ADDRESS =
    '0x3110a855333bfb922aeCB1B3542ba2fdE28d204F';

export const LIFI_NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';

// Base endpoint
export const LIFI_BRIDGE_ENDPOINT = 'https://li.quest/v1';

export enum LiFiBridgeStatus {
    NOT_FOUND = 'NOT_FOUND',
    INVALID = 'INVALID',
    PENDING = 'PENDING',
    DONE = 'DONE',
    FAILED = 'FAILED',
}

export enum LiFiBridgeSubstatus {
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

export interface LiFiToken {
    address: string;
    symbol: string;
    decimals: number;
    chainId: number;
    name: string;
    coinKey: string;
    priceUSD: number;
    logoURI: string;
}

export interface LiFiChain {
    key: string;
    name: string;
    coin: string;
    id: number;
    mainnet: boolean;
    logoURI: string;
    tokenlistUrl: string;
}

export interface GetLifiTokensResponse {
    tokens: { [chainId: number]: LiFiToken[] };
}

export interface GetLifiChainsResponse {
    chains: LiFiChain[];
}

export interface GetLifiConnectionsResponse {
    connections: Connection[];
}
export interface GetLiFiQuoteResponse {
    id: string;
    type: string;
    tool: string;
    action: QuoteAction;
    estimate: Estimate;
    transactionRequest: LiFiTransactionRequest;
}

interface LifiTransactionData {
    txHash: string;
    txLink: string;
    amount: string;
    token: LiFiToken;
    chainId: number;
}

export interface GetLiFiStatusResponse {
    sending: LifiTransactionData;
    receiving: LifiTransactionData;
    status: LiFiBridgeStatus;
    substatus: LiFiBridgeSubstatus;
    tool: string;
}

interface QuoteAction {
    fromChainId: number;
    toChainId: number;
    fromToken: LiFiToken;
    toToken: LiFiToken;
    fromAmount: string;
    slippage: number;
    fromAddress: string;
    toAddress: string;
}

interface LiFiTransactionRequest {
    from: string;
    to: string;
    chainId: number;
    data: string;
    value: string;
    gasLimit: string;
    gasPrice: string;
}

interface Estimate {
    approvalAddress: string;
    fromAmount: string;
    toAmount: string;
}

interface Connection {
    fromChainId: number;
    toChainId: number;
    fromTokens: LiFiToken[];
    toTokens: LiFiToken[];
}

export interface LiFiErrorResponse {
    message: string;
    errors: {
        errorType: string;
        code: string;
    }[];
}

export const lifiTokenToIToken = (token: LiFiToken): IToken => {
    return {
        address: token.address,
        decimals: token.decimals,
        logo: token.logoURI,
        name: token.name,
        symbol: token.symbol,
        type: '',
    };
};

export const lifiBridgeStatusToBridgeStatus = (
    lifiStatus: LiFiBridgeStatus
): BridgeStatus => {
    return BridgeStatus[lifiStatus];
};

export const lifiBridgeSubstatusToBridgeSubstatus = (
    lifiSubstatus: LiFiBridgeSubstatus
): BridgeSubstatus => {
    return BridgeSubstatus[lifiSubstatus];
};