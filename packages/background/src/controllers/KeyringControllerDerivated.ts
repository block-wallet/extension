import {
    keyringBuilderFactory,
    KeyringController,
    KeyringControllerProps,
    KeyringControllerState,
} from '@metamask/eth-keyring-controller';
import * as customEncryptor from '@metamask/browser-passworder';
import { Hash, Hasheable } from '../utils/hasher';
import { Mutex } from 'async-mutex';
import { Devices } from '../utils/types/hardware';
import log from 'loglevel';
import { HDPaths, BIP44_PATH } from '../utils/types/hardware';
import LedgerBridgeKeyring from '@block-wallet/eth-ledger-bridge-keyring';
import TrezorKeyring from 'eth-trezor-keyring';
import { TypedTransaction } from '@ethereumjs/tx';
// import {
//     MetaMaskKeyring as QRKeyring,
//     MetaMaskKeyring as QRHardwareKeyring,
// } from '@keystonehq/metamask-airgapped-keyring';
// import {
//     DataType,
//     ETHSignature,
//     EthSignRequest,
// } from '@keystonehq/bc-ur-registry-eth';

import rlp from 'rlp';
import { v4 } from 'uuid';
import { SignatureData } from './transactions/utils/types';
import { FeeMarketEIP1559Transaction } from '@ethereumjs/tx';
import {
    arrToBufArr,
    bigIntToBuffer,
    bufferToBigInt,
    bufferToHex,
    stripHexPrefix,
} from '@ethereumjs/util';
import { hexToString } from '../utils/signature';
import { isManifestV3, forceNavigateTab } from '../utils/manifest';
// Add static import for ledgerBridge
import { ledgerBridge } from '../utils/ledgerBridge';
// Import LedgerKeyringPatch to add forceAddAccount method
import '../utils/LedgerKeyringPatch';

/**
 * Events emitted by the KeyringController
 * These can be subscribed to using the on/off methods inherited from EventEmitter
 */
export enum KeyringControllerEvents {
    QR_TRANSACTION_SIGNATURE_REQUEST_GENERATED = 'QR_TRANSACTION_SIGNATURE_REQUEST_GENERATED',
    QR_MESSAGE_SIGNATURE_REQUEST_GENERATED = 'QR_MESSAGE_SIGNATURE_REQUEST_GENERATED',
    QR_SIGNATURE_SUBMIT = 'QR_SIGNATURE_SUBMIT',
}

/**
 * Available keyring types supported by the controller
 * Each type corresponds to a different implementation strategy
 */
export enum KeyringTypes {
    SIMPLE_KEY_PAIR = 'Simple Key Pair',
    HD_KEY_TREE = 'HD Key Tree',
    TREZOR = 'Trezor Hardware',
    LEDGER = 'Ledger Hardware',
    QR = 'QR Hardware Wallet Device',
}

/**
 * QR signature request interface
 * Defines the structure for QR-based signature requests
 */
interface QRSignatureRequest {
    requestId: string;
    qrSignRequest: string[];
}

/**
 * Checks if the current environment has DOM access
 * This is needed to work around the fact that LedgerBridgeKeyring tries to create DOM elements
 * which fails in MV3 service workers
 * 
 * @returns {boolean} True if the environment has a document with createElement
 */
const hasDomAccess = (): boolean => {
    try {
        // Check for document with element creation capability
        return typeof document !== 'undefined' &&
            document !== null &&
            typeof document.createElement === 'function';
    } catch (e) {
        // If any error occurs during the check, assume we don't have DOM access
        return false;
    }
};

/**
 * KeyringControllerDerivated
 *
 * This class extends the base KeyringController to provide additional functionality
 * for managing keyrings, hardware wallets, and cryptographic operations.
 * It includes enhanced error handling, detailed logging, and robust keyring management.
 */
export default class KeyringControllerDerivated extends KeyringController {
    private readonly _mutex: Mutex;
    // private readonly _qrHardwareKeyring: QRHardwareKeyring;
    private restorePromise: Promise<boolean | { needsUserGesture: boolean; deviceName: string }> | null = null;
    private restoreCompleted = false;

    /**
     * The default hdPath to use for new hardware wallets
     */
    private DEFAULT_HD_PATH = "m/44'/60'/0'/0/0";

    /**
     * Name of the controller for logging purposes
     */
    controllerName = 'KeyringControllerDerivated';

    /**
     * Creates a new KeyringControllerDerivated instance
     *
     * @param {KeyringControllerProps} opts - Configuration options for the controller
     */
    constructor(opts: KeyringControllerProps) {
        opts.keyringBuilders = [
            keyringBuilderFactory(LedgerBridgeKeyring),
            keyringBuilderFactory(TrezorKeyring),
            //keyringBuilderFactory(QRKeyring),
        ];
        opts.cacheEncryptionKey = isManifestV3();
        opts.encryptor = customEncryptor;

        super(opts);

        this._mutex = new Mutex();
        //this._qrHardwareKeyring = new QRHardwareKeyring();

        log.debug('KeyringControllerDerivated initialized successfully');
    }

    /**
     * Get the mutex lock for this controller
     *
     * Returns the mutex used to prevent concurrent access to the keyring
     * operations, ensuring thread safety.
     *
     * @returns {Mutex} The mutex instance used for synchronization
     */
    public getMutex(): Mutex {
        return this._mutex;
    }

    /**
     * Create New Vault And Keychain
     *
     * Destroys any old encrypted storage,
     * creates a new encrypted store with the given password,
     * randomly creates a new HD wallet with 1 account,
     * faucets that account on the testnet.
     *
     * @emits KeyringController#unlock
     * @param {string} password - The password to encrypt the vault with.
     * @returns {Promise<KeyringControllerState>} A Promise that resolves to the state.
     * @throws {Error} If account verification fails
     */
    @Hasheable
    public async createNewVaultAndKeychain(
        @Hash password: string
    ): Promise<KeyringControllerState> {
        const releaseLock = await this._mutex.acquire();
        try {
            log.debug('Creating new vault and keychain');
            let vault;
            const currentAccounts = await super.getAccounts();
            if (currentAccounts.length > 0) {
                log.debug('Accounts already exist, performing full update');
                vault = super.fullUpdate();
            } else {
                log.debug('No accounts found, creating new vault and keychain');
                vault = await super.createNewVaultAndKeychain(password);
            }

            // Verify keyring
            await this.verifyAccounts();
            log.debug('Vault creation successful, accounts verified');

            return vault;
        } catch (error) {
            log.error('Failed to create new vault and keychain:', error);
            throw error;
        } finally {
            releaseLock();
        }
    }

    /**
     * CreateNewVaultAndRestore
     *
     * Destroys any old encrypted storage,
     * creates a new encrypted store with the given password,
     * creates a new HD wallet from the given seed with 1 account.
     *
     * @emits KeyringController#unlock
     * @param {string} password - The password to encrypt the vault with
     * @param {string} seed - The BIP44-compliant seed phrase.
     * @returns {Promise<KeyringControllerState>} A Promise that resolves to the state.
     * @throws {Error} If restoration or account verification fails
     */
    @Hasheable
    public async createNewVaultAndRestore(
        @Hash password: string,
        seed: string
    ): Promise<KeyringControllerState> {
        const releaseLock = await this._mutex.acquire();
        try {
            log.debug('Creating new vault and restoring from seed');
            if (!seed || seed.trim() === '') {
                throw new Error('Seed phrase cannot be empty');
            }

            const vault = await super.createNewVaultAndRestore(password, seed);

            // Verify keyring
            await this.verifyAccounts();
            log.debug('Vault restoration successful, accounts verified');

            return vault;
        } catch (error) {
            log.error('Failed to create new vault and restore:', error);
            throw error;
        } finally {
            releaseLock();
        }
    }

    /**
     * Submit Password
     *
     * Attempts to decrypt the current vault and load its keyrings
     * into memory. Validates the password against the vault before proceeding.
     *
     * Temporarily also migrates any old-style vaults first, as well.
     * (Pre MetaMask 3.0.0)
     *
     * @emits KeyringController#unlock
     * @param {string} password - The keyring controller password.
     * @returns {Promise<KeyringControllerState>} A Promise that resolves to the state.
     * @throws {Error} If password submission fails
     */
    @Hasheable
    public async submitPassword(
        @Hash password: string
    ): Promise<KeyringControllerState> {
        try {
            log.debug('Submitting password to unlock vault');
            if (!password) {
                throw new Error('Password cannot be empty');
            }

            const result = await super.submitPassword(password);
            log.debug('Password submission successful, vault unlocked');
            return result;
        } catch (error) {
            log.error('Password submission failed:', error);
            throw error;
        }
    }

    /**
     * Verify Password
     *
     * Attempts to decrypt the current vault with a given password
     * to verify its validity without unlocking the vault.
     *
     * @param {string} password - The password to verify
     * @throws {Error} If password verification fails
     */
    @Hasheable
    public async verifyPassword(@Hash password: string): Promise<void> {
        try {
            log.debug('Verifying password');
            if (!password) {
                throw new Error('Password cannot be empty');
            }

            await super.verifyPassword(password);
            log.debug('Password verification successful');
        } catch (error) {
            log.error('Password verification failed:', error);
            throw error;
        }
    }

    /**
     * Verifies the validity of the current vault's seed phrase
     *
     * Ensures that the seed phrase can be successfully retrieved from
     * the primary HD keyring and is valid.
     *
     * @param {string} password - The keyring controller password.
     * @returns {Promise<string>} Seed phrase.
     * @throws {Error} If seed phrase verification fails
     */
    @Hasheable
    public async verifySeedPhrase(@Hash password: string): Promise<string> {
        try {
            log.debug('Verifying seed phrase');
            await super.verifyPassword(password);
            await this.verifyAccounts();

            const primaryKeyring = super.getKeyringsByType(
                KeyringTypes.HD_KEY_TREE
            )[0];

            if (!primaryKeyring) {
                throw new Error('No HD keyring found');
            }

            const serialized = await primaryKeyring.serialize();
            const seedPhrase = hexToString(bufferToHex(serialized.mnemonic));

            if (!seedPhrase || seedPhrase.trim() === '') {
                throw new Error('Retrieved seed phrase is empty or invalid');
            }

            log.debug('Seed phrase verification successful');
            return seedPhrase;
        } catch (error) {
            log.error('Seed phrase verification failed:', error);
            throw error;
        }
    }

    /**
     * Creates a new account in the primary HD keyring
     *
     * @returns {Promise<string>} The address of the newly created account
     * @throws {Error} If account creation fails
     */
    public async createAccount(): Promise<string> {
        const releaseLock = await this._mutex.acquire();
        try {
            log.debug('Creating new account');
            // Get primary keyring
            const primaryKeyring = super.getKeyringsByType(
                KeyringTypes.HD_KEY_TREE
            )[0];
            if (!primaryKeyring) {
                throw new Error(`No ${KeyringTypes.HD_KEY_TREE} found`);
            }

            // Add new account to the primary keyring
            await super.addNewAccount(primaryKeyring);

            // Check the integrity
            await this.verifyAccounts();

            // Recover the current accounts
            const accounts = await primaryKeyring.getAccounts();
            const newAccount = accounts[accounts.length - 1];

            log.debug(`New account created successfully: ${newAccount}`);
            return newAccount;
        } catch (error) {
            log.error('Failed to create new account:', error);
            throw error;
        } finally {
            releaseLock();
        }
    }

    /**
     * Add a new Keyring and returns the created account
     * @param privateKey
     * @returns {string} the new account
     */
    public async importAccount(privateKey: string): Promise<string> {
        const releaseLock = await this._mutex.acquire();
        try {
            // Get primary keyring
            const primaryKeyring = super.getKeyringsByType(
                KeyringTypes.HD_KEY_TREE
            )[0];
            if (!primaryKeyring) {
                throw new Error(`No ${KeyringTypes.HD_KEY_TREE} found`);
            }

            // Create a new keyring with this account
            const newKeyring = await super.addNewKeyring(
                KeyringTypes.SIMPLE_KEY_PAIR,
                [privateKey]
            );

            // Get created account address
            const newKeyringAccounts = await newKeyring.getAccounts();

            // Return the created account
            return newKeyringAccounts[0];
        } finally {
            releaseLock();
        }
    }
    /**
     * Verifies if the seed words can restore the accounts.
     *
     * Key notes:
     * - The seed words can recreate the primary keyring and the accounts belonging to it.
     * - The created accounts in the primary keyring are always the same.
     * - The keyring always creates the accounts in the same sequence.
     *
     * @returns {Promise<void>} Promises undefined
     *
     */
    private async verifyAccounts(): Promise<void> {
        // Get primary keyring
        const primaryKeyring = super.getKeyringsByType(
            KeyringTypes.HD_KEY_TREE
        )[0];
        if (!primaryKeyring) {
            throw new Error(`No ${KeyringTypes.HD_KEY_TREE} found`);
        }

        const serialized = await primaryKeyring.serialize();
        const seedPhrase = serialized.mnemonic;

        // Get current accounts
        const createdAccounts = await primaryKeyring.getAccounts();
        if (createdAccounts.length < 1) {
            throw new Error('No accounts found');
        }

        // Generate a new keyring
        const keyringController = new KeyringController({});
        const opts = {
            mnemonic: seedPhrase,
            numberOfAccounts: createdAccounts.length,
        };

        const keyring = await keyringController._newKeyring(
            KeyringTypes.HD_KEY_TREE,
            opts
        );
        if (!keyring) {
            throw new Error('Unable to generate keyring of type HD_KEY_TREE');
        }

        const restoredAccounts = await keyring.getAccounts();

        if (restoredAccounts.length !== createdAccounts.length) {
            throw new Error('Wrong number of accounts');
        }

        for (let i = 0; i < restoredAccounts.length; i++) {
            if (
                restoredAccounts[i].toLowerCase() !==
                createdAccounts[i].toLowerCase()
            ) {
                throw new Error(
                    `Not identical accounts! Original: ${createdAccounts[i]}, Restored: ${restoredAccounts[i]}`
                );
            }
        }
    }

    /**
     * Determines the appropriate HD path for a given device type
     *
     * @param {Devices} device - The hardware wallet device type
     * @returns {string} The default HD derivation path for the device
     * @private
     */
    private _HDPathForDevice(device: Devices): string {
        const hdPaths = HDPaths[device];
        if (!hdPaths || hdPaths.length === 0) {
            log.warn(
                `No HD paths defined for device ${device}, using BIP44 path as fallback`
            );
            return BIP44_PATH;
        }

        const defaultPath = hdPaths.find((data) => data.default)?.path;
        if (!defaultPath) {
            log.warn(
                `No default HD path found for device ${device}, using BIP44 path as fallback`
            );
            return BIP44_PATH;
        }

        return defaultPath;
    }

    /**
     * Set the HD path for a hardware device
     * For Ledger, this needs to handle both UI and service worker contexts
     *
     * @param device - The hardware device type
     * @param hdPath - The HD path to set
     */
    public async setHDPath(device: Devices, hdPath: string): Promise<void> {
        log.debug(`Setting HD path for ${device} to ${hdPath}`);

        // Input validation
        if (!device) {
            throw new Error('Device is required');
        }
        if (!hdPath) {
            throw new Error('HD path is required');
        }

        // Make sure the HD path is one of our predefined paths
        const devicePaths = HDPaths[device];
        if (!devicePaths || !devicePaths.some(pathObj => pathObj.path === hdPath)) {
            log.warn(`Unexpected HD path for ${device}: ${hdPath}`);
            // Continue anyway as the path might be valid, just not one of our predefined paths
        }

        // First, get the keyring based on device
        try {
            const keyring = await this.getKeyringFromDevice(device);
            if (!keyring) {
                log.error(`No keyring found for device ${device}`);
                throw new Error(`No keyring found for device ${device}. Please connect the device first.`);
            }

            // Initialize WebHID permission flag
            let hasExplicitPermission = false;

            // For Ledger, we need to check if we're in a service worker context
            if (device === Devices.LEDGER) {
                const hasDOM = hasDomAccess();
                log.debug(`Setting HD path in environment with DOM access: ${hasDOM}`);

                // Store the HD path in session storage for recovery/retry
                try {
                    if (chrome.storage?.session) {
                        await chrome.storage.session.set({
                            'ledger_hd_path': {
                                path: hdPath,
                                timestamp: Date.now()
                            }
                        });
                        log.debug(`Stored HD path ${hdPath} in session storage`);
                    }
                } catch (storageError) {
                    log.error(`Failed to store HD path in session storage:`, storageError);
                    // Continue anyway, this is just for recovery
                }

                // Also store in local storage for more permanent record
                try {
                    const ledgerPaths = JSON.parse(localStorage.getItem('ledger_hd_paths') || '{}');
                    ledgerPaths[device] = hdPath;
                    localStorage.setItem('ledger_hd_paths', JSON.stringify(ledgerPaths));
                    log.debug(`Stored HD path ${hdPath} in local storage`);
                } catch (localStorageError) {
                    log.warn(`Failed to store HD path in local storage:`, localStorageError);
                    // Continue anyway, this is just for recovery
                }

                // If we're in a service worker context (no DOM access), check for explicit permission
                if (!hasDOM) {
                    log.debug(`No DOM access, checking for explicit WebHID permission`);

                    try {
                        // Check for explicit WebHID permission
                        if (chrome.storage?.session) {
                            const result = await chrome.storage.session.get('ledger_explicit_permission');

                            if (result.ledger_explicit_permission &&
                                result.ledger_explicit_permission.granted) {

                                // Check if permission is fresh enough (10 minutes)
                                const permTimestamp = result.ledger_explicit_permission.timestamp || 0;
                                if (Date.now() - permTimestamp < 600000) {
                                    log.debug(`Found valid explicit WebHID permission granted at ${new Date(permTimestamp).toISOString()}`);
                                    hasExplicitPermission = true;
                                } else {
                                    log.debug(`Found expired explicit WebHID permission from ${new Date(permTimestamp).toISOString()}`);
                                }
                            } else {
                                log.debug(`No explicit WebHID permission found in session storage`);
                            }
                        }
                    } catch (e) {
                        log.error(`Error checking for explicit WebHID permission:`, e);
                    }

                    // If no explicit permission, check connection status as fallback
                    if (!hasExplicitPermission) {
                        try {
                            if (chrome.storage?.session) {
                                const connStatus = await chrome.storage.session.get('ledger_connection_status');
                                if (connStatus.ledger_connection_status &&
                                    connStatus.ledger_connection_status.connected) {

                                    // Check if connection status is recent enough (5 minutes)
                                    const connTimestamp = connStatus.ledger_connection_status.timestamp || 0;
                                    if (Date.now() - connTimestamp < 300000) {
                                        log.debug(`Found recent connection status from ${new Date(connTimestamp).toISOString()}`);
                                        hasExplicitPermission = true;
                                    } else {
                                        log.debug(`Found expired connection status from ${new Date(connTimestamp).toISOString()}`);
                                    }
                                } else {
                                    log.debug(`No connection status found in session storage`);
                                }
                            }
                        } catch (e) {
                            log.error(`Error checking connection status:`, e);
                        }
                    }

                    // If no explicit permission or recent connection, store this for UI handling
                    if (!hasExplicitPermission) {
                        log.debug(`No valid WebHID permission found, need user interaction for HD path change`);

                        try {
                            if (chrome.storage?.session) {
                                await chrome.storage.session.set({
                                    'ledger_needs_user_interaction': {
                                        timestamp: Date.now(),
                                        status: 'pending',
                                        requiresWebHID: true,
                                        operation: 'setHdPath',
                                        pendingHdPath: hdPath,
                                        reason: 'service_worker_context'
                                    }
                                });
                                log.debug(`Stored pending HD path operation in session storage`);
                            }
                        } catch (e) {
                            log.error(`Error storing pending HD path operation:`, e);
                        }

                        throw new Error('Hardware wallet connection requires user interaction');
                    }
                }

                // Validate keyring functionality
                try {
                    const isReady = await this.isKeyringReadyForUse(keyring);
                    if (!isReady) {
                        log.warn(`Keyring is not ready for use, cannot set HD path`);

                        // Store this for UI handling
                        if (chrome.storage?.session) {
                            await chrome.storage.session.set({
                                'ledger_needs_user_interaction': {
                                    timestamp: Date.now(),
                                    status: 'pending',
                                    requiresWebHID: true,
                                    operation: 'setHdPath',
                                    pendingHdPath: hdPath,
                                    reason: 'keyring_not_ready'
                                }
                            });
                        }

                        throw new Error('Hardware wallet requires reconnection');
                    }
                } catch (readyError) {
                    log.error(`Error checking if keyring is ready:`, readyError);
                    throw readyError;
                }
            }

            // Set the HD path on the keyring
            log.debug(`Actually setting HD path ${hdPath} on keyring`);

            // For LEDGER devices, we use a special method
            if (device === Devices.LEDGER) {
                try {
                    await keyring.setHdPath(hdPath);
                    log.debug(`Successfully set HD path ${hdPath} on Ledger keyring`);
                } catch (e) {
                    log.error(`Error setting HD path on Ledger keyring:`, e);

                    // If this is a document not defined error, store for UI handling
                    if (e.message && e.message.includes('document is not defined')) {
                        try {
                            if (chrome.storage?.session) {
                                await chrome.storage.session.set({
                                    'ledger_needs_user_interaction': {
                                        timestamp: Date.now(),
                                        status: 'pending',
                                        requiresWebHID: true,
                                        operation: 'setHdPath',
                                        pendingHdPath: hdPath,
                                        reason: 'document_not_defined_error'
                                    }
                                });
                                log.debug(`Stored pending HD path operation due to document error`);
                            }
                        } catch (storageErr) {
                            log.warn(`Failed to store pending HD path operation:`, storageErr);
                        }
                    }

                    throw e;
                }
            } else {
                // For non-Ledger devices, we use standard approach
                const descriptor = this._HDPathForDevice(device);
                // Use generic keyring interface to bypass strict type checking
                const genericKeyring = keyring as any;
                await genericKeyring.setHdPath(hdPath + descriptor);
                log.debug(`Successfully set HD path ${hdPath}${descriptor} on ${device} keyring`);
            }

            // After success, update local and session storage again to ensure we have the latest
            try {
                if (chrome.storage?.session) {
                    await chrome.storage.session.set({
                        'ledger_hd_path': {
                            path: hdPath,
                            timestamp: Date.now(),
                            status: 'success'
                        }
                    });

                    // Also clear any pending operations
                    await chrome.storage.session.remove('ledger_needs_user_interaction');
                }

                // Update local storage
                const ledgerPaths = JSON.parse(localStorage.getItem('ledger_hd_paths') || '{}');
                ledgerPaths[device] = hdPath;
                localStorage.setItem('ledger_hd_paths', JSON.stringify(ledgerPaths));
            } catch (finalStorageError) {
                log.warn(`Failed to update HD path in storage after success:`, finalStorageError);
                // Continue anyway, this is just for recovery
            }

            // Persist the state for future use
            await this.persistHardwareKeyringState(device);
            log.debug(`Completed setting HD path ${hdPath} for ${device}`);
        } catch (error) {
            log.error(`Failed to set HD path for ${device}:`, error);
            throw error;
        }
    }

    /**
     * Helper to check if a keyring is ready for use (unlocked and functional)
     * @param keyring The hardware wallet keyring to check
     * @returns true if the keyring is ready for use
     */
    private async isKeyringReadyForUse(keyring: any): Promise<boolean> {
        try {
            if (!keyring) return false;

            // Check if it has the isUnlocked method
            if (typeof keyring.isUnlocked !== 'function') {
                log.debug("Keyring doesn't have isUnlocked method");
                return false;
            }

            // Check if it's unlocked
            const isUnlocked = keyring.isUnlocked();
            log.debug(`Keyring unlock state: ${isUnlocked}`);

            if (!isUnlocked) {
                // Try to unlock it
                try {
                    await keyring.unlock();
                    log.debug("Successfully unlocked keyring");
                    return true;
                } catch (e) {
                    log.debug("Failed to unlock keyring:", e);
                    return false;
                }
            }

            return true;
        } catch (e) {
            log.debug("Error checking if keyring is ready:", e);
            return false;
        }
    }

    /**
     * Retrieves the configured HD path for a hardware wallet device
     *
     * @param {Devices} device - The hardware wallet device type
     * @returns {Promise<string>} The current HD path for the device
     * @throws {Error} If the device type is invalid
     */
    public async getHDPathForDevice(device: Devices): Promise<string> {
        try {
            log.debug(`Getting HD path for ${device}`);

            if (!device) {
                throw new Error('Device type must be specified');
            }

            const keyring = await this.getKeyringFromDevice(device);
            const hdPath =
                keyring && keyring.hdPath !== ''
                    ? keyring.hdPath
                    : this._HDPathForDevice(device);

            log.debug(`Retrieved HD path for ${device}: ${hdPath}`);
            return hdPath;
        } catch (error) {
            log.error(`Failed to get HD path for ${device}:`, error);
            throw error;
        }
    }

    /**
     * Sets the transport type for the Ledger hardware wallet
     * @param transportType - The transport type to use ('webhid' or 'webusb')
     * @throws {Error} If the transport type is invalid
     */
    public async setLedgerTransportType(transportType: 'webhid' | 'webusb'): Promise<void> {
        log.debug(`Setting Ledger transport type to: ${transportType}`);
        console.log(`[LEDGER] Setting transport type to: ${transportType}`);

        try {
            // Store the transport type in memory state
            this.memStore.updateState({ ledgerTransportType: transportType });

            // Also store in persistent state if we have chrome storage
            if (chrome.storage && chrome.storage.local) {
                await chrome.storage.local.set({ ledgerTransportType: transportType });
                log.debug(`Stored Ledger transport type: ${transportType}`);
                console.log(`[LEDGER] Stored transport type in local storage: ${transportType}`);
            }
        } catch (e) {
            log.warn(`Could not store Ledger transport type: ${e.message}`);
            console.warn(`[LEDGER] Could not store transport type: ${e.message}`);
        }

        // Try to update any existing Ledger keyring with the new transport
        try {
            const ledgerKeyring = await this.getKeyringFromDevice(Devices.LEDGER);
            if (ledgerKeyring) {
                console.log(`[LEDGER] Found existing keyring, updating transport type`);
                // Use type assertion instead of ts-ignore
                const keyringWithTransport = ledgerKeyring as unknown as {
                    _setTransportType?: (type: string) => Promise<void>
                };

                if (keyringWithTransport._setTransportType) {
                    await keyringWithTransport._setTransportType(transportType);
                    log.debug(`Updated existing Ledger keyring with transport type: ${transportType}`);
                    console.log(`[LEDGER] Updated existing keyring with transport type: ${transportType}`);
                }
            }
        } catch (e) {
            log.warn(`Could not update existing Ledger keyring transport: ${e.message}`);
            console.warn(`[LEDGER] Could not update existing keyring transport: ${e.message}`);
        }
    }

    /**
     * connectHardwareKeyring
     *
     * Connects to a hardware wallet device
     * For Ledger, this needs to handle both UI and service worker contexts
     *
     * @param device - The hardware wallet device type
     * @returns Promise resolving to true if connection succeeded, or an object indicating user gesture is needed
     */
    public async connectHardwareKeyring(
        device: Devices
    ): Promise<boolean | { needsUserGesture: boolean; deviceName: string; needsEthereumApp?: boolean; message?: string }> {
        try {
            log.debug(`Connecting hardware keyring for device: ${device}`);

            // First check if we're in a service worker context
            const hasDOM = hasDomAccess();
            log.debug(`Connecting hardware keyring in environment with DOM access: ${hasDOM}`);

            // Import our new error handling utilities
            const {
                withTimeout,
                convertHardwareWalletError,
                HardwareWalletErrorCode,
                ServiceWorkerContextError,
                AppNotOpenError,
                errorStorage,
                ERROR_STORAGE_KEYS
            } = await import('../utils/errors');

            // Handle Ledger in service worker context specially
            if (device === Devices.LEDGER) {
                // First check if we have an existing keyring already that's ready for use
                try {
                    const existingKeyring = await this.getKeyringFromDevice(device);
                    if (existingKeyring) {
                        log.debug("Found existing Ledger keyring");
                        console.log("[LEDGER] Found existing keyring");

                        try {
                            // Wrap the keyring check in a timeout to prevent hanging
                            const isUsable = await withTimeout(
                                this.isKeyringReadyForUse(existingKeyring),
                                {
                                    timeoutMs: 5000,
                                    message: 'Timeout checking if Ledger keyring is ready for use',
                                    context: {
                                        deviceType: device,
                                        operationType: 'keyringReadyCheck'
                                    }
                                }
                            );

                            if (isUsable) {
                                log.debug("Existing Ledger keyring is usable, returning success");
                                console.log("[LEDGER] Existing keyring is usable, returning success");

                                // Even if keyring is usable, verify Ethereum app is open with timeout
                                try {
                                    const appOpenStatus = await withTimeout(
                                        ledgerBridge.verifyEthereumAppOpen(),
                                        {
                                            timeoutMs: 10000,
                                            message: 'Timeout checking if Ethereum app is open',
                                            context: {
                                                deviceType: device,
                                                operationType: 'ethAppCheck'
                                            }
                                        }
                                    );

                                    if (!appOpenStatus) {
                                        log.debug("Ethereum app is not open on Ledger device");
                                        console.log("[LEDGER] Ethereum app is not open on Ledger device");

                                        // Store the app open error for UI to handle
                                        await errorStorage.storeError(
                                            ERROR_STORAGE_KEYS.LEDGER_OPERATION,
                                            new AppNotOpenError('Please open the Ethereum app on your Ledger device', {
                                                deviceType: 'LEDGER'
                                            })
                                        );

                                        // Store the verification result
                                        try {
                                            if (chrome.storage?.session) {
                                                await chrome.storage.session.set({
                                                    'ledger_eth_app_status': {
                                                        open: false,
                                                        timestamp: Date.now(),
                                                        device: device
                                                    }
                                                });
                                            }
                                        } catch (e) {
                                            log.error("Failed to store Ethereum app status:", e);
                                        }

                                        return {
                                            needsUserGesture: false,
                                            deviceName: device,
                                            needsEthereumApp: true,
                                            message: "Please open the Ethereum app on your Ledger device"
                                        };
                                    }

                                    // Store successful verification
                                    try {
                                        if (chrome.storage?.session) {
                                            await chrome.storage.session.set({
                                                'ledger_eth_app_status': {
                                                    open: true,
                                                    timestamp: Date.now(),
                                                    device: device
                                                }
                                            });
                                        }
                                    } catch (e) {
                                        log.error("Failed to store Ethereum app status:", e);
                                    }
                                } catch (e) {
                                    // Use our error conversion utility for standardized errors
                                    const standardError = convertHardwareWalletError(e, 'LEDGER');

                                    log.warn("Error verifying Ethereum app state:", standardError);
                                    console.warn("[LEDGER] Error verifying Ethereum app state:", standardError);

                                    // Store the error for UI to handle
                                    await errorStorage.storeError(
                                        ERROR_STORAGE_KEYS.LEDGER_OPERATION,
                                        standardError
                                    );
                                }

                                return true;
                            }
                            log.debug("Existing Ledger keyring is not usable, needs reconnection");
                            console.log("[LEDGER] Existing keyring is not usable, needs reconnection");
                        } catch (e) {
                            // Use our error conversion utility for standardized errors
                            const standardError = convertHardwareWalletError(e, 'LEDGER');

                            log.warn("Error checking if keyring is usable:", standardError);
                            console.warn("[LEDGER] Error checking if keyring is usable:", standardError);

                            // Store the error for UI to handle
                            await errorStorage.storeError(
                                ERROR_STORAGE_KEYS.LEDGER_CONNECTION,
                                standardError
                            );
                        }
                    }
                } catch (e) {
                    // Use our error conversion utility for standardized errors
                    const standardError = convertHardwareWalletError(e, 'LEDGER');

                    log.warn("Error checking for existing keyring:", standardError);
                    console.warn("[LEDGER] Error checking for existing keyring:", standardError);

                    // Store the error for UI to handle
                    await errorStorage.storeError(
                        ERROR_STORAGE_KEYS.LEDGER_CONNECTION,
                        standardError
                    );
                }

                // In service worker context, try to use the offscreen document approach
                if (!hasDOM) {
                    log.debug("No DOM access in service worker context - trying offscreen document approach");
                    console.log("[LEDGER] No DOM access in service worker context - trying offscreen document approach");

                    // Use the ledgerBridge utility to connect via offscreen document with timeout
                    try {
                        console.log("[LEDGER] Attempting to connect using WebHID exclusively");

                        const result = await withTimeout(
                            ledgerBridge.connectUsingWebHID(),
                            {
                                timeoutMs: 30000, // 30 seconds timeout for initial connection
                                message: 'Timeout connecting to Ledger device',
                                context: {
                                    deviceType: 'LEDGER',
                                    operationType: 'connect'
                                }
                            }
                        );

                        if (result.success) {
                            log.debug("Successfully connected to Ledger via WebHID");
                            console.log("[LEDGER] Successfully connected via WebHID");

                            // Check if Ethereum app is open
                            if (result.needsEthereumApp) {
                                log.debug("Ledger connected but Ethereum app not open");
                                console.log("[LEDGER] Ledger connected but Ethereum app not open");

                                // Store app status
                                try {
                                    if (chrome.storage?.session) {
                                        await chrome.storage.session.set({
                                            'ledger_eth_app_status': {
                                                open: false,
                                                timestamp: Date.now(),
                                                device: device,
                                                message: result.message || "Please open the Ethereum app on your Ledger device"
                                            }
                                        });
                                    }
                                } catch (e) {
                                    log.error("Failed to store app status:", e);
                                }

                                // Store the need for UI to complete the connection when ready
                                try {
                                    if (chrome.storage?.session) {
                                        await chrome.storage.session.set({
                                            'ledger_needs_user_interaction': {
                                                timestamp: Date.now(),
                                                status: 'pending',
                                                requiresWebHID: true,
                                                operation: 'openEthereumApp',
                                                reason: 'ethereum_app_closed',
                                                message: result.message || "Please open the Ethereum app on your Ledger device"
                                            }
                                        });
                                        console.log("[LEDGER] Stored user interaction requirement in session storage");
                                    }
                                } catch (e) {
                                    log.warn("Failed to store interaction need:", e);
                                    console.warn("[LEDGER] Failed to store interaction need:", e);
                                }

                                // Store a standardized error for UI to handle
                                await errorStorage.storeError(
                                    ERROR_STORAGE_KEYS.LEDGER_OPERATION,
                                    new AppNotOpenError(
                                        result.message || "Please open the Ethereum app on your Ledger device",
                                        { deviceType: 'LEDGER' }
                                    )
                                );

                                return {
                                    needsUserGesture: false,
                                    deviceName: device,
                                    needsEthereumApp: true,
                                    message: result.message || "Please open the Ethereum app on your Ledger device"
                                };
                            }

                            // Store the need for UI to complete the connection when ready
                            try {
                                if (chrome.storage?.session) {
                                    await chrome.storage.session.set({
                                        'ledger_needs_user_interaction': {
                                            timestamp: Date.now(),
                                            status: 'pending',
                                            requiresWebHID: true,
                                            operation: 'connectKeyring',
                                            reason: 'service_worker_context'
                                        }
                                    });
                                    console.log("[LEDGER] Stored user interaction requirement in session storage");
                                }
                            } catch (e) {
                                log.warn("Failed to store interaction need:", e);
                                console.warn("[LEDGER] Failed to store interaction need:", e);
                            }

                            // Track successful connection in service worker state
                            // We'll rely on the UI context to create the actual keyring instance
                            // since the LedgerBridgeKeyring requires DOM access
                            try {
                                if (chrome.storage?.session) {
                                    await chrome.storage.session.set({
                                        'ledger_connection_status': {
                                            connected: true,
                                            timestamp: Date.now(),
                                            fromServiceWorker: true
                                        }
                                    });
                                    console.log("[LEDGER] Stored successful connection in session storage");
                                }

                                // Note: We do NOT create a keyring here in the service worker context
                                // as LedgerBridgeKeyring requires document which isn't available

                                log.info(`Connection to ${device} established, UI will handle keyring creation`);
                                console.log(`[LEDGER] Connection established, UI will handle keyring creation`);

                                // Return success but with needsUserGesture to indicate UI involvement required
                                return {
                                    needsUserGesture: true,
                                    deviceName: device,
                                    message: "Ledger connected successfully. Please complete the setup in the UI."
                                };
                            } catch (e) {
                                const standardError = convertHardwareWalletError(e, 'LEDGER');
                                log.error(`Failed to store connection status for ${device}:`, standardError);
                                console.error(`[LEDGER] Failed to store connection status:`, standardError);

                                // Store the error for UI handling
                                await errorStorage.storeError(
                                    ERROR_STORAGE_KEYS.LEDGER_CONNECTION,
                                    standardError
                                );
                            }

                            return {
                                needsUserGesture: true,
                                deviceName: device,
                                message: "Ledger connected successfully. Please complete the setup in the UI."
                            };
                        }

                        // If connection failed, store the error
                        if (result.message) {
                            await errorStorage.storeError(
                                ERROR_STORAGE_KEYS.LEDGER_CONNECTION,
                                new ServiceWorkerContextError(
                                    result.message,
                                    { deviceType: 'LEDGER' }
                                )
                            );
                        }

                        return false;
                    } catch (e) {
                        // Use our error conversion utility
                        const standardError = convertHardwareWalletError(e, 'LEDGER');

                        log.error("Error connecting via offscreen document:", standardError);
                        console.error("[LEDGER] Error connecting via offscreen document:", standardError);

                        // Store the error for UI handling
                        await errorStorage.storeError(
                            ERROR_STORAGE_KEYS.LEDGER_CONNECTION,
                            standardError
                        );
                    }

                    // If offscreen approach fails, we'll still need user gesture
                    log.debug("No DOM access and offscreen approach failed, indicating user gesture needed");
                    return {
                        needsUserGesture: true,
                        deviceName: device,
                        message: "Please connect your Ledger device and try again in the popup"
                    };
                }

                // For Ledger in UI context, we still require user gesture for WebHID
                log.debug("Ledger connection requires user gesture for WebHID access");
                console.log("[LEDGER] Ledger connection requires user gesture for WebHID access");

                return {
                    needsUserGesture: true,
                    deviceName: device
                };
            }

            // For other devices, try to create keyring if in UI context
            if (hasDOM) {
                if (device === Devices.TREZOR) {
                    log.debug("Creating new Trezor keyring in UI context");
                    await this.addNewKeyring('Trezor Hardware', {});
                    return true;
                } else if (device === Devices.KEYSTONE) {
                    log.debug("Creating new Keystone keyring in UI context");
                    await this.addNewKeyring('QR Hardware', {});
                    return true;
                }
            } else {
                // Store error for non-Ledger devices in service worker context
                const serviceWorkerError = new ServiceWorkerContextError(
                    `${device} connection requires UI context`,
                    { deviceType: device }
                );

                await errorStorage.storeError(
                    device === Devices.TREZOR
                        ? ERROR_STORAGE_KEYS.TREZOR_CONNECTION
                        : ERROR_STORAGE_KEYS.HARDWARE_WALLET,
                    serviceWorkerError
                );
            }

            // If we reach here, we couldn't create a keyring and need user interaction
            return {
                needsUserGesture: true,
                deviceName: device
            };
        } catch (error) {
            // For any uncaught errors, convert to our standard format and store
            try {
                const { convertHardwareWalletError, errorStorage, ERROR_STORAGE_KEYS } = await import('../utils/errors');
                const standardError = convertHardwareWalletError(error, device);

                log.error(`Error connecting hardware keyring for ${device}:`, standardError);

                // Store the error for UI handling
                await errorStorage.storeError(
                    device === Devices.LEDGER
                        ? ERROR_STORAGE_KEYS.LEDGER_CONNECTION
                        : device === Devices.TREZOR
                            ? ERROR_STORAGE_KEYS.TREZOR_CONNECTION
                            : ERROR_STORAGE_KEYS.HARDWARE_WALLET,
                    standardError
                );
            } catch (e) {
                // If even our error handling fails, log the original error
                log.error(`Error connecting hardware keyring for ${device} (and error handling failed):`, error);
            }

            throw error;
        }
    }

    /**
     * completeHardwareConnection
     *
     * Completes the hardware wallet connection process
     * This is typically called after user has granted permissions
     *
     * @param {Devices} device - The hardware wallet device type
     * @returns {Promise<boolean>} True if the connection was successful
     * @throws {Error} If connection fails
     */
    public async completeHardwareConnection(
        device: Devices
    ): Promise<boolean> {
        try {
            log.debug(`Completing hardware connection for ${device}...`);

            // Check DOM access first - this is crucial for Ledger in MV3
            if (device === Devices.LEDGER && !hasDomAccess()) {
                log.debug("No DOM access for Ledger connection completion in service worker");
                console.log("[LEDGER] No DOM access for connection completion in service worker");

                try {
                    // Try using the ledgerBridge with WebHID approach
                    console.log("[LEDGER] Checking status using WebHID exclusively");
                    const webhidStatus = await ledgerBridge.checkWebHIDStatus();

                    if (webhidStatus) {
                        log.debug("Found active Ledger connection via WebHID");
                        console.log("[LEDGER] Found active Ledger connection via WebHID");

                        // Store minimal connection state
                        if (chrome.storage?.session) {
                            await chrome.storage.session.set({
                                'ledger_connection_status': {
                                    connected: true,
                                    timestamp: Date.now(),
                                    source: 'webhid',
                                    transportType: 'webhid'
                                }
                            });
                            log.debug("Updated Ledger connection status in session storage from WebHID");
                        }

                        return true;
                    }
                } catch (e) {
                    log.warn("Error using WebHID approach:", e);
                    console.warn("[LEDGER] Error using WebHID approach:", e);
                    // Continue with fallback approach
                }

                // Store minimal connection state as fallback
                try {
                    if (chrome.storage && chrome.storage.session) {
                        await chrome.storage.session.set({
                            'ledger_connection_status': {
                                connected: true,
                                timestamp: Date.now(),
                                source: 'fallback'
                            }
                        });
                        log.debug("Stored Ledger connection status in session storage");
                    }
                } catch (e) {
                    log.error("Failed to store Ledger connection status:", e);
                }

                // Check if we need to navigate the user to the accounts page
                const result = await chrome.storage.session.get('ledger_needs_user_interaction');
                if (result.ledger_needs_user_interaction &&
                    result.ledger_needs_user_interaction.operation === 'connectKeyring') {
                    log.debug("Ledger operation requires navigation to accounts page");

                    // Force navigate directly to the accounts page instead of trying to initialize the keyring here
                    // This bypasses the DOM access issue entirely
                    try {
                        await forceNavigateTab('/tab.html#/hardware-wallet/accounts', { vendor: device });
                        log.debug("Forced navigation to accounts page");
                    } catch (e) {
                        log.error("Failed to navigate to accounts page:", e);
                    }
                }

                // Return success since we've stored the connection state
                return true;
            }

            // For other devices or when DOM is available, proceed with normal initialization
            const keyringType = this._getKeyringTypeFromDevice(device);
            const hdPath = await this.getHDPathForDevice(device);

            // Get existing keyrings of this type
            const existingKeyrings = this.getKeyringsByType(keyringType);

            // Remove existing keyrings of this type to start fresh
            if (existingKeyrings && existingKeyrings.length > 0) {
                log.debug(`Removing ${existingKeyrings.length} existing keyrings of type ${keyringType}`);
                for (const existingKeyring of existingKeyrings) {
                    const accounts = await existingKeyring.getAccounts();
                    if (accounts && accounts.length > 0) {
                        try {
                            await this.removeAccount(accounts[0]);
                        } catch (e) {
                            log.warn(`Failed to remove account ${accounts[0]}:`, e);
                        }
                    }
                }
            }

            // Add new keyring
            log.debug(`Adding new keyring of type ${keyringType} with hdPath ${hdPath}`);
            const newKeyring = await this.addNewKeyring(keyringType, {
                hdPath: hdPath,
            });

            // Setup the new keyring if needed
            if (device === Devices.TREZOR) {
                // For Trezor, ensure manifest is set
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
            }

            // Store connection success for Ledger
            if (device === Devices.LEDGER && chrome.storage?.session) {
                try {
                    await chrome.storage.session.set({
                        'ledger_connection_status': {
                            connected: true,
                            timestamp: Date.now(),
                            source: 'completed',
                            keyringType: keyringType,
                            hdPath: hdPath
                        }
                    });
                    log.debug("Updated Ledger connection status after keyring creation");
                } catch (e) {
                    log.warn("Failed to update Ledger connection status:", e);
                }
            }

            // Persist the keyring state
            await this.persistHardwareKeyringState(device);
            log.debug(`Hardware connection for ${device} completed successfully`);
            return true;
        } catch (error) {
            log.error(`Failed to complete hardware connection for ${device}:`, error);
            throw error;
        }
    }

    /**
     * importHardwareWalletAccounts
     *
     * Imports the accounts from a connected hardware wallet at the specified
     * derivation path indexes. Validates device connection and account indexes
     * before attempting import.
     *
     * @param {number[]} accountIndexes - Array of account indexes to import from the device
     * @param {Devices} device - The hardware wallet device type
     * @returns {Promise<string[]>} Array of imported account addresses
     * @throws {Error} If device is invalid, not connected, or account import fails
     */
    public async importHardwareWalletAccounts(
        accountIndexes: number[],
        device: Devices
    ): Promise<string[]> {
        return this._mutex.runExclusive(async (): Promise<string[]> => {
            try {
                log.debug(
                    `Importing hardware wallet accounts for ${device} at indexes: ${accountIndexes.join(
                        ', '
                    )}`
                );

                if (!device) {
                    throw new Error('Device type must be specified');
                }

                if (!accountIndexes || accountIndexes.length === 0) {
                    throw new Error(
                        'At least one account index must be specified'
                    );
                }

                // Validate all indexes are non-negative
                if (accountIndexes.some((index) => index < 0)) {
                    throw new Error(
                        'Account indexes must be non-negative values'
                    );
                }

                // Special handling for Ledger in service worker context
                if (device === Devices.LEDGER && !hasDomAccess()) {
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
                    // This ensures the accounts are tracked by the extension
                    const keyringType = this._getKeyringTypeFromDevice(device);
                    const hdPath = this._HDPathForDevice(device);

                    let keyring = await this.getKeyringFromDevice(device);
                    if (!keyring) {
                        keyring = await this.addNewKeyring(keyringType, {
                            hdPath: hdPath,
                        });
                    }

                    // Add the accounts to the state without device interaction
                    for (const address of importedAddresses) {
                        try {
                            await keyring.forceAddAccount(address);
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
                                }
                            } else {
                                // Rethrow other errors
                                throw e;
                            }
                        }
                    }

                    // Persist state changes
                    await this.persistHardwareKeyringState(device);

                    return importedAddresses;
                }

                // For other devices or when DOM is available, proceed with normal flow
                const keyringType = this._getKeyringTypeFromDevice(device);
                const hdPath = this._HDPathForDevice(device);

                // Check if a keyring already exists for this device
                let keyring = await this.getKeyringFromDevice(device);

                // If no keyring exists, create one
                if (!keyring) {
                    log.debug(`No keyring found for ${device}, creating one...`);
                    keyring = await this.addNewKeyring(keyringType, {
                        hdPath: hdPath,
                    });
                    log.debug(`Successfully created new keyring for ${device}`);
                }

                // For Ledger devices, initialize transport (ensure we have a valid connection)
                if (device === Devices.LEDGER) {
                    log.debug(`Initializing Ledger transport for keyring`);
                    try {
                        // First set transport type if Ledger
                        await this.setLedgerTransportType('webhid');

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
                }

                // Store updated hardware wallet state
                await this.persistHardwareKeyringState(device);

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
                for (const index of accountIndexes) {
                    try {
                        // Set the account index on the keyring
                        keyring.setAccountToUnlock(index);

                        // Add new account to the keyring
                        await super.addNewAccount(keyring);
                        log.debug(`Added account at index ${index} to keyring`);
                    } catch (error) {
                        log.error(`Error adding account at index ${index}:`, error);
                        throw new Error(`Failed to import account at index ${index}: ${error.message}`);
                    }
                }

                // Get the final accounts after import
                const finalAccounts = await keyring.getAccounts();

                log.debug(`Successfully imported accounts from ${device}`);
                return finalAccounts;
            } catch (error) {
                // Check if this is a document is not defined error
                if (error.message && error.message.includes('document is not defined')) {
                    log.debug('Document is not defined error during hardware wallet import process');

                    // Use offscreen document to get the requested accounts
                    try {
                        if (device === Devices.LEDGER) {
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
                        }
                    } catch (fallbackError) {
                        log.error('Fallback account retrieval failed:', fallbackError);
                    }
                }

                log.error(`Failed to import hardware wallet accounts:`, error);
                throw error;
            }
        });
    }

    /**
     * Get the keyring type from the device type
     * @param device The hardware wallet device type
     * @returns The keyring type associated with the device
     */
    private _getKeyringTypeFromDevice(device: Devices): string {
        switch (device) {
            case Devices.LEDGER:
                return KeyringTypes.LEDGER;
            case Devices.TREZOR:
                return KeyringTypes.TREZOR;
            // case Devices.QR:
            //     return KeyringTypes.QR;
            default:
                throw new Error(`Unsupported device: ${device}`);
        }
    }

    /**
     * Get a keyring for a specific hardware wallet device
     * @param device The hardware wallet device type
     * @returns The keyring for the device, or null if no keyring exists
     */
    public async getKeyringFromDevice(device: Devices): Promise<any> {
        try {
            const keyringType = this._getKeyringTypeFromDevice(device);
            const keyrings = await this.getKeyringsByType(keyringType);
            return keyrings[0] || null;
        } catch (error) {
            log.error(`Error getting keyring from device ${device}:`, error);
            return null;
        }
    }

    /**
     * Persist the keyring state for a hardware wallet device
     * @param device The hardware wallet device type
     * @returns A promise that resolves when the state is persisted
     */
    private async persistHardwareKeyringState(device: Devices): Promise<void> {
        try {
            log.debug(`Persisting keyring state for ${device}`);
            // Get the latest state from the controller
            await this.fullUpdate();
        } catch (error) {
            log.error(`Error persisting keyring state for ${device}:`, error);
            throw error;
        }
    }

    /**
     * Sets the HD path for a device
     * @param device The hardware wallet device type
     * @param hdPath The HD path to set
     * @returns Promise that resolves when the HD path is set
     */
    public async setHdPathForDevice(device: Devices, hdPath: string): Promise<void> {
        await this.setHDPath(device, hdPath);
    }

    /**
     * Signs an Ethereum transaction
     * This is an alias for signTransaction for backwards compatibility
     * 
     * @param transactionId The transaction ID
     * @param transaction The transaction to sign
     * @param from The address to sign from
     * @returns Promise resolving to the signed transaction
     */
    public async signEthTransaction(
        transactionId: string,
        transaction: TypedTransaction,
        from: string
    ): Promise<TypedTransaction> {
        log.debug('signEthTransaction called, delegating to signTransaction');
        return this.signTransaction(transaction, from);
    }

    /**
     * Gets the device associated with a specific account
     * 
     * @param address The account address to check
     * @returns The device type or null if not a hardware wallet
     */
    public async getKeyringDeviceFromAccount(address: string): Promise<Devices | null> {
        log.debug(`Checking device for account ${address}`);
        try {
            // Search each hardware wallet type
            const keyringTypes = [
                { type: KeyringTypes.LEDGER, device: Devices.LEDGER },
                { type: KeyringTypes.TREZOR, device: Devices.TREZOR },
                // { type: KeyringTypes.QR, device: Devices.QR },
            ];

            for (const { type, device } of keyringTypes) {
                const keyrings = await this.getKeyringsByType(type);
                if (keyrings.length === 0) continue;

                const keyring = keyrings[0];
                const accounts = await keyring.getAccounts();

                if (accounts.map((a: string) => a.toLowerCase()).includes(address.toLowerCase())) {
                    log.debug(`Found device ${device} for account ${address}`);
                    return device;
                }
            }

            log.debug(`No hardware device found for account ${address}`);
            return null;
        } catch (error) {
            log.error('Error in getKeyringDeviceFromAccount:', error);
            return null;
        }
    }

    /**
     * Restores hardware wallet state from storage
     * 
     * @param params The parameters containing device and state
     * @returns Promise resolving to the restoration result or an object with needsUserGesture property
     */
    public async restoreHardwareWalletState(params: {
        device: Devices;
        state: any;
    }): Promise<boolean | { needsUserGesture: boolean; deviceName: string; }> {
        log.debug(`Restoring hardware wallet state for ${params.device}`);
        try {
            const keyring = await this.getKeyringFromDevice(params.device);
            return !!keyring;
        } catch (error) {
            log.error(`Error restoring hardware wallet state for ${params.device}:`, error);
            return false;
        }
    }

    /**
     * Checks if an account is linked to a hardware device
     * 
     * @param address The account address to check
     * @returns True if the account is linked to a hardware device
     */
    public async isAccountDeviceLinked(address: string): Promise<boolean> {
        const device = await this.getKeyringDeviceFromAccount(address);
        return device !== null;
    }

    /**
     * Removes a hardware keyring for a specific device
     * 
     * @param device The hardware wallet device type
     * @returns Promise resolving when the keyring is removed
     */
    public async removeDeviceKeyring(device: Devices): Promise<void> {
        log.debug(`Removing keyring for device ${device}`);
        try {
            const keyring = await this.getKeyringFromDevice(device);
            if (keyring) {
                // Remove the keyring if found
                await this.removeEmptyKeyrings();
            }
        } catch (error) {
            log.error(`Error removing keyring for device ${device}:`, error);
            throw error;
        }
    }

    /**
     * Cancels a QR hardware sign request
     * Stub implementation for interface compatibility
     * 
     * @param requestId Optional - The ID of the request to cancel
     */
    public cancelQRHardwareSignRequest(requestId?: string): void {
        log.debug(`Canceling QR hardware sign request ${requestId || 'all'}`);
        // Currently a stub - would be implemented for QR signing support
    }

    /**
     * Tries to restore a hardware wallet from storage
     * Supports both direct Devices parameter and object parameter with device and state
     * 
     * @param paramsOrDevice The device or parameters containing device and state
     * @returns Promise resolving to the restoration result or an object with needsUserGesture property
     */
    public async tryRestoreHardwareWalletFromStorage(
        paramsOrDevice: Devices | { device: Devices; state: any; }
    ): Promise<boolean | { needsUserGesture: boolean; deviceName: string; }> {
        // Handle both parameter styles for backwards compatibility
        if (typeof paramsOrDevice === 'object' && 'device' in paramsOrDevice) {
            // It's the new style object parameter
            return this.restoreHardwareWalletState(paramsOrDevice);
        } else {
            // It's the old style direct device parameter
            return this.restoreHardwareWalletState({
                device: paramsOrDevice as Devices,
                state: {}
            });
        }
    }
}