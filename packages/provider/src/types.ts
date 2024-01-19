import BlankProvider from './provider/BlankProvider';
import { JSONRPCMethod } from '@block-wallet/background/utils/types/ethereum';
import { Origin } from '@block-wallet/background/utils/types/communication';

// Global
type This = typeof globalThis;

export interface InjectedWindow extends This {
    ethereum: BlankProvider;
    web3: { currentProvider: BlankProvider };
}

// Provider interface
export interface EthereumProvider {
    readonly isBlockWallet: boolean;

    // Metamask compatibility
    readonly isMetaMask: boolean;
    autoRefreshOnNetworkChange: boolean;

    /**
     * ethereum.chainId
     *
     * @deprecated To retrieve the current chainId use use ethereum.request({ method: 'eth_chainId' })
     * or subscribe to chainChanged event.
     */
    chainId: string | null;

    /**
     * ethereum.networkVersion
     *
     * @deprecated To retrieve the network id use ethereum.request({ method: 'net_version' }).
     */
    networkVersion: string | null;

    /**
     * ethereum.selectedAddress
     *
     * @deprecated To retrieve the selected address use ethereum.request({ method: 'eth_accounts' }).
     */
    selectedAddress: string | null;

    // Methods
    isConnected(): boolean;
    request(args: RequestArguments): Promise<unknown>;

    /**
     * ethereum.send()
     *
     * @deprecated Use ethereum.request() instead.
     */
    send(request: JSONRPCRequest): JSONRPCResponse;
    send(request: JSONRPCRequest[]): JSONRPCResponse[];
    send(request: JSONRPCRequest, callback: Callback<JSONRPCResponse>): void;
    send(
        request: JSONRPCRequest[],
        callback: Callback<JSONRPCResponse[]>
    ): void;
    send<T = any>(method: string, params?: any[] | any): Promise<T>;

    /**
     * ethereum.sendAsync()
     *
     * @deprecated Use ethereum.request() instead.
     */
    sendAsync(
        request: JSONRPCRequest,
        callback: Callback<JSONRPCResponse>
    ): void;
    sendAsync(
        request: JSONRPCRequest[],
        callback: Callback<JSONRPCResponse[]>
    ): void;
    sendAsync(
        request: JSONRPCRequest | JSONRPCRequest[],
        callback: Callback<JSONRPCResponse> | Callback<JSONRPCResponse[]>
    ): void;

    /**
     * ethereum.enable()
     *
     * @deprecated Use ethereum.request({ method: 'eth_requestAccounts' }) instead.
     */
    enable(): Promise<string[]>;
}

export interface JSONRPCRequest<T = any[]> {
    jsonrpc: '2.0';
    id: number;
    method: JSONRPCMethod;
    params: T;
}

export interface JSONRPCResponse<T = any, U = any> {
    jsonrpc: '2.0';
    id: number;
    result?: T;
    error?: {
        code: number;
        message: string;
        data?: U;
    } | null;
}

export type Callback<T> = (err: Error | null, result: T | null) => void;

// Provider types

export interface ProviderSetupData {
    accounts: string[];
    chainId?: string;
    networkVersion?: string;
}

/**
 * Communication errors definition
 *
 * Common codes:
 *  - 4001: The request was rejected by the user
 *  - -32602: The parameters were invalid
 *  - -32603: Internal error
 */
export interface ProviderRpcError extends Error {
    code: number;
    data?: unknown;
}

export interface RequestArguments {
    readonly method: JSONRPCMethod;
    readonly params?: readonly unknown[] | Record<string, unknown>;
}

export interface ProviderMessage {
    readonly type: string;
    readonly data: unknown;
}

export interface EthSubscription extends ProviderMessage {
    readonly type: 'eth_subscription';
    readonly data: {
        readonly subscription: string;
        readonly result: unknown;
    };
}

/**
 * Legacy web3 eth_subscription type
 * @deprecated Only supported for non-updated DApps
 */
export interface Web3LegacySubscription {
    readonly jsonrpc: '2.0';
    readonly method: 'eth_subscription';
    readonly params: {
        readonly result: unknown;
        readonly subscription: string;
    };
}

// Provider events

export enum ProviderEvents {
    accountsChanged = 'accountsChanged',
    chainChanged = 'chainChanged',
    connect = 'connect',
    disconnect = 'disconnect',
    message = 'message',

    /**
     * close
     *
     * @deprecated Deprecated Web3 subscription event
     */
    close = 'close',

    /**
     * notification
     *
     * @deprecated Deprecated Web3 subscription event
     */
    notification = 'notification',

    /**
     * data
     *
     * @deprecated Deprecated Web3 subscription event
     */
    data = 'data',

    /**
     * networkChanged
     *
     * @deprecated Deprecated network change event
     */
    networkChanged = 'networkChanged',

    /**
     * chainIdChanged
     *
     * @deprecated Deprecated network change event
     */
    chainIdChanged = 'chainIdChanged',
}

export interface ProviderConnectInfo {
    readonly chainId: string;
}

export interface ChainChangedInfo {
    chainId: string;
    networkVersion: string;
}

// Site Metadata
export interface SiteMetadata {
    iconURL: string | null;
    name: string;
}

export enum Signals {
    SW_REINIT = 'SW_REINIT',
}

export type SignalMessage = {
    origin: Origin;
    signal: Signals;
};

export interface EIP6963ProviderInfo {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
}

export interface EIP6963ProviderDetail {
    info: EIP6963ProviderInfo;
    provider: BlankProvider;
}

// Announce Event dispatched by a Wallet
export interface EIP6963AnnounceProviderEvent extends CustomEvent {
    type: 'eip6963:announceProvider';
    detail: EIP6963ProviderDetail;
}
