import { ledgerBridge } from './ledgerBridge';
import log from 'loglevel';
import { Mutex } from 'async-mutex';

/**
 * Defines the possible states of a Ledger connection
 */
export enum LedgerConnectionState {
    DISCONNECTED = 'DISCONNECTED',
    CONNECTING = 'CONNECTING',
    CONNECTED = 'CONNECTED',
    WAITING_FOR_APP = 'WAITING_FOR_APP',
    APP_OPEN = 'APP_OPEN',
    ERROR = 'ERROR',
}

/**
 * Defines the events that can trigger state transitions
 */
export enum LedgerConnectionEvent {
    CONNECT = 'CONNECT',
    CONNECTION_SUCCESS = 'CONNECTION_SUCCESS',
    CONNECTION_FAILURE = 'CONNECTION_FAILURE',
    APP_OPEN_DETECTED = 'APP_OPEN_DETECTED',
    APP_CLOSED_DETECTED = 'APP_CLOSED_DETECTED',
    DISCONNECT = 'DISCONNECT',
    USER_REJECTED = 'USER_REJECTED',
    ERROR_OCCURRED = 'ERROR_OCCURRED',
    VERIFY_CONNECTION = 'VERIFY_CONNECTION',
    HEARTBEAT_SUCCEEDED = 'HEARTBEAT_SUCCEEDED',
    HEARTBEAT_FAILED = 'HEARTBEAT_FAILED',
}

/**
 * Defines the error types specific to Ledger connections
 */
export enum LedgerErrorType {
    CONNECTION_FAILED = 'CONNECTION_FAILED',
    NO_DEVICE_FOUND = 'NO_DEVICE_FOUND',
    MULTIPLE_DEVICES = 'MULTIPLE_DEVICES',
    APP_NOT_OPEN = 'APP_NOT_OPEN',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    TIMEOUT = 'TIMEOUT',
    UNKNOWN = 'UNKNOWN',
}

/**
 * Structured error object for Ledger operations
 */
export interface LedgerError {
    type: LedgerErrorType;
    message: string;
    originalError?: Error;
    timestamp: number;
}

/**
 * Configuration options for LedgerConnectionManager
 */
export interface LedgerConnectionManagerConfig {
    heartbeatInterval?: number; // In milliseconds
    storageKeys?: {
        connectionStatus?: string;
        ethereumAppStatus?: string;
        hdPath?: string;
        pendingOperations?: string;
    };
    maxRetries?: number;
    reconnectDelay?: number; // In milliseconds
}

/**
 * Connection status information including device details
 */
export interface LedgerConnectionInfo {
    state: LedgerConnectionState;
    lastStateChange: number;
    transportType: 'webhid' | 'webusb' | undefined;
    error: LedgerError | null;
    hdPath?: string;
    appOpen?: boolean;
    lastAppCheck?: number;
}

/**
 * Event listener for connection state changes
 */
export type LedgerConnectionListener = (
    state: LedgerConnectionState,
    info: LedgerConnectionInfo
) => void;

/**
 * Result of a connection attempt
 */
export interface ConnectionResult {
    success: boolean;
    needsUserGesture?: boolean;
    state: LedgerConnectionState;
    error?: LedgerError;
    transportType?: 'webhid' | 'webusb';
}

/**
 * Result format from ledgerBridge.connectUsingWebHID() method
 */
interface LedgerBridgeConnectionResult {
    success: boolean;
    needsUserGesture?: boolean;
    needsEthereumApp?: boolean;
    message?: string;
    transportType?: 'webhid' | 'webusb';
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: LedgerConnectionManagerConfig = {
    heartbeatInterval: 30000, // 30 seconds
    storageKeys: {
        connectionStatus: 'ledger_connection_status',
        ethereumAppStatus: 'ledger_eth_app_status',
        hdPath: 'ledger_hd_path',
        pendingOperations: 'ledger_pending_operations',
    },
    maxRetries: 3,
    reconnectDelay: 1000, // 1 second
};

/**
 * Manages the Ledger connection lifecycle using a state machine pattern
 * Handles WebHID connections, Ethereum app detection, and connection heartbeats
 */
export class LedgerConnectionManager {
    private state: LedgerConnectionState = LedgerConnectionState.DISCONNECTED;
    private connectionInfo: LedgerConnectionInfo;
    private listeners: Set<LedgerConnectionListener> = new Set();
    private config: LedgerConnectionManagerConfig;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private mutex: Mutex = new Mutex();
    private retryCount = 0;
    private connectionPromise: Promise<ConnectionResult> | null = null;

    constructor(config: Partial<LedgerConnectionManagerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };

        // Initialize connection info
        this.connectionInfo = {
            state: LedgerConnectionState.DISCONNECTED,
            lastStateChange: Date.now(),
            transportType: undefined,
            error: null,
        };

        // Try to restore state from storage
        this.restoreStateFromStorage();

        log.debug('LedgerConnectionManager initialized');
    }

    /**
     * Restores the connection state from persistent storage if available
     */
    private async restoreStateFromStorage(): Promise<void> {
        try {
            if (!chrome.storage?.session) return;

            const statusKey = this.config.storageKeys?.connectionStatus || 'ledger_connection_status';
            const appStatusKey = this.config.storageKeys?.ethereumAppStatus || 'ledger_eth_app_status';

            const result = await chrome.storage.session.get([statusKey, appStatusKey]);

            const connectionStatus = result[statusKey];
            const ethereumAppStatus = result[appStatusKey];

            if (connectionStatus && connectionStatus.connected) {
                const lastUpdate = connectionStatus.timestamp || 0;
                const now = Date.now();

                // Only restore if state is recent (last 5 minutes)
                if (now - lastUpdate < 5 * 60 * 1000) {
                    this.connectionInfo = {
                        ...this.connectionInfo,
                        transportType: connectionStatus.transportType || 'webhid',
                        lastStateChange: lastUpdate,
                    };

                    // Check if Ethereum app status is available and recent
                    if (ethereumAppStatus && ethereumAppStatus.timestamp) {
                        const appStatusAge = now - ethereumAppStatus.timestamp;

                        if (appStatusAge < 5 * 60 * 1000) {
                            // If app status is recent, use it
                            if (ethereumAppStatus.open) {
                                await this.transition(LedgerConnectionEvent.APP_OPEN_DETECTED);
                            } else if (connectionStatus.connected) {
                                await this.transition(LedgerConnectionEvent.CONNECTION_SUCCESS);
                                // Also indicate app is not open
                                this.connectionInfo.appOpen = false;
                            }

                            this.connectionInfo.lastAppCheck = ethereumAppStatus.timestamp;
                        } else {
                            // If app status is not recent, verify connection
                            await this.transition(LedgerConnectionEvent.VERIFY_CONNECTION);
                        }
                    } else if (connectionStatus.connected) {
                        // If we have connection but no app status, set connected state
                        await this.transition(LedgerConnectionEvent.CONNECTION_SUCCESS);
                    }
                }
            }
        } catch (error) {
            log.error('Error restoring Ledger connection state:', error);
        }
    }

    /**
     * Transitions the state machine based on an event
     * @param event The event triggering the state transition
     * @param data Optional data associated with the event
     * @returns Promise resolving when the transition is complete
     */
    private async transition(
        event: LedgerConnectionEvent,
        data: any = null
    ): Promise<void> {
        // Use mutex to prevent concurrent state transitions
        return this.mutex.runExclusive(async () => {
            log.debug(`LedgerConnectionManager - Event: ${event}, Current State: ${this.state}`);

            const prevState = this.state;
            let nextState = prevState;

            // Define state transitions based on current state and event
            switch (prevState) {
                case LedgerConnectionState.DISCONNECTED:
                    if (event === LedgerConnectionEvent.CONNECT) {
                        nextState = LedgerConnectionState.CONNECTING;
                    }
                    break;

                case LedgerConnectionState.CONNECTING:
                    if (event === LedgerConnectionEvent.CONNECTION_SUCCESS) {
                        nextState = LedgerConnectionState.CONNECTED;
                    } else if (event === LedgerConnectionEvent.CONNECTION_FAILURE ||
                        event === LedgerConnectionEvent.USER_REJECTED ||
                        event === LedgerConnectionEvent.ERROR_OCCURRED) {
                        nextState = LedgerConnectionState.ERROR;

                        // Store error information
                        if (data && data.error) {
                            this.connectionInfo.error = data.error;
                        }
                    }
                    break;

                case LedgerConnectionState.CONNECTED:
                    if (event === LedgerConnectionEvent.APP_OPEN_DETECTED) {
                        nextState = LedgerConnectionState.APP_OPEN;
                    } else if (event === LedgerConnectionEvent.VERIFY_CONNECTION) {
                        // Stay in CONNECTED, but will trigger app check
                        nextState = LedgerConnectionState.WAITING_FOR_APP;
                    } else if (event === LedgerConnectionEvent.HEARTBEAT_FAILED ||
                        event === LedgerConnectionEvent.DISCONNECT) {
                        nextState = LedgerConnectionState.DISCONNECTED;
                    }
                    break;

                case LedgerConnectionState.WAITING_FOR_APP:
                    if (event === LedgerConnectionEvent.APP_OPEN_DETECTED) {
                        nextState = LedgerConnectionState.APP_OPEN;
                    } else if (event === LedgerConnectionEvent.APP_CLOSED_DETECTED) {
                        nextState = LedgerConnectionState.CONNECTED;
                    } else if (event === LedgerConnectionEvent.HEARTBEAT_FAILED ||
                        event === LedgerConnectionEvent.DISCONNECT) {
                        nextState = LedgerConnectionState.DISCONNECTED;
                    }
                    break;

                case LedgerConnectionState.APP_OPEN:
                    if (event === LedgerConnectionEvent.APP_CLOSED_DETECTED) {
                        nextState = LedgerConnectionState.CONNECTED;
                    } else if (event === LedgerConnectionEvent.HEARTBEAT_FAILED ||
                        event === LedgerConnectionEvent.DISCONNECT) {
                        nextState = LedgerConnectionState.DISCONNECTED;
                    }
                    break;

                case LedgerConnectionState.ERROR:
                    if (event === LedgerConnectionEvent.CONNECT) {
                        nextState = LedgerConnectionState.CONNECTING;
                        this.connectionInfo.error = null;
                    }
                    break;
            }

            // Update state if it changed
            if (nextState !== prevState) {
                this.state = nextState;
                this.connectionInfo.state = nextState;
                this.connectionInfo.lastStateChange = Date.now();

                // Handle side effects of state transitions
                await this.handleStateTransitionEffects(prevState, nextState);

                // Notify listeners
                this.notifyListeners();

                // Store state in session storage
                this.persistStateToStorage();
            }
        });
    }

    /**
     * Handle side effects after state transitions
     * @param prevState Previous state
     * @param nextState New state
     */
    private async handleStateTransitionEffects(
        prevState: LedgerConnectionState,
        nextState: LedgerConnectionState
    ): Promise<void> {
        // Start heartbeat when connected
        if (nextState === LedgerConnectionState.CONNECTED ||
            nextState === LedgerConnectionState.WAITING_FOR_APP ||
            nextState === LedgerConnectionState.APP_OPEN) {
            this.startHeartbeat();
        }

        // Stop heartbeat when disconnected or in error state
        if (nextState === LedgerConnectionState.DISCONNECTED ||
            nextState === LedgerConnectionState.ERROR) {
            this.stopHeartbeat();
        }

        // When entering CONNECTED state, check for Ethereum app
        if (nextState === LedgerConnectionState.CONNECTED) {
            // Reset retry count when successfully connected
            this.retryCount = 0;

            try {
                const appOpen = await ledgerBridge.verifyEthereumAppOpen(true);
                if (appOpen) {
                    this.connectionInfo.appOpen = true;
                    this.connectionInfo.lastAppCheck = Date.now();
                    await this.transition(LedgerConnectionEvent.APP_OPEN_DETECTED);
                } else {
                    this.connectionInfo.appOpen = false;
                    this.connectionInfo.lastAppCheck = Date.now();
                }
            } catch (error) {
                log.debug('Error checking for Ethereum app:', error);
                this.connectionInfo.appOpen = false;
            }
        }

        // Clear error when leaving ERROR state
        if (prevState === LedgerConnectionState.ERROR &&
            nextState !== LedgerConnectionState.ERROR) {
            this.connectionInfo.error = null;
        }
    }

    /**
     * Performs a heartbeat check to verify the connection is still active
     */
    private async performHeartbeat(): Promise<void> {
        try {
            if (this.state === LedgerConnectionState.DISCONNECTED ||
                this.state === LedgerConnectionState.ERROR) {
                return;
            }

            log.debug('Performing Ledger connection heartbeat check');

            // Check connection status
            const isConnected = await ledgerBridge.checkWebHIDStatus();

            if (!isConnected) {
                log.debug('Heartbeat failed: device no longer connected');
                await this.transition(LedgerConnectionEvent.HEARTBEAT_FAILED);
                return;
            }

            // If in APP_OPEN state, verify app is still open
            if (this.state === LedgerConnectionState.APP_OPEN) {
                const now = Date.now();
                const lastAppCheck = this.connectionInfo.lastAppCheck || 0;

                // Only check every 2 minutes to avoid excessive checks
                if (now - lastAppCheck > 2 * 60 * 1000) {
                    const appOpen = await ledgerBridge.verifyEthereumAppOpen(true);
                    this.connectionInfo.lastAppCheck = now;

                    if (!appOpen) {
                        log.debug('Heartbeat detected Ethereum app was closed');
                        this.connectionInfo.appOpen = false;
                        await this.transition(LedgerConnectionEvent.APP_CLOSED_DETECTED);
                    } else {
                        this.connectionInfo.appOpen = true;
                    }
                }
            }

            await this.transition(LedgerConnectionEvent.HEARTBEAT_SUCCEEDED);
        } catch (error) {
            log.error('Error during Ledger heartbeat:', error);
            // Only transition to failed state if we had a critical error
            if (error.message && (error.message.includes('device disconnected') ||
                error.message.includes('timeout') ||
                error.message.includes('permission') ||
                error.message.includes('not found'))) {
                await this.transition(LedgerConnectionEvent.HEARTBEAT_FAILED);
            }
        }
    }

    /**
     * Starts the heartbeat timer
     */
    private startHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }

        const interval = this.config.heartbeatInterval || 30000;
        this.heartbeatTimer = setInterval(() => this.performHeartbeat(), interval);

        // Ensure the interval will be garbage collected if this class is
        if (this.heartbeatTimer && typeof this.heartbeatTimer === 'object') {
            (this.heartbeatTimer as any).unref?.();
        }
    }

    /**
     * Stops the heartbeat timer
     */
    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    /**
     * Persists the current state to session storage
     */
    private async persistStateToStorage(): Promise<void> {
        try {
            if (!chrome.storage?.session) return;

            const statusKey = this.config.storageKeys?.connectionStatus || 'ledger_connection_status';
            const appStatusKey = this.config.storageKeys?.ethereumAppStatus || 'ledger_eth_app_status';

            // Store connection status
            await chrome.storage.session.set({
                [statusKey]: {
                    connected: this.state === LedgerConnectionState.CONNECTED ||
                        this.state === LedgerConnectionState.WAITING_FOR_APP ||
                        this.state === LedgerConnectionState.APP_OPEN,
                    appOpen: this.state === LedgerConnectionState.APP_OPEN,
                    state: this.state,
                    timestamp: Date.now(),
                    transportType: this.connectionInfo.transportType,
                    error: this.connectionInfo.error,
                }
            });

            // Store Ethereum app status
            if (this.connectionInfo.appOpen !== undefined) {
                await chrome.storage.session.set({
                    [appStatusKey]: {
                        open: this.connectionInfo.appOpen,
                        timestamp: this.connectionInfo.lastAppCheck || Date.now(),
                        device: 'LEDGER',
                        message: this.connectionInfo.appOpen
                            ? 'Ethereum app is open and ready'
                            : 'Please open the Ethereum app on your Ledger device'
                    }
                });
            }
        } catch (error) {
            log.error('Error persisting Ledger state to storage:', error);
        }
    }

    /**
     * Notifies all registered listeners of state changes
     */
    private notifyListeners(): void {
        for (const listener of this.listeners) {
            try {
                listener(this.state, { ...this.connectionInfo });
            } catch (error) {
                log.error('Error in Ledger connection listener:', error);
            }
        }
    }

    /**
     * Registers a listener for connection state changes
     * @param listener The listener function
     * @returns Function to remove the listener
     */
    public addListener(listener: LedgerConnectionListener): () => void {
        this.listeners.add(listener);

        // Call the listener immediately with current state
        try {
            listener(this.state, { ...this.connectionInfo });
        } catch (error) {
            log.error('Error in Ledger connection listener:', error);
        }

        // Return function to remove the listener
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Gets the current connection state
     * @returns Current connection state and info
     */
    public getState(): { state: LedgerConnectionState; info: LedgerConnectionInfo } {
        return {
            state: this.state,
            info: { ...this.connectionInfo }
        };
    }

    /**
     * Initiates a connection to a Ledger device
     * Only one connection attempt can be in progress at a time
     * 
     * @returns Promise resolving to connection result
     */
    public async connect(): Promise<ConnectionResult> {
        // If we already have a connection attempt in progress, return that
        if (this.connectionPromise &&
            (this.state === LedgerConnectionState.CONNECTING)) {
            return this.connectionPromise;
        }

        // Start new connection attempt
        this.connectionPromise = this._connect();

        try {
            const result = await this.connectionPromise;
            return result;
        } finally {
            this.connectionPromise = null;
        }
    }

    /**
     * Internal connection method with retry logic
     */
    private async _connect(): Promise<ConnectionResult> {
        try {
            await this.transition(LedgerConnectionEvent.CONNECT);

            // Set default transport type
            this.connectionInfo.transportType = 'webhid';

            log.debug('Attempting to connect to Ledger device...');

            // Use the ledgerBridge to connect to the device and explicitly type the result
            const result = await ledgerBridge.connectUsingWebHID() as LedgerBridgeConnectionResult;

            if (result.success) {
                // Update connection info with result data
                if (result.transportType) {
                    this.connectionInfo.transportType = result.transportType;
                }

                if (result.needsEthereumApp) {
                    // Device connected but Ethereum app not open
                    this.connectionInfo.appOpen = false;
                    await this.transition(LedgerConnectionEvent.CONNECTION_SUCCESS);
                    return {
                        success: true,
                        state: this.state,
                        needsUserGesture: false,
                        transportType: this.connectionInfo.transportType
                    };
                }

                // Success - device connected and Ethereum app detected
                this.connectionInfo.appOpen = true;
                await this.transition(LedgerConnectionEvent.CONNECTION_SUCCESS);
                await this.transition(LedgerConnectionEvent.APP_OPEN_DETECTED);

                return {
                    success: true,
                    state: this.state,
                    transportType: this.connectionInfo.transportType
                };
            } else if (result.needsUserGesture) {
                // Need UI interaction for WebHID permission
                const error: LedgerError = {
                    type: LedgerErrorType.PERMISSION_DENIED,
                    message: result.message || 'User gesture required for Ledger connection',
                    timestamp: Date.now()
                };

                await this.transition(LedgerConnectionEvent.USER_REJECTED, { error });

                return {
                    success: false,
                    needsUserGesture: true,
                    state: this.state,
                    error,
                    transportType: this.connectionInfo.transportType
                };
            } else {
                // Connection failed for other reasons
                const errorType = this.getErrorTypeFromMessage(result.message);
                const error: LedgerError = {
                    type: errorType,
                    message: result.message || 'Failed to connect to Ledger device',
                    timestamp: Date.now()
                };

                await this.transition(LedgerConnectionEvent.CONNECTION_FAILURE, { error });

                // If configured, attempt to retry
                if (this.retryCount < (this.config.maxRetries || 3)) {
                    this.retryCount++;

                    log.debug(`Connection failed, retrying (${this.retryCount}/${this.config.maxRetries})...`);

                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, this.config.reconnectDelay || 1000));

                    return this._connect();
                }

                return {
                    success: false,
                    state: this.state,
                    error,
                    transportType: this.connectionInfo.transportType
                };
            }
        } catch (error) {
            log.error('Error connecting to Ledger device:', error);

            const ledgerError: LedgerError = {
                type: LedgerErrorType.UNKNOWN,
                message: error.message || 'Unknown error connecting to Ledger device',
                originalError: error,
                timestamp: Date.now()
            };

            await this.transition(LedgerConnectionEvent.ERROR_OCCURRED, { error: ledgerError });

            return {
                success: false,
                state: this.state,
                error: ledgerError,
                transportType: this.connectionInfo.transportType
            };
        }
    }

    /**
     * Determines the error type from an error message
     */
    private getErrorTypeFromMessage(message?: string): LedgerErrorType {
        if (!message) return LedgerErrorType.UNKNOWN;

        if (message.includes('no device selected') ||
            message.includes('no device found') ||
            message.includes('device not found')) {
            return LedgerErrorType.NO_DEVICE_FOUND;
        }

        if (message.includes('multiple devices')) {
            return LedgerErrorType.MULTIPLE_DEVICES;
        }

        if (message.includes('app not open') ||
            message.includes('ethereum app') ||
            message.includes('open the app')) {
            return LedgerErrorType.APP_NOT_OPEN;
        }

        if (message.includes('permission') ||
            message.includes('user gesture') ||
            message.includes('cancelled')) {
            return LedgerErrorType.PERMISSION_DENIED;
        }

        if (message.includes('timeout')) {
            return LedgerErrorType.TIMEOUT;
        }

        return LedgerErrorType.CONNECTION_FAILED;
    }

    /**
     * Verifies that the Ethereum app is open
     * @param bypassCache Whether to bypass the cache check
     * @returns Promise resolving to true if app is open
     */
    public async verifyEthereumAppOpen(bypassCache = false): Promise<boolean> {
        // If app is already confirmed open and cache check not bypassed
        if (!bypassCache &&
            this.state === LedgerConnectionState.APP_OPEN &&
            this.connectionInfo.appOpen) {

            const now = Date.now();
            const lastCheck = this.connectionInfo.lastAppCheck || 0;

            // Use cached result if recent (within 30 seconds)
            if (now - lastCheck < 30000) {
                return true;
            }
        }

        try {
            // If device is not in a connected state, try to connect first
            if (this.state !== LedgerConnectionState.CONNECTED &&
                this.state !== LedgerConnectionState.WAITING_FOR_APP &&
                this.state !== LedgerConnectionState.APP_OPEN) {

                const connectResult = await this.connect();
                if (!connectResult.success) {
                    return false;
                }
            }

            // Verify Ethereum app is open
            await this.transition(LedgerConnectionEvent.VERIFY_CONNECTION);

            const appOpen = await ledgerBridge.verifyEthereumAppOpen(true);
            this.connectionInfo.lastAppCheck = Date.now();

            if (appOpen) {
                this.connectionInfo.appOpen = true;
                await this.transition(LedgerConnectionEvent.APP_OPEN_DETECTED);
                return true;
            } else {
                this.connectionInfo.appOpen = false;
                await this.transition(LedgerConnectionEvent.APP_CLOSED_DETECTED);
                return false;
            }
        } catch (error) {
            log.error('Error verifying Ethereum app:', error);
            this.connectionInfo.appOpen = false;
            return false;
        }
    }

    /**
     * Disconnects from the Ledger device
     */
    public async disconnect(): Promise<void> {
        try {
            if (this.state === LedgerConnectionState.DISCONNECTED) {
                return;
            }

            log.debug('Disconnecting from Ledger device');

            // Close offscreen document
            try {
                await ledgerBridge.closeOffscreenDocument();
            } catch (error) {
                log.debug('Error closing offscreen document:', error);
            }

            await this.transition(LedgerConnectionEvent.DISCONNECT);
        } catch (error) {
            log.error('Error disconnecting from Ledger device:', error);

            // Force disconnect state regardless of error
            this.state = LedgerConnectionState.DISCONNECTED;
            this.connectionInfo.state = LedgerConnectionState.DISCONNECTED;
            this.connectionInfo.lastStateChange = Date.now();
            this.notifyListeners();
        }
    }

    /**
     * Cleans up resources when the manager is no longer needed
     */
    public cleanup(): void {
        this.stopHeartbeat();
        this.listeners.clear();
        this.connectionPromise = null;
    }

    /**
     * Sets the HD path for the Ledger device
     * @param hdPath The HD path to set
     */
    public async setHDPath(hdPath: string): Promise<void> {
        try {
            if (!hdPath) {
                throw new Error('HD path is required');
            }

            log.debug(`Setting HD path for Ledger to ${hdPath}`);

            // Store the HD path
            this.connectionInfo.hdPath = hdPath;

            if (this.state === LedgerConnectionState.APP_OPEN) {
                // Try to set the HD path if already connected
                try {
                    await ledgerBridge.proxyLedgerOperation('setHdPath', { hdPath });
                    log.debug(`Successfully set HD path to ${hdPath}`);
                } catch (error) {
                    log.warn(`Failed to set HD path: ${error.message}`);
                    // Continue anyway - we'll store it for later use
                }
            }

            // Store HD path in session storage
            if (chrome.storage?.session) {
                const hdPathKey = this.config.storageKeys?.hdPath || 'ledger_hd_path';

                await chrome.storage.session.set({
                    [hdPathKey]: {
                        path: hdPath,
                        timestamp: Date.now(),
                        status: 'success'
                    }
                });
            }

            // Also store in local storage for persistence
            try {
                const ledgerPaths = JSON.parse(localStorage.getItem('ledger_hd_paths') || '{}');
                ledgerPaths['LEDGER'] = hdPath;
                localStorage.setItem('ledger_hd_paths', JSON.stringify(ledgerPaths));
            } catch (e) {
                log.warn(`Failed to persist HD path to local storage: ${e.message}`);
            }
        } catch (error) {
            log.error('Error setting HD path:', error);
            throw error;
        }
    }

    /**
     * Gets the stored HD path
     * @returns The currently stored HD path
     */
    public async getHDPath(): Promise<string | undefined> {
        // First check memory cache
        if (this.connectionInfo.hdPath) {
            return this.connectionInfo.hdPath;
        }

        try {
            // Try session storage
            if (chrome.storage?.session) {
                const hdPathKey = this.config.storageKeys?.hdPath || 'ledger_hd_path';
                const result = await chrome.storage.session.get(hdPathKey);

                if (result[hdPathKey] && result[hdPathKey].path) {
                    this.connectionInfo.hdPath = result[hdPathKey].path;
                    return result[hdPathKey].path;
                }
            }

            // Try local storage
            try {
                const ledgerPaths = JSON.parse(localStorage.getItem('ledger_hd_paths') || '{}');
                if (ledgerPaths['LEDGER']) {
                    this.connectionInfo.hdPath = ledgerPaths['LEDGER'];
                    return ledgerPaths['LEDGER'];
                }
            } catch (e) {
                log.warn(`Failed to read HD path from local storage: ${e.message}`);
            }

            // Default path as fallback
            return "m/44'/60'/0'/0/0"; // Ledger Live default
        } catch (error) {
            log.error('Error getting HD path:', error);
            return undefined;
        }
    }
}

// Export a singleton instance for global use
export const ledgerConnectionManager = new LedgerConnectionManager(); 