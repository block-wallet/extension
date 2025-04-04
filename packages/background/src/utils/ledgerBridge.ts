import log from 'loglevel';

// Define a type for connection result
interface ConnectionResult {
    success: boolean;
    needsUserGesture?: boolean;
    needsEthereumApp?: boolean;
    message?: string;
}

/**
 * Utility class to manage the Ledger connection via WebHID
 * This handles communication through the offscreen document for hardware wallet access
 */
export class LedgerBridge {
    private offscreenCreated = false;
    private connectionTimeout: NodeJS.Timeout | null = null;
    private lastEthAppCheck = 0;
    private ethAppOpenStatus = false;

    constructor() {
        log.debug('Initialized LedgerBridge for WebHID communication');
        console.log('[LEDGER] LedgerBridge initialized for WebHID communication');
    }

    /**
     * Ensures an offscreen document is available for hardware wallet communication
     * @returns Promise resolving to true if offscreen document is available
     * @throws Error if offscreen API is not available or document creation fails
     */
    async ensureOffscreenDocument(): Promise<boolean> {
        // Check if we already have an offscreen document
        if (this.offscreenCreated) return true;

        try {
            // Require chrome.offscreen to be available (no fallback)
            if (!chrome.offscreen) {
                const error = new Error('Offscreen document API not available. WebHID access requires Chrome with offscreen API support.');
                log.error(error.message);
                console.error('[LEDGER] ' + error.message);
                throw error;
            }

            // Check if document already exists
            const hasDocument = await chrome.offscreen.hasDocument();

            if (!hasDocument) {
                log.debug('Creating offscreen document for WebHID communication');
                console.log('[LEDGER] Creating offscreen document for WebHID communication');

                // Create the offscreen document - use type assertion to handle the fact that
                // TypeScript definitions may not be up to date with Chrome's implementation
                await chrome.offscreen.createDocument({
                    url: 'offscreen.html',
                    reasons: ['USER_MEDIA'], // Using USER_MEDIA for hardware access
                    justification: 'Hardware wallet connection requires access to WebHID APIs'
                });

                // Wait for it to initialize
                await new Promise<void>((resolve) => {
                    const listener = (message: any) => {
                        if (message.type === 'BRIDGE_READY') {
                            chrome.runtime.onMessage.removeListener(listener);
                            resolve();
                        }
                    };

                    // Set a timeout in case the document doesn't initialize
                    const timeout = setTimeout(() => {
                        chrome.runtime.onMessage.removeListener(listener);
                        resolve();
                    }, 3000);

                    chrome.runtime.onMessage.addListener(listener);
                });

                log.debug('Offscreen document created and initialized');
                console.log('[LEDGER] Offscreen document created and initialized');
            } else {
                log.debug('Offscreen document already exists');
                console.log('[LEDGER] Offscreen document already exists');
            }

            this.offscreenCreated = true;
            return true;
        } catch (error) {
            log.error('Failed to create offscreen document:', error);
            console.error('[LEDGER] Failed to create offscreen document:', error);
            throw error; // Rethrow as we don't have fallbacks
        }
    }

    /**
     * Verifies that the Ethereum app is open on the Ledger device
     * @returns Promise resolving to true if the Ethereum app is open
     */
    async verifyEthereumAppOpen(bypassCache = false): Promise<boolean> {
        try {
            const now = Date.now();
            if (!bypassCache && now - this.lastEthAppCheck < 5000 && this.ethAppOpenStatus) {
                log.debug('Using cached Ethereum app status (open)');
                return this.ethAppOpenStatus;
            }

            await this.ensureOffscreenDocument();

            return new Promise<boolean>((resolve) => {
                // Set a timeout to avoid hanging
                const timeout = setTimeout(() => {
                    log.debug('Ethereum app verification timed out');
                    console.log('[LEDGER] Ethereum app verification timed out in ledgerBridge.ts');

                    // Store the timeout status in session storage
                    try {
                        if (chrome.storage?.session) {
                            chrome.storage.session.set({
                                'ledger_eth_app_status': {
                                    open: false,
                                    timestamp: Date.now(),
                                    reason: 'ledgerbridge_verification_timeout'
                                }
                            });
                        }
                    } catch (e) {
                        console.error('[LEDGER] Failed to store timeout status:', e);
                    }

                    this.ethAppOpenStatus = false;
                    resolve(false);
                }, 20000);

                console.log('[LEDGER] Sending verification request to offscreen document');
                // Send verification request to offscreen document
                chrome.runtime.sendMessage({
                    type: 'HW_VERIFY_ETH_APP',
                    device: 'LEDGER',
                    transportType: 'webhid',
                    bypassCache, // Pass along the bypass flag
                    requestId: Date.now().toString() // Add unique ID to track this request
                }).then((response) => {
                    clearTimeout(timeout);
                    console.log('[LEDGER] Received verification response:', response);

                    if (response && response.success && response.appOpen) {
                        log.debug('Ethereum app is open on Ledger device');
                        console.log('[LEDGER] Ethereum app is open on Ledger device');
                        this.lastEthAppCheck = now;
                        this.ethAppOpenStatus = true;

                        // Store the app status in session storage from the service worker
                        try {
                            if (chrome.storage?.session && response.ethAppStatus) {
                                chrome.storage.session.set({
                                    'ledger_eth_app_status': {
                                        ...response.ethAppStatus,
                                        device: 'LEDGER',
                                        message: 'Ethereum app is open and ready',
                                        timestamp: Date.now()
                                    }
                                });
                            }
                        } catch (e) {
                            console.error('[LEDGER] Failed to store eth app status:', e);
                        }

                        resolve(true);
                    } else {
                        const errorMessage = response?.error || 'Ethereum app is not open on Ledger device';
                        const errorSource = response?.source || response?.ethAppStatus?.source || 'unknown';
                        log.debug(`Ethereum app verification failed: ${errorMessage} (source: ${errorSource})`);
                        console.log(`[LEDGER] Ethereum app verification failed: ${errorMessage} (source: ${errorSource})`);
                        this.ethAppOpenStatus = false;

                        // Store the error in session storage from the service worker
                        try {
                            if (chrome.storage?.session) {
                                chrome.storage.session.set({
                                    'ledger_eth_app_status': {
                                        open: false,
                                        device: 'LEDGER',
                                        timestamp: Date.now(),
                                        error: errorMessage,
                                        source: errorSource,
                                        message: 'Please open the Ethereum app on your Ledger device'
                                    }
                                });
                            }
                        } catch (e) {
                            console.error('[LEDGER] Failed to store error status:', e);
                        }

                        resolve(false);
                    }
                }).catch((error) => {
                    clearTimeout(timeout);
                    log.error('Error verifying Ethereum app:', error);
                    console.error('[LEDGER] Error verifying Ethereum app:', error);

                    // Store error in session storage
                    try {
                        if (chrome.storage?.session) {
                            chrome.storage.session.set({
                                'ledger_eth_app_status': {
                                    open: false,
                                    timestamp: Date.now(),
                                    device: 'LEDGER',
                                    error: error.message,
                                    source: 'ledgerbridge_verification_error',
                                    message: 'Error checking Ethereum app status'
                                }
                            });
                        }
                    } catch (e) {
                        console.error('[LEDGER] Failed to store error status:', e);
                    }

                    this.ethAppOpenStatus = false;
                    resolve(false);
                });
            });
        } catch (error) {
            log.error('Error in verifyEthereumAppOpen:', error);
            console.error('[LEDGER] Error in verifyEthereumAppOpen:', error);

            // Also store this error in session storage
            try {
                if (chrome.storage?.session) {
                    chrome.storage.session.set({
                        'ledger_eth_app_status': {
                            open: false,
                            timestamp: Date.now(),
                            device: 'LEDGER',
                            error: error.message,
                            source: 'verifyEthereumAppOpen',
                            message: 'Error checking Ethereum app status'
                        }
                    });
                }
            } catch (e) {
                console.error('[LEDGER] Failed to store error status:', e);
            }

            this.ethAppOpenStatus = false;
            return false;
        }
    }

    /**
     * Communicates with the offscreen document to connect to a Ledger device via WebHID
     * @returns Promise resolving to the connection result
     */
    async connectUsingWebHID(): Promise<ConnectionResult> {
        try {
            // Ensure offscreen document is available (throws if not possible)
            await this.ensureOffscreenDocument();

            // Set a timeout to avoid hanging indefinitely
            return new Promise<ConnectionResult>((resolve, reject) => {
                // Clear any existing timeout
                if (this.connectionTimeout) {
                    clearTimeout(this.connectionTimeout);
                }

                // Set a new timeout
                this.connectionTimeout = setTimeout(() => {
                    log.debug('WebHID connection attempt timed out');
                    console.log('[LEDGER] WebHID connection attempt timed out');
                    reject(new Error('WebHID connection attempt timed out'));
                }, 30000);

                // Send connection request to offscreen document
                chrome.runtime.sendMessage({
                    type: 'HW_CONNECT_REQUEST',
                    device: 'LEDGER',
                    transportType: 'webhid' // Explicitly specify WebHID
                }).then(async (response) => {
                    // Clear the timeout
                    if (this.connectionTimeout) {
                        clearTimeout(this.connectionTimeout);
                        this.connectionTimeout = null;
                    }

                    if (response && response.success) {
                        log.debug('Successful connection via WebHID');
                        console.log('[LEDGER] Successfully connected via WebHID');

                        // Store connection info in session storage
                        try {
                            if (chrome.storage?.session && response.connectionInfo) {
                                await chrome.storage.session.set({
                                    'ledger_connection_status': response.connectionInfo
                                });
                                console.log('[LEDGER] Stored connection status in session storage');
                            }

                            // If we have explicit permission info, store that too
                            if (chrome.storage?.session && response.explicitPermission) {
                                await chrome.storage.session.set({
                                    'ledger_explicit_permission': response.explicitPermission
                                });
                                console.log('[LEDGER] Stored explicit permission in session storage');
                            }
                        } catch (e) {
                            console.error('[LEDGER] Error storing connection status:', e);
                        }

                        // After connecting, verify that Ethereum app is open
                        const isEthAppOpen = await this.verifyEthereumAppOpen();

                        if (!isEthAppOpen) {
                            log.debug('Connected to Ledger device but Ethereum app is not open');
                            console.log('[LEDGER] Connected to device but Ethereum app is not open');
                            return resolve({
                                success: true,
                                needsEthereumApp: true,
                                message: 'Please open the Ethereum app on your Ledger device'
                            });
                        }

                        return resolve({ success: true });
                    } else if (response && response.requiresUserGesture) {
                        log.debug('WebHID connection requires user gesture');
                        console.log('[LEDGER] WebHID connection requires user gesture');

                        // Store the error status in session storage
                        try {
                            if (chrome.storage?.session) {
                                await chrome.storage.session.set({
                                    'ledger_connection_error': {
                                        error: response.error || 'User gesture required',
                                        errorCode: response.errorCode || 'PERMISSION_DENIED',
                                        requiresUserGesture: true,
                                        timestamp: Date.now()
                                    }
                                });

                                await chrome.storage.session.set({
                                    'ledger_needs_user_interaction': {
                                        timestamp: Date.now(),
                                        reason: 'permission_required'
                                    }
                                });
                            }
                        } catch (e) {
                            console.error('[LEDGER] Failed to store user gesture requirement:', e);
                        }

                        return resolve({
                            success: false,
                            needsUserGesture: true,
                            message: response.error || 'WebHID access requires user interaction'
                        });
                    } else {
                        const errorMessage = response?.error || 'Unknown connection error';
                        log.debug(`WebHID connection failed: ${errorMessage}`);
                        console.log(`[LEDGER] WebHID connection failed: ${errorMessage}`);

                        // Store the error in session storage
                        try {
                            if (chrome.storage?.session) {
                                await chrome.storage.session.set({
                                    'ledger_connection_error': {
                                        error: errorMessage,
                                        errorCode: response?.errorCode || 'CONNECTION_FAILED',
                                        timestamp: Date.now()
                                    }
                                });
                            }
                        } catch (e) {
                            console.error('[LEDGER] Failed to store connection error:', e);
                        }

                        return resolve({
                            success: false,
                            message: errorMessage
                        });
                    }
                }).catch((error) => {
                    // Clear the timeout
                    if (this.connectionTimeout) {
                        clearTimeout(this.connectionTimeout);
                        this.connectionTimeout = null;
                    }

                    log.error('Error connecting via WebHID:', error);
                    console.error('[LEDGER] Error connecting via WebHID:', error);

                    // Store the error in session storage
                    try {
                        if (chrome.storage?.session) {
                            chrome.storage.session.set({
                                'ledger_connection_error': {
                                    error: error.message,
                                    timestamp: Date.now(),
                                    errorCode: 'CONNECTION_ERROR'
                                }
                            });
                        }
                    } catch (e) {
                        console.error('[LEDGER] Failed to store connection error:', e);
                    }

                    reject(error);
                });
            });
        } catch (error) {
            log.error('Error setting up WebHID connection:', error);
            console.error('[LEDGER] Error setting up WebHID connection:', error);

            // Store the error in session storage
            try {
                if (chrome.storage?.session) {
                    chrome.storage.session.set({
                        'ledger_connection_error': {
                            error: error.message,
                            timestamp: Date.now(),
                            errorCode: 'SETUP_ERROR'
                        }
                    });
                }
            } catch (e) {
                console.error('[LEDGER] Failed to store connection error:', e);
            }

            throw error;
        }
    }

    /**
     * Communicates with the offscreen document to check Ledger device status
     * @returns Promise resolving to true if a Ledger device is connected via WebHID
     */
    async checkWebHIDStatus(): Promise<boolean> {
        try {
            await this.ensureOffscreenDocument();

            return new Promise<boolean>((resolve, reject) => {
                // Set a timeout to avoid hanging
                const timeout = setTimeout(() => {
                    log.debug('WebHID status check timed out');
                    console.log('[LEDGER] WebHID status check timed out');
                    resolve(false);
                }, 3000);

                // Send status request to offscreen document
                chrome.runtime.sendMessage({
                    type: 'HW_STATUS',
                    device: 'LEDGER',
                    transportType: 'webhid'
                }).then((response) => {
                    clearTimeout(timeout);

                    if (response && response.status === 'ready' && response.hasActiveDevice) {
                        log.debug('Offscreen document has active Ledger device via WebHID');
                        console.log('[LEDGER] Offscreen document has active Ledger device via WebHID');
                        resolve(true);
                    } else {
                        log.debug('Offscreen document has no active Ledger device via WebHID');
                        console.log('[LEDGER] Offscreen document has no active Ledger device via WebHID');
                        resolve(false);
                    }
                }).catch((error) => {
                    clearTimeout(timeout);
                    log.error('Error checking WebHID status:', error);
                    console.error('[LEDGER] Error checking WebHID status:', error);
                    reject(error);
                });
            });
        } catch (error) {
            log.error('Error in checkWebHIDStatus:', error);
            console.error('[LEDGER] Error in checkWebHIDStatus:', error);
            throw error;
        }
    }

    /**
     * Checks the connection status with Ledger via WebHID
     * @returns Promise resolving to true if connection is active
     */
    async checkConnectionStatus(): Promise<boolean> {
        console.log('[LEDGER] Checking WebHID connection status');

        try {
            // First check if we have a valid connection in session storage
            if (chrome.storage?.session) {
                const result = await chrome.storage.session.get('ledger_connection_status');

                if (result.ledger_connection_status &&
                    result.ledger_connection_status.connected &&
                    result.ledger_connection_status.source === 'webhid' &&
                    Date.now() - result.ledger_connection_status.timestamp < 300000) { // Valid within last 5 minutes
                    log.debug('Found valid WebHID connection status in session storage');
                    console.log('[LEDGER] Found valid WebHID connection status in session storage');
                    return true;
                }
            }
        } catch (e) {
            log.error('Error checking session storage for WebHID status:', e);
        }

        // Check offscreen document status
        try {
            const webhidStatus = await this.checkWebHIDStatus();
            if (webhidStatus) {
                log.debug('Found active Ledger connection via WebHID');
                console.log('[LEDGER] Found active Ledger connection via WebHID');
                return true;
            }
        } catch (e) {
            log.error('Error checking WebHID status:', e);
        }

        console.log('[LEDGER] No valid WebHID connection found');
        return false;
    }

    /**
     * Closes the offscreen document if it exists
     */
    async closeOffscreenDocument(): Promise<void> {
        if (this.offscreenCreated && chrome.offscreen) {
            try {
                await chrome.offscreen.closeDocument();
                this.offscreenCreated = false;
                log.debug('Offscreen document closed');
                console.log('[LEDGER] Offscreen document closed');
            } catch (e) {
                log.error('Error closing offscreen document:', e);
                console.error('[LEDGER] Error closing offscreen document:', e);
            }
        }
    }

    /**
     * Proxy method to get a page of accounts from Ledger device via the offscreen document
     * @param pageIndex The index of the page to get
     * @param pageSize The number of accounts to get per page
     * @param hdPath The HD path to use (optional) 
     * @returns Promise resolving to the page of accounts
     */
    async getAccounts(pageIndex: number, pageSize: number, hdPath?: string): Promise<Array<{ address: string, index: number, balance?: string, name?: string }>> {
        try {
            log.debug(`Proxying getAccounts to offscreen document (page ${pageIndex}, size ${pageSize})`);
            console.log(`[LEDGER] Proxying getAccounts to offscreen document (page ${pageIndex}, size ${pageSize})`);

            // Ensure offscreen document is created
            await this.ensureOffscreenDocument();

            // Verify transport connection before trying to get accounts
            const isConnected = await this.checkWebHIDStatus();
            if (!isConnected) {
                log.debug(`WebHID connection not established, attempting reconnection`);
                console.log(`[LEDGER] WebHID connection not established, attempting reconnection`);

                // Try to reconnect first
                const connectionResult = await this.connectUsingWebHID();
                if (!connectionResult.success) {
                    throw new Error("Failed to establish WebHID connection before getting accounts");
                }

                // Add a short delay after successful connection to ensure device is ready
                await new Promise(resolve => setTimeout(resolve, 1000));

                console.log(`[LEDGER] Reconnection successful, proceeding to get accounts`);
            }

            // Ensure Ethereum app is open
            const isEthAppOpen = await this.verifyEthereumAppOpen();
            if (!isEthAppOpen) {
                throw new Error("Ethereum app is not open on Ledger device");
            }

            return new Promise((resolve, reject) => {
                // Set a timeout to avoid hanging
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout waiting for Ledger accounts'));
                }, 30000);

                // Set up error handling for message channel closed
                const handleErrorResponse = (error: Error | any) => {
                    clearTimeout(timeout);
                    log.error('Error in getAccounts message:', error);
                    console.error('[LEDGER] Error in getAccounts message:', error);

                    // Special handling for device not opened
                    if (error.message && error.message.includes('device must be opened')) {
                        console.error('[LEDGER] Device not opened error detected, attempting recovery');

                        // Force reconnection next time
                        this.sendDeviceReconnectionRequest()
                            .then(() => reject(error))
                            .catch(() => reject(error));
                        return;
                    }

                    reject(error);
                };

                // Send message to offscreen document
                chrome.runtime.sendMessage({
                    type: 'HW_LEDGER_OPERATION',
                    operation: 'getAccounts',
                    params: {
                        pageIndex,
                        pageSize,
                        hdPath
                    },
                    requestId: Date.now().toString()
                }).then((response) => {
                    clearTimeout(timeout);

                    if (response && response.success) {
                        log.debug(`Successfully received ${response.accounts?.length || 0} accounts from offscreen document`);
                        console.log(`[LEDGER] Successfully received ${response.accounts?.length || 0} accounts from offscreen document`);
                        resolve(response.accounts || []);
                    } else {
                        const error = new Error(response?.error || 'Failed to get accounts from Ledger device');
                        log.error('Error getting accounts from offscreen document:', error);
                        console.error('[LEDGER] Error getting accounts from offscreen document:', error);
                        handleErrorResponse(error);
                    }
                }).catch(handleErrorResponse);
            });
        } catch (error) {
            log.error('Error in getAccounts:', error);
            console.error('[LEDGER] Error in getAccounts:', error);
            throw error;
        }
    }

    /**
     * Helper method to send a device reconnection request to the offscreen document
     * This force-closes and reopens the device connection to recover from errors
     */
    private async sendDeviceReconnectionRequest(): Promise<void> {
        console.log('[LEDGER] Sending device reconnection request');
        try {
            // First disconnect the device
            await chrome.runtime.sendMessage({
                type: 'HW_DISCONNECT_REQUEST',
                device: 'LEDGER'
            });

            // Wait a bit before reconnecting
            await new Promise(resolve => setTimeout(resolve, 500));

            // Then try to connect again
            await this.connectUsingWebHID();

            // Add additional delay to ensure device is ready
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('[LEDGER] Device reconnection request completed');
        } catch (e) {
            console.error('[LEDGER] Error during device reconnection:', e);
        }
    }

    /**
     * Proxy method to get a page of accounts from Ledger device via the offscreen document
     * This is an alternative interface to getAccounts that matches the KeyringController interface
     * @param pageIndex The index of the page to get
     * @param hdPath The HD path to use (optional) 
     * @returns Promise resolving to the page of accounts
     */
    async getPage(pageIndex: number, hdPath?: string): Promise<string[]> {
        try {
            log.debug(`Proxying getPage to offscreen document (page ${pageIndex})`);
            console.log(`[LEDGER] Proxying getPage to offscreen document (page ${pageIndex})`);

            await this.ensureOffscreenDocument();

            return new Promise((resolve, reject) => {
                // Set a timeout to avoid hanging
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout waiting for Ledger page'));
                }, 30000);

                chrome.runtime.sendMessage({
                    type: 'HW_LEDGER_OPERATION',
                    operation: 'getPage',
                    params: {
                        pageIndex,
                        hdPath
                    },
                    requestId: Date.now().toString()
                }).then((response) => {
                    clearTimeout(timeout);

                    if (response && response.success) {
                        log.debug(`Successfully received page from offscreen document`);
                        console.log(`[LEDGER] Successfully received page from offscreen document`);
                        resolve(response.accounts || []);
                    } else {
                        const error = new Error(response?.error || 'Failed to get page from Ledger device');
                        log.error('Error getting page from offscreen document:', error);
                        console.error('[LEDGER] Error getting page from offscreen document:', error);
                        reject(error);
                    }
                }).catch((error) => {
                    clearTimeout(timeout);
                    log.error('Error in getPage message:', error);
                    console.error('[LEDGER] Error in getPage message:', error);
                    reject(error);
                });
            });
        } catch (error) {
            log.error('Error in getPage:', error);
            console.error('[LEDGER] Error in getPage:', error);
            throw error;
        }
    }

    /**
     * Retrieves multiple accounts from the Ledger device at the specified indexes
     * @param accountIndexes Array of account indexes to retrieve
     * @param hdPath Optional HD path to use (defaults to the device's standard path)
     * @returns Promise resolving to array of Ethereum addresses
     */
    async getMultipleAccounts(accountIndexes: number[], hdPath?: string): Promise<string[]> {
        try {
            log.debug(`Getting multiple Ledger accounts for indexes: ${accountIndexes.join(', ')}`);
            console.log(`[LEDGER] Getting multiple Ledger accounts for indexes: ${accountIndexes.join(', ')}`);

            await this.ensureOffscreenDocument();

            // Verify Ethereum app is open
            const isAppOpen = await this.verifyEthereumAppOpen();
            if (!isAppOpen) {
                throw new Error('Ethereum app is not open on Ledger device');
            }

            return new Promise((resolve, reject) => {
                // Set a timeout to avoid hanging
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout waiting for Ledger accounts'));
                }, 60000); // Longer timeout for multiple accounts

                chrome.runtime.sendMessage({
                    type: 'HW_LEDGER_OPERATION',
                    operation: 'getMultipleAccounts',
                    params: {
                        indexes: accountIndexes,
                        hdPath
                    },
                    requestId: Date.now().toString()
                }).then((response) => {
                    clearTimeout(timeout);

                    if (response && response.success) {
                        log.debug(`Successfully received ${response.accounts?.length || 0} accounts from Ledger`);
                        console.log(`[LEDGER] Successfully received ${response.accounts?.length || 0} accounts from Ledger`);
                        resolve(response.accounts || []);
                    } else {
                        const error = new Error(response?.error || 'Failed to get multiple accounts from Ledger device');
                        log.error('Error getting multiple accounts:', error);
                        console.error('[LEDGER] Error getting multiple accounts:', error);
                        reject(error);
                    }
                }).catch((error) => {
                    clearTimeout(timeout);
                    log.error('Error in getMultipleAccounts message:', error);
                    console.error('[LEDGER] Error in getMultipleAccounts message:', error);
                    reject(error);
                });
            });
        } catch (error) {
            log.error('Error in getMultipleAccounts:', error);
            console.error('[LEDGER] Error in getMultipleAccounts:', error);
            throw error;
        }
    }

    /**
     * General purpose proxy method to execute any Ledger operation via the offscreen document
     * @param operation The name of the operation to execute
     * @param params The parameters to pass to the operation
     * @returns Promise resolving to the operation result
     */
    async proxyLedgerOperation(operation: string, params: any): Promise<any> {
        try {
            log.debug(`Proxying ${operation} to offscreen document`);
            console.log(`[LEDGER] Proxying ${operation} to offscreen document`);

            await this.ensureOffscreenDocument();

            return new Promise((resolve, reject) => {
                // Set a timeout to avoid hanging
                const timeout = setTimeout(() => {
                    reject(new Error(`Timeout waiting for Ledger operation: ${operation}`));
                }, 30000);

                chrome.runtime.sendMessage({
                    type: 'HW_LEDGER_OPERATION',
                    operation,
                    params,
                    requestId: Date.now().toString()
                }).then((response) => {
                    clearTimeout(timeout);

                    if (response && response.success) {
                        log.debug(`Successfully executed ${operation} via offscreen document`);
                        console.log(`[LEDGER] Successfully executed ${operation} via offscreen document`);
                        resolve(response.result);
                    } else {
                        const error = new Error(response?.error || `Failed to execute ${operation} on Ledger device`);
                        log.error(`Error executing ${operation} via offscreen document:`, error);
                        console.error(`[LEDGER] Error executing ${operation} via offscreen document:`, error);
                        reject(error);
                    }
                }).catch((error) => {
                    clearTimeout(timeout);
                    log.error(`Error in ${operation} message:`, error);
                    console.error(`[LEDGER] Error in ${operation} message:`, error);
                    reject(error);
                });
            });
        } catch (error) {
            log.error(`Error in ${operation}:`, error);
            console.error(`[LEDGER] Error in ${operation}:`, error);
            throw error;
        }
    }
}

// Export a singleton instance
export const ledgerBridge = new LedgerBridge(); 