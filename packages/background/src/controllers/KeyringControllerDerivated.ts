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
        return typeof document !== 'undefined' &&
            document !== null &&
            typeof document.createElement === 'function';
    } catch (e) {
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
     * Sets the HD path for a hardware wallet device
     * @param {Devices} device - The hardware wallet device type
     * @param {string} hdPath - The HD derivation path to set
     * @throws {Error} If the HD path is invalid or the keyring cannot be configured
     */
    public async setHDPath(device: Devices, hdPath: string): Promise<void> {
        try {
            log.debug(`Setting HD path for ${device} to ${hdPath}`);

            if (!device) {
                throw new Error('Device type must be specified');
            }

            if (!hdPath || hdPath.trim() === '') {
                throw new Error('HD path cannot be empty');
            }

            // First validate the HD path before attempting any device connection
            const hdPaths = HDPaths[device];
            if (!hdPaths) {
                throw new Error(`No HD paths defined for device ${device}`);
            }

            if (hdPaths.findIndex((data) => data.path === hdPath) === -1) {
                throw new Error(
                    `The provided HD path "${hdPath}" is not recognized as a valid path for ${device}`
                );
            }

            // Persist this HD path in storage even before trying to connect
            // This allows the UI to know which path was selected even if connection requires user interaction
            try {
                if (chrome.storage?.session) {
                    await chrome.storage.session.set({
                        [`${device.toLowerCase()}_hd_path`]: {
                            path: hdPath,
                            timestamp: Date.now()
                        }
                    });
                    log.debug(`HD path for ${device} saved to session storage: ${hdPath}`);
                }

                // Also try to store in local storage for persistence across sessions
                if (chrome.storage?.local) {
                    await chrome.storage.local.set({
                        [`${device.toLowerCase()}_last_hd_path`]: hdPath
                    });
                    log.debug(`HD path for ${device} saved to local storage: ${hdPath}`);
                }
            } catch (storageError) {
                log.warn(`Could not save HD path to storage for ${device}:`, storageError);
                // Continue anyway
            }

            // Get keyring for the device - but don't error out if no keyring exists yet
            const keyring = await this.getKeyringFromDevice(device);

            // For Ledger specifically, check if we have an active connection status stored
            let connectionStatus = false;
            if (device === Devices.LEDGER && chrome.storage?.session) {
                try {
                    const result = await chrome.storage.session.get('ledger_connection_status');
                    if (result.ledger_connection_status &&
                        result.ledger_connection_status.connected &&
                        Date.now() - result.ledger_connection_status.timestamp < 300000) { // If connected in last 5 minutes
                        log.debug("Found valid Ledger connection status in session storage");
                        connectionStatus = true;
                    }
                } catch (e) {
                    log.warn("Error checking Ledger connection status:", e);
                }
            }

            // If no keyring exists, or we don't have a valid connection status, we can't proceed
            // without user interaction
            if (!keyring || (device === Devices.LEDGER && !connectionStatus)) {
                // For Ledger without connection status, store more detailed information
                if (device === Devices.LEDGER) {
                    log.debug("No keyring or valid connection for Ledger - user interaction required");

                    // Store pending HD path change with more details in session storage
                    try {
                        if (chrome.storage?.session) {
                            await chrome.storage.session.set({
                                'ledger_needs_user_interaction': {
                                    timestamp: Date.now(),
                                    status: 'pending',
                                    requiresWebHID: true,
                                    operation: 'setHdPath',
                                    pendingHdPath: hdPath
                                }
                            });
                            log.debug("Stored Ledger HD path operation details in session storage");
                        }
                    } catch (storageErr) {
                        log.warn("Failed to store Ledger HD path operation details:", storageErr);
                    }

                    throw new Error(`Hardware wallet connection requires user interaction`);
                }

                // For other devices, try connecting
                log.debug(`No keyring found for ${device}, attempting to create one before setting HD path`);
                const connectionResult = await this.connectHardwareKeyring(device);

                if (connectionResult !== true) {
                    // If connection was not successful, throw error
                    log.warn(`${device} connection requires user gesture for HD path setting`);
                    throw new Error(`Hardware wallet connection requires user interaction`);
                }
            }

            // At this point, we should have a keyring or have thrown if user interaction is required
            // Try to get the keyring again in case we just created it
            const updatedKeyring = await this.getKeyringFromDevice(device);

            if (!updatedKeyring) {
                throw new Error(`No keyring found for device ${device} after connection attempt`);
            }

            if (!updatedKeyring.setHdPath) {
                throw new Error(
                    `Device ${device} does not support HD path configuration`
                );
            }

            // Set the HD path on the keyring
            updatedKeyring.setHdPath(hdPath);
            log.debug(`HD path set successfully for ${device}`);

            if (device !== Devices.KEYSTONE) {
                if (!updatedKeyring.isUnlocked()) {
                    log.debug(`Unlocking keyring for ${device}`);
                    await updatedKeyring.unlock();
                }
            }

            // Update connection status for Ledger after successful HD path setting
            if (device === Devices.LEDGER && chrome.storage?.session) {
                try {
                    await chrome.storage.session.set({
                        'ledger_connection_status': {
                            connected: true,
                            timestamp: Date.now()
                        }
                    });
                    log.debug("Updated Ledger connection status after HD path setting");
                } catch (e) {
                    log.warn("Failed to update Ledger connection status:", e);
                }
            }

            // Persist the hardware wallet state after setting HD path
            await this.persistHardwareKeyringState(device);
        } catch (error) {
            log.error(`Failed to set HD path for ${device}:`, error);
            throw error;
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

        if (transportType !== 'webhid' && transportType !== 'webusb') {
            throw new Error(`Invalid transport type: ${transportType}`);
        }

        // Store the transport type in memory state
        this.memStore.updateState({ ledgerTransportType: transportType });

        try {
            // Also store in persistent state if we have chrome storage
            if (chrome.storage && chrome.storage.local) {
                await chrome.storage.local.set({ ledgerTransportType: transportType });
                log.debug(`Stored Ledger transport type: ${transportType}`);
            }
        } catch (e) {
            log.warn(`Could not store Ledger transport type: ${e.message}`);
        }

        // Try to update any existing Ledger keyring with the new transport
        try {
            const ledgerKeyring = await this.getKeyringFromDevice(Devices.LEDGER);
            if (ledgerKeyring) {
                // Use type assertion instead of ts-ignore
                const keyringWithTransport = ledgerKeyring as unknown as {
                    _setTransportType?: (type: string) => Promise<void>
                };

                if (keyringWithTransport._setTransportType) {
                    await keyringWithTransport._setTransportType(transportType);
                    log.debug(`Updated existing Ledger keyring with transport type: ${transportType}`);
                }
            }
        } catch (e) {
            log.warn(`Could not update existing Ledger keyring transport: ${e.message}`);
        }
    }

    /**
     * connectHardwareKeyring
     *
     * Connects to a hardware wallet by either finding an existing keyring or
     * creating a new keyring if one doesn't exist. Handles device-specific
     * configuration such as Ledger transport method and Trezor timing.
     *
     * @param {Devices} device - The hardware wallet device type to connect
     * @returns {Promise<boolean>} True if the connection was successful
     * @throws {Error} If connection fails or device type is invalid
     */
    public async connectHardwareKeyring(
        device: Devices
    ): Promise<boolean | { needsUserGesture: boolean; deviceName: string }> {
        // Add debugging to track the execution flow
        log.debug(`Connecting to ${device} hardware wallet...`);

        return this._mutex.runExclusive(async () => {
            if (device === Devices.LEDGER) {
                try {
                    log.debug("Initializing Ledger keyring connection...");

                    // First, try to set the Ledger transport type
                    try {
                        await this.setLedgerTransportType('webhid');
                    } catch (e) {
                        log.warn("Failed to set Ledger transport type:", e);
                        // Continue anyway
                    }

                    // Check if we're in an environment without DOM access
                    if (!hasDomAccess()) {
                        log.debug("No DOM access available (likely MV3 service worker). Using alternative connection method.");

                        // Check if we have a keyring already - if so, try to work with it
                        const existingKeyrings = this.getKeyringsByType(
                            this._getKeyringTypeFromDevice(device)
                        );

                        if (existingKeyrings && existingKeyrings.length > 0) {
                            log.debug("Found existing Ledger keyrings in service worker context, trying to use them");
                            try {
                                // Try to unlock the existing keyring
                                await existingKeyrings[0].unlock();

                                // Check if it has accounts
                                const accounts = await existingKeyrings[0].getAccounts();
                                if (accounts && accounts.length > 0) {
                                    log.debug(`Found ${accounts.length} accounts in existing Ledger keyring`);
                                    // Persist the state again
                                    await this.persistHardwareKeyringState(device);
                                    return true;
                                }
                            } catch (e) {
                                // Check if this is specifically about user interaction
                                if (e instanceof Error &&
                                    (e.message.includes('user interaction') ||
                                        e.message.includes('user gesture'))) {
                                    log.info("Ledger connection requires user interaction via WebHID");

                                    // Store this state in session storage for UI to detect
                                    try {
                                        if (chrome.storage?.session) {
                                            await chrome.storage.session.set({
                                                'ledger_needs_user_interaction': {
                                                    timestamp: Date.now(),
                                                    status: 'pending',
                                                    requiresWebHID: true
                                                }
                                            });
                                            log.debug("Stored user interaction requirement in session storage");
                                        }
                                    } catch (storageErr) {
                                        log.warn("Failed to store Ledger interaction state:", storageErr);
                                    }

                                    // Return specific object indicating user gesture needed
                                    return {
                                        needsUserGesture: true,
                                        deviceName: 'Ledger'
                                    };
                                }

                                log.warn("Failed to use existing Ledger keyring:", e);
                                // Continue to signal user gesture needed
                            }
                        }

                        // If still here, we need to indicate that user gesture is needed
                        log.debug("Ledger connection requires user interaction");
                        return {
                            needsUserGesture: true,
                            deviceName: 'Ledger'
                        };
                    }

                    // We're in an environment with DOM access, so we can try to connect directly
                    try {
                        log.debug("Attempting to add new Ledger keyring in DOM context");

                        // Even in a DOM context, we want to warn about needing WebHID permission
                        log.info("Ledger connection requires WebHID permission from the user");
                        return {
                            needsUserGesture: true,
                            deviceName: 'Ledger'
                        };

                    } catch (e) {
                        log.error("Failed to add Ledger keyring:", e);

                        // Check if this was due to needing user interaction
                        if (e instanceof Error &&
                            (e.message.includes('user interaction') ||
                                e.message.includes('user gesture'))) {
                            log.debug("Ledger connection requires WebHID permission");
                            return {
                                needsUserGesture: true,
                                deviceName: 'Ledger'
                            };
                        }

                        throw e;
                    }
                } catch (error) {
                    log.error("Ledger connection error:", error);
                    throw error;
                }
            } else if (device === Devices.TREZOR) {
                try {
                    // Get existing keyrings
                    const existingKeyrings = this.getKeyringsByType(
                        this._getKeyringTypeFromDevice(device)
                    );

                    // If we already have a keyring, just unlock it
                    if (existingKeyrings && existingKeyrings.length > 0) {
                        try {
                            await existingKeyrings[0].unlock();
                            return true;
                        } catch (e) {
                            log.error("Failed to unlock existing Trezor keyring:", e);
                        }
                    }

                    // We don't have an existing keyring, so let's try to create one
                    log.debug("Adding new Trezor keyring...");
                    await this.addNewKeyring('Trezor Hardware', {});
                    return true;
                } catch (error) {
                    log.error("Trezor connection error:", error);
                    throw error;
                }
            } else if (device === Devices.KEYSTONE) {
                try {
                    // Get existing keyrings
                    const existingKeyrings = this.getKeyringsByType(
                        this._getKeyringTypeFromDevice(device)
                    );

                    // If we already have a keyring, just unlock it
                    if (existingKeyrings && existingKeyrings.length > 0) {
                        try {
                            await existingKeyrings[0].unlock();
                            return true;
                        } catch (e) {
                            log.error("Failed to unlock existing Keystone keyring:", e);
                        }
                    }

                    // We don't have an existing keyring, so let's try to create one
                    log.debug("Adding new Keystone keyring...");
                    await this.addNewKeyring('QR Hardware', {});
                    return true;
                } catch (error) {
                    log.error("Keystone connection error:", error);
                    throw error;
                }
            } else {
                throw new Error(`Unsupported device: ${device}`);
            }
        });
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
                log.debug("No DOM access for Ledger connection completion, using direct navigation workaround");

                // Store minimal connection state
                try {
                    if (chrome.storage && chrome.storage.session) {
                        await chrome.storage.session.set({
                            'ledger_connection_status': {
                                connected: true,
                                timestamp: Date.now()
                            }
                        });
                        log.debug("Stored Ledger connection status in session storage");
                    }
                } catch (e) {
                    log.error("Failed to store Ledger connection status:", e);
                }

                // Force navigate directly to the accounts page instead of trying to initialize the keyring here
                // This bypasses the DOM access issue entirely
                try {
                    await forceNavigateTab('/tab.html#/hardware-wallet/accounts', { vendor: device });
                    log.debug("Forced navigation to accounts page");
                    return true;
                } catch (e) {
                    log.error("Failed to navigate to accounts page:", e);
                    throw e;
                }
            }

            // For other devices or when DOM is available, proceed with normal initialization
            const keyringType = this._getKeyringTypeFromDevice(device);
            const hdPath = this._HDPathForDevice(device);

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

            // Try to connect and unlock
            if (newKeyring.connect) {
                try {
                    await newKeyring.connect();
                    log.debug(`${device} connected`);
                } catch (e) {
                    log.error(`Failed to connect to ${device}:`, e);
                    throw e;
                }
            }

            try {
                await newKeyring.unlock();
                log.debug(`${device} unlocked`);
            } catch (e) {
                log.error(`Failed to unlock ${device}:`, e);
                throw e;
            }

            // After hardware connection completion, persist the state
            await this.persistHardwareKeyringState(device);
            log.debug(`${device} hardware wallet connection completed`);
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
    ): Promise<[]> {
        try {
            log.debug(`Getting page ${pageIndex} for ${device}`);

            if (device === Devices.LEDGER) {
                try {
                    // Check if the Ledger is still connected
                    log.debug(`Checking if Ledger is still connected...`);
                    const isConnected = keyring.isConnected && await keyring.isConnected();

                    if (!isConnected) {
                        log.warn('Ledger is not connected. Attempting to reconnect...');

                        // Try to reconnect
                        try {
                            await keyring.connect();
                            log.debug('Ledger reconnected successfully');
                        } catch (e) {
                            log.error('Failed to reconnect to Ledger:', e);
                            throw new Error('Ledger disconnected. Please reconnect your device.');
                        }
                    } else {
                        log.debug('Ledger is still connected');
                    }

                    // Check if the Ethereum app is open
                    try {
                        log.debug('Getting Ledger app info...');
                        const appInfo = keyring.eth && await keyring.eth.getAppConfiguration();
                        log.debug('Ledger app info:', appInfo);
                    } catch (e) {
                        log.error('Failed to get Ledger app info:', e);
                        if (e.message && (
                            e.message.includes('Ledger device: UNKNOWN_ERROR') ||
                            e.message.includes('Timeout') ||
                            e.message.includes('0x6511')
                        )) {
                            throw new Error('Ethereum app not open on Ledger. Please open it and try again.');
                        }
                    }
                } catch (e) {
                    log.error('Error with Ledger connection check:', e);
                }
            }

            // For all devices, try to get the page
            try {
                log.debug(`Calling keyring.getAccounts(${pageIndex})...`);
                const page = await keyring.getAccounts(pageIndex);
                log.debug(`Got ${page?.length || 0} accounts from ${device}`);
                return page;
            } catch (e) {
                log.error(`Error getting accounts for ${device}:`, e);

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