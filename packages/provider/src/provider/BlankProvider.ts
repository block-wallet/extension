/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
    Callback,
    RequestArguments,
    JSONRPCRequest,
    JSONRPCResponse,
    ProviderConnectInfo,
    ProviderRpcError,
    ProviderEvents,
    EthereumProvider,
    ChainChangedInfo,
    EthSubscription,
    Web3LegacySubscription,
    Signals,
} from '../types';
import {
    ExternalEventSubscription,
    Handlers,
    MessageTypes,
    Messages,
    RequestTypes,
    ResponseTypes,
    SubscriptionMessageTypes,
    TransportResponseMessage,
    EXTERNAL,
    Origin,
    WindowTransportRequestMessage,
} from '@block-wallet/background/utils/types/communication';
import SafeEventEmitter from '@metamask/safe-event-emitter';
import { ethErrors } from 'eth-rpc-errors';
import { getIconData } from '../utils/site';
import { JSONRPCMethod } from '@block-wallet/background/utils/types/ethereum';
import { validateError } from '../utils/errors';
import log from 'loglevel';
import {
    getBlockWalletCompatibility,
    updateBlockWalletCompatibility,
} from '../utils/compatibility';

interface BlankProviderState {
    accounts: string[];
    isConnected: boolean;
}

const MAX_EVENT_LISTENERS = 100;

/**
 * Blank Provider
 *
 */
export default class BlankProvider
    extends SafeEventEmitter
    implements EthereumProvider
{
    public isBlockWallet = true;
    public isMetaMask = true;
    public chainId: string | null;
    public selectedAddress: string | null;
    public networkVersion: string | null;
    public autoRefreshOnNetworkChange: boolean;
    private _state: BlankProviderState;
    private _handlers: Handlers;
    private _requestId: number;
    private _ethSubscriptions: {
        [reqId: string]: {
            params: any;
            subId: string;
            prevSubId: string;
        };
    };

    private _metamask: {
        isEnabled: () => boolean;
        isApproved: () => Promise<boolean>;
        isUnlocked: () => Promise<boolean>;
    };

    constructor() {
        super();

        this._state = {
            accounts: [],
            isConnected: true,
        };

        this.chainId = null;
        this.selectedAddress = null;
        this.networkVersion = null;

        this._handlers = {};
        this._requestId = 0;

        const cachedCompatibility = getBlockWalletCompatibility();
        this.isBlockWallet = cachedCompatibility.isBlockWallet ?? true;
        this._ethSubscriptions = {};

        // Metamask compatibility
        this.isMetaMask = !this.isBlockWallet;
        this._updateSiteCompatibility();

        this.autoRefreshOnNetworkChange = false;
        this._metamask = {
            isEnabled: () => true,
            isApproved: async () => true,
            isUnlocked: async () => true,
        };

        // Bind non arrow functions
        this.send = this.send.bind(this);
        this.sendAsync = this.sendAsync.bind(this);

        // Setup provider
        this._setupProvider();

        // Subscribe to state updates
        this._eventSubscription(this._eventHandler);

        // Set maximum amount of event listeners
        this.setMaxListeners(MAX_EVENT_LISTENERS);

        // Set site icon
        this._setIcon();
    }

    /**
     * This method checks whether the current page is compatible with BlockWallet.
     * If the site is not compatible, the isBlockWallet flag will be set to false when injecting the provider and isMetamask will be true.
     */
    private async _updateSiteCompatibility(): Promise<void> {
        const providerConfig = await this._postMessage(
            Messages.EXTERNAL.GET_PROVIDER_CONFIG
        );
        const { isBlockWallet } = updateBlockWalletCompatibility(
            providerConfig.incompatibleSites
        );
        this.isBlockWallet = isBlockWallet;
        this.isMetaMask = !isBlockWallet;
    }

    private async reInitializeSubscriptions() {
        log.trace('reInitializeSubscriptions', 'init', this._ethSubscriptions);
        for (const reqId in this._ethSubscriptions) {
            const { params, subId, prevSubId } = this._ethSubscriptions[reqId];
            const request: RequestArguments = {
                method: JSONRPCMethod.eth_subscribe,
                params,
            };

            log.trace(reqId, 'request', request);
            await this._postMessage(
                Messages.EXTERNAL.REQUEST,
                request,
                undefined,
                reqId
            );
            this._ethSubscriptions[reqId].prevSubId =
                prevSubId && prevSubId !== '' ? prevSubId : subId;
        }
        log.trace('reInitializeSubscriptions', 'end', this._ethSubscriptions);
    }

    /**
     * handleSignal
     *
     * Handles a signal
     *
     * @param signal The signal received
     */
    public handleSignal(signal: Signals): void {
        switch (signal) {
            case Signals.SW_REINIT:
                this._eventSubscription(this._eventHandler);
                this.reInitializeSubscriptions();
                break;
            default:
                log.debug('Unrecognized signal received');
                break;
        }
    }

    /**
     * Public method to check if the provider is connected
     *
     */
    public isConnected = (): boolean => {
        return this._state.isConnected;
    };

    /**
     * Public request method
     *
     * @param args Request arguments
     * @returns Request response
     */
    public request = async (args: RequestArguments): Promise<unknown> => {
        if (!this._state.isConnected) {
            throw ethErrors.provider.disconnected();
        }

        if (!args || typeof args !== 'object' || Array.isArray(args)) {
            throw ethErrors.rpc.invalidRequest({
                message: 'Expected a single, non-array, object argument.',
                data: args,
            });
        }

        const { method, params } = args;

        if (typeof method !== 'string' || method.length === 0) {
            throw ethErrors.rpc.invalidRequest({
                message: "'method' property must be a non-empty string.",
                data: args,
            });
        }

        if (
            params !== undefined &&
            !Array.isArray(params) &&
            (typeof params !== 'object' || params === null)
        ) {
            throw ethErrors.rpc.invalidRequest({
                message:
                    "'params' property must be an object or array if provided.",
                data: args,
            });
        }

        return this._postMessage(Messages.EXTERNAL.REQUEST, args);
    };

    /**
     * Response handler
     *
     */
    public handleResponse = <TMessageType extends MessageTypes>(
        data: TransportResponseMessage<TMessageType>
    ): void => {
        const handler = this._handlers[data.id];

        if (!handler) {
            log.error('Unknown response', data);

            return;
        }

        if (!handler.subscriber) {
            delete this._handlers[data.id];
        }

        // check for subscription id in response
        this.setEthSubscriptionsSubId(data);

        if (data.subscription) {
            (handler.subscriber as (data: any) => void)(data.subscription);
        } else if (data.error) {
            // Deserialze error object
            const parsedError = JSON.parse(data.error);
            const err = new Error(parsedError.message);

            // Validate error and reject promise
            const valdatedErr = validateError(err.message);
            handler.reject(valdatedErr);
        } else {
            handler.resolve(data.response);
        }
    };

    /* ----------------------------------------------------------------------------- */
    /* Deprecated request methods
    /* ----------------------------------------------------------------------------- */

    /**
     * Deprecated send method
     *
     */
    public send(request: JSONRPCRequest): JSONRPCResponse;
    public send(request: JSONRPCRequest[]): JSONRPCResponse[];
    public send(
        request: JSONRPCRequest,
        callback: Callback<JSONRPCResponse>
    ): void;
    public send(
        request: JSONRPCRequest[],
        callback: Callback<JSONRPCResponse[]>
    ): void;
    public send<T = any>(method: string, params?: any[] | any): Promise<T>;
    public send(
        requestOrMethod: JSONRPCRequest | JSONRPCRequest[] | string,
        callbackOrParams?:
            | Callback<JSONRPCResponse>
            | Callback<JSONRPCResponse[]>
            | any[]
            | any
    ): JSONRPCResponse | JSONRPCResponse[] | void | Promise<any> {
        this.deprecationWarning('ethereum.send(...)', true);

        // send<T>(method, params): Promise<T>
        if (typeof requestOrMethod === 'string') {
            const method = requestOrMethod as JSONRPCMethod;
            const params = Array.isArray(callbackOrParams)
                ? callbackOrParams
                : callbackOrParams !== undefined
                ? [callbackOrParams]
                : [];
            const request: RequestArguments = {
                method,
                params,
            };
            const response = this._postMessage(
                Messages.EXTERNAL.REQUEST,
                request
            );

            return response;
        }

        // send(JSONRPCRequest | JSONRPCRequest[], callback): void
        if (typeof callbackOrParams === 'function') {
            const request = requestOrMethod as any;
            const callback = callbackOrParams as any;
            return this.sendAsync(request, callback);
        }

        // send(JSONRPCRequest[]): JSONRPCResponse[]
        if (Array.isArray(requestOrMethod)) {
            const requests = requestOrMethod;
            return requests.map((r) => this._sendJSONRPCRequest(r));
        }

        // send(JSONRPCRequest): JSONRPCResponse
        const req = requestOrMethod as JSONRPCRequest;
        return this._sendJSONRPCRequest(req);
    }

    /**
     * Asynchronous send method
     *
     */
    public sendAsync(
        request: JSONRPCRequest,
        callback: Callback<JSONRPCResponse>
    ): void;
    public sendAsync(
        request: JSONRPCRequest[],
        callback: Callback<JSONRPCResponse[]>
    ): void;
    public sendAsync(
        request: JSONRPCRequest | JSONRPCRequest[],
        callback: Callback<JSONRPCResponse> | Callback<JSONRPCResponse[]>
    ): void {
        this.deprecationWarning('ethereum.sendAsync(...)', true);

        if (typeof callback !== 'function') {
            throw ethErrors.rpc.invalidRequest({
                message: 'A callback is required',
            });
        }

        // send(JSONRPCRequest[], callback): void
        if (Array.isArray(request)) {
            const arrayCb = callback as Callback<JSONRPCResponse[]>;
            this._sendMultipleRequestsAsync(request)
                .then((responses) => arrayCb(null, responses))
                .catch((err) => arrayCb(err, null));
            return;
        }

        // send(JSONRPCRequest, callback): void
        const cb = callback as Callback<JSONRPCResponse>;
        this._sendRequestAsync(request)
            .then((response) => cb(null, response))
            .catch((err) => cb(err, null));
    }

    public enable = async (): Promise<string[]> => {
        this.deprecationWarning('ethereum.enable(...)', true);
        const accounts = (await this._postMessage(Messages.EXTERNAL.REQUEST, {
            method: JSONRPCMethod.eth_requestAccounts,
        })) as string[];

        return accounts;
    };

    /* ----------------------------------------------------------------------------- */
    /* Provider setup
    /* ----------------------------------------------------------------------------- */

    /**
     * Provider setup
     *
     */
    private _setupProvider = async () => {
        const { accounts, chainId, networkVersion } = await this._postMessage(
            Messages.EXTERNAL.SETUP_PROVIDER
        );

        if (chainId !== undefined && networkVersion !== undefined) {
            this.networkVersion = networkVersion;
            this.chainId = chainId;

            this._connect({ chainId });
        }

        this._accountsChanged(accounts);
    };

    /**
     * Subscribes to events updates
     *
     * @param cb update handler
     */
    private _eventSubscription = async (
        cb: (state: ExternalEventSubscription) => void
    ): Promise<boolean> => {
        return this._postMessage(
            Messages.EXTERNAL.EVENT_SUBSCRIPTION,
            undefined,
            cb
        );
    };

    /**
     * Set favicon url
     */
    private _setIcon = async () => {
        const iconURL = await getIconData();

        if (iconURL) {
            this._postMessage(Messages.EXTERNAL.SET_ICON, {
                iconURL,
            });
        }
    };

    /* ----------------------------------------------------------------------------- */
    /* Requests utils
    /* ----------------------------------------------------------------------------- */

    /**
     * Post a message using the window object, to be listened by the content script
     *
     * @param message External method to use
     * @param request Request parameters
     * @param subscriber Subscription callback
     * @returns Promise with the response
     */
    private _postMessage = <TMessageType extends EXTERNAL>(
        message: TMessageType,
        request?: RequestTypes[TMessageType],
        subscriber?: (data: SubscriptionMessageTypes[TMessageType]) => void,
        reqId?: string
    ): Promise<ResponseTypes[TMessageType]> => {
        return new Promise((resolve, reject): void => {
            const id = reqId || `${Date.now()}.${++this._requestId}`;

            this._handlers[id] = { reject, resolve, subscriber };

            // If request is a subscription,
            // store it for resubscription in case the SW is terminated
            const updatedReq = this._checkForEthSubscriptions<TMessageType>(
                message,
                request,
                id
            );

            window.postMessage(
                {
                    id,
                    message,
                    origin: Origin.PROVIDER,
                    request: updatedReq ?? (request || {}),
                } as WindowTransportRequestMessage,
                window.location.href
            );
        });
    };

    /**
     * Synchronous RPC request
     *
     */
    private _sendJSONRPCRequest = (
        request: JSONRPCRequest
    ): JSONRPCResponse => {
        const response: JSONRPCResponse = {
            jsonrpc: '2.0',
            id: request.id,
        };

        response.result = this._handleSynchronousMethods(request);

        if (response.result === undefined) {
            throw new Error(
                `Please provide a callback parameter to call ${request.method} ` +
                    'asynchronously.'
            );
        }

        return response;
    };

    private _sendMultipleRequestsAsync = (
        requests: JSONRPCRequest[]
    ): Promise<JSONRPCResponse[]> => {
        return Promise.all(requests.map((r) => this._sendRequestAsync(r)));
    };

    private _sendRequestAsync = (
        request: JSONRPCRequest
    ): Promise<JSONRPCResponse> => {
        return new Promise<JSONRPCResponse>((resolve, reject) => {
            this._handleAsynchronousMethods(request)
                .then((res) => {
                    resolve(res);
                })
                .catch((err) => reject(err));
        });
    };

    /**
     * Synchronous methods handler
     *
     */
    private _handleSynchronousMethods = (request: JSONRPCRequest) => {
        const { method } = request;

        switch (method) {
            case JSONRPCMethod.eth_accounts:
                return this.selectedAddress ? [this.selectedAddress] : [];
            case JSONRPCMethod.eth_coinbase:
                return this.selectedAddress || null;
            case JSONRPCMethod.net_version:
                return this.networkVersion || null;
            default:
                return undefined;
        }
    };

    /**
     * Asynchronous methods handler
     *
     */
    private _handleAsynchronousMethods = async (
        request: JSONRPCRequest
    ): Promise<JSONRPCResponse> => {
        const response: JSONRPCResponse = {
            jsonrpc: '2.0',
            id: request.id,
        };

        response.result = await this._postMessage(Messages.EXTERNAL.REQUEST, {
            method: request.method,
            params: request.params,
        });

        return response;
    };

    /* ----------------------------------------------------------------------------- */
    /* Events
    /* ----------------------------------------------------------------------------- */

    private _eventHandler = ({
        eventName,
        payload,
    }: ExternalEventSubscription): void => {
        switch (eventName) {
            case ProviderEvents.connect:
                this._connect(payload);
                break;
            case ProviderEvents.disconnect:
                this._disconnect(payload);
                break;
            case ProviderEvents.chainChanged:
                this._chainChanged(payload);
                break;
            case ProviderEvents.accountsChanged:
                this._accountsChanged(payload);
                break;
            case ProviderEvents.message:
                this._emitSubscriptionMessage(payload);
                break;
            default:
                break;
        }
    };

    private _connect = (connectInfo: ProviderConnectInfo) => {
        this._state.isConnected = true;
        this.emit(ProviderEvents.connect, connectInfo);
    };

    private _disconnect = (
        error: ProviderRpcError = ethErrors.provider.disconnected()
    ) => {
        this._state.isConnected = false;
        this.emit(ProviderEvents.disconnect, error);

        /**
         * @deprecated Alias of disconnect
         */
        this.emit(ProviderEvents.close, error);
    };

    private _chainChanged = ({ chainId, networkVersion }: ChainChangedInfo) => {
        this._connect({ chainId });

        if (chainId !== this.chainId) {
            this.chainId = chainId;
            this.networkVersion = networkVersion;

            this.emit(ProviderEvents.chainChanged, chainId);

            /**
             * @deprecated This was previously used with networkId instead of chainId,
             * we keep the interface but we enforce chainId anyways
             */
            this.emit(ProviderEvents.networkChanged, chainId);

            /**
             * @deprecated Alias of chainChanged
             */
            this.emit(ProviderEvents.chainIdChanged, chainId);
        }
    };

    private _accountsChanged = async (accounts: string[]) => {
        if (
            accounts.length !== this._state.accounts.length ||
            !accounts.every((val, index) => val === this._state.accounts[index])
        ) {
            this._state.accounts = accounts;

            if (this.selectedAddress !== accounts[0]) {
                this.selectedAddress = accounts[0] || null;
            }

            this.emit(ProviderEvents.accountsChanged, accounts);
        }
    };

    /**
     * Emits to the consumers the message received via a previously
     * initiated subscription.
     *
     * @param message The received subscription message
     */
    private _emitSubscriptionMessage = (message: EthSubscription) => {
        // re-write subscription id
        for (const reqId in this._ethSubscriptions) {
            const { prevSubId, subId } = this._ethSubscriptions[reqId];
            if (
                message.data.subscription === subId &&
                prevSubId &&
                prevSubId !== ''
            ) {
                message = {
                    ...message,
                    data: {
                        ...message.data,
                        subscription: prevSubId,
                    },
                };

                log.trace(
                    '_emitSubscriptionMessage',
                    'message overridden',
                    message
                );
                break;
            }
        }
        this.emit(ProviderEvents.message, message);

        // Emit events for legacy API
        const web3LegacyResponse = {
            jsonrpc: '2.0',
            method: 'eth_subscription',
            params: {
                result: message.data.result,
                subscription: message.data.subscription,
            },
        } as Web3LegacySubscription;
        this.emit(ProviderEvents.data, web3LegacyResponse);
        this.emit(
            ProviderEvents.notification,
            web3LegacyResponse.params.result
        );
    };

    private _checkForEthSubscriptions<TMessageType extends EXTERNAL>(
        message: TMessageType,
        request: RequestTypes[TMessageType] | undefined,
        id: string
    ): RequestTypes[EXTERNAL.REQUEST] | undefined {
        if (!request) {
            return undefined;
        }

        // @ts-ignore
        if (message === EXTERNAL.REQUEST && request && 'method' in request) {
            if (request.method === JSONRPCMethod.eth_subscribe) {
                // Store request params for SW reinit
                this._ethSubscriptions[id] = {
                    params: request.params,
                    subId: '',
                    prevSubId: '',
                };
            } else if (request.method === JSONRPCMethod.eth_unsubscribe) {
                // If this is an unsubscription, remove from the list so we won't
                // subscribe again on SW termination
                const [subscriptionId] = request.params as string[];
                let subIdToUnsubscribe = subscriptionId;
                for (const reqId in this._ethSubscriptions) {
                    const { subId, prevSubId } = this._ethSubscriptions[reqId];
                    if (
                        subId === subIdToUnsubscribe ||
                        prevSubId === subIdToUnsubscribe
                    ) {
                        subIdToUnsubscribe = subId;

                        delete this._ethSubscriptions[reqId];
                        break;
                    }
                }

                log.trace(
                    'eth_unsubscribe',
                    'subIdToUnsubscribe',
                    subIdToUnsubscribe,
                    this._ethSubscriptions
                );

                return {
                    method: request.method,
                    params: [subIdToUnsubscribe],
                };
            }
        }

        return undefined;
    }

    /**
     * Adds the new subscription id to the ethSubscriptions dictionary.
     *
     */
    private setEthSubscriptionsSubId = <TMessageType extends MessageTypes>(
        data: TransportResponseMessage<TMessageType>
    ): void => {
        if ('id' in data && data.id in this._ethSubscriptions) {
            log.trace(
                'setEthSubscriptionsSubId',
                'found',
                this._ethSubscriptions[data.id],
                data.response
            );
            this._ethSubscriptions[data.id].subId = data.response as string;
        }
    };

    /**
     * Prints a console.warn message to warn the user about usage of a deprecated API
     * @param eventName The eventName
     */
    public deprecationWarning(methodName: string, force = false): void {
        const deprecatedMethods = [
            'close',
            'data',
            'networkChanged',
            'chainIdChanged',
            'notification',
        ];
        if (deprecatedMethods.includes(methodName) || force) {
            log.warn(
                `BlockWallet: '${methodName}' is deprecated and may be removed in the future. See: https://eips.ethereum.org/EIPS/eip-1193`
            );
        }
    }

    /// EventEmitter overrides

    public addListener(
        eventName: string,
        listener: (...args: any[]) => void
    ): this {
        this.deprecationWarning(eventName);
        return super.addListener(eventName, listener);
    }

    public on(eventName: string, listener: (...args: any[]) => void): this {
        this.deprecationWarning(eventName);
        return super.on(eventName, listener);
    }

    public once(eventName: string, listener: (...args: any[]) => void): this {
        this.deprecationWarning(eventName);
        return super.once(eventName, listener);
    }

    public prependListener(
        eventName: string,
        listener: (...args: any[]) => void
    ): this {
        this.deprecationWarning(eventName);
        return super.prependListener(eventName, listener);
    }

    public prependOnceListener(
        eventName: string,
        listener: (...args: any[]) => void
    ): this {
        this.deprecationWarning(eventName);
        return super.prependOnceListener(eventName, listener);
    }
}
