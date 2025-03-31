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
            // Don't check too frequently (throttle to once every 5 seconds)
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
                    console.log('[LEDGER] Ethereum app verification timed out');

                    // Store the timeout status in session storage
                    try {
                        if (chrome.storage?.session) {
                            chrome.storage.session.set({
                                'ledger_eth_app_status': {
                                    open: false,
                                    timestamp: Date.now(),
                                    reason: 'verification_timeout'
                                }
                            });
                        }
                    } catch (e) {
                        console.error('[LEDGER] Failed to store timeout status:', e);
                    }

                    this.ethAppOpenStatus = false;
                    resolve(false);
                }, 5000);

                // Send verification request to offscreen document
                chrome.runtime.sendMessage({
                    type: 'HW_VERIFY_ETH_APP',
                    device: 'LEDGER',
                    transportType: 'webhid',
                    bypassCache, // Pass along the bypass flag
                    requestId: Date.now().toString() // Add unique ID to track this request
                }).then((response) => {
                    clearTimeout(timeout);

                    if (response && response.success && response.appOpen) {
                        log.debug('Ethereum app is open on Ledger device');
                        console.log('[LEDGER] Ethereum app is open on Ledger device');
                        this.lastEthAppCheck = now;
                        this.ethAppOpenStatus = true;
                        resolve(true);
                    } else {
                        const errorMessage = response?.error || 'Ethereum app is not open on Ledger device';
                        log.debug(`Ethereum app verification failed: ${errorMessage}`);
                        console.log(`[LEDGER] Ethereum app verification failed: ${errorMessage}`);
                        this.ethAppOpenStatus = false;
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
                                    error: error.message
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
                            error: error.message,
                            source: 'verifyEthereumAppOpen'
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

                        // After connecting, verify that Ethereum app is open
                        const isEthAppOpen = await this.verifyEthereumAppOpen();

                        // Store connection info in session storage
                        try {
                            if (chrome.storage?.session) {
                                chrome.storage.session.set({
                                    'ledger_connection_status': {
                                        connected: true,
                                        timestamp: Date.now(),
                                        source: 'webhid',
                                        transportType: 'webhid',
                                        ethAppOpen: isEthAppOpen
                                    }
                                });
                            }
                        } catch (e) {
                            console.error('[LEDGER] Failed to store connection status in session storage:', e);
                        }

                        if (!isEthAppOpen) {
                            // Connection successful but app not open
                            console.warn('[LEDGER] Connected to device but Ethereum app is not open');
                            resolve({
                                success: true,
                                needsEthereumApp: true,
                                message: 'Please open the Ethereum app on your Ledger device'
                            });
                        } else {
                            resolve({ success: true });
                        }
                    } else {
                        log.debug('WebHID connection failed:', response?.error || 'Unknown error');
                        console.log('[LEDGER] WebHID connection failed:', response?.error || 'Unknown error');

                        // Store error information in session storage
                        try {
                            if (chrome.storage?.session && response?.errorCode) {
                                chrome.storage.session.set({
                                    'ledger_connection_error': {
                                        error: response.error,
                                        timestamp: Date.now(),
                                        errorCode: response.errorCode,
                                        transportType: 'webhid'
                                    }
                                });
                            }
                        } catch (e) {
                            console.error('[LEDGER] Failed to store error in session storage:', e);
                        }

                        if (response?.errorCode === 'PERMISSION_DENIED') {
                            // For permission denied, we need user gesture
                            resolve({ success: false, needsUserGesture: true });
                        } else {
                            reject(new Error(response?.error || 'WebHID connection failed for unknown reason'));
                        }
                    }
                }).catch((error) => {
                    // Clear the timeout
                    if (this.connectionTimeout) {
                        clearTimeout(this.connectionTimeout);
                        this.connectionTimeout = null;
                    }

                    log.error('Error sending WebHID connection message:', error);
                    console.error('[LEDGER] Error sending WebHID connection message:', error);
                    reject(error);
                });
            });
        } catch (error) {
            log.error('Error in WebHID connection process:', error);
            console.error('[LEDGER] Error in WebHID connection process:', error);
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
}

// Export a singleton instance
export const ledgerBridge = new LedgerBridge(); 