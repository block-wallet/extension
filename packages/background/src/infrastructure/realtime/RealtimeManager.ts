import { EventEmitter } from 'events';

// Service Worker global types
declare const clients: {
    matchAll(): Promise<{ url: string }[]>;
};

export interface RealtimeProviderConfig {
    provider: 'alchemy' | 'infura';
    apiKey: string;
    fallbackProvider?: 'alchemy' | 'infura';
    fallbackApiKey?: string;
}

export interface PendingTransaction {
    hash: string;
    from: string;
    to: string;
    value: string;
    gasPrice: string;
    gas: string;
    input: string;
}

export interface RealtimeEvents {
    'new-block': (chainId: number, blockNumber: number, blockHash: string, timestamp: number) => void;
    'pending-transaction': (chainId: number, transaction: PendingTransaction) => void;
    'connection-status': (chainId: number, connected: boolean) => void;
    'connection-error': (chainId: number, error: string) => void;
}

export class RealtimeManager extends EventEmitter {
    private offscreenDocumentPath = '/offscreen.html';
    private activeConnections = new Set<number>();
    private watchedAddresses = new Set<string>();
    private providerConfigs = new Map<number, RealtimeProviderConfig>();
    private currentChainId: number | null = null;

    constructor() {
        super();
        this.setupMessageListeners();
    }

    /**
     * Switch to monitoring a different network
     * This will disconnect from the current network and connect to the new one
     */
    async switchNetwork(
        newChainId: number,
        addresses: string[],
        providerConfig: RealtimeProviderConfig
    ): Promise<void> {
        try {
            console.log(`[RealtimeManager] Switching from chain ${this.currentChainId} to ${newChainId}`);

            // Disconnect from current chain if active
            if (this.currentChainId && this.isMonitoringActive(this.currentChainId)) {
                await this.disconnectChain(this.currentChainId);
            }

            // Update current chain ID
            this.currentChainId = newChainId;

            // Setup monitoring for new chain
            await this.setupChainMonitoring(newChainId, addresses, providerConfig);

            console.log(`[RealtimeManager] Successfully switched to chain ${newChainId}`);

        } catch (error) {
            console.error(`[RealtimeManager] Failed to switch to network ${newChainId}:`, error);
            // Still update the current chain ID even if monitoring setup fails
            this.currentChainId = newChainId;
            throw error;
        }
    }

    /**
     * Get the currently monitored chain ID
     */
    getCurrentChainId(): number | null {
        return this.currentChainId;
    }

    /**
     * Setup real-time monitoring for a specific chain
     */
    async setupChainMonitoring(
        chainId: number,
        addresses: string[],
        providerConfig: RealtimeProviderConfig
    ): Promise<void> {
        try {
            // Check if this is a local development chain
            const localChains = [31337, 1337, 8545]; // Hardhat, Ganache, local dev chains
            if (localChains.includes(chainId)) {
                return; // Skip real-time monitoring for local chains
            }

            // Ensure offscreen document exists
            await this.ensureOffscreenDocument();

            // Store provider config
            this.providerConfigs.set(chainId, providerConfig);

            // Update watched addresses
            for (const address of addresses) {
                this.watchedAddresses.add(address.toLowerCase());
            }

            // Setup connection in offscreen document
            let response = await chrome.runtime.sendMessage({
                type: 'REALTIME_SETUP_CONNECTION',
                chainId,
                providerConfig
            });

            // If primary provider fails and we have a fallback, try the fallback
            if (!response?.success && providerConfig.fallbackProvider && providerConfig.fallbackApiKey) {
                console.warn(`[RealtimeManager] Primary provider (${providerConfig.provider}) failed for chain ${chainId}, trying fallback (${providerConfig.fallbackProvider})`);

                const fallbackConfig: RealtimeProviderConfig = {
                    provider: providerConfig.fallbackProvider,
                    apiKey: providerConfig.fallbackApiKey
                };

                response = await chrome.runtime.sendMessage({
                    type: 'REALTIME_SETUP_CONNECTION',
                    chainId,
                    providerConfig: fallbackConfig
                });

                if (response?.success) {
                    // Update stored config to reflect successful fallback
                    this.providerConfigs.set(chainId, fallbackConfig);
                }
            }

            if (!response?.success) {
                // Check if the error is about unsupported chain
                if (response?.error?.includes('No WebSocket provider configured')) {
                    console.warn(`[RealtimeManager] Real-time monitoring not supported for chain ${chainId} - continuing without WebSocket monitoring`);
                    return; // Gracefully skip unsupported chains
                }
                throw new Error(`Failed to setup connection with all providers: ${response?.error}`);
            }

            // Update watched addresses in offscreen document
            await chrome.runtime.sendMessage({
                type: 'REALTIME_UPDATE_WATCHED_ADDRESSES',
                addresses: Array.from(this.watchedAddresses)
            });

            this.activeConnections.add(chainId);
            this.currentChainId = chainId;

        } catch (error) {
            console.error(`[RealtimeManager] Failed to setup chain monitoring for ${chainId}:`, error);
            // Don't re-throw error for unsupported chains to avoid breaking the app
            if (error.message?.includes('No WebSocket provider configured')) {
                console.warn(`[RealtimeManager] Continuing without real-time monitoring for chain ${chainId}`);
                return;
            }
            throw error;
        }
    }

    /**
     * Add addresses to watch across all active connections
     */
    async addWatchedAddresses(addresses: string[]): Promise<void> {
        for (const address of addresses) {
            this.watchedAddresses.add(address.toLowerCase());
        }

        if (this.activeConnections.size > 0) {
            try {
                if (await this.hasOffscreenDocument()) {
                    await chrome.runtime.sendMessage({
                        type: 'REALTIME_UPDATE_WATCHED_ADDRESSES',
                        addresses: Array.from(this.watchedAddresses)
                    });
                } else {
                    console.warn('[RealtimeManager] Offscreen document not found for address update');
                }
            } catch (error) {
                console.warn('[RealtimeManager] Failed to update watched addresses:', error);
            }
        }
    }

    /**
     * Remove addresses from watch list
     */
    async removeWatchedAddresses(addresses: string[]): Promise<void> {
        for (const address of addresses) {
            this.watchedAddresses.delete(address.toLowerCase());
        }

        if (this.activeConnections.size > 0) {
            try {
                if (await this.hasOffscreenDocument()) {
                    await chrome.runtime.sendMessage({
                        type: 'REALTIME_UPDATE_WATCHED_ADDRESSES',
                        addresses: Array.from(this.watchedAddresses)
                    });
                } else {
                    console.warn('[RealtimeManager] Offscreen document not found for address update');
                }
            } catch (error) {
                console.warn('[RealtimeManager] Failed to remove watched addresses:', error);
            }
        }
    }

    /**
     * Disconnect monitoring for a specific chain
     */
    async disconnectChain(chainId: number): Promise<void> {
        try {
            // Check if offscreen document exists before sending message
            if (await this.hasOffscreenDocument()) {
                await chrome.runtime.sendMessage({
                    type: 'REALTIME_DISCONNECT_CHAIN',
                    chainId
                });
            } else {
                console.warn(`[RealtimeManager] Offscreen document not found for chain ${chainId} disconnect`);
            }

            this.activeConnections.delete(chainId);
            this.providerConfigs.delete(chainId);

        } catch (error) {
            // Log error but don't throw - cleanup should be fail-safe
            console.warn(`[RealtimeManager] Failed to disconnect chain ${chainId}:`, error);

            // Still clean up local state
            this.activeConnections.delete(chainId);
            this.providerConfigs.delete(chainId);
        }
    }

    /**
     * Disconnect all monitoring
     */
    async disconnectAll(): Promise<void> {
        try {
            // Check if offscreen document exists before sending message
            if (await this.hasOffscreenDocument()) {
                await chrome.runtime.sendMessage({
                    type: 'REALTIME_DISCONNECT_ALL'
                });
            } else {
                console.warn('[RealtimeManager] Offscreen document not found for disconnect all');
            }

            this.activeConnections.clear();
            this.providerConfigs.clear();
            this.watchedAddresses.clear();

        } catch (error) {
            // Log error but don't throw - cleanup should be fail-safe
            console.warn('[RealtimeManager] Failed to disconnect all connections:', error);

            // Still clean up local state
            this.activeConnections.clear();
            this.providerConfigs.clear();
            this.watchedAddresses.clear();
        }
    }

    /**
     * Get status of all connections
     */
    async getConnectionStatus(): Promise<any> {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'REALTIME_GET_STATUS'
            });

            return response?.success ? response : null;
        } catch (error) {
            console.error('[RealtimeManager] Failed to get connection status:', error);
            return null;
        }
    }

    /**
     * Check if monitoring is active for a chain
     */
    isMonitoringActive(chainId: number): boolean {
        return this.activeConnections.has(chainId);
    }

    /**
     * Get all watched addresses
     */
    getWatchedAddresses(): string[] {
        return Array.from(this.watchedAddresses);
    }

    /**
     * Ensure offscreen document exists
     */
    private async ensureOffscreenDocument(): Promise<void> {
        try {
            // Check if offscreen document already exists
            if (await this.hasOffscreenDocument()) {
                return;
            }

            // Create offscreen document
            await chrome.offscreen.createDocument({
                url: this.offscreenDocumentPath,
                reasons: ['BLOBS', 'DOM_SCRAPING'],
                justification: 'Real-time blockchain event monitoring via WebSocket connections'
            });

        } catch (error) {
            // Handle the case where offscreen document already exists
            if (error.message?.includes('Only a single offscreen document may be created')) {
                return; // Document exists, continue normally
            }
            console.error('[RealtimeManager] Failed to create offscreen document:', error);
            throw error;
        }
    }

    /**
     * Check if offscreen document exists
     */
    private async hasOffscreenDocument(): Promise<boolean> {
        try {
            const matchedClients = await clients.matchAll();
            return matchedClients.some(
                (client) => client.url === chrome.runtime.getURL(this.offscreenDocumentPath)
            );
        } catch (error) {
            return false;
        }
    }

    /**
     * Setup message listeners for offscreen document communication
     */
    private setupMessageListeners(): void {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            // Only handle messages from offscreen document
            if (!sender.url?.includes('offscreen.html')) {
                return;
            }

            switch (message.type) {
                case 'REALTIME_NEW_BLOCK':
                    this.emit('new-block',
                        message.chainId,
                        message.blockNumber,
                        message.blockHash,
                        message.timestamp
                    );
                    break;

                case 'REALTIME_PENDING_TRANSACTION':
                    this.emit('pending-transaction',
                        message.chainId,
                        message.transaction
                    );
                    break;

                case 'REALTIME_CONNECTION_STATUS':
                    this.emit('connection-status',
                        message.chainId,
                        message.connected
                    );
                    break;

                case 'REALTIME_CONNECTION_ERROR':
                    this.emit('connection-error',
                        message.chainId,
                        message.error
                    );
                    break;
            }
        });
    }

    /**
     * Cleanup resources
     */
    async cleanup(): Promise<void> {
        await this.disconnectAll();
        this.removeAllListeners();
    }
}
