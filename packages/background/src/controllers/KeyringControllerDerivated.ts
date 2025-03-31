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

            // Handle Ledger in service worker context specially
            if (device === Devices.LEDGER) {
                // First check if we have an existing keyring already that's ready for use
                try {
                    const existingKeyring = await this.getKeyringFromDevice(device);
                    if (existingKeyring) {
                        log.debug("Found existing Ledger keyring");
                        console.log("[LEDGER] Found existing keyring");

                        try {
                            const isUsable = await this.isKeyringReadyForUse(existingKeyring);
                            if (isUsable) {
                                log.debug("Existing Ledger keyring is usable, returning success");
                                console.log("[LEDGER] Existing keyring is usable, returning success");

                                // Even if keyring is usable, verify Ethereum app is open
                                try {
                                    const appOpenStatus = await ledgerBridge.verifyEthereumAppOpen();
                                    if (!appOpenStatus) {
                                        log.debug("Ethereum app is not open on Ledger device");
                                        console.log("[LEDGER] Ethereum app is not open on Ledger device");

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
                                    log.warn("Error verifying Ethereum app state:", e);
                                    console.warn("[LEDGER] Error verifying Ethereum app state:", e);
                                }

                                return true;
                            }
                            log.debug("Existing Ledger keyring is not usable, needs reconnection");
                            console.log("[LEDGER] Existing keyring is not usable, needs reconnection");
                        } catch (e) {
                            log.warn("Error checking if keyring is usable:", e);
                            console.warn("[LEDGER] Error checking if keyring is usable:", e);
                        }
                    }
                } catch (e) {
                    log.warn("Error checking for existing keyring:", e);
                    console.warn("[LEDGER] Error checking for existing keyring:", e);
                }

                // In service worker context, try to use the offscreen document approach
                if (!hasDOM) {
                    log.debug("No DOM access in service worker context - trying offscreen document approach");
                    console.log("[LEDGER] No DOM access in service worker context - trying offscreen document approach");

                    // Use the ledgerBridge utility to connect via offscreen document
                    try {
                        console.log("[LEDGER] Attempting to connect using WebHID exclusively");
                        const result = await ledgerBridge.connectUsingWebHID();

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
                                log.error(`Failed to store connection status for ${device}:`, e);
                                console.error(`[LEDGER] Failed to store connection status:`, e);
                            }

                            return {
                                needsUserGesture: true,
                                deviceName: device,
                                message: "Ledger connected successfully. Please complete the setup in the UI."
                            };
                        }

                        return false;
                    } catch (e) {
                        log.error("Error connecting via offscreen document:", e);
                        console.error("[LEDGER] Error connecting via offscreen document:", e);
                    }

                    // If offscreen approach fails, check for explicit WebHID permission as fallback
                    let hasExplicitPermission = false;
                    try {
                        if (chrome.storage?.session) {
                            const result = await chrome.storage.session.get('ledger_explicit_permission');
                            console.log("[LEDGER] Checking for explicit WebHID permission:", result);
                            if (result.ledger_explicit_permission?.granted) {
                                // Check if permission is recent (within 10 minutes)
                                const timestamp = result.ledger_explicit_permission.timestamp;
                                if (Date.now() - timestamp < 10 * 60 * 1000) {
                                    log.debug(`Found valid explicit WebHID permission in service worker context`);
                                    console.log(`[LEDGER] Found valid explicit WebHID permission in service worker context`);
                                    hasExplicitPermission = true;
                                }
                            }

                            // As a fallback, also check connection status
                            if (!hasExplicitPermission) {
                                const connectionResult = await chrome.storage.session.get('ledger_connection_status');
                                console.log("[LEDGER] Checking connection status as fallback:", connectionResult);
                                if (connectionResult.ledger_connection_status?.connected) {
                                    // Check if connection is recent (within 5 minutes)
                                    const timestamp = connectionResult.ledger_connection_status.timestamp;
                                    if (Date.now() - timestamp < 5 * 60 * 1000) {
                                        log.debug(`Found valid connection status in service worker context`);
                                        console.log(`[LEDGER] Found valid connection status in service worker context`);
                                        hasExplicitPermission = true;
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        log.warn("Error checking WebHID permission/connection status:", e);
                        console.warn("[LEDGER] Error checking WebHID permission/connection status:", e);
                    }

                    // If we have permission, try to return success
                    if (hasExplicitPermission) {
                        log.debug("Found valid WebHID permission, indicating success for service worker");
                        console.log("[LEDGER] Found valid WebHID permission, indicating success for service worker");

                        // Store the need for user interaction to complete the connection in UI
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

                        // Create and initialize a LedgerKeyring if not present
                        try {
                            // Check if we already have a keyring for this device type
                            const existingKeyring = await this.getKeyringFromDevice(device);

                            if (!existingKeyring) {
                                log.debug(`No keyring instance found for ${device}, creating one based on explicit permission`);
                                console.log(`[LEDGER] Creating new keyring instance based on explicit permission`);

                                // Add a new keyring for Ledger
                                await this.addNewKeyring('Ledger Hardware', {});

                                // Get the newly created keyring
                                const newKeyring = await this.getKeyringFromDevice(device);

                                if (newKeyring) {
                                    log.info(`Successfully created keyring for ${device} in service worker context`);
                                    console.log(`[LEDGER] Successfully created keyring in service worker context`);

                                    // Set WebHID transport on the new keyring
                                    const keyringWithTransport = newKeyring as unknown as {
                                        _setTransportType?: (type: string) => Promise<void>;
                                    };

                                    if (keyringWithTransport._setTransportType) {
                                        await keyringWithTransport._setTransportType('webhid');
                                        log.debug('Set Ledger transport type to webhid');
                                    }

                                    // Persist this newly created keyring for future restoration
                                    await this.persistHardwareKeyringState(device);
                                    log.info(`Persisted initial state for ${device} keyring`);
                                    console.log(`[LEDGER] Persisted initial keyring state`);
                                }
                            } else {
                                log.debug(`Existing keyring found for ${device}, no need to create a new one`);
                                console.log(`[LEDGER] Using existing keyring instance with explicit permission`);

                                // Refresh the persisted state to ensure it's up-to-date
                                await this.persistHardwareKeyringState(device);
                            }
                        } catch (keyringError) {
                            log.error(`Failed to create or update keyring for ${device}:`, keyringError);
                            console.error(`[LEDGER] Failed to create or update keyring:`, keyringError);
                            // Continue anyway
                        }

                        return true;
                    }

                    // If we get here, we couldn't connect automatically in the service worker
                    log.debug("No valid permission in service worker context, indicating user gesture needed");
                    console.log("[LEDGER] No valid permission in service worker context, indicating user gesture needed");
                    return {
                        needsUserGesture: true,
                        deviceName: device
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
            }

            // If we reach here, we couldn't create a keyring and need user interaction
            return {
                needsUserGesture: true,
                deviceName: device
            };
        } catch (error) {
            log.error(`Error connecting hardware keyring for ${device}:`, error);
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
     * Imports hardware wallet accounts to the keyring
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

                const keyring = await this.getKeyringFromDevice(device);
                if (!keyring) {
                    throw new Error(
                        `No keyring found for device ${device}. Make sure the device is connected.`
                    );
                }

                if (!keyring.isUnlocked && !keyring.isUnlocked()) {
                    log.debug(
                        `Keyring for ${device} is locked, attempting to unlock`
                    );
                    if (keyring.unlock) {
                        await keyring.unlock();
                    } else {
                        throw new Error(
                            `Unable to unlock keyring for ${device}`
                        );
                    }
                }

                // Iterate over the list of added indexes and add each
                // selected account to the keyring
                const originalAccounts = await keyring.getAccounts();
                log.debug(
                    `Original accounts before import: ${originalAccounts.length}`
                );

                for (const index of accountIndexes) {
                    log.debug(
                        `Importing account at index ${index} from ${device}`
                    );
                    try {
                        keyring.setAccountToUnlock(index);
                        await super.addNewAccount(keyring);
                    } catch (error) {
                        log.error(
                            `Failed to import account at index ${index} from ${device}:`,
                            error
                        );
                        throw new Error(
                            `Failed to import account at index ${index}: ${error.message}`
                        );
                    }
                }

                // Return the list of all new added accounts
                const finalAccounts = await keyring.getAccounts();
                const importedAccounts = finalAccounts.slice(
                    originalAccounts.length
                );

                log.debug(
                    `Successfully imported ${importedAccounts.length} accounts from ${device}`
                );
                return finalAccounts;
            } catch (error) {
                log.error(
                    `Hardware wallet account import failed for ${device}:`,
                    error
                );
                throw error;
            }
        });
    }

    /**
     * Maps a device type to its corresponding keyring type
     *
     * @param {Devices} device - The hardware wallet device type
     * @returns {KeyringTypes} The corresponding keyring type
     * @throws {Error} If the device type is invalid or unsupported
     * @private
     */
    private _getKeyringTypeFromDevice(
        device: Devices
    ): KeyringTypes.LEDGER | KeyringTypes.TREZOR | KeyringTypes.QR {
        if (!device) {
            throw new Error('Device type must be specified');
        }

        switch (device) {
            case Devices.LEDGER:
                return KeyringTypes.LEDGER;
            case Devices.TREZOR:
                return KeyringTypes.TREZOR;
            case Devices.KEYSTONE:
                return KeyringTypes.QR;
            default:
                throw new Error(
                    `Invalid or unsupported device type: ${device}`
                );
        }
    }

    /**
     * Retrieves the keyring instance for a specific hardware wallet device
     *
     * Locates and returns the appropriate keyring for the specified hardware
     * wallet device type. If no keyring exists for the device, returns null.
     *
     * @param {Devices} device - The hardware wallet device type
     * @returns {Promise<any>} The keyring instance or null if not found
     * @throws {Error} If device type is invalid
     */
    public async getKeyringFromDevice(device: Devices): Promise<any> {
        try {
            log.debug(`Retrieving keyring for ${device}`);

            if (!device) {
                throw new Error('Device type must be specified');
            }

            // Determine the keyring type for the given device
            const keyringType = this._getKeyringTypeFromDevice(device);

            // Get all keyrings of this type
            const keyrings = super.getKeyringsByType(keyringType);
            log.debug(
                `Found ${keyrings.length} keyrings of type ${keyringType}`
            );

            // Return the first one found, or null if none
            return keyrings.length > 0 ? keyrings[0] : null;
        } catch (error) {
            log.error(`Failed to retrieve keyring for ${device}:`, error);
            throw error;
        }
    }

    /**
     * Removes a hardware wallet keyring from the controller
     *
     * Disconnects and removes the keyring for the specified hardware
     * wallet device type. This effectively forgets all accounts
     * associated with the device.
     *
     * @param {Devices} device - The hardware wallet device type
     * @returns {Promise<boolean>} True if the keyring was removed successfully
     * @throws {Error} If device type is invalid or removal fails
     */
    public async removeDeviceKeyring(device: Devices): Promise<boolean> {
        try {
            log.debug(`Removing keyring for ${device}`);

            if (!device) {
                throw new Error('Device type must be specified');
            }

            const keyring = await this.getKeyringFromDevice(device);
            if (!keyring) {
                log.debug(`No keyring found for ${device}, nothing to remove`);
                return false;
            }

            const accounts = await keyring.getAccounts();

            // If keyring has accounts, we need to remove them
            if (accounts.length > 0) {
                log.debug(
                    `Removing ${accounts.length} accounts associated with ${device} keyring`
                );

                // Iterate over accounts and remove them
                for (const account of accounts) {
                    try {
                        await super.removeAccount(account);
                    } catch (error) {
                        log.error(
                            `Failed to remove account ${account} during keyring removal:`,
                            error
                        );
                        // Continue with other accounts rather than failing completely
                    }
                }
            }

            // Get an updated keyring after account removal
            const updatedKeyring = await this.getKeyringFromDevice(device);
            if (updatedKeyring) {
                log.debug(
                    `Removing keyring type ${this._getKeyringTypeFromDevice(
                        device
                    )}`
                );
                // Remove the keyring
                await super.removeEmptyKeyrings();
                log.debug(`Successfully removed keyring for ${device}`);
                return true;
            }

            return false;
        } catch (error) {
            log.error(`Failed to remove keyring for ${device}:`, error);
            throw error;
        }
    }

    /**
     * getKeyringTypeFromAccount
     *
     * @param address The address to check
     * @returns The keyring type of the account
     */
    public async getKeyringTypeFromAccount(
        address: string
    ): Promise<KeyringTypes> {
        // Get the keyring for the specified address
        const keyring = await this.getKeyringForAccount(address);
        return keyring.type;
    }

    /**
     * getKeyringDeviceFromAccount
     *
     * @param address The address to check
     * @returns The device type for the specified address keyring or undefined if not found
     */
    public async getKeyringDeviceFromAccount(
        address: string
    ): Promise<Devices | undefined> {
        // Get the keyring for the specified address
        const type = await this.getKeyringTypeFromAccount(address);
        switch (type) {
            case KeyringTypes.LEDGER:
                return Devices.LEDGER;
            case KeyringTypes.TREZOR:
                return Devices.TREZOR;
            case KeyringTypes.QR:
                return Devices.KEYSTONE;
            default:
                return undefined;
        }
    }

    /**
     * isAccountDeviceLinked
     *
     * Checks if the current account device is connected.
     * This applies only to Ledger devices. Every other keyring type returns true.
     *
     * @param address The address of the account to check
     * @returns Whether the account device is connected or not
     */
    public async isAccountDeviceLinked(address: string): Promise<boolean> {
        const keyring = await this.getKeyringForAccount(address);
        if (keyring.type === KeyringTypes.LEDGER) {
            const releaseLock = await this._mutex.acquire();
            try {
                await keyring.checkIfReady();
                return true;
            } catch (error) {
                return false;
            } finally {
                releaseLock();
            }
        } else {
            return true;
        }
    }

    /**
     * Sign Ethereum Transaction
     *
     * Signs an Ethereum transaction object.
     *
     * @param {TypedTransaction} ethTx - The transaction to sign.
     * @param {string} _fromAddress - The transaction 'from' address.
     * @param {Object} opts - Signing options.
     * @returns {Promise<TypedTransaction>} The signed transactio object.
     */
    /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
    public async signEthTransaction(
        transactionId: string,
        ethTx: TypedTransaction,
        _fromAddress: string,
        opts?: any
    ): Promise<TypedTransaction> {
        const keyringType = await this.getKeyringTypeFromAccount(_fromAddress);
        /*
        if (keyringType === KeyringTypes.QR) {
            // cancels any previous signature request
            this.cancelQRHardwareSignRequest();
            this.removeAllListeners(
                KeyringControllerEvents.QR_SIGNATURE_SUBMIT
            );

            const signRequest = await this.getQRETHSignRequest(
                ethTx,
                _fromAddress
            );

            this.emit(
                KeyringControllerEvents.QR_TRANSACTION_SIGNATURE_REQUEST_GENERATED,
                transactionId,
                signRequest.requestId,
                signRequest.qrSignRequest
            );

            try {
                const { v, r, s } = await this.QRsignatureSubmission(
                    signRequest
                );

                // 0 means legacy
                if (ethTx.type === 0) {
                    return (ethTx as Transaction)['_processSignature'](v, r, s);
                } else if (ethTx.type === 1) {
                    return (
                        ethTx as AccessListEIP2930Transaction
                    )._processSignature(v, r, s);
                } else {
                    return (
                        ethTx as FeeMarketEIP1559Transaction
                    )._processSignature(v + BigInt(27), r, s);
                }
            } catch (error) {
                log.error('signature request error', error);
                return ethTx;
            }
        } else {
            */
        return this._mutex.runExclusive(async (): Promise<TypedTransaction> => {
            if (keyringType === KeyringTypes.TREZOR) {
                await this.connectHardwareKeyring(Devices.TREZOR);
            }
            return super.signTransaction(ethTx, _fromAddress, opts);
        });
        /*
        }
            */
    }

    /**
     * Sign Message
     *
     * Attempts to sign the provided message parameters.
     * Used for eth_sign
     *
     * @param msgParams - The message parameters to sign.
     * @returns The raw signature.
     */
    public async signMessage(
        msgParams: {
            from: string;
            data: string;
        },
        opts?: { withAppKeyOrigin: boolean }
    ): Promise<string> {
        const keyringType = await this.getKeyringTypeFromAccount(
            msgParams.from
        );
        /*
        if (keyringType === KeyringTypes.QR) {
            return await this._signQRMessage(msgParams, opts);
        } else {
         */
        return this._mutex.runExclusive(async () => {
            if (keyringType === KeyringTypes.TREZOR) {
                await this.connectHardwareKeyring(Devices.TREZOR);
            }
            return super.signMessage(msgParams, opts);
        });
        /*
        }
            */
    }

    /**
     * Sign Personal Message
     *
     * Attempts to sign the provided message paramaters.
     * Prefixes the hash before signing per the personal sign expectation.
     *
     * @param {Object} msgParams - The message parameters to sign.
     * @returns {Promise<string>} The hexed signature.
     */
    /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
    public async signPersonalMessage(
        msgParams: {
            from: string;
            data: string;
        },
        opts?: any
    ): Promise<string> {
        const keyringType = await this.getKeyringTypeFromAccount(
            msgParams.from
        );
        /*
        if (keyringType === KeyringTypes.QR) {
            return await this._signQRMessage(msgParams, opts);
        } else {
            */
        return this._mutex.runExclusive(async () => {
            if (keyringType === KeyringTypes.TREZOR) {
                await this.connectHardwareKeyring(Devices.TREZOR);
            }
            return super.signPersonalMessage(msgParams, opts);
        });
        /*
        }
            */
    }

    /**
     * Sign Typed Data
     * (EIP712 https://github.com/ethereum/EIPs/pull/712#issuecomment-329988454)
     *
     * @param {Object} msgParams - The message parameters to sign.
     * @returns {Promise<string>} The raw signature.
     */
    public async signTypedMessage(
        msgParams: {
            from: string;
            data: any;
        },
        opts: {
            version: 'V1' | 'V3' | 'V4';
        }
    ): Promise<string> {
        const keyringType = await this.getKeyringTypeFromAccount(
            msgParams.from
        );
        /*
        if (keyringType === KeyringTypes.QR) {
            return await this._signQRMessage(msgParams, opts, true);
        } else {
            */
        return this._mutex.runExclusive(async () => {
            if (keyringType === KeyringTypes.TREZOR) {
                await this.connectHardwareKeyring(Devices.TREZOR);
            }
            return super.signTypedMessage(msgParams, opts);
        });
        /*
        }
            */
    }

    /*
    private async _signQRMessage(
        msgParams: {
            from: string;
            data: string;
        },
        opts?: any,
        typedData?: boolean
    ): Promise<string> {
        // cancels any previous signature request
        this.cancelQRHardwareSignRequest();
        this.removeAllListeners(KeyringControllerEvents.QR_SIGNATURE_SUBMIT);

        let signRequest: QRSignatureRequest;

        if (typedData) {
            signRequest = await this.getQRTypedMessageSignRequest(
                msgParams,
                opts
            );
        } else {
            signRequest = await this.getQRMessageSignRequest(msgParams);
        }

        this.emit(
            KeyringControllerEvents.QR_MESSAGE_SIGNATURE_REQUEST_GENERATED,
            signRequest.requestId,
            signRequest.qrSignRequest
        );

        const { v, r, s } = await this.QRsignatureSubmission(signRequest);
        return concatSig(bigIntToBuffer(v), r, s);
    }
    */

    /**
     * Submites the HDKey of the QR device
     *
     * @param cbor
     */
    /*
    async submitQRHardwareCryptoHDKey(cbor: string) {
        return this._mutex.runExclusive(async () => {
            const read = this._qrHardwareKeyring.readKeyring();
            this._qrHardwareKeyring.submitCryptoHDKey(cbor);
            await read;
            this.fullUpdate();
        });
    }
    */

    /**
     * Submites the account of the QR device
     *
     * @param cbor
     */
    /*
    async submitQRHardwareCryptoAccount(cbor: string) {
        return this._mutex.runExclusive(async () => {
            const r = this._qrHardwareKeyring.readKeyring();
            this._qrHardwareKeyring.submitCryptoAccount(cbor);
            await r;
            this.fullUpdate();
        });
    }
    */

    /**
     * Generates a ETH Sign request to be signed with a QR device
     *
     *
     * @param {TypedTransaction} ethTx - The transaction to sign.
     * @param {string} _fromAddress - The transaction 'from' address.
     * @returns {Promise<QRSignatureRequest>} The transaction sign request object QR as string.
     */
    /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
    /*
    public async getQRETHSignRequest(
        ethTx: TypedTransaction,
        _fromAddress: string
    ): Promise<QRSignatureRequest> {
        return this._mutex.runExclusive(async () => {
            const dataType =
                ethTx.type === 0
                    ? DataType.transaction
                    : DataType.typedTransaction;

            let messageToSign;
            if (ethTx.type === 0) {
                messageToSign = rlp.encode(ethTx.getMessageToSign(false));
            } else {
                messageToSign = ethTx.getMessageToSign(false);
            }

            const hdPath = await this._qrHardwareKeyring._pathFromAddress(
                _fromAddress
            );
            const chainId = ethTx.common.chainId();
            const requestId = v4();
            const xfp = (this._qrHardwareKeyring as any)['xfp'];

            const ethSignRequest = EthSignRequest.constructETHRequest(
                messageToSign as Buffer,
                dataType,
                hdPath,
                xfp,
                requestId,
                Number(chainId),
                _fromAddress
            );

            return {
                requestId,
                qrSignRequest: ethSignRequest.toUREncoder(200).encodeWhole(),
            };
        });
    }
    */

    /**
     * Generates a message sign request to be signed with a QR device
     *
     *
     * @param {Object} msgParams - The message parameters to sign.
     * @returns {Promise<QRSignatureRequest>} The message sign request object QR as string.
     */
    /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
    /*
    public async getQRMessageSignRequest(msgParams: {
        from: string;
        data: string;
    }): Promise<QRSignatureRequest> {
        return this._mutex.runExclusive(async () => {
            const usignedHex = stripHexPrefix(msgParams.data);
            const dataHex = Buffer.from(usignedHex, 'hex');
            const requestId = v4();
            const xfp = (this._qrHardwareKeyring as any)['xfp'];
            const hdPath = await this._qrHardwareKeyring._pathFromAddress(
                msgParams.from
            );

            const ethSignRequest = EthSignRequest.constructETHRequest(
                dataHex,
                DataType.personalMessage,
                hdPath,
                xfp,
                requestId,
                undefined,
                msgParams.from
            );

            return {
                requestId,
                qrSignRequest: ethSignRequest.toUREncoder(200).encodeWhole(),
            };
        });
    }
    */

    /**
     * Generates a typed message sign request to be signed with a QR device
     *
     *
     * @param {Object} msgParams - The message parameters to sign.
     * @returns {Promise<QRSignatureRequest>} The typed message sign request object QR as string.
     */
    /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
    /*
    public async getQRTypedMessageSignRequest(
        msgParams: {
            from: string;
            data: any;
        },
        opts: {
            version: 'V1' | 'V3' | 'V4';
        }
    ): Promise<QRSignatureRequest> {
        return this._mutex.runExclusive(async () => {
            if (
                opts.version !== SignTypedDataVersion.V1 &&
                typeof msgParams.data === 'string'
            ) {
                msgParams.data = JSON.parse(msgParams.data);
            }
            const dataHex = Buffer.from(
                JSON.stringify(msgParams.data),
                'utf-8'
            );
            const requestId = v4();
            const xfp = (this._qrHardwareKeyring as any)['xfp'];
            const hdPath = await this._qrHardwareKeyring._pathFromAddress(
                msgParams.from
            );

            const ethSignRequest = EthSignRequest.constructETHRequest(
                dataHex,
                DataType.typedData,
                hdPath,
                xfp,
                requestId,
                undefined,
                msgParams.from
            );

            return {
                requestId,
                qrSignRequest: ethSignRequest.toUREncoder(200).encodeWhole(),
            };
        });
    }
    */

    /**
     * After requesting a QR sign this function waits for the signed message
     * @param signRequest
     * @returns
     */
    /*
    private async QRsignatureSubmission(
        signRequest: QRSignatureRequest
    ): Promise<SignatureData> {
        return new Promise((resolve, reject) => {
            this.on(
                KeyringControllerEvents.QR_SIGNATURE_SUBMIT,
                (_requestId: string, signatureData: SignatureData) => {
                    if (_requestId === signRequest.requestId) {
                        this.removeAllListeners(
                            KeyringControllerEvents.QR_SIGNATURE_SUBMIT
                        );
                        resolve(signatureData);
                    } else {
                        reject(
                            `got a signature of another request. current request requestId: ${signRequest.requestId}, received requestId: ${_requestId}`
                        );
                    }
                }
            );
        });
    }
    */

    /**
     * Submits the signature generate by the QR device
     *
     * @param requestId
     * @param cbor
     */
    /*
    public submitQRHardwareSignature(requestId: string, cbor: Buffer) {
        const ethSignature = ETHSignature.fromCBOR(cbor);
        const signature = ethSignature.getSignature(); // it will return the signature r,s,v
        const slice = Uint8Array.prototype.slice.call(signature);
        const v = bufferToBigInt(arrToBufArr(slice.slice(64, 65)));
        const r = arrToBufArr(slice.slice(0, 32));
        const s = arrToBufArr(slice.slice(32, 64));

        const signatureData: SignatureData = { v, r, s };

        this.emit(
            KeyringControllerEvents.QR_SIGNATURE_SUBMIT,
            requestId,
            signatureData
        );
    }
    */

    /**
     * Cancels an ongoing sign request
     */
    public cancelQRHardwareSignRequest() {
        this.emit(KeyringControllerEvents.QR_SIGNATURE_SUBMIT);
    }

    /**
     * Returns accounts from the device by page
     *
     * @param device
     * @param keyring
     * @param page
     * @returns
     */
    async getPage(
        device: Devices,
        keyring: any,
        pageIndex: number
    ): Promise<string[]> {
        try {
            log.debug(`Getting page ${pageIndex} for ${device}`);

            // First check if we're in a service worker context
            const hasDOM = hasDomAccess();
            log.debug(`Getting accounts in environment with DOM access: ${hasDOM}`);

            // For Ledger in service worker context, we need to check explicit WebHID permission
            if (device === Devices.LEDGER && !hasDOM) {
                log.debug("Checking for explicit WebHID permission in service worker context");

                let hasExplicitPermission = false;
                try {
                    if (chrome.storage?.session) {
                        const result = await chrome.storage.session.get('ledger_explicit_permission');

                        if (result.ledger_explicit_permission &&
                            result.ledger_explicit_permission.granted &&
                            Date.now() - result.ledger_explicit_permission.timestamp < 600000) { // 10 minutes

                            log.debug("Found valid explicit WebHID permission", result.ledger_explicit_permission);
                            hasExplicitPermission = true;
                        } else {
                            log.debug("No valid explicit WebHID permission found in session storage");
                        }
                    }
                } catch (e) {
                    log.error("Error checking for explicit WebHID permission:", e);
                }

                if (!hasExplicitPermission) {
                    // No explicit permission - need UI interaction
                    log.debug("Service worker cannot get accounts without explicit WebHID permission");

                    // Store this requirement in session storage
                    try {
                        if (chrome.storage?.session) {
                            await chrome.storage.session.set({
                                'ledger_needs_user_interaction': {
                                    timestamp: Date.now(),
                                    status: 'pending',
                                    requiresWebHID: true,
                                    operation: 'getAccounts',
                                    reason: 'service_worker_context_no_permission'
                                }
                            });
                            log.debug("Stored account operation requirement in session storage");
                        }
                    } catch (storageErr) {
                        log.warn("Failed to store account operation requirement:", storageErr);
                    }

                    throw new Error('Cannot get accounts for Ledger in service worker context - explicit WebHID permission required');
                }

                // We're in a service worker context but have explicit permission
                // Use the ledgerBridge proxy instead of trying to use a keyring instance directly
                log.debug("Using ledgerBridge proxy to get page in service worker context");
                console.log("[LEDGER] Using ledgerBridge proxy to get page in service worker context");

                try {
                    // Call the ledgerBridge proxy method
                    const page = await ledgerBridge.getPage(pageIndex);

                    log.debug(`Got ${page?.length || 0} accounts from Ledger via offscreen document`);
                    console.log(`[LEDGER] Got ${page?.length || 0} accounts from Ledger via offscreen document`);

                    // Update connection status after successful account fetch
                    if (chrome.storage?.session) {
                        try {
                            await chrome.storage.session.set({
                                'ledger_connection_status': {
                                    connected: true,
                                    timestamp: Date.now()
                                }
                            });

                            // Also clear any pending interaction requirements
                            await chrome.storage.session.remove('ledger_needs_user_interaction');

                            log.debug("Updated Ledger connection status after successful account fetch");
                        } catch (e) {
                            log.warn("Failed to update Ledger connection status:", e);
                        }
                    }

                    return page;
                } catch (e) {
                    log.error(`Error getting accounts for Ledger via proxy:`, e);
                    console.error(`[LEDGER] Error getting accounts via proxy:`, e);

                    // Store error information
                    if (chrome.storage?.session) {
                        try {
                            await chrome.storage.session.set({
                                'ledger_proxy_error': {
                                    timestamp: Date.now(),
                                    error: e.message,
                                    operation: 'getPage'
                                }
                            });
                        } catch (storageErr) {
                            log.warn("Failed to store proxy error:", storageErr);
                        }
                    }

                    throw e;
                }
            }

            // For all devices, try to get the page
            try {
                // Verify the keyring is valid and ready
                if (!keyring) {
                    log.error(`No keyring found for device ${device} after connection attempt`);
                    throw new Error(`No keyring found for device ${device} after connection attempt`);
                }

                if (device === Devices.LEDGER) {
                    try {
                        // For Ledger, check if the keyring is working correctly
                        log.debug(`Checking if Ledger keyring is ready for use...`);
                        const isReady = await this.isKeyringReadyForUse(keyring);

                        if (!isReady) {
                            log.warn("Ledger keyring is not ready for use, cannot fetch accounts");
                            throw new Error('Ledger keyring not ready for use. Please reconnect your device.');
                        }

                        // Check if we have a working connection
                        if (typeof keyring.isConnected === 'function') {
                            try {
                                const connected = await keyring.isConnected();
                                if (!connected) {
                                    log.warn("Ledger device reports it is not connected");
                                    throw new Error('Ledger not connected. Please reconnect your device.');
                                }
                            } catch (connError) {
                                log.error("Error checking Ledger connection:", connError);
                                // Continue anyway, the getAccounts call will reveal more specific errors
                            }
                        }
                    } catch (readyError) {
                        log.error("Error checking if Ledger keyring is ready:", readyError);
                        throw readyError;
                    }
                }

                // For debugging, log the keyring state
                log.debug(`Calling keyring.getAccounts(${pageIndex}) on ${device}...`);

                // Actually get the accounts
                const page = await keyring.getAccounts(pageIndex);
                log.debug(`Got ${page?.length || 0} accounts from ${device}`);

                // After successful account fetch, update the connection status
                if (device === Devices.LEDGER && chrome.storage?.session) {
                    try {
                        await chrome.storage.session.set({
                            'ledger_connection_status': {
                                connected: true,
                                timestamp: Date.now()
                            }
                        });

                        // Also clear any pending interaction requirements
                        await chrome.storage.session.remove('ledger_needs_user_interaction');

                        log.debug("Updated Ledger connection status after successful account fetch");
                    } catch (e) {
                        log.warn("Failed to update Ledger connection status:", e);
                    }
                }

                return page;
            } catch (e) {
                log.error(`Error getting accounts for ${device}:`, e);

                // If this is a WebHID or document not defined error, we need UI intervention
                if (e.message && (
                    e.message.includes('document is not defined') ||
                    e.message.includes('WebHID') ||
                    e.message.includes('user gesture') ||
                    e.message.includes('user interaction') ||
                    e.message.includes('no device selected')
                )) {
                    log.debug("Account retrieval requires WebHID access in UI context");

                    try {
                        if (chrome.storage?.session) {
                            await chrome.storage.session.set({
                                'ledger_needs_user_interaction': {
                                    timestamp: Date.now(),
                                    status: 'pending',
                                    requiresWebHID: true,
                                    operation: 'getAccounts',
                                    reason: 'hid_access_required',
                                    error: e.message
                                }
                            });
                            log.debug("Stored account operation requirement in session storage due to WebHID error");
                        }
                    } catch (storageErr) {
                        log.warn("Failed to store account operation requirement:", storageErr);
                    }

                    throw new Error('Hardware wallet connection requires user interaction in UI context');
                }

                // For reconnection errors, try to reconnect
                if (e.message && (
                    e.message.includes('disconnected') ||
                    e.message.includes('not connected') ||
                    e.message.includes('No device selected') ||
                    e.message.includes('No keyring found')
                )) {
                    log.debug("Detected disconnection error, marking for reconnection");

                    try {
                        if (chrome.storage?.session) {
                            await chrome.storage.session.set({
                                'ledger_needs_reconnection': {
                                    timestamp: Date.now(),
                                    reason: e.message
                                }
                            });
                            log.debug("Stored reconnection requirement in session storage");
                        }
                    } catch (storageErr) {
                        log.warn("Failed to store reconnection requirement:", storageErr);
                    }
                }

                // Provide more detailed error messages for Ledger
                if (device === Devices.LEDGER) {
                    if (e.message && e.message.includes('Ledger device: UNKNOWN_ERROR')) {
                        throw new Error('Make sure the Ethereum app is open on your Ledger device.');
                    } else if (e.message && e.message.includes('Timeout')) {
                        throw new Error('Connection timed out. Ensure your Ledger is unlocked with the Ethereum app open.');
                    } else if (e.message && e.message.includes('U2F')) {
                        throw new Error('Browser U2F support issue. Try using Chrome or a Chromium-based browser.');
                    }
                }

                throw e;
            }
        } catch (e) {
            log.error(`Error in getPage for ${device}:`, e);
            throw e;
        }
    }

    /**
     * persistHardwareKeyringState
     *
     * Saves the hardware wallet keyring state for a specific device
     * Ensures the state is saved to both session and local storage for reliability
     *
     * @param {Devices} device - The hardware wallet device type
     * @returns {Promise<boolean>} True if the keyring state was successfully persisted
     */
    public async persistHardwareKeyringState(device: Devices): Promise<boolean> {
        try {
            log.debug(`Persisting hardware wallet keyring state for ${device}`);

            if (!device) {
                throw new Error('Device type must be specified');
            }

            // Get the keyring for the device
            const keyring = await this.getKeyringFromDevice(device);
            if (!keyring) {
                log.warn(`No keyring found for ${device}, nothing to persist`);
                return false;
            }

            // Attempt to serialize the keyring state
            let serializedState;
            try {
                // Cast to any to access serialize method
                const serializableKeyring = keyring as any;
                if (typeof serializableKeyring.serialize !== 'function') {
                    throw new Error(`${device} keyring does not support serialization`);
                }
                serializedState = await serializableKeyring.serialize();
            } catch (e) {
                log.error(`Failed to serialize ${device} keyring state:`, e);
                return false;
            }

            if (!serializedState) {
                log.warn(`Serialized state for ${device} is empty`);
                return false;
            }

            // Create a storage object with metadata
            const storageObject = {
                state: serializedState,
                type: this._getKeyringTypeFromDevice(device),
                timestamp: Date.now(),
                accounts: await keyring.getAccounts()
            };

            // Save to session storage (primary storage for active session)
            try {
                if (chrome.storage?.session) {
                    await chrome.storage.session.set({
                        [`hw_keyring_${device.toLowerCase()}`]: storageObject
                    });
                    log.debug(`${device} keyring state saved to session storage`);
                }
            } catch (sessionError) {
                log.error(`Failed to save ${device} keyring state to session storage:`, sessionError);
                // Continue trying to save to local storage
            }

            // Also save to local storage for persistence across browser restarts
            try {
                if (chrome.storage?.local) {
                    await chrome.storage.local.set({
                        [`hw_keyring_${device.toLowerCase()}`]: storageObject
                    });
                    log.debug(`${device} keyring state saved to local storage`);
                }
            } catch (localError) {
                log.error(`Failed to save ${device} keyring state to local storage:`, localError);
                // If we failed to save to both session and local storage, return false
                if (!chrome.storage?.session) {
                    return false;
                }
            }

            // For Ledger specifically, also update the connection status
            if (device === Devices.LEDGER && chrome.storage?.session) {
                try {
                    await chrome.storage.session.set({
                        'ledger_connection_status': {
                            connected: true,
                            timestamp: Date.now()
                        }
                    });
                    log.debug("Updated Ledger connection status on state persistence");
                } catch (connectionError) {
                    log.warn("Failed to update Ledger connection status:", connectionError);
                    // Continue anyway, this is just an auxiliary state
                }
            }

            return true;
        } catch (error) {
            log.error(`Failed to persist ${device} hardware wallet state:`, error);
            return false;
        }
    }

    /**
     * Restores a hardware wallet state after restart
     * @param params - Parameters including device name and state
     */
    public async restoreHardwareWalletState(
        params: { device: string; state: { hdPath: string; accounts: string[], state?: any, type?: string } }
    ): Promise<boolean | { needsUserGesture: boolean; deviceName: string }> {
        try {
            log.info(
                `Attempting to restore hardware wallet connection for device: ${params.device}`
            );

            // Cancel any existing restores
            if (this.restorePromise) {
                this.restoreCompleted = true;
            }

            // Start a new restore process
            this.restorePromise = new Promise<boolean | { needsUserGesture: boolean; deviceName: string }>((resolve) => {
                const attemptRestore = async () => {
                    this.restoreCompleted = false;
                    let restored = false;

                    try {
                        // For Ledger, we need to check for WebHID transport first to avoid errors
                        if (params.device.toUpperCase() === 'LEDGER') {
                            try {
                                await this.setLedgerTransportType('webhid');
                                log.debug('WebHID transport set for Ledger');
                            } catch (transportError) {
                                log.warn('WebHID transport setting failed for Ledger:', transportError);
                                // Continue anyway as it might work with the default transport
                            }
                        }

                        // Step 1: Connect to the hardware keyring
                        log.debug(`Restore: connecting to ${params.device}`);
                        const connectionResult = await this.connectHardwareKeyring(params.device as Devices);

                        // If connection requires user gesture, capture that and return appropriate result
                        if (typeof connectionResult === 'object' && connectionResult.needsUserGesture) {
                            log.info(`${params.device} connection requires user interaction`);
                            this.restoreCompleted = true;
                            this.restorePromise = null;
                            resolve(connectionResult);
                            return;
                        }

                        // Step 2: Get the keyring from the device
                        const keyring = await this.getKeyringFromDevice(params.device as Devices);
                        if (!keyring) {
                            log.error(`Failed to get keyring for ${params.device}`);
                            this.restoreCompleted = true;
                            this.restorePromise = null;
                            resolve(false);
                            return;
                        }

                        // Step 3: Set the HD path if provided
                        if (params.state.hdPath && typeof keyring.setHdPath === 'function') {
                            try {
                                log.debug(`Setting HD path to ${params.state.hdPath}`);
                                await keyring.setHdPath(params.state.hdPath);
                            } catch (hdPathError) {
                                // Check if this is a user interaction error
                                if (hdPathError instanceof Error &&
                                    (hdPathError.message.includes('user interaction') ||
                                        hdPathError.message.includes('user gesture'))) {

                                    log.info(`${params.device} HD path setting requires user interaction`);

                                    // Store the pending HD path operation in session storage
                                    try {
                                        if (chrome.storage?.session) {
                                            await chrome.storage.session.set({
                                                [`${params.device.toLowerCase()}_needs_user_interaction`]: {
                                                    timestamp: Date.now(),
                                                    status: 'pending',
                                                    operation: 'setHdPath',
                                                    hdPath: params.state.hdPath
                                                }
                                            });
                                            log.debug(`Stored ${params.device} HD path interaction requirement in session storage`);
                                        }
                                    } catch (storageErr) {
                                        log.warn(`Failed to store ${params.device} interaction state:`, storageErr);
                                    }

                                    this.restoreCompleted = true;
                                    this.restorePromise = null;
                                    const result = {
                                        needsUserGesture: true,
                                        deviceName: params.device
                                    };
                                    resolve(result);
                                    return;
                                }

                                log.error(`Failed to set HD path for ${params.device}:`, hdPathError);
                                // Continue anyway with other steps
                            }
                        }

                        // Step 4: Deserialize the state if available
                        if (params.state.state && typeof keyring.deserialize === 'function') {
                            try {
                                log.debug(`Deserializing keyring state for ${params.device}`);
                                await keyring.deserialize(params.state.state);
                            } catch (deserializeError) {
                                log.error(`Failed to deserialize keyring state for ${params.device}:`, deserializeError);
                                // Continue anyway, we'll try to add accounts manually
                            }
                        }

                        // Step 5: Unlock the keyring if needed
                        if (typeof keyring.unlock === 'function') {
                            log.debug(`Unlocking keyring for ${params.device}`);
                            await keyring.unlock();
                        }

                        // Step 6: Set up accounts
                        const accountsToUnlock = params.state.accounts || [];

                        if (accountsToUnlock.length > 0) {
                            // Step 6: Set the accounts (this may require communicating with the device)
                            log.debug(`Restoring ${accountsToUnlock.length} accounts for ${params.device}`);

                            if (typeof keyring.setAccountToUnlock === 'function') {
                                for (const account of accountsToUnlock) {
                                    await keyring.setAccountToUnlock(account);
                                }
                            } else if (typeof keyring.forgetAccounts === 'function' &&
                                typeof keyring.addAccounts === 'function') {
                                // Alternative approach if setAccountToUnlock is not available
                                await keyring.forgetAccounts();
                                await keyring.addAccounts(accountsToUnlock.length);
                            }
                        }

                        // Step 7: Get accounts from the keyring to verify restoration
                        const accounts = await this.getAccounts();
                        log.info(`Restored ${params.device} with ${accounts.length} accounts`);

                        // Step 8: Re-persist state to ensure it's up-to-date
                        await this.persistHardwareKeyringState(params.device as Devices);

                        // Record successful restoration in session storage
                        if (chrome.storage?.session) {
                            try {
                                await chrome.storage.session.set({
                                    [`${params.device.toLowerCase()}_restoration_status`]: {
                                        restored: true,
                                        timestamp: Date.now(),
                                        accountCount: accounts.length
                                    }
                                });
                            } catch (storageError) {
                                log.error(`Failed to record restoration status for ${params.device}:`, storageError);
                            }
                        }

                        restored = true;
                    } catch (error) {
                        log.error(`Error during restore attempt:`, error);
                    }

                    this.restoreCompleted = true;
                    this.restorePromise = null;
                    resolve(restored);
                };

                // Execute the async function
                attemptRestore();
            });

            return await this.restorePromise;
        } catch (error) {
            log.error(`Failed to restore hardware wallet state for ${params.device}:`, error);
            this.restoreCompleted = true;
            this.restorePromise = null;
            return false;
        }
    }

    /**
     * Attempts to restore a hardware wallet keyring from storage on demand
     * Used when a keyring is not found but should exist
     * @param device The hardware wallet device type
     * @returns True if restoration was successful, or an object indicating user gesture is needed
     */
    public async tryRestoreHardwareWalletFromStorage(
        device: Devices
    ): Promise<boolean | { needsUserGesture: boolean; deviceName: string }> {
        try {
            log.debug(`Attempting to restore ${device} from storage`);

            // Check both session and local storage simultaneously
            let hwStateSession = null;
            let hwStateLocal = null;
            const storageKey = `hw_keyring_${device.toLowerCase()}`;

            // Try session storage
            try {
                if (chrome.storage?.session) {
                    const sessionState = await chrome.storage.session.get(storageKey);
                    hwStateSession = sessionState[storageKey];
                    if (hwStateSession) {
                        log.debug(`Found ${device} keyring state in session storage with timestamp: ${hwStateSession.timestamp}`);
                    }
                }
            } catch (e) {
                log.error('Failed to access session storage:', e);
            }

            // Try local storage
            try {
                if (chrome.storage?.local) {
                    const localState = await chrome.storage.local.get(storageKey);
                    hwStateLocal = localState[storageKey];
                    if (hwStateLocal) {
                        log.debug(`Found ${device} keyring state in local storage with timestamp: ${hwStateLocal.timestamp}`);
                    }
                }
            } catch (e) {
                log.error('Failed to access local storage:', e);
            }

            // Determine which state to use (prefer the one with the most recent timestamp)
            let hwState = null;

            if (hwStateSession && hwStateLocal) {
                // Use the most recent state if both exist
                hwState = hwStateSession.timestamp > hwStateLocal.timestamp ? hwStateSession : hwStateLocal;
                log.debug(`Using ${hwState === hwStateSession ? 'session' : 'local'} storage state (more recent)`);
            } else {
                // Use whichever one exists
                hwState = hwStateSession || hwStateLocal;
            }

            if (!hwState) {
                log.debug(`No persisted state found for ${device}`);
                return false;
            }

            log.info(`Found persisted state for ${device} (timestamp: ${hwState.timestamp}), attempting restoration`);

            // Validate the state has required properties before attempting restoration
            if (!hwState.state || !hwState.type) {
                log.error(`Invalid state structure for ${device}, missing required properties`);
                return false;
            }

            return await this.restoreHardwareWalletState({
                device: device,
                state: hwState
            });
        } catch (error) {
            log.error(`Failed to restore ${device} from storage:`, error);
            return false;
        }
    }

    /**
     * Reconnects to a hardware wallet device
     * This is a robust reconnection function that will handle various device states
     * 
     * @param device - The device type to reconnect
     * @param forceNewKeyring - If true, will always create a new keyring
     * @returns Promise resolving to true if reconnection was successful, or the result of connectHardwareKeyring
     */
    public async reconnectHardwareDevice(
        device: Devices,
        forceNewKeyring = false
    ): Promise<boolean | { needsUserGesture: boolean; deviceName: string }> {
        log.debug(`Attempting to reconnect ${device} hardware wallet`);

        // Special handling for Ledger
        if (device === Devices.LEDGER) {
            try {
                // First check if a keyring exists at all
                let keyring = await this.getKeyringFromDevice(device);

                // If no keyring or if forced, create a new one
                if (!keyring || forceNewKeyring) {
                    log.debug('No existing Ledger keyring or forced new keyring, creating one');
                    const keyringType = this._getKeyringTypeFromDevice(device);
                    const hdPath = this._HDPathForDevice(device);

                    keyring = await this.addNewKeyring(keyringType, {
                        hdPath: hdPath,
                    });

                    log.debug('New Ledger keyring created');
                }

                // Try to get the transport type from storage
                let transportType: 'webhid' | 'webusb' = 'webhid';
                try {
                    // Try to get from memory store first
                    const memState = this.memStore.getState();
                    if (memState.ledgerTransportType === 'webhid' || memState.ledgerTransportType === 'webusb') {
                        transportType = memState.ledgerTransportType;
                    } else if (chrome.storage && chrome.storage.local) {
                        // Then try from chrome storage
                        const result = await chrome.storage.local.get('ledgerTransportType');
                        if (result.ledgerTransportType === 'webhid' || result.ledgerTransportType === 'webusb') {
                            transportType = result.ledgerTransportType;
                        }
                    }
                } catch (e) {
                    log.debug('No stored transport type, using default WebHID');
                }

                // Set the transport type on the keyring
                // Use type casting instead of ts-ignore
                const keyringWithTransport = keyring as unknown as {
                    _setTransportType?: (type: string) => Promise<void>;
                    disconnect?: () => Promise<void>;
                };

                if (keyringWithTransport._setTransportType) {
                    await keyringWithTransport._setTransportType(transportType);
                    log.debug(`Set Ledger transport type to ${transportType}`);
                }

                // Always try to disconnect first to clear any stale connections
                try {
                    if (keyringWithTransport.disconnect) {
                        await keyringWithTransport.disconnect();
                        log.debug('Disconnected from existing Ledger connection');
                    }
                } catch (e) {
                    log.debug('No disconnect method or error disconnecting, continuing');
                }

                // Now try to connect to the device
                log.debug('Attempting to connect to Ledger...');
                await keyring.connect();
                log.debug('Successfully connected to Ledger');

                // Unlock the keyring
                await keyring.unlock();
                log.debug('Ledger keyring unlocked');

                // Persist the keyring state
                await this.persistHardwareKeyringState(device);
                log.debug('Ledger keyring state persisted');

                return true;
            } catch (e) {
                log.error('Failed to reconnect to Ledger:', e);

                // Check for specific error types and provide better error messages
                if (e.message && e.message.includes('timeout')) {
                    throw new Error('Connection timed out. Ensure your Ledger is unlocked with the Ethereum app open.');
                } else if (e.message && e.message.includes('denied')) {
                    throw new Error('Permission denied. Please allow the connection in Chrome and try again.');
                } else if (e.message && e.message.includes('disconnected')) {
                    throw new Error('Device disconnected. Please reconnect your Ledger and try again.');
                }

                // Re-throw the original error
                throw e;
            }
        }

        // For other device types, just call the connect function
        return await this.connectHardwareKeyring(device);
    }

    /**
     * Sets the HD path for a hardware wallet device
     *
     * @param {Devices} device - The hardware wallet device type
     * @param {string} hdPath - The HD path to set
     * @throws {Error} If the device type is invalid or the connection fails
     */
    public async setHdPathForDevice(device: Devices, hdPath: string): Promise<void> {
        try {
            log.debug(`Setting HD path for ${device}: ${hdPath}`);

            if (!device) {
                throw new Error('Device type must be specified');
            }

            // Get the keyring for the device
            const updatedKeyring = await this.getKeyringFromDevice(device);
            if (!updatedKeyring) {
                throw new Error(`No keyring found for ${device}`);
            }

            // Set the HD path on the keyring
            try {
                updatedKeyring.setHdPath(hdPath);
                log.debug(`HD path set successfully for ${device}`);
            } catch (error) {
                // Check if this is a user interaction error
                if (error instanceof Error &&
                    (error.message.includes('user interaction') ||
                        error.message.includes('user gesture'))) {

                    // Store this state in session storage for UI to detect
                    try {
                        if (chrome.storage?.session) {
                            await chrome.storage.session.set({
                                'ledger_needs_user_interaction': {
                                    timestamp: Date.now(),
                                    status: 'pending',
                                    operation: 'setHdPath',
                                    hdPath: hdPath
                                }
                            });
                            log.debug("Stored HD path interaction requirement in session storage");
                        }
                    } catch (storageErr) {
                        log.warn("Failed to store Ledger interaction state:", storageErr);
                    }
                }
                throw error;
            }

            if (device !== Devices.KEYSTONE) {
                if (!updatedKeyring.isUnlocked()) {
                    log.debug(`Unlocking keyring for ${device}`);
                    await updatedKeyring.unlock();
                }
            }

            // Persist the hardware wallet state after setting HD path
            await this.persistHardwareKeyringState(device);
        } catch (error) {
            log.error(`Failed to set HD path for ${device}:`, error);
            throw error;
        }
    }
}