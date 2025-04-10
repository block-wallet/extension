import { BaseHardwareWalletHandler } from './BaseHardwareWalletHandler';
import { Devices } from '../types/hardware';
import log from 'loglevel';
import { KeyringTypes } from '../../controllers/KeyringControllerDerivated';
import { hasDomAccess } from '../environment';

/**
 * TrezorHardwareWalletHandler
 * Handles Trezor hardware wallet operations
 */
export class TrezorHardwareWalletHandler extends BaseHardwareWalletHandler {
    /**
     * Creates a new TrezorHardwareWalletHandler
     * @param keyringController Reference to the keyring controller
     */
    constructor(keyringController: any) {
        super(Devices.TREZOR, keyringController);
        log.debug('Initialized TrezorHardwareWalletHandler');
    }

    /**
     * Connects to a Trezor hardware wallet
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
        return this.runWithTimeout(
            async () => {
                try {
                    log.debug(`Connecting to ${this.device} hardware wallet`);

                    // Trezor requires user interaction in a UI context
                    const hasDOM = this.hasDomAccess();
                    if (hasDOM) {
                        log.debug(`Creating new Trezor keyring in UI context`);
                        await this.keyringController.addNewKeyring(KeyringTypes.TREZOR, {});
                        return true;
                    } else {
                        // Store error for service worker context
                        const { errorStorage, ERROR_STORAGE_KEYS, ServiceWorkerContextError } = await import('../errors');

                        const serviceWorkerError = new ServiceWorkerContextError(
                            `${this.device} connection requires UI context`,
                            { deviceType: this.device }
                        );

                        await errorStorage.storeError(
                            ERROR_STORAGE_KEYS.TREZOR_CONNECTION,
                            serviceWorkerError
                        );
                    }

                    // If we reach here, we couldn't create a keyring and need user interaction
                    return {
                        needsUserGesture: true,
                        deviceName: this.device
                    };
                } catch (error) {
                    // For any uncaught errors, convert to our standard format and store
                    try {
                        const { convertHardwareWalletError, errorStorage, ERROR_STORAGE_KEYS } = await import('../errors');
                        const standardError = convertHardwareWalletError(error, this.device);

                        log.error(`Error connecting hardware keyring for ${this.device}:`, standardError);

                        // Store the error for UI handling
                        await errorStorage.storeError(
                            ERROR_STORAGE_KEYS.TREZOR_CONNECTION,
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
            },
            this.CONNECT_TIMEOUT,
            'connect'
        );
    }

    /**
     * Completes the hardware wallet connection process
     * For Trezor, this initializes the keyring with the proper manifest
     * 
     * @returns Promise resolving to true if the connection was successful
     */
    public async completeConnection(): Promise<boolean> {
        try {
            log.debug(`Completing hardware connection for ${this.device}...`);

            // Get existing keyrings of this type
            const keyringType = this.getKeyringType();
            const hdPath = await this.getHDPath();

            const existingKeyrings = this.keyringController.getKeyringsByType(keyringType);

            // Remove existing keyrings of this type to start fresh
            if (existingKeyrings && existingKeyrings.length > 0) {
                log.debug(`Removing ${existingKeyrings.length} existing keyrings of type ${keyringType}`);
                for (const existingKeyring of existingKeyrings) {
                    const accounts = await existingKeyring.getAccounts();
                    if (accounts && accounts.length > 0) {
                        try {
                            await this.keyringController.removeAccount(accounts[0]);
                        } catch (e) {
                            log.warn(`Failed to remove account ${accounts[0]}:`, e);
                        }
                    }
                }
            }

            // Add new keyring
            log.debug(`Adding new keyring of type ${keyringType} with hdPath ${hdPath}`);
            const newKeyring = await this.keyringController.addNewKeyring(keyringType, {
                hdPath: hdPath,
            });

            // Setup the Trezor manifest
            try {
                if (newKeyring.updateManifest) {
                    // Update the manifest to have the proper email/app info
                    await newKeyring.updateManifest({
                        email: 'hello@blockwallet.io',
                        appUrl: 'https://blockwallet.io',
                    });
                    log.debug('Updated Trezor manifest');
                }
            } catch (e) {
                log.error('Failed to update Trezor manifest:', e);
            }

            // Persist the keyring state
            await this.persistState();
            log.debug(`Hardware connection for ${this.device} completed successfully`);
            return true;
        } catch (error) {
            log.error(`Failed to complete hardware connection for ${this.device}:`, error);
            throw error;
        }
    }

    /**
     * Sets the HD path for the Trezor device
     * 
     * @param hdPath The HD path to set
     */
    public async setHDPath(hdPath: string): Promise<void> {
        log.debug(`Setting HD path for ${this.device} to ${hdPath}`);

        if (!hdPath) {
            throw new Error('HD path is required');
        }

        // Update our cache and storage immediately for better UX
        await this.storeHDPath(hdPath);

        try {
            // Get the keyring for this device
            const keyring = await this.keyringController.getKeyringFromDevice(this.device);
            if (!keyring) {
                log.error(`No keyring found for device ${this.device}`);
                throw new Error(`No keyring found for device ${this.device}. Please connect the device first.`);
            }

            // Get the descriptor
            const descriptor = this.getDefaultHDPath();

            // Use generic keyring interface to bypass strict type checking
            const genericKeyring = keyring as any;
            await genericKeyring.setHdPath(hdPath + descriptor);
            log.debug(`Successfully set HD path ${hdPath}${descriptor} on ${this.device} keyring`);

            // Persist the state for future use
            await this.persistState();
            log.debug(`Completed setting HD path ${hdPath} for ${this.device}`);
        } catch (error) {
            log.error(`Failed to set HD path for ${this.device}:`, error);
            throw error;
        }
    }

    /**
     * Gets the current HD path for the Trezor device
     * 
     * @returns The current HD path for the device
     */
    public async getHDPath(): Promise<string> {
        try {
            log.debug(`Getting HD path for ${this.device}`);

            // If we have the path in cache, return it
            if (this.hdPathCache) {
                return this.hdPathCache;
            }

            // Try to get from session storage
            if (chrome.storage?.session) {
                try {
                    const result = await chrome.storage.session.get(`${this.device.toLowerCase()}_hd_path`);
                    const hdPathData = result[`${this.device.toLowerCase()}_hd_path`];
                    if (hdPathData && hdPathData.path) {
                        this.hdPathCache = hdPathData.path;
                        return hdPathData.path;
                    }
                } catch (e) {
                    log.warn(`Failed to read HD path from session storage:`, e);
                }
            }

            // Try to read from local storage
            try {
                const devicePaths = JSON.parse(localStorage.getItem('hardware_hd_paths') || '{}');
                if (devicePaths[this.device]) {
                    this.hdPathCache = devicePaths[this.device];
                    return devicePaths[this.device];
                }
            } catch (e) {
                log.warn(`Failed to read HD path from local storage:`, e);
            }

            // Fall back to default path
            const defaultPath = this.getDefaultHDPath();
            this.hdPathCache = defaultPath;
            return defaultPath;
        } catch (error) {
            log.error(`Failed to get HD path for ${this.device}:`, error);
            return this.getDefaultHDPath();
        }
    }

    /**
     * Imports accounts from the Trezor device
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
                    log.error(`Failed to import hardware wallet accounts:`, error);
                    throw error;
                }
            },
            this.IMPORT_TIMEOUT,
            'importAccounts'
        );
    }

    /**
     * Additional cleanup specific to Trezor
     */
    public async cleanup(): Promise<void> {
        // Call base cleanup first
        await super.cleanup();

        // Clean up Trezor-specific resources
        try {
            // Clear any stored connection status
            if (chrome.storage?.session) {
                await chrome.storage.session.remove(`${this.device.toLowerCase()}_connection_status`);
                await chrome.storage.session.remove(`${this.device.toLowerCase()}_needs_user_interaction`);
            }
        } catch (e) {
            log.warn(`Error during Trezor cleanup: ${e.message}`);
        }
    }
} 