import { ledgerBridge } from './ledgerBridge';
import log from 'loglevel';
import { Mutex } from 'async-mutex';
import { storage } from './storage/OptimizedStorage';

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
    private pendingOperations = 0;
    private lastOperationTime = 0;

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

        console.log('LedgerConnectionManager initialized');
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
            console.log(`LedgerConnectionManager - Event: ${event}, Current State: ${this.state}`);

            const prevState = this.state;
            let nextState = prevState;

            // Define state transitions based on current state and event
            switch (prevState) {
                case LedgerConnectionState.DISCONNECTED:
                    if (event === LedgerConnectionEvent.CONNECT) {
                        nextState = LedgerConnectionState.CONNECTING;
                        console.log('Transitioning from DISCONNECTED to CONNECTING');
                    }
                    break;

                case LedgerConnectionState.CONNECTING:
                    if (event === LedgerConnectionEvent.CONNECTION_SUCCESS) {
                        nextState = LedgerConnectionState.CONNECTED;
                        console.log('Transitioning from CONNECTING to CONNECTED');
                    } else if (event === LedgerConnectionEvent.CONNECTION_FAILURE ||
                        event === LedgerConnectionEvent.USER_REJECTED ||
                        event === LedgerConnectionEvent.ERROR_OCCURRED) {
                        nextState = LedgerConnectionState.ERROR;
                        console.log(`Transitioning from CONNECTING to ERROR due to ${event}`);

                        // Store error information
                        if (data && data.error) {
                            this.connectionInfo.error = data.error;
                        }
                    }
                    break;

                case LedgerConnectionState.CONNECTED:
                    if (event === LedgerConnectionEvent.APP_OPEN_DETECTED) {
                        nextState = LedgerConnectionState.APP_OPEN;
                        console.log('Transitioning from CONNECTED to APP_OPEN');
                    } else if (event === LedgerConnectionEvent.VERIFY_CONNECTION) {
                        // Stay in CONNECTED, but will trigger app check
                        nextState = LedgerConnectionState.WAITING_FOR_APP;
                        console.log('Transitioning from CONNECTED to WAITING_FOR_APP for verification');
                    } else if (event === LedgerConnectionEvent.HEARTBEAT_FAILED ||
                        event === LedgerConnectionEvent.DISCONNECT) {
                        nextState = LedgerConnectionState.DISCONNECTED;
                        console.log(`Transitioning from CONNECTED to DISCONNECTED due to ${event}`);
                    }
                    break;

                case LedgerConnectionState.WAITING_FOR_APP:
                    if (event === LedgerConnectionEvent.APP_OPEN_DETECTED) {
                        nextState = LedgerConnectionState.APP_OPEN;
                        console.log('Transitioning from WAITING_FOR_APP to APP_OPEN');
                    } else if (event === LedgerConnectionEvent.APP_CLOSED_DETECTED) {
                        nextState = LedgerConnectionState.CONNECTED;
                        console.log('Transitioning from WAITING_FOR_APP to CONNECTED');
                    } else if (event === LedgerConnectionEvent.HEARTBEAT_FAILED ||
                        event === LedgerConnectionEvent.DISCONNECT) {
                        nextState = LedgerConnectionState.DISCONNECTED;
                        console.log(`Transitioning from WAITING_FOR_APP to DISCONNECTED due to ${event}`);
                    }
                    break;

                case LedgerConnectionState.APP_OPEN:
                    if (event === LedgerConnectionEvent.APP_CLOSED_DETECTED) {
                        nextState = LedgerConnectionState.CONNECTED;
                        console.log('Transitioning from APP_OPEN to CONNECTED');
                    } else if (event === LedgerConnectionEvent.HEARTBEAT_FAILED ||
                        event === LedgerConnectionEvent.DISCONNECT) {
                        nextState = LedgerConnectionState.DISCONNECTED;
                        console.log(`Transitioning from APP_OPEN to DISCONNECTED due to ${event}`);
                    }
                    break;

                case LedgerConnectionState.ERROR:
                    if (event === LedgerConnectionEvent.CONNECT) {
                        nextState = LedgerConnectionState.CONNECTING;
                        console.log('Transitioning from ERROR to CONNECTING');
                        this.connectionInfo.error = null;
                    }
                    break;
            }

            // Update state if it changed
            if (nextState !== prevState) {
                this.state = nextState;
                this.connectionInfo.state = nextState;
                this.connectionInfo.lastStateChange = Date.now();

                // Notify listeners before handle effects
                // This ensures UI gets fresh state before side effects run
                this.notifyListeners();

                // Handle side effects of state transitions
                await this.handleStateTransitionEffects(prevState, nextState);

                // Special handling for APP_OPEN_DETECTED event to ensure it propagates
                if (event === LedgerConnectionEvent.APP_OPEN_DETECTED) {
                    console.log('Re-notifying listeners after APP_OPEN_DETECTED event');
                    // Force another notification to ensure APP_OPEN state is captured
                    this.notifyListeners();
                }
            } else {
                console.log(`State remained ${prevState} after event ${event}`);

                // Even if state didn't change, we might need to update some info
                if (event === LedgerConnectionEvent.APP_OPEN_DETECTED) {
                    this.connectionInfo.appOpen = true;
                    this.connectionInfo.lastAppCheck = Date.now();
                    console.log('Updated appOpen status without state change');
                    this.notifyListeners();
                } else if (event === LedgerConnectionEvent.APP_CLOSED_DETECTED) {
                    this.connectionInfo.appOpen = false;
                    this.connectionInfo.lastAppCheck = Date.now();
                    console.log('Updated appOpen status without state change');
                    this.notifyListeners();
                }
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
        console.log(`Handling state transition effects: ${prevState} -> ${nextState}`);

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
                console.log('Checking if Ethereum app is open...');
                const appOpen = await this._checkEthereumApp();

                if (appOpen) {
                    console.log('Ethereum app is open, will transition to APP_OPEN');
                    this.connectionInfo.appOpen = true;
                    this.connectionInfo.lastAppCheck = Date.now();

                    // Force a session storage update with app status info
                    await this.persistAppStatus(true);

                    // Explicitly set state to APP_OPEN directly instead of using transition
                    // This avoids possible race conditions with multiple transitions
                    this.state = LedgerConnectionState.APP_OPEN;
                    this.connectionInfo.state = LedgerConnectionState.APP_OPEN;
                    this.connectionInfo.lastStateChange = Date.now();

                    // Force notification about the APP_OPEN state
                    this.notifyListeners(true);

                    console.log('Directly transitioned to APP_OPEN state');
                } else {
                    console.log('Ethereum app is not open');
                    this.connectionInfo.appOpen = false;

                    // Force a session storage update with app status info
                    await this.persistAppStatus(false);
                }
            } catch (error) {
                console.log(`Error checking for Ethereum app: ${error.message}`);
                this.connectionInfo.appOpen = false;
                await this.persistAppStatus(false);
            }
        }

        // When entering APP_OPEN state, update app info
        if (nextState === LedgerConnectionState.APP_OPEN && prevState !== LedgerConnectionState.APP_OPEN) {
            // Update app status
            this.connectionInfo.appOpen = true;
            this.connectionInfo.lastAppCheck = Date.now();

            // Store app status explicitly
            await this.persistAppStatus(true);

            console.log('Successfully entered APP_OPEN state');
        }

        // Clear error when leaving ERROR state
        if (prevState === LedgerConnectionState.ERROR &&
            nextState !== LedgerConnectionState.ERROR) {
            this.connectionInfo.error = null;
        }
    }

    /**
     * Persist app status to storage (OPTIMIZED with batching)
     * @param isOpen Whether the Ethereum app is open
     */
    private async persistAppStatus(isOpen: boolean): Promise<void> {
        if (!chrome.storage?.session) return;

        const appStatusKey = this.config.storageKeys?.ethereumAppStatus || 'ledger_eth_app_status';

        try {
            await storage.session.set(appStatusKey, {
                open: isOpen,
                timestamp: Date.now(),
                device: 'LEDGER',
                source: 'offscreen_verification_success',
                message: isOpen
                    ? 'Ethereum app is open and ready'
                    : 'Please open the Ethereum app on your Ledger device'
            });
            console.log(`Stored Ethereum app status (open: ${isOpen}) in session storage`);
        } catch (e) {
            console.warn(`Failed to store app status: ${e.message}`);
        }
    }

    /**
     * Helper method to check if the Ethereum app is open
     * Retries up to 3 times with short timeouts to handle app startup delay
     */
    private async _checkEthereumApp(): Promise<boolean> {
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000; // 1 second

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                if (attempt > 0) {
                    console.log(`Retry attempt ${attempt + 1}/${MAX_RETRIES} to check Ethereum app...`);
                }

                const appOpen = await ledgerBridge.verifyEthereumAppOpen(true);

                if (appOpen) {
                    console.log('Successfully detected Ethereum app is open');
                    return true;
                } else if (attempt < MAX_RETRIES - 1) {
                    console.log('Ethereum app not detected yet, waiting before retry...');
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                }
            } catch (error) {
                console.log(`Error during Ethereum app check (attempt ${attempt + 1}): ${error.message}`);

                if (attempt < MAX_RETRIES - 1) {
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                }
            }
        }

        console.log('Failed to detect Ethereum app after multiple attempts');
        return false;
    }

    /**
     * Performs a heartbeat check to verify the connection is still active
     */
    private async performHeartbeat(): Promise<void> {
        // Skip heartbeat if in disconnect or error states
        if (this.state === LedgerConnectionState.DISCONNECTED ||
            this.state === LedgerConnectionState.ERROR) {
            return;
        }

        console.log(`Performing Ledger connection heartbeat check (current state: ${this.state})`);

        try {
            // Check connection status
            const isConnected = await ledgerBridge.checkWebHIDStatus();

            if (!isConnected) {
                console.log('Heartbeat failed: device no longer connected');
                await this.transition(LedgerConnectionEvent.HEARTBEAT_FAILED);
                return;
            }

            const now = Date.now();
            const lastAppCheck = this.connectionInfo.lastAppCheck || 0;
            const timeSinceLastCheck = now - lastAppCheck;

            // Device is connected, now handle state-specific checks
            switch (this.state) {
                case LedgerConnectionState.APP_OPEN:
                    // If in APP_OPEN state, verify app is still open (less frequently)
                    // Only check every 2 minutes to avoid excessive checks
                    if (timeSinceLastCheck > 2 * 60 * 1000) {
                        try {
                            console.log('Verifying Ethereum app is still open...');
                            const appOpen = await ledgerBridge.verifyEthereumAppOpen(true);
                            this.connectionInfo.lastAppCheck = now;

                            if (!appOpen) {
                                console.log('Heartbeat detected Ethereum app was closed');
                                this.connectionInfo.appOpen = false;
                                await this.transition(LedgerConnectionEvent.APP_CLOSED_DETECTED);
                            } else {
                                console.log('Confirmed Ethereum app is still open');
                                this.connectionInfo.appOpen = true;
                            }
                        } catch (error) {
                            // Don't change state on verification error, just log it
                            console.log(`Error verifying app status: ${error.message}`);
                        }
                    }
                    break;

                case LedgerConnectionState.CONNECTED:
                case LedgerConnectionState.WAITING_FOR_APP:
                    // Optionally check if app is open now
                    // but less aggressively than the regular check
                    if (timeSinceLastCheck > 5 * 60 * 1000) { // 5 minutes
                        try {
                            console.log('Checking if Ethereum app has been opened...');
                            const appOpen = await ledgerBridge.verifyEthereumAppOpen(true);
                            this.connectionInfo.lastAppCheck = now;

                            if (appOpen && !this.connectionInfo.appOpen) {
                                console.log('Heartbeat detected Ethereum app was opened');
                                this.connectionInfo.appOpen = true;
                                await this.transition(LedgerConnectionEvent.APP_OPEN_DETECTED);
                            } else {
                                this.connectionInfo.appOpen = appOpen;
                            }
                        } catch (error) {
                            console.log(`Error checking app in heartbeat: ${error.message}`);
                        }
                    }
                    break;
            }

            // Heartbeat succeeded
            console.log('Heartbeat successful, connection still active');
            await this.transition(LedgerConnectionEvent.HEARTBEAT_SUCCEEDED);
        } catch (error) {
            log.error(`Error during Ledger heartbeat: ${error.message}`);

            // Only transition to failed state if we had a critical error
            if (error.message && (
                error.message.includes('device disconnected') ||
                error.message.includes('timeout') ||
                error.message.includes('permission') ||
                error.message.includes('not found') ||
                error.message.includes('transfer') || // USB transfer errors
                error.message.includes('claim')       // Interface claim errors
            )) {
                console.log('Critical connection error detected, marking heartbeat as failed');
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
            if (!chrome.storage) return;

            const statusKey = this.config.storageKeys?.connectionStatus || 'ledger_connection_status';
            const appStatusKey = this.config.storageKeys?.ethereumAppStatus || 'ledger_eth_app_status';
            const timestamp = Date.now();

            const connectionData = {
                connected: this.state === LedgerConnectionState.CONNECTED ||
                    this.state === LedgerConnectionState.WAITING_FOR_APP ||
                    this.state === LedgerConnectionState.APP_OPEN,
                appOpen: this.state === LedgerConnectionState.APP_OPEN,
                state: this.state,
                timestamp,
                transportType: this.connectionInfo.transportType,
                error: this.connectionInfo.error,
            };

            // OPTIMIZED: Batch session storage operations
            const sessionData: Record<string, any> = {
                [statusKey]: connectionData
            };

            // Add Ethereum app status to session batch if available
            if (this.connectionInfo.appOpen !== undefined) {
                sessionData[appStatusKey] = {
                    open: this.connectionInfo.appOpen,
                    timestamp: this.connectionInfo.lastAppCheck || timestamp,
                    device: 'LEDGER',
                    message: this.connectionInfo.appOpen
                        ? 'Ethereum app is open and ready'
                        : 'Please open the Ethereum app on your Ledger device'
                };
            }

            // OPTIMIZED: Batch local storage operations
            const localData: Record<string, any> = {
                [`${statusKey}_persistent`]: {
                    connected: connectionData.connected,
                    appOpen: connectionData.appOpen,
                    state: this.state,
                    timestamp,
                    transportType: this.connectionInfo.transportType,
                }
            };

            // Execute batched storage operations in parallel
            const storagePromises = [];

            if (chrome.storage.session) {
                storagePromises.push(storage.session.setMultiple(sessionData));
            }

            if (chrome.storage.local) {
                storagePromises.push(storage.local.setMultiple(localData));
            }

            // Wait for all storage operations to complete
            await Promise.all(storagePromises);

        } catch (error) {
            log.error('Error persisting Ledger state to storage:', error);
        }
    }

    /**
     * Notifies all registered listeners of state changes
     * @param forceUpdate Force update even if state hasn't changed
     */
    private notifyListeners(forceUpdate = false): void {
        console.log(`Notifying ${this.listeners.size} listeners of state: ${this.state}, appOpen: ${this.connectionInfo.appOpen}, forceUpdate: ${forceUpdate}`);

        for (const listener of this.listeners) {
            try {
                // Create a copy of connection info to avoid modification by listeners
                const connectionInfoCopy = {
                    ...this.connectionInfo,
                    // Ensure appOpen is properly set based on state
                    appOpen: this.state === LedgerConnectionState.APP_OPEN ? true : this.connectionInfo.appOpen
                };

                listener(this.state, connectionInfoCopy);
            } catch (error) {
                console.error('Error in Ledger connection listener:', error);
            }
        }

        // Also publish state to session storage for UI components
        this.persistStateToStorage();

        // For APP_OPEN state, ensure the app status is explicitly stored
        if (this.state === LedgerConnectionState.APP_OPEN) {
            this.persistAppStatus(true);
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
            // Create a copy of connection info to avoid modification by listeners
            const connectionInfoCopy = {
                ...this.connectionInfo,
                // Ensure appOpen is properly set based on state
                appOpen: this.state === LedgerConnectionState.APP_OPEN ? true : this.connectionInfo.appOpen
            };

            listener(this.state, connectionInfoCopy);
        } catch (error) {
            console.error('Error in Ledger connection listener:', error);
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
        // If we already have a pending connection, return that promise
        if (this.connectionPromise) {
            console.log('[LEDGER] Returning existing connection promise');
            return this.connectionPromise;
        }

        // Reset retry counter on new connection attempt
        this.retryCount = 0;

        // Create a new connection promise
        this.connectionPromise = this._connect();

        try {
            // Wait for the connection to complete
            const result = await this.connectionPromise;
            return result;
        } finally {
            // Clear the connection promise reference
            this.connectionPromise = null;
        }
    }

    /**
     * Internal connection method with retry logic
     */
    private async _connect(): Promise<ConnectionResult> {
        try {
            console.log('[LEDGER] Starting connection process');
            // Check if we're already connected - no need to repeat
            if (this.state === LedgerConnectionState.APP_OPEN ||
                this.state === LedgerConnectionState.CONNECTED) {
                console.log('[LEDGER] Already connected, returning success');
                return {
                    success: true,
                    state: this.state,
                    transportType: this.connectionInfo.transportType,
                };
            }

            if (this.state !== LedgerConnectionState.DISCONNECTED) {
                console.log(`[LEDGER] Not in DISCONNECTED state (current: ${this.state}). Force transitioning to DISCONNECTED.`);
                await this.transition(LedgerConnectionEvent.DISCONNECT);

                // Add a small delay to ensure disconnection completes
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Transition to connecting state
            await this.transition(LedgerConnectionEvent.CONNECT);

            // Attempt to connect
            let result;
            try {
                // Check if there are any pending operations that might interfere
                if (this.pendingOperations > 0) {
                    console.log(`[LEDGER] Waiting for ${this.pendingOperations} pending operations to complete`);

                    // Short wait to allow operations to complete
                    const timeSinceLastOp = Date.now() - this.lastOperationTime;
                    if (timeSinceLastOp < 1000) {
                        await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastOp));
                    }
                }

                console.log('[LEDGER] Sending connect request to ledgerBridge');
                result = await ledgerBridge.connectUsingWebHID() as LedgerBridgeConnectionResult;
                console.log('[LEDGER] Received connect result:', result);
            } catch (error) {
                console.error('[LEDGER] Connection error:', error);
                // Create a structured error object
                const ledgerError: LedgerError = {
                    type: this.getErrorTypeFromMessage(error.message),
                    message: error.message,
                    originalError: error,
                    timestamp: Date.now(),
                };

                // Transition to error state
                await this.transition(LedgerConnectionEvent.CONNECTION_FAILURE, ledgerError);

                return {
                    success: false,
                    state: this.state,
                    error: ledgerError,
                    needsUserGesture: ledgerError.type === LedgerErrorType.PERMISSION_DENIED,
                };
            }

            // Handle successful connection
            if (result.success) {
                console.log('[LEDGER] Connection successful');
                // Update connection info
                if (result.transportType) {
                    this.connectionInfo.transportType = result.transportType;
                }

                // Transition state to connected
                await this.transition(LedgerConnectionEvent.CONNECTION_SUCCESS);

                // Check if the Ethereum app is open
                const appOpen = await this.verifyEthereumAppOpen(true);
                if (appOpen) {
                    console.log('[LEDGER] Ethereum app is open');
                    await this.transition(LedgerConnectionEvent.APP_OPEN_DETECTED);
                }

                // Return success result - use the connection info transportType
                return {
                    success: true,
                    state: this.state,
                    transportType: this.connectionInfo.transportType,
                };
            } else {
                console.log('[LEDGER] Connection failed:', result);
                // Create error object from result
                const errorType = result.needsUserGesture
                    ? LedgerErrorType.PERMISSION_DENIED
                    : (result.needsEthereumApp
                        ? LedgerErrorType.APP_NOT_OPEN
                        : LedgerErrorType.CONNECTION_FAILED);

                const ledgerError: LedgerError = {
                    type: errorType,
                    message: result.message || 'Failed to connect to Ledger device',
                    timestamp: Date.now(),
                };

                // Transition to error state
                await this.transition(LedgerConnectionEvent.CONNECTION_FAILURE, ledgerError);

                return {
                    success: false,
                    state: this.state,
                    error: ledgerError,
                    needsUserGesture: result.needsUserGesture,
                };
            }
        } catch (error) {
            console.error('[LEDGER] Unexpected error during connection:', error);

            // Create a structured error object for unexpected errors
            const ledgerError: LedgerError = {
                type: LedgerErrorType.UNKNOWN,
                message: error.message || 'Unexpected error during Ledger connection',
                originalError: error,
                timestamp: Date.now(),
            };

            // Transition to error state
            await this.transition(LedgerConnectionEvent.ERROR_OCCURRED, ledgerError);

            return {
                success: false,
                state: this.state,
                error: ledgerError,
            };
        }
    }

    /**
     * Determine the appropriate LedgerErrorType from an error message
     * @param message The error message to analyze
     * @returns The corresponding LedgerErrorType
     */
    private getErrorTypeFromMessage(message?: string): LedgerErrorType {
        if (!message) return LedgerErrorType.UNKNOWN;

        if (message.includes('app') || message.includes('App')) {
            return LedgerErrorType.APP_NOT_OPEN;
        }

        if (message.includes('permission') || message.includes('denied') || message.includes('gesture')) {
            return LedgerErrorType.PERMISSION_DENIED;
        }

        if (message.includes('found') || message.includes('no device')) {
            return LedgerErrorType.NO_DEVICE_FOUND;
        }

        if (message.includes('multiple') || message.includes('more than one')) {
            return LedgerErrorType.MULTIPLE_DEVICES;
        }

        if (message.includes('timeout') || message.includes('timed out')) {
            return LedgerErrorType.TIMEOUT;
        }

        return LedgerErrorType.CONNECTION_FAILED;
    }

    /**
     * Verifies if the Ethereum app is open on the Ledger device
     * @param bypassCache Whether to bypass cached app status
     * @returns Promise resolving to true if Ethereum app is open
     */
    public async verifyEthereumAppOpen(bypassCache = false): Promise<boolean> {
        try {
            // Try to grab the mutex to prevent concurrent verification attempts
            return await this.mutex.runExclusive(async () => {
                this.pendingOperations++; // Track pending operation

                try {
                    // Check if we have a cached result and bypass is not requested
                    if (!bypassCache &&
                        this.connectionInfo.appOpen !== undefined &&
                        this.connectionInfo.lastAppCheck !== undefined) {
                        const lastCheckAge = Date.now() - this.connectionInfo.lastAppCheck;
                        // Use cached result if it's recent (last 30 seconds)
                        if (lastCheckAge < 30000 && this.connectionInfo.appOpen) {
                            console.log('[LEDGER] Using cached Ethereum app status');
                            return this.connectionInfo.appOpen;
                        }
                    }

                    if (this.state === LedgerConnectionState.DISCONNECTED) {
                        console.log('[LEDGER] Not connected, attempting to connect first');
                        const result = await this.connect();
                        if (!result.success) {
                            console.log('[LEDGER] Failed to connect for app verification');
                            return false;
                        }
                    }

                    // Use safe state comparison
                    const isAlreadyInAppOpenState = this.state === LedgerConnectionState.APP_OPEN;
                    if (isAlreadyInAppOpenState) {
                        console.log('[LEDGER] Already in APP_OPEN state, returning true');
                        return true;
                    }

                    console.log('[LEDGER] Asking ledgerBridge to verify Ethereum app status');
                    const isOpen = await ledgerBridge.verifyEthereumAppOpen(bypassCache);
                    console.log('[LEDGER] Ethereum app status:', isOpen);

                    // Update cache
                    this.connectionInfo.appOpen = isOpen;
                    this.connectionInfo.lastAppCheck = Date.now();

                    // Update state if needed
                    if (isOpen) {
                        // Use safe state comparison
                        const shouldTransitionToAppOpen = this.state !== LedgerConnectionState.APP_OPEN;
                        if (shouldTransitionToAppOpen) {
                            await this.transition(LedgerConnectionEvent.APP_OPEN_DETECTED);
                        }
                    } else {
                        // Use safe state comparison
                        const isInAppOpenState = this.state === LedgerConnectionState.APP_OPEN;
                        if (isInAppOpenState) {
                            await this.transition(LedgerConnectionEvent.APP_CLOSED_DETECTED);
                        }
                    }

                    // Persist app status to storage
                    await this.persistAppStatus(isOpen);

                    return isOpen;
                } catch (error) {
                    console.error('[LEDGER] Error verifying Ethereum app:', error);

                    // Update cache with failure
                    this.connectionInfo.appOpen = false;
                    this.connectionInfo.lastAppCheck = Date.now();

                    // Update state if needed - use safe comparison
                    const isInAppOpenState = this.state === LedgerConnectionState.APP_OPEN;
                    if (isInAppOpenState) {
                        await this.transition(LedgerConnectionEvent.APP_CLOSED_DETECTED);
                    }

                    return false;
                } finally {
                    this.pendingOperations--; // Remove from pending count
                    this.lastOperationTime = Date.now(); // Update last operation time
                }
            });
        } catch (error) {
            console.error('[LEDGER] Mutex error during verifyEthereumAppOpen:', error);
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

            console.log('Disconnecting from Ledger device');

            // Close offscreen document
            try {
                await ledgerBridge.closeOffscreenDocument();
            } catch (error) {
                console.log('Error closing offscreen document:', error);
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

        // Clean up storage references
        if (chrome.storage?.session) {
            try {
                const keys = [
                    this.config.storageKeys?.connectionStatus || 'ledger_connection_status',
                    this.config.storageKeys?.ethereumAppStatus || 'ledger_eth_app_status',
                    this.config.storageKeys?.pendingOperations || 'ledger_pending_operations'
                ];

                chrome.storage.session.remove(keys)
                    .catch(e => console.log('Error cleaning up session storage:', e));
            } catch (e) {
                console.log('Error during session storage cleanup:', e);
            }
        }

        console.log('LedgerConnectionManager resources cleaned up');
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

            console.log(`Setting HD path for Ledger to ${hdPath}`);

            // Store the HD path
            this.connectionInfo.hdPath = hdPath;

            if (this.state === LedgerConnectionState.APP_OPEN) {
                // Try to set the HD path if already connected
                try {
                    await ledgerBridge.proxyLedgerOperation('setHdPath', { hdPath });
                    console.log(`Successfully set HD path to ${hdPath}`);
                } catch (error) {
                    log.warn(`Failed to set HD path: ${error.message}`);
                    // Continue anyway - we'll store it for later use
                }
            }

            // Store HD path in session storage for quick access
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

            // Store HD path in local storage for persistence across restarts
            if (chrome.storage?.local) {
                const hdPathKey = this.config.storageKeys?.hdPath || 'ledger_hd_path';

                await chrome.storage.local.set({
                    [hdPathKey]: {
                        path: hdPath,
                        timestamp: Date.now(),
                        status: 'success'
                    }
                });
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
            // Try session storage first (faster)
            if (chrome.storage?.session) {
                const hdPathKey = this.config.storageKeys?.hdPath || 'ledger_hd_path';
                const result = await chrome.storage.session.get(hdPathKey);

                if (result[hdPathKey] && result[hdPathKey].path) {
                    this.connectionInfo.hdPath = result[hdPathKey].path;
                    return result[hdPathKey].path;
                }
            }

            // Try local storage (more persistent)
            if (chrome.storage?.local) {
                const hdPathKey = this.config.storageKeys?.hdPath || 'ledger_hd_path';
                const result = await chrome.storage.local.get(hdPathKey);

                if (result[hdPathKey] && result[hdPathKey].path) {
                    this.connectionInfo.hdPath = result[hdPathKey].path;
                    return result[hdPathKey].path;
                }
            }

            // Default path as fallback
            return "m/44'/60'/0'/0/0"; // Ledger Live default
        } catch (error) {
            log.error('Error getting HD path:', error);
            return undefined;
        }
    }
}

// Export a lazy-loaded singleton instance for global use
let instance: LedgerConnectionManager | null = null;

export const ledgerConnectionManager = {
    getInstance(): LedgerConnectionManager {
        if (!instance) {
            instance = new LedgerConnectionManager();
            console.log('LedgerConnectionManager initialized');
        }
        return instance;
    }
}
