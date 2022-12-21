/* eslint-disable @typescript-eslint/no-non-null-assertion */
import Common from '@ethereumjs/common';
import { BaseController } from '../infrastructure/BaseController';
import {
    Network,
    Networks,
    HARDFORKS,
    AddNetworkType,
    EditNetworkUpdatesType,
    EditNetworkOrderType,
    ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
} from '../utils/constants/networks';
import { isABlockWalletNode } from '../utils/nodes';
import { constants, ethers } from 'ethers';
import { poll } from '@ethersproject/web';
import { ErrorCode } from '@ethersproject/logger';
import { cloneDeep } from 'lodash';

import { checkIfRateLimitError } from '../utils/ethersError';
import { getChainListItem } from '../utils/chainlist';
import { FEATURES } from '../utils/constants/features';
import {
    formatAndValidateRpcURL,
    getUrlWithoutTrailingSlash,
    validateNetworkChainId,
} from '../utils/ethereumChain';
import { normalizeNetworksOrder } from '../utils/networks';
import log from 'loglevel';

export enum NetworkEvents {
    NETWORK_CHANGE = 'NETWORK_CHANGE',
    USER_NETWORK_CHANGE = 'USER_NETWORK_CHANGE',
    PROVIDER_NETWORK_CHANGE = 'PROVIDER_NETWORK_CHANGE',
}

export interface NetworkControllerState {
    selectedNetwork: string;
    availableNetworks: Networks;
    isNetworkChanging: boolean;
    isUserNetworkOnline: boolean;
    isProviderNetworkOnline: boolean;
    isEIP1559Compatible: { [chainId in number]: boolean };
}

export default class NetworkController extends BaseController<NetworkControllerState> {
    public static readonly CURRENT_HARDFORK: string = 'london';
    private provider: ethers.providers.StaticJsonRpcProvider;

    constructor(initialState: NetworkControllerState) {
        super(initialState);

        this.provider = this.getProviderFromName(
            initialState.selectedNetwork || 'goerli'
        );

        // Set the error handler for the provider to check for network status
        this.provider.on('error', this._updateProviderNetworkStatus);

        // Periodical checks when provider is down
        setInterval(() => {
            if (!this.getState().isProviderNetworkOnline) {
                this._updateProviderNetworkStatus();
            }
        }, 3000);

        this.setMaxListeners(30); // currently, we need 16
    }

    /**
     * Gets user selected native currency
     */
    public get selectedNetwork(): string {
        return this.store.getState().selectedNetwork;
    }

    /**
     * Sets user selected native currency
     *
     * @param v fiat ticker
     */
    public set selectedNetwork(v: string) {
        this.store.updateState({ selectedNetwork: v });
    }

    /**
     * Get the available networks with name, chainId and
     * the available features for that network.
     */
    public get networks(): Networks {
        return this.store.getState().availableNetworks;
    }

    /**
     * Set a new list of networks.
     */
    public set networks(networks: Networks) {
        this.store.updateState({
            availableNetworks: normalizeNetworksOrder(networks),
        });
    }

    /**
     * It returns the current selected network object
     */
    public get network(): Network {
        // Uppercase the network name
        const key = this.selectedNetwork.toUpperCase();
        return this.networks[key];
    }

    /**
     * Obtains the network object from the specified name
     *
     * @param name The network name
     * @returns The network object from the name
     */
    public searchNetworkByName(name: string): Network {
        return this.networks[name.toUpperCase()];
    }

    /**
     * Obtains the network object from the specified chainId
     *
     * @param chainId The network chain id
     * @returns The network object from the chainId
     */
    public getNetworkFromChainId(chainId: number): Network | undefined {
        if (!chainId) {
            return undefined;
        }

        return Object.values(this.networks).find((i) => i.chainId === chainId);
    }

    /**
     * Checks if a certain chain is a custom network and has not a fixed gas cost for sends
     *
     * @param chainId The network chain id
     * @returns if the chain is a custom network with no fixed gas cost for sends
     */
    public hasChainFixedGasCost(
        chainId: number | undefined
    ): boolean | undefined {
        if (!chainId) {
            false;
        }

        const network: Network | undefined = Object.values(this.networks).find(
            (i) => i.chainId === chainId
        );

        return network?.hasFixedGasCost ?? false;
    }

    /**
     * getNonNativeNetworkKey
     *
     * @param chainId The chain id of the network
     * @returns The networks object key for the given chain id
     */
    public getNonNativeNetworkKey(chainId: number): string {
        return `CHAIN-${chainId}`;
    }

    /**
     * Change list of networks order.
     */
    public editNetworksOrder(networksOrder: EditNetworkOrderType[]): void {
        const newNetworks = cloneDeep(this.networks);
        networksOrder.forEach((networkOrderUpdate) => {
            const { chainId, order } = networkOrderUpdate;

            //Validations
            if (!chainId || Number.isNaN(chainId)) {
                throw new Error('ChainId is required and must be numeric.');
            }

            const existingNetwork = this.getNetworkFromChainId(chainId);

            if (!existingNetwork) {
                throw new Error(
                    'The network you are trying to edit does not exist.'
                );
            }

            const networkKey = this._getNetworkKey(existingNetwork);

            newNetworks[networkKey].order = order;
        });

        this.networks = newNetworks;
    }

    /**
     * removeNetwork
     *
     * Removes a network from the list of available networks
     *
     * @param chainId The chain id of the network to remove
     */
    public removeNetwork(chainId: number): void {
        if (!chainId) {
            throw new Error('ChainId is required');
        }

        // Check if network already exists
        const network = this.getNetworkFromChainId(chainId);

        // If network does not exist, throw error
        if (!network) {
            throw new Error(`Network with chainId ${chainId} does not exist`);
        }

        // Check if network is currently selected
        if (this.network.chainId === network.chainId) {
            throw new Error(
                `Can't remove network with chainId ${chainId} because it is the currently selected network.
                Please change the selected network first.`
            );
        }

        // Remove network from list only if it is not natively supported
        if (network.nativelySupported) {
            if (network.chainId === 1) {
                throw new Error(`Mainnet cannot be removed`);
            }
            const newNetworks = cloneDeep(this.networks);

            // If network is natively supported, the key is its uppercased name
            const key = this._getNetworkKey(network);
            newNetworks[key].enable = false;
            this.networks = newNetworks;
        } else {
            // Get non-native key
            const key = this.getNonNativeNetworkKey(chainId);

            // Remove network from list
            const newNetworks = cloneDeep(this.networks);
            delete newNetworks[key];
            this.networks = newNetworks;
        }

        //TODO: Review if we should remove related information from the store
    }

    private _getNetworkKey = (network: Network): string => {
        return network.name.toUpperCase();
    };

    public async editNetwork(
        chainId: number,
        updates: EditNetworkUpdatesType
    ): Promise<void> {
        if (!chainId || Number.isNaN(chainId)) {
            throw new Error('ChainId is required and must be numeric.');
        }

        // Check if network already exists
        const existingNetwork = this.getNetworkFromChainId(chainId);

        if (!existingNetwork) {
            throw new Error(
                'The network you are trying to edit does not exist.'
            );
        }

        if (!updates.name) {
            throw new Error('Name cannot be empty.');
        }

        //throws an error in case the rcpUrl is not valid.
        const rpcUrl = formatAndValidateRpcURL(
            updates.rpcUrls && updates.rpcUrls.length ? updates.rpcUrls[0] : ''
        );

        // Check that chainId matches with network's. If it doesnt match, throws an error.
        await validateNetworkChainId(chainId, rpcUrl);

        // Check block explorer url
        const explorerUrl =
            getUrlWithoutTrailingSlash(updates.blockExplorerUrls) || '';

        if (explorerUrl && explorerUrl.indexOf('https://') === -1) {
            throw new Error('Block explorer endpoint must be https');
        }

        const networkKey = this._getNetworkKey(existingNetwork);

        const newNetworks = cloneDeep(this.networks);
        newNetworks[networkKey].desc = updates.name;
        newNetworks[networkKey].rpcUrls = [rpcUrl];
        newNetworks[networkKey].blockExplorerUrls = [explorerUrl];
        newNetworks[networkKey].test = updates.test;
        this.networks = newNetworks;
        return;
    }

    /**
     * Add a new network manually to the list.
     */
    public async addNetwork(network: AddNetworkType): Promise<void> {
        if (!network.chainId || Number.isNaN(network.chainId)) {
            throw new Error('ChainId is required and must be numeric.');
        }

        // Check if network already exists
        const existingNetwork = this.getNetworkFromChainId(network.chainId);

        // If network has already been added, return
        if (
            typeof existingNetwork !== 'undefined' &&
            (!existingNetwork.nativelySupported || existingNetwork.enable)
        ) {
            return;
        }

        // Obtain the chain data from the chainlist json
        const chainDataFromList = getChainListItem(network.chainId);

        // Validate data
        if (!chainDataFromList) {
            if (!network.rpcUrls?.[0]) {
                throw new Error('No RPC endpoint provided');
            }
            if (!network.chainName) {
                throw new Error('No chain name provided');
            }
            if (!network.nativeCurrency?.symbol) {
                throw new Error('No native currency provided');
            }
        }

        const rpcUrl = formatAndValidateRpcURL(
            network.rpcUrls?.[0] || chainDataFromList!.rpc[0]
        );

        // Check block explorer url
        const explorerUrl =
            getUrlWithoutTrailingSlash(network.blockExplorerUrls) ||
            getUrlWithoutTrailingSlash(
                chainDataFromList?.explorers?.map(({ url }) => url)
            ) ||
            '';
        if (explorerUrl && explorerUrl.indexOf('https://') === -1) {
            throw new Error('Block explorer endpoint must be https');
        }

        // Check if we have the explorer name
        const blockExplorerName = chainDataFromList?.explorers
            ?.map((t) => ({
                ...t,
                url: t.url.endsWith('/') ? t.url.slice(0, -1) : t.url,
            }))
            .find((e) => e.url.includes(explorerUrl))?.name;

        const nativeCurrencySymbol =
            network.nativeCurrency?.symbol ||
            chainDataFromList!.nativeCurrency.symbol;

        // Check that chainId matches with network's. If it doesnt match, throws an error.
        await validateNetworkChainId(network.chainId, rpcUrl);

        if (typeof existingNetwork !== 'undefined') {
            // Here we handle the nativelySupported networks which are disabled
            const key = this._getNetworkKey(existingNetwork);
            const newNetworks = cloneDeep(this.networks);
            newNetworks[key].enable = true;
            newNetworks[key].rpcUrls = [rpcUrl];
            newNetworks[key].blockExplorerName =
                blockExplorerName ||
                newNetworks[key].blockExplorerName ||
                'Explorer';
            newNetworks[key].blockExplorerUrls = [explorerUrl];
            newNetworks[key].test = network.test;
            if (
                !newNetworks[key].etherscanApiUrl &&
                chainDataFromList?.scanApi
            ) {
                newNetworks[key].etherscanApiUrl = chainDataFromList?.scanApi;
            }
            this.networks = newNetworks;
        } else {
            // Set the network key
            const key = `CHAIN-${network.chainId}`;

            const nativeCurrencyIcon =
                chainDataFromList?.nativeCurrencyIcon ||
                chainDataFromList?.logo ||
                network.iconUrls?.[0];

            // Add the network
            this.networks[key] = {
                chainId: network.chainId,
                name: `chain-${network.chainId}`,
                desc: network.chainName || chainDataFromList!.name,
                ens: false,
                enable: true,
                features: [FEATURES.SENDS],
                nativeCurrency: {
                    name:
                        chainDataFromList?.nativeCurrency.name ||
                        nativeCurrencySymbol,
                    symbol: nativeCurrencySymbol,
                    decimals: chainDataFromList?.nativeCurrency.decimals || 18,
                },
                networkVersion: (
                    chainDataFromList?.networkId || network.chainId
                ).toString(),
                rpcUrls: [rpcUrl],
                showGasLevels: true,
                blockExplorerUrls: [explorerUrl],
                blockExplorerName: blockExplorerName || 'Explorer',
                actionsTimeIntervals: ACTIONS_TIME_INTERVALS_DEFAULT_VALUES,
                test: !!network.test,
                order:
                    Object.values(this.networks)
                        .filter((n) => n.test === network.test)
                        .map((c) => c.order)
                        .sort((a, b) => b - a)[0] + 1,
                iconUrls: nativeCurrencyIcon ? [nativeCurrencyIcon] : undefined,
                nativelySupported: false,
                hasFixedGasCost: false,
                etherscanApiUrl: chainDataFromList?.scanApi,
            };
        }
    }

    /**
     * It adds a listener to be triggered on a block update
     * @param blockListener The listener
     */
    public addOnBlockListener(
        blockListener: (blockNumber: number) => void | Promise<void>
    ): void {
        this.getProvider().on('block', blockListener);
    }

    /**
     * It removes a listener from the block updates listeners
     * @param blockListener The listener
     */
    public removeOnBlockListener(
        blockListener: (blockNumber: number) => void | Promise<void>
    ): void {
        this.getProvider().off('block', blockListener);
    }

    /**
     * It removes ALL block updates listeners
     */
    public removeAllOnBlockListener(): void {
        this.getProvider().removeAllListeners('block');
    }

    /**
     * It returns the Network Provider instance
     * @returns {ethers.providers.StaticJsonRpcProvider}
     */
    public getProvider(): ethers.providers.StaticJsonRpcProvider {
        return this.provider;
    }

    /**
     * It returns the Ethereum mainnet Flashbots Provider instance
     * @returns {ethers.providers.StaticJsonRpcProvider}
     */
    public getFlashbotsProvider(): ethers.providers.StaticJsonRpcProvider {
        return new ethers.providers.StaticJsonRpcProvider(
            'https://rpc.flashbots.net'
        );
    }

    /**
     * Gets a provider for a given network
     * @returns {ethers.providers.StaticJsonRpcProvider}
     */
    public getProviderFromName = (
        networkName: string
    ): ethers.providers.StaticJsonRpcProvider => {
        const network = this.searchNetworkByName(networkName);
        return this._getProviderForNetwork(network.chainId, network.rpcUrls[0]);
    };

    /**
     * Gets a provider for a given chainId.
     *
     * @param chainId the network's chainId
     * @param userNetworksOnly whether return the generated provider if the chainId exists on the user's network list.
     * @returns {ethers.providers.StaticJsonRpcProvider}
     */
    public getProviderForChainId = (
        chainId: number,
        userNetworksOnly = true
    ): ethers.providers.StaticJsonRpcProvider | undefined => {
        if (this.network.chainId === chainId) {
            return this.provider;
        }

        const userNetwork = Object.values(
            this.store.getState().availableNetworks
        ).find(
            (network) => Number(network.chainId) === chainId && network.enable
        );

        if (userNetwork) {
            return this._getProviderForNetwork(
                userNetwork.chainId,
                userNetwork.rpcUrls[0]
            );
        }

        if (userNetworksOnly) {
            return;
        }

        const chain = getChainListItem(chainId);
        if (chain && chain.rpc && chain.rpc[0]) {
            return this._getProviderForNetwork(chainId, chain.rpc[0]);
        }
    };

    private _getProviderForNetwork(chainId: number, rpcUrl: string) {
        const blockWalletNode = isABlockWalletNode(rpcUrl);
        return this._overloadProviderMethods(
            { chainId },
            new ethers.providers.StaticJsonRpcProvider(
                {
                    url: rpcUrl,
                    allowGzip: blockWalletNode,
                    // temporarily removed until cors issue is fixed
                    //headers: blockWalletNode
                    //    ? customHeadersForBlockWalletNode
                    //    : undefined,
                },
                chainId
            )
        );
    }

    /**
     * It returns the latest block from the network
     */
    public async getLatestBlock(
        provider: ethers.providers.JsonRpcProvider = this.getProvider()
    ): Promise<ethers.providers.Block> {
        return provider.getBlock('latest');
    }

    /**
     * It returns if current network is EIP1559 compatible.
     */
    public async getEIP1559Compatibility(
        chainId: number = this.network.chainId,
        forceUpdate = false,
        //required by parameter to avoid returning undefined if the user hasn't added the chain
        //previous check should be done before invoking this method.
        provider: ethers.providers.JsonRpcProvider = this.getProvider()
    ): Promise<boolean> {
        let shouldFetchTheCurrentState = false;

        if (!(chainId in this.getState().isEIP1559Compatible)) {
            shouldFetchTheCurrentState = true;
        } else {
            if (this.getState().isEIP1559Compatible[chainId] === undefined) {
                shouldFetchTheCurrentState = true;
            } else {
                if (forceUpdate) {
                    shouldFetchTheCurrentState = true;
                }
            }
        }

        if (shouldFetchTheCurrentState) {
            let baseFeePerGas = (await this.getLatestBlock(provider))
                .baseFeePerGas;

            // detection for the fantom case,
            // the network seems to be eip1559 but eth_feeHistory is not available.
            if (baseFeePerGas) {
                try {
                    await provider.send('eth_feeHistory', [
                        '0x1',
                        'latest',
                        [50],
                    ]);
                } catch {
                    baseFeePerGas = undefined;
                }
            }

            this.store.updateState({
                isEIP1559Compatible: {
                    ...this.getState().isEIP1559Compatible,
                    [chainId]: !!baseFeePerGas,
                },
            });
        }

        return this.getState().isEIP1559Compatible[chainId];
    }

    /**
     * Get the state of the controller
     *
     * @returns {NetworkControllerState} state
     */
    public getState(): NetworkControllerState {
        return this.store.getState() as NetworkControllerState;
    }

    /**
     * Get current selected network
     *
     * @returns Promise<Network> (https://docs.ethers.io/v5/api/providers/provider/#Provider-getNetwork)
     */
    public async getNetwork(): Promise<ethers.providers.Network> {
        return this.provider.getNetwork();
    }

    /**
     * Stalls until network is connected
     *
     * @returns Promise<Network> (https://docs.ethers.io/v5/api/providers/provider/#Provider-ready)
     */
    public async waitUntilNetworkLoaded(): Promise<ethers.providers.Network> {
        return this.provider.ready;
    }

    /**
     * It transfer the list of listeners from the state provider to a new one when changing networks
     * @param newProvider The provider for the selected nework
     */
    private _updateListeners(
        newProvider: ethers.providers.StaticJsonRpcProvider
    ) {
        const listeners = this.getProvider()._events.map((ev) => ({
            name: ev.event,
            listener: ev.listener,
        }));

        for (const item of listeners) {
            newProvider.on(item.name, item.listener);
        }

        this.getProvider().removeAllListeners();
    }

    /**
     * Indicates whether the network is being changed
     */
    public get isNetworkChanging(): boolean {
        return this.store.getState().isNetworkChanging;
    }

    /**
     * Change the ethereum network
     * @param string network
     */
    public async setNetwork(networkName: string): Promise<boolean> {
        try {
            // Set isNetworkChanging flag
            this.store.updateState({ isNetworkChanging: true });

            // Uppercase the network name to obtain key
            const key = networkName.toUpperCase();

            // Get the selected network
            const network = this.networks[key];

            // Instantiate provider and wait until it's ready
            const newNetworkProvider = this.getProviderFromName(network.name);

            // Update provider listeners
            this._updateListeners(newNetworkProvider);

            // Update provider reference
            this.provider = newNetworkProvider;

            // Check if provider is ready and update network status
            this._updateProviderNetworkStatus();

            // Update selected network
            this.store.updateState({
                selectedNetwork: networkName,
            });

            // check for eip1559 compatibility
            await this.getEIP1559Compatibility(network.chainId, true);

            // Set the isNetworkChanging flag to false
            this.store.updateState({
                isNetworkChanging: false,
            });

            // Emit NETWORK_CHANGE event
            this.emit(NetworkEvents.NETWORK_CHANGE, this.network);

            // Return network change success
            return true;
        } catch (error) {
            // Set the isNetworkChanging flag to false
            this.store.updateState({ isNetworkChanging: false });

            // If an error was thrown
            // return network change failure
            return false;
        }
    }

    /**
     * waitForTransaction
     */
    public waitForTransaction(
        transactionHash: string,
        confirmations?: number,
        timeout?: number
    ): Promise<ethers.providers.TransactionReceipt> {
        return this.getProvider().waitForTransaction(
            transactionHash,
            confirmations,
            timeout
        );
    }

    /**
     * @ethereumjs/common specifies data needed to create a transaction on a chain
     * (https://github.com/ethereumjs/ethereumjs-monorepo)
     *
     * @returns Promise<Common>
     */

    public async getCommon(): Promise<Common> {
        const { name, chainId } = this.network;

        // this only matters, if a hardfork adds new transaction types
        const hardfork = (await this.getEIP1559Compatibility(chainId))
            ? HARDFORKS.LONDON
            : HARDFORKS.BERLIN;

        return Common.custom({ name, chainId }, { hardfork });
    }

    public handleUserNetworkChange(isOnline: boolean) {
        const newValue = isOnline;
        if (this.getState().isUserNetworkOnline == newValue) {
            return;
        }

        this.store.updateState({ isUserNetworkOnline: newValue });
        this.emit(NetworkEvents.USER_NETWORK_CHANGE, newValue);
    }

    private _updateProviderNetworkStatus = (err?: {
        code: ErrorCode;
        body?: string;
    }) => {
        const errorCodes = [ErrorCode.SERVER_ERROR, ErrorCode.TIMEOUT];
        if (!err || errorCodes.includes(err.code)) {
            this._isProviderReady()
                .then(() => {
                    return Promise.resolve(true);
                })
                .catch(() => {
                    return Promise.resolve(false);
                })
                .then((newStatus) => {
                    if (this.getState().isProviderNetworkOnline === newStatus) {
                        return;
                    }

                    this.store.updateState({
                        isProviderNetworkOnline: newStatus,
                    });
                    this.emit(NetworkEvents.PROVIDER_NETWORK_CHANGE, newStatus);
                });
        }
    };

    private _isProviderReady(
        provider: ethers.providers.StaticJsonRpcProvider = this.provider
    ): Promise<ethers.providers.Network | undefined> {
        return poll(
            async () => {
                try {
                    // call net_version to easily identify this call on the reporting
                    return provider.send('net_version', []);
                } catch (error) {
                    if (
                        error.code === ErrorCode.NETWORK_ERROR &&
                        error.event === 'noNetwork'
                    ) {
                        return undefined;
                        // If the returned error is a rate limit error, return undefined.
                    } else if (checkIfRateLimitError(error)) {
                        return undefined;
                    }

                    throw error;
                }
            },
            { timeout: 10000, retryLimit: 5 }
        );
    }

    /**
     * Overload provider methods for some chains that present an special case.
     * @returns {ethers.providers.StaticJsonRpcProvider}
     */
    private _overloadProviderMethods = (
        { chainId }: { chainId: number },
        provider: ethers.providers.StaticJsonRpcProvider
    ): ethers.providers.StaticJsonRpcProvider => {
        switch (chainId) {
            // celo
            case 42220: {
                const originalBlockFormatter: (
                    value: any,
                    format: any
                ) => ethers.providers.Block = provider.formatter._block;
                provider.formatter._block = (value: any, format: any) => {
                    return originalBlockFormatter(
                        {
                            gasLimit: constants.Zero,
                            ...value,
                        },
                        format
                    );
                };
                break;
            }
        }

        provider.on('debug', (...args: Array<any>) => {
            const argsObj = args[0];
            const { action, request, response } = argsObj;
            const { method, params } = request;

            if (response) {
                log.trace(action, method, ...params, response);
            } else {
                log.trace(action, method, ...params);
            }
        });

        return provider;
    };
}
