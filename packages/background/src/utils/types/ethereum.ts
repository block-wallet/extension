import { AppStateControllerState } from '@block-wallet/background/controllers/AppStateController';
import { BlankProviderControllerState } from '@block-wallet/background/controllers/BlankProviderController';
import { PermissionsControllerState } from '@block-wallet/background/controllers/PermissionsController';
import { TransactionVolatileControllerState } from '@block-wallet/background/controllers/transactions/TransactionController';
import { SiteMetadata } from '@block-wallet/provider/types';
import { TransactionParams } from '../../controllers/transactions/utils/types';

export type TransactionRequest = TransactionParams & { gas?: string | number };

export enum ProviderError {
    INVALID_PARAMS = 'INVALID_PARAMS',
    RESOURCE_UNAVAILABLE = 'RESOURCE_UNAVAILABLE',
    TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
    UNAUTHORIZED = 'UNAUTHORIZED',
    UNSUPPORTED_METHOD = 'UNSUPPORTED_METHOD',
    UNSUPPORTED_SUBSCRIPTION_TYPE = 'UNSUPPORTED_SUBSCRIPTION_TYPE',
    USER_REJECTED_REQUEST = 'USER_REJECTED_REQUEST',
}

// Types for window management
export enum WindowRequest {
    DAPP = 'DAPP',
    LOCK = 'LOCK',
    PERMISSIONS = 'PERMISSIONS',
    TRANSACTIONS = 'TRANSACTIONS',
}

export interface WindowRequestArguments {
    [WindowRequest.DAPP]: BlankProviderControllerState;
    [WindowRequest.LOCK]: AppStateControllerState;
    [WindowRequest.PERMISSIONS]: PermissionsControllerState;
    [WindowRequest.TRANSACTIONS]: TransactionVolatileControllerState;
}

// Type of dapp request
export enum DappReq {
    ASSET = 'ASSET',
    SIGNING = 'SIGNING',
    SWITCH_NETWORK = 'SWITCH_NETWORK',
    ADD_ETHEREUM_CHAIN = 'ADD_ETHEREUM_CHAIN',
}

export interface DappRequestParams {
    [DappReq.ASSET]: WatchAssetReq;
    [DappReq.SIGNING]: DappSignatureReq<SignatureMethods>;
    [DappReq.SWITCH_NETWORK]: NormalizedSwitchEthereumChainParameters;
    [DappReq.ADD_ETHEREUM_CHAIN]: NormalizedAddEthereumChainParameter;
}

export type DappRequestType = keyof DappRequestParams;

// Dapp request handle optional confirmation parameters
export interface DappRequestConfirmOptions {
    [DappReq.ASSET]: WatchAssetConfirmParams;
    [DappReq.ADD_ETHEREUM_CHAIN]: AddEthereumChainConfirmParams;
    [DappReq.SIGNING]: undefined;
    [DappReq.SWITCH_NETWORK]: undefined;
}

// Dapp request optional status type

export enum DappRequestSigningStatus {
    PENDING = 'DAPP_PENDING',
    APPROVED = 'DAPP_APPROVED',
    REJECTED = 'DAPP_REJECTED',
    FAILED = 'DAPP_FAILED',
    SIGNED = 'DAPP_SIGNED',
}

// Dapp request submitted to state interface
export interface DappRequest<Type extends DappRequestType> {
    type: Type;
    params: DappRequestParams[Type];
    origin: string;
    siteMetadata: SiteMetadata;
    originId: string;

    /**
     * The time at it was requested
     */
    time: number;

    /**
     * The status of the request (pending or approved)
     *
     * Used to display a different message to the user when signing messages
     * and awaiting confirmation in a hardware wallet device
     *
     * @default PENDING
     */
    status?: DappRequestSigningStatus;

    /**
     * A possible error message to display to the user
     *
     * Used to show the error message to the user if the view state is restored
     */
    error?: Error;

    /**
     * The time when the request was marked as APPROVED and submitted for signing (only for message signing requests)
     */
    approveTime?: number;
}

// EIP-3085
export interface AddEthereumChainParameter {
    chainId: string;
    blockExplorerUrls?: string[];
    chainName?: string;
    iconUrls?: string[];
    nativeCurrency?: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpcUrls?: string[];
}

export interface NormalizedAddEthereumChainParameter {
    chainId: number;
    chainName: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    iconUrl?: string;
    rpcUrl: string;
    blockExplorerUrl?: string;
    isTestnet: boolean;

    validations: {
        /**
         * Indicates if the provided Chain ID is known to the wallet
         */
        knownChainId: boolean;

        /**
         * Indicates if the block explorer is known to the specified chain
         */
        knownBlockExplorer: boolean;

        /**
         * Indicates if the rpcUrl is known to the specified chain
         */
        knownRpcUrl: boolean;

        /**
         * Indicates if icon data is custom or validated against our chain list
         */
        knownIcon: boolean;
    };
}

// EIP-3326
export interface SwitchEthereumChainParameters {
    chainId: string;
}

export interface NormalizedSwitchEthereumChainParameters {
    chainId: number;
}

// EIP-1193
export interface GetPermissionResponse {
    invoker: string;
    parentCapability?: string;
    caveats?: Record<string, unknown>[];
}

// https://geth.ethereum.org/docs/rpc/pubsub
export enum SubscriptionType {
    logs = 'logs',
    newHeads = 'newHeads',
    /**
     * @unsupported
     */
    newPendingTransactions = 'newPendingTransactions',
    /**
     * @unsupported
     */
    syncing = 'syncing',
}

export interface SubscriptionParam {
    [SubscriptionType.logs]?: {
        address?: string | string[]; // address or array of addresses
        topics?: string[]; // logs which match the specified topics
    };
    [SubscriptionType.newHeads]: undefined;
    [SubscriptionType.newPendingTransactions]: undefined;
    [SubscriptionType.syncing]: undefined;
}

export type SubscriptionParams = [
    SubscriptionType,
    SubscriptionParam[SubscriptionType]
];

export interface SubscriptionResult {
    method: 'eth_subscription';
    params: {
        subscription: string; // Subscription id
        result: Record<string, unknown>; // Subscription data
    };
}

/**
 * Subscription object.
 * It's created when a dApp ask for newBlocks or logs.
 */
export interface Subscription {
    id: string;
    portId: string;
    type: SubscriptionType;

    /**
     * Callback method that is triggered every
     * block update.
     *
     * @param chainId The current network chainId
     * @param previousBlockNumber The previous update block number
     * @param newBlockNumber The new update block number
     */
    notification(
        chainId: number,
        previousBlockNumber: number,
        newBlockNumber: number
    ): Promise<void>;
}

// EIP-747
export interface WatchAssetParameters {
    type: string; // Asset's interface
    options: {
        address: string;
        symbol?: string; // Ticker
        decimals?: number;
        image?: string; // URL or Base64 image
    };
}

export interface WatchAssetReq {
    params: {
        address: string;
        symbol: string; // Ticker
        decimals: number;
        image?: string; // URL
    };
    activeAccount?: string; // Account connected to the dapp
    isUpdate: boolean; // If token already exists
    savedToken?: WatchAssetReq['params']; // Existing token data
}

export interface WatchAssetConfirmParams {
    symbol: string;
    decimals: number;
    image: string;
}

export interface AddEthereumChainConfirmParams {
    saveImage: boolean;
}

export interface EstimateGasParams {
    data: string;
    from: string;
    to: string;
    value: string;
}

// EIP-712

// Raw data for each method (Direct input from the provider)
export interface RawSignatureData {
    [JSONRPCMethod.eth_sign]: [string, string]; // [account, data]
    [JSONRPCMethod.personal_sign]: [string, string]; // [data, account]
    [JSONRPCMethod.eth_signTypedData]: [V1TypedData[], string]; // [data, account]
    [JSONRPCMethod.eth_signTypedData_v1]: [V1TypedData[], string]; // [data, account]
    [JSONRPCMethod.eth_signTypedData_v3]: [string, string]; // [account, data]
    [JSONRPCMethod.eth_signTypedData_v4]: [string, string]; // [account, data]
}

// Data submitted to the dapp request
export interface NormalizedSignatureData {
    [JSONRPCMethod.eth_sign]: string;
    [JSONRPCMethod.personal_sign]: string;
    [JSONRPCMethod.eth_signTypedData]: V1TypedData[];
    [JSONRPCMethod.eth_signTypedData_v1]: V1TypedData[];
    [JSONRPCMethod.eth_signTypedData_v3]: TypedMessage<MessageSchema>;
    [JSONRPCMethod.eth_signTypedData_v4]: TypedMessage<MessageSchema>;
}

export type SignatureMethods = keyof RawSignatureData;

// Normalized signature parameters
export interface SignatureParams<T extends SignatureMethods> {
    address: string;
    data: RawSignatureData[T][0]; // It's actually inverted for v3 & v4 but it's the same type
}

// Signature dapp request interface
export interface DappSignatureReq<T extends SignatureMethods> {
    method: T;
    params: NormalizedSignatureParams<T>;
}

export interface NormalizedSignatureParams<T extends SignatureMethods> {
    address: string;
    data: NormalizedSignatureData[T];
    rawData?: string;
}

export type TypedSignatureMethods = Exclude<
    SignatureMethods,
    JSONRPCMethod.eth_sign | JSONRPCMethod.personal_sign
>;

// Adapt version to keyring sig util
export const sigVersion: {
    [method in TypedSignatureMethods]: { version: 'V1' | 'V3' | 'V4' };
} = {
    eth_signTypedData: { version: 'V1' },
    eth_signTypedData_v1: { version: 'V1' },
    eth_signTypedData_v3: { version: 'V3' },
    eth_signTypedData_v4: { version: 'V4' },
};

// eth_signTypedData_v1
export interface V1TypedData {
    name: string;
    type: string;
    value: unknown;
}

// eth_signTypedData_v3 & eth_signTypedData_v4
// V4 allows arrays in message content
export interface TypedMessage<T extends MessageSchema> {
    types: T;
    primaryType: keyof T;
    domain: EIP712Domain;
    message: Record<string, unknown>;
}

// "Domain" info for v3 and v4
export interface EIP712Domain {
    chainId?: number;
    name?: string;
    salt?: string;
    verifyingContract?: string;
    version?: string;
}

export type EIP712DomainKey = keyof EIP712Domain;

// v3 and v4 message schema
export interface MessageSchema {
    EIP712Domain: MessageTypeProperty[];
    [additionalProperties: string]: MessageTypeProperty[];
}

export declare type SignedMsgParams<D> = Required<MsgParams<D>>;

export interface MsgParams<D> {
    data: D;
    sig?: string;
}

interface MessageTypeProperty {
    name: string;
    type: string;
}

export const typedMessageSchema = {
    type: 'object',
    properties: {
        types: {
            type: 'object',
            additionalProperties: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        type: { type: 'string' },
                    },
                    required: ['name', 'type'],
                },
            },
        },
        primaryType: { type: 'string' },
        domain: { type: 'object' },
        message: { type: 'object' },
    },
    required: ['types', 'primaryType', 'domain', 'message'],
};

// JSON RPC methods

export enum JSONRPCMethod {
    db_getHex = 'db_getHex',
    db_getString = 'db_getString',
    db_putHex = 'db_putHex',
    db_putString = 'db_putString',
    eth_accounts = 'eth_accounts',
    eth_blockNumber = 'eth_blockNumber',
    eth_call = 'eth_call',
    eth_chainId = 'eth_chainId',
    eth_coinbase = 'eth_coinbase',
    eth_compileLLL = 'eth_compileLLL',
    eth_compileSerpent = 'eth_compileSerpent',
    eth_compileSolidity = 'eth_compileSolidity',
    eth_estimateGas = 'eth_estimateGas',
    eth_feeHistory = 'eth_feeHistory',
    eth_gasPrice = 'eth_gasPrice',
    eth_getBalance = 'eth_getBalance',
    eth_getBlockByHash = 'eth_getBlockByHash',
    eth_getBlockByNumber = 'eth_getBlockByNumber',
    eth_getBlockTransactionCountByHash = 'eth_getBlockTransactionCountByHash',
    eth_getBlockTransactionCountByNumber = 'eth_getBlockTransactionCountByNumber',
    eth_getCode = 'eth_getCode',
    eth_getCompilers = 'eth_getCompilers',
    eth_getFilterChanges = 'eth_getFilterChanges',
    eth_getFilterLogs = 'eth_getFilterLogs',
    eth_getLogs = 'eth_getLogs',
    eth_getStorageAt = 'eth_getStorageAt',
    eth_getTransactionByBlockHashAndIndex = 'eth_getTransactionByBlockHashAndIndex',
    eth_getTransactionByBlockNumberAndIndex = 'eth_getTransactionByBlockNumberAndIndex',
    eth_getTransactionByHash = 'eth_getTransactionByHash',
    eth_getTransactionCount = 'eth_getTransactionCount',
    eth_getTransactionReceipt = 'eth_getTransactionReceipt',
    eth_getUncleByBlockHashAndIndex = 'eth_getUncleByBlockHashAndIndex',
    eth_getUncleByBlockNumberAndIndex = 'eth_getUncleByBlockNumberAndIndex',
    eth_getUncleCountByBlockHash = 'eth_getUncleCountByBlockHash',
    eth_getUncleCountByBlockNumber = 'eth_getUncleCountByBlockNumber',
    eth_getWork = 'eth_getWork',
    eth_mining = 'eth_mining',
    eth_newBlockFilter = 'eth_newBlockFilter',
    eth_newFilter = 'eth_newFilter',
    eth_protocolVersion = 'eth_protocolVersion',
    eth_requestAccounts = 'eth_requestAccounts',
    eth_sendRawTransaction = 'eth_sendRawTransaction',
    eth_sendTransaction = 'eth_sendTransaction',
    eth_sign = 'eth_sign',
    eth_signTransaction = 'eth_signTransaction',
    eth_signTypedData = 'eth_signTypedData',
    eth_signTypedData_v1 = 'eth_signTypedData_v1',
    eth_signTypedData_v3 = 'eth_signTypedData_v3',
    eth_signTypedData_v4 = 'eth_signTypedData_v4',
    eth_submitWork = 'eth_submitWork',
    eth_uninstallFilter = 'eth_uninstallFilter',
    net_listening = 'net_listening',
    net_peerCount = 'net_peerCount',
    net_version = 'net_version',
    personal_ecRecover = 'personal_ecRecover',
    personal_sign = 'personal_sign',
    shh_addToGroup = 'shh_addToGroup',
    shh_getFilterChanges = 'shh_getFilterChanges',
    shh_getMessages = 'shh_getMessages',
    shh_hasIdentity = 'shh_hasIdentity',
    shh_newFilter = 'shh_newFilter',
    shh_newGroup = 'shh_newGroup',
    shh_newIdentity = 'shh_newIdentity',
    shh_post = 'shh_post',
    shh_uninstallFilter = 'shh_uninstallFilter',
    shh_version = 'shh_version',
    wallet_addEthereumChain = 'wallet_addEthereumChain',
    wallet_switchEthereumChain = 'wallet_switchEthereumChain',
    wallet_getPermissions = 'wallet_getPermissions',
    wallet_requestPermissions = 'wallet_requestPermissions',
    wallet_watchAsset = 'wallet_watchAsset',
    web3_clientVersion = 'web3_clientVersion',
    web3_sha3 = 'web3_sha3',
    // pub/sub
    eth_subscribe = 'eth_subscribe',
    eth_unsubscribe = 'eth_unsubscribe',
}

export interface Block {
    parentHash: string;
    sha3Uncles: string;
    miner: string;
    stateRoot: string;
    transactionsRoot: string;
    receiptsRoot: string;
    logsBloom: string;
    difficulty: string;
    number: string;
    gasLimit: string;
    gasUsed: string;
    timestamp: string;
    extraData: string;
    mixHash: string;
    nonce: string;
    baseFeePerGas: string;
    hash: string;
}

// External provider methods

export const ExtProviderMethods = [
    JSONRPCMethod.eth_call,
    JSONRPCMethod.eth_estimateGas,
    JSONRPCMethod.eth_feeHistory,
    JSONRPCMethod.eth_gasPrice,
    JSONRPCMethod.eth_getBalance,
    JSONRPCMethod.eth_getBlockByHash,
    JSONRPCMethod.eth_getBlockByNumber,
    JSONRPCMethod.eth_getBlockTransactionCountByHash,
    JSONRPCMethod.eth_getBlockTransactionCountByNumber,
    JSONRPCMethod.eth_getCode,
    JSONRPCMethod.eth_getLogs,
    JSONRPCMethod.eth_getStorageAt,
    JSONRPCMethod.eth_getTransactionByBlockHashAndIndex,
    JSONRPCMethod.eth_getTransactionByBlockNumberAndIndex,
    JSONRPCMethod.eth_getTransactionByHash,
    JSONRPCMethod.eth_getTransactionCount,
    JSONRPCMethod.eth_getTransactionReceipt,
    JSONRPCMethod.eth_getUncleByBlockHashAndIndex,
    JSONRPCMethod.eth_getUncleByBlockNumberAndIndex,
    JSONRPCMethod.eth_getUncleCountByBlockHash,
    JSONRPCMethod.eth_getUncleCountByBlockNumber,
    JSONRPCMethod.eth_getWork,
    JSONRPCMethod.eth_mining,
    JSONRPCMethod.eth_protocolVersion,
    JSONRPCMethod.eth_sendRawTransaction,
    JSONRPCMethod.eth_submitWork,
    JSONRPCMethod.net_listening,
    JSONRPCMethod.net_peerCount,
    JSONRPCMethod.net_version,
    JSONRPCMethod.web3_clientVersion,
];
