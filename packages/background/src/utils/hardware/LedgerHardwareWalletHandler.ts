import { BaseHardwareWalletHandler } from './BaseHardwareWalletHandler';
import { Devices } from '../types/hardware';
import { ledgerBridge } from '../ledgerBridge';
import { ledgerConnectionManager, LedgerConnectionState } from '../LedgerConnectionManager';
import log from 'loglevel';
import { forceNavigateTab } from '../manifest';
import { KeyringTypes } from '../../controllers/KeyringControllerDerivated';

/**
 * LedgerHardwareWalletHandler
 * Handles Ledger hardware wallet operations using ledgerConnectionManager
 */
export class LedgerHardwareWalletHandler extends BaseHardwareWalletHandler {
    /**
     * Creates a new LedgerHardwareWalletHandler
     * @param keyringController Reference to the keyring controller
     */
    constructor(keyringController: any) {
        super(Devices.LEDGER, keyringController);
        log.debug('Initialized LedgerHardwareWalletHandler');
    }

    /**
     * Connects to a Ledger hardware wallet
     * Uses ledgerConnectionManager to handle connection state
     * 
     * @returns Promise resolving to connection result
     */
    public async connect(): Promise<
        | boolean
        | {
            needsUserGesture: boolean;
            deviceName: string;
            needsEthereumApp?: boolean;
            message?: string;
        }
    > {
        try {
            log.debug("Using LedgerConnectionManager for Ledger connection");
            console.log("[LEDGER] Using connection manager for Ledger connection");

            // Use the connection manager to connect to the device
            const result = await ledgerConnectionManager.connect();

            if (result.success) {
                // Check if Ethereum app is open
                if (result.state === LedgerConnectionState.APP_OPEN) {
                    log.debug("Ledger connected and Ethereum app is open");
                    console.log("[LEDGER] Connected and Ethereum app is open");

                    // Still need to complete the keyring setup in UI context
                    return {
                        needsUserGesture: !this.hasDomAccess(),
                        deviceName: this.device,
                        message: "Ledger connected successfully with Ethereum app open."
                    };
                }

                // Connected but Ethereum app not open
                log.debug("Ledger connected but Ethereum app not open");
                console.log("[LEDGER] Connected but Ethereum app not open");

                return {
                    needsUserGesture: !this.hasDomAccess(),
                    deviceName: this.device,
                    needsEthereumApp: true,
                    message: "Please open the Ethereum app on your Ledger device"
                };
            }

            // Connection failed or needs user gesture
            if (result.needsUserGesture) {
                log.debug("Ledger connection requires user gesture");
                console.log("[LEDGER] Connection requires user gesture");

                return {
                    needsUserGesture: true,
                    deviceName: this.device,
                    message: result.error?.message || "User gesture required for Ledger connection"
                };
            }

            // Other connection error
            log.error("Failed to connect to Ledger:", result.error);
            console.error("[LEDGER] Connection failed:", result.error);

            // Store the error for UI handling if possible
            try {
                const { errorStorage, ERROR_STORAGE_KEYS } = await import('../errors');

                await errorStorage.storeError(
                    ERROR_STORAGE_KEYS.LEDGER_CONNECTION,
                    {
                        code: result.error?.type || 'CONNECTION_FAILED',
                        message: result.error?.message || 'Failed to connect to Ledger device',
                    }
                );
            } catch (e) {
                log.warn("Could not store Ledger error:", e);
            }

            return false;
        } catch (error) {
            // For any uncaught errors, convert to our standard format and store
            try {
                const { convertHardwareWalletError, errorStorage, ERROR_STORAGE_KEYS } = await import('../errors');
                const standardError = convertHardwareWalletError(error, this.device);

                log.error(`Error connecting hardware keyring for ${this.device}:`, standardError);

                // Store the error for UI handling
                await errorStorage.storeError(
                    ERROR_STORAGE_KEYS.LEDGER_CONNECTION,
                    standardError
                );

                // Clean up any abandoned connections on error
                await this.cleanup();
            } catch (e) {
                // If even our error handling fails, log the original error
                log.error(`Error connecting hardware keyring for ${this.device} (and error handling failed):`, error);
            }

            throw error;
        }
    }

    /**
     * Completes the hardware wallet connection process
     * For Ledger, this verifies the connection and creates a keyring
     * 
     * @returns Promise resolving to true if the connection was successful
     */
    public async completeConnection(): Promise<boolean> {
        try {
            log.debug(`Completing hardware connection for ${this.device}...`);

            // Verify the connection state using the manager
            const { state, info } = ledgerConnectionManager.getState();

            // Get current info about the connection
            log.debug(`Current Ledger connection state: ${state}`);

            // If we're not connected, try to connect first
            if (state !== LedgerConnectionState.CONNECTED &&
                state !== LedgerConnectionState.WAITING_FOR_APP &&
                state !== LedgerConnectionState.APP_OPEN) {

                log.debug("Ledger not connected, attempting connection...");
                const result = await ledgerConnectionManager.connect();

                if (!result.success) {
                    log.error("Failed to connect to Ledger:", result.error);
                    return false;
                }
            }

            // Verify Ethereum app is open
            const appOpen = await ledgerConnectionManager.verifyEthereumAppOpen();

            // Create keyring if in UI context
            if (this.hasDomAccess()) {
                log.debug("Creating Ledger keyring in UI context");

                // Get HD path from connection manager
                const hdPath = await ledgerConnectionManager.getHDPath();

                // Create a new keyring instance
                try {
                    await this.keyringController.addNewKeyring(KeyringTypes.LEDGER, {
                        hdPath: hdPath || this.getDefaultHDPath(),
                    });

                    log.debug("Successfully created Ledger keyring");

                    // Persist keyring state
                    await this.persistState();

                    return true;
                } catch (error) {
                    log.error("Failed to create Ledger keyring:", error);
                    return false;
                }
            } else {
                // In service worker context, we can't create the keyring
                // but we still consider this successful if we have a connection
                log.debug("In service worker context, deferring keyring creation to UI");

                // Force navigate to accounts page if needed
                try {
                    await forceNavigateTab('/tab.html#/hardware-wallet/accounts', { vendor: this.device });
                    log.debug("Forced navigation to accounts page");
                } catch (e) {
                    log.error("Failed to navigate to accounts page:", e);
                }

                return true;
            }
        } catch (error) {
            log.error(`Failed to complete hardware connection for ${this.device}:`, error);
            throw error;
        }
    }

    /**
     * Sets the HD path for the Ledger device
     * Uses ledgerConnectionManager to manage path state
     * 
     * @param hdPath The HD path to set
     */
    public async setHDPath(hdPath: string): Promise<void> {
        log.debug(`Setting HD path for ${this.device} to ${hdPath}`);

        // Input validation
        if (!hdPath) {
            throw new Error('HD path is required');
        }

        // Update our cache and storage immediately for better UX
        await this.storeHDPath(hdPath);

        try {
            // Let the connection manager handle the complex path setting and persistence
            await ledgerConnectionManager.setHDPath(hdPath);

            log.debug(`Successfully set HD path ${hdPath} for Ledger using connection manager`);
        } catch (error) {
            log.error(`Failed to set HD path for Ledger:`, error);
            throw error;
        }
    }

    /**
     * Gets the current HD path for the Ledger device
     * Uses ledgerConnectionManager for cached state
     * 
     * @returns The current HD path for the device
     */
    public async getHDPath(): Promise<string> {
        try {
            log.debug(`Getting HD path for ${this.device}`);

            // Try to get from connection manager first
            const hdPath = await ledgerConnectionManager.getHDPath();

            // If found, update our cache and return
            if (hdPath) {
                this.hdPathCache = hdPath;
                return hdPath;
            }

            // If not in connection manager, check our cache
            if (this.hdPathCache) {
                return this.hdPathCache;
            }

            // Fall back to session storage
            if (chrome.storage?.session) {
                try {
                    const result = await chrome.storage.session.get('ledger_hd_path');
                    if (result.ledger_hd_path && result.ledger_hd_path.path) {
                        const path = result.ledger_hd_path.path;
                        this.hdPathCache = path;
                        return path;
                    }
                } catch (e) {
                    log.warn(`Failed to read HD path from session storage:`, e);
                }
            }

            // Fall back to default
            const defaultPath = this.getDefaultHDPath();
            this.hdPathCache = defaultPath;
            return defaultPath;
        } catch (error) {
            log.error(`Failed to get HD path for ${this.device}:`, error);
            // Return default path on error
            return this.getDefaultHDPath();
        }
    }

    /**
     * Imports accounts from the Ledger device
     * Handles both UI and service worker contexts
     * 
     * @param accountIndexes Array of account indexes to import
     * @returns Promise resolving to array of imported account addresses
     */
    public async importAccounts(accountIndexes: number[]): Promise<string[]> {
        return this.runWithTimeout(
            async () => {
                try {
                    log.debug(
                        `Importing hardware wallet accounts for ${this.device} at indexes: ${accountIndexes.join(', ')}`
                    );

                    if (!accountIndexes || accountIndexes.length === 0) {
                        throw new Error('At least one account index must be specified');
                    }

                    // Validate all indexes are non-negative
                    if (accountIndexes.some((index) => index < 0)) {
                        throw new Error('Account indexes must be non-negative values');
                    }

                    // Special handling for service worker context where we don't have DOM access
                    if (!this.hasDomAccess()) {
                        log.debug('No DOM access when importing Ledger accounts - using offscreen approach');

                        // Use ledgerBridge which handles the offscreen document communication
                        const isConnected = await ledgerBridge.checkWebHIDStatus();
                        if (!isConnected) {
                            log.debug('No active Ledger connection, attempting to connect');
                            await ledgerBridge.connectUsingWebHID();
                        }

                        // Delegate account import to the ledger bridge in offscreen document
                        log.debug(`Using ledgerBridge to import accounts: ${accountIndexes.join(',')}`);
                        const importedAddresses = await ledgerBridge.getMultipleAccounts(accountIndexes);

                        log.debug(`Successfully imported ${importedAddresses.length} accounts using ledgerBridge`);

                        // Need to add these accounts to our keyring state without direct keyring interaction
                        const keyring = await this.keyringController.getKeyringFromDevice(this.device);
                        if (!keyring) {
                            const keyringType = this.getKeyringType();
                            const hdPath = await this.getHDPath();

                            await this.keyringController.addNewKeyring(keyringType, {
                                hdPath,
                            });
                        }

                        // Add the accounts to the state without device interaction
                        const addedAccounts = [];
                        for (const address of importedAddresses) {
                            try {
                                await keyring.forceAddAccount(address);
                                addedAccounts.push(address);
                            } catch (e) {
                                // Check if this is a DOM access error
                                if (e.message && e.message.includes('document is not defined')) {
                                    log.debug(`DOM access error during forceAddAccount, storing account for later UI processing`);

                                    // Store the pending account in session storage for UI to handle
                                    if (chrome.storage?.session) {
                                        const pendingAccounts = (await chrome.storage.session.get('ledger_pending_accounts')).ledger_pending_accounts || [];
                                        pendingAccounts.push(address);

                                        await chrome.storage.session.set({
                                            'ledger_pending_accounts': pendingAccounts,
                                            'ledger_needs_user_interaction': {
                                                timestamp: Date.now(),
                                                status: 'pending',
                                                requiresWebHID: true,
                                                operation: 'importAccounts',
                                                reason: 'document_not_defined_error',
                                                accountIndexes: accountIndexes
                                            }
                                        });

                                        log.debug(`Stored pending account ${address} in session storage`);
                                        addedAccounts.push(address);
                                    }
                                } else {
                                    // Rethrow other errors
                                    throw e;
                                }
                            }
                        }

                        // Persist state changes
                        await this.persistState();

                        return importedAddresses;
                    }

                    // For UI context, proceed with standard import
                    // Check if a keyring already exists for this device
                    let keyring = await this.keyringController.getKeyringFromDevice(this.device);

                    // If no keyring exists, create one
                    if (!keyring) {
                        log.debug(`No keyring found for ${this.device}, creating one...`);
                        const keyringType = this.getKeyringType();
                        const hdPath = await this.getHDPath();

                        keyring = await this.keyringController.addNewKeyring(keyringType, {
                            hdPath,
                        });
                        log.debug(`Successfully created new keyring for ${this.device}`);
                    }

                    // Initialize transport (ensure we have a valid connection)
                    log.debug(`Initializing Ledger transport for keyring`);
                    try {
                        // First set transport type
                        await this.keyringController.setLedgerTransportType('webhid');

                        // Connect to the device
                        if (keyring.connect) {
                            await keyring.connect();
                            log.debug('Connected to Ledger device for keyring');
                        }

                        // Unlock the keyring if needed
                        if (keyring.unlock) {
                            await keyring.unlock();
                            log.debug('Unlocked Ledger keyring');
                        }
                    } catch (e) {
                        log.error(`Error initializing Ledger transport: ${e.message}`);
                        throw new Error(`Failed to initialize Ledger device: ${e.message}`);
                    }

                    // Store updated hardware wallet state
                    await this.persistState();

                    // Get current accounts before adding new ones
                    let originalAccounts: string[] = [];
                    try {
                        originalAccounts = await keyring.getAccounts();
                        log.debug(`Original accounts before import: ${originalAccounts.length}`);
                    } catch (error) {
                        log.warn(`Could not get original accounts: ${error.message}`);
                        originalAccounts = [];
                    }

                    // For each account to import
                    const addedAccounts = [];
                    for (const index of accountIndexes) {
                        try {
                            // Set the account index on the keyring
                            keyring.setAccountToUnlock(index);

                            // Add new account to the keyring
                            await this.keyringController.addNewAccount(keyring);
                            log.debug(`Added account at index ${index} to keyring`);

                            // Track successful additions
                            const currentAccounts = await keyring.getAccounts();
                            if (currentAccounts.length > originalAccounts.length + addedAccounts.length) {
                                addedAccounts.push(currentAccounts[currentAccounts.length - 1]);
                            }
                        } catch (error) {
                            log.error(`Error adding account at index ${index}:`, error);
                            throw new Error(`Failed to import account at index ${index}: ${error.message}`);
                        }
                    }

                    // Get the final accounts after import
                    const finalAccounts = await keyring.getAccounts();
                    log.debug(`Successfully imported accounts from ${this.device}`);

                    return finalAccounts;
                } catch (error) {
                    // Check if this is a document is not defined error
                    if (error.message && error.message.includes('document is not defined')) {
                        log.debug('Document is not defined error during hardware wallet import process');

                        // Use offscreen document to get the requested accounts
                        try {
                            // Make sure the bridge is connected
                            const isConnected = await ledgerBridge.checkWebHIDStatus();
                            if (!isConnected) {
                                await ledgerBridge.connectUsingWebHID();
                            }

                            // Get accounts directly through the offscreen document
                            log.debug(`Attempting fallback account retrieval for indexes: ${accountIndexes.join(',')}`);
                            const importedAddresses = await ledgerBridge.getMultipleAccounts(accountIndexes);

                            // Store accounts for later UI handling
                            if (chrome.storage?.session) {
                                await chrome.storage.session.set({
                                    'ledger_pending_accounts': importedAddresses,
                                    'ledger_needs_user_interaction': {
                                        timestamp: Date.now(),
                                        status: 'pending',
                                        requiresWebHID: true,
                                        operation: 'importAccounts',
                                        reason: 'document_not_defined_error',
                                        accountIndexes: accountIndexes
                                    }
                                });
                                log.debug(`Stored ${importedAddresses.length} pending accounts in session storage`);
                            }

                            // Return the addresses even though they aren't fully imported yet
                            return importedAddresses;
                        } catch (fallbackError) {
                            log.error('Fallback account retrieval failed:', fallbackError);
                        }
                    }

                    log.error(`Failed to import hardware wallet accounts:`, error);
                    throw error;
                }
            },
            this.IMPORT_TIMEOUT,
            'importAccounts'
        );
    }

    /**
     * Additional cleanup specific to Ledger
     */
    public async cleanup(): Promise<void> {
        // Call base cleanup first
        await super.cleanup();

        // Clean up Ledger-specific resources
        try {
            // Try to close the offscreen document
            await ledgerBridge.closeOffscreenDocument();

            // Clear any stored connection status
            if (chrome.storage?.session) {
                await chrome.storage.session.remove('ledger_connection_status');
                await chrome.storage.session.remove('ledger_eth_app_status');
                await chrome.storage.session.remove('ledger_needs_user_interaction');
            }
        } catch (e) {
            log.warn(`Error during Ledger cleanup: ${e.message}`);
        }
    }
} 