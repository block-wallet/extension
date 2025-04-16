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
// Add import at the top with other imports 
import {
    ledgerConnectionManager,
    LedgerConnectionState,
} from '../utils/LedgerConnectionManager';
import { HardwareWalletHandlerFactory } from '../utils/hardware/HardwareWalletHandlerFactory';
import { hasDomAccess } from '../utils/environment';
// NEW: Use require for SimpleHDKeyring due to missing types
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SimpleHDKeyring = require('@metamask/eth-hd-keyring');
// NEW: Import communication types for the response
import { DiscoveredAccountInfo, ResponseDiscoverAccountsFromSeed } from '../utils/types/communication';

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
const hasDOMAccess = (): boolean => {
    return hasDomAccess();
};

/**
 * Helper function to create a promise that rejects after a timeout
 * @param ms Timeout in milliseconds
 * @param message Error message to use when rejecting
 * @returns A promise that rejects after the specified timeout
 */
function promiseTimeout<T>(ms: number, message: string): Promise<T> {
    return new Promise<T>((_, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(`Operation timed out: ${message}`));
        }, ms);

        // Ensure the timeout is cleared if the promise is garbage collected
        if (timeoutId && typeof timeoutId === 'object') {
            (timeoutId as any).unref?.();
        }
    });
}

/**
 * Run a promise with a timeout
 * @param promise The promise to execute
 * @param timeoutMs Timeout in milliseconds
 * @param timeoutMessage Error message to use when timing out
 * @returns The result of the promise or throws if timeout occurs
 */
async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
): Promise<T> {
    return Promise.race([
        promise,
        promiseTimeout<T>(timeoutMs, timeoutMessage)
    ]);
}

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
    // Add HD path cache to improve performance
    private _hdPathCache: Map<Devices, string> = new Map();

    // Store active operation timeouts for cleanup
    private _activeTimeouts: Set<NodeJS.Timeout> = new Set();

    /**
     * The default hdPath to use for new hardware wallets
     */
    private readonly DEFAULT_BIP44_HD_PATH = "m/44'/60'/0'/0"; // Standard path prefix

    /**
     * Name of the controller for logging purposes
     */
    controllerName = 'KeyringControllerDerivated';

    // Track the last updated timestamp to prevent redundant updates
    private static lastUpdateTime: Record<string, number> = {};

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
     * Cleanup resources when the controller is no longer needed
     * Should be called when the controller is being removed or on extension shutdown
     */
    public cleanup(): void {
        // Clear any active timeouts to prevent memory leaks
        this._clearAllTimeouts();

        // Clear restore promise reference
        this.restorePromise = null;

        // Clear the HD path cache
        this._hdPathCache.clear();

        // Clear the last update timestamp cache
        KeyringControllerDerivated.lastUpdateTime = {};

        // Clean up hardware wallet handlers
        HardwareWalletHandlerFactory.cleanup();

        // Clean up Ledger connection manager
        ledgerConnectionManager.cleanup();

        // Clear any in-memory session storage items if possible
        if (chrome.storage?.session) {
            try {
                chrome.storage.session.remove([
                    'ledger_connection_status',
                    'ledger_eth_app_status',
                    'ledger_hd_path',
                    'trezor_connection_status'
                ]).catch(e => log.debug('Error cleaning up session storage:', e));
            } catch (e) {
                log.debug('Error during session storage cleanup:', e);
            }
        }

        log.debug('KeyringControllerDerivated cleaned up');
    }

    /**
     * Set a timeout and track it for cleanup
     * @param callback The function to call when the timeout expires
     * @param delay The delay in milliseconds
     * @returns The timeout ID
     */
    private _setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
        const timeoutId = setTimeout(() => {
            this._activeTimeouts.delete(timeoutId);
            callback();
        }, delay);

        this._activeTimeouts.add(timeoutId);
        return timeoutId;
    }

    /**
     * Clear a specific timeout and remove it from tracking
     * @param timeoutId The timeout ID to clear
     */
    private _clearTimeout(timeoutId: NodeJS.Timeout): void {
        clearTimeout(timeoutId);
        this._activeTimeouts.delete(timeoutId);
    }

    /**
     * Clear all active timeouts
     */
    private _clearAllTimeouts(): void {
        for (const timeoutId of this._activeTimeouts) {
            clearTimeout(timeoutId);
        }
        this._activeTimeouts.clear();
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
     * Clears the restore promise and sets restore completion status
     * Should be called after hardware wallet restore operations complete
     * @param status Whether the restore was successful
     */
    private _clearRestorePromise(status: boolean): void {
        this.restorePromise = null;
        this.restoreCompleted = status;

        log.debug(`Hardware wallet restore operation completed with status: ${status}`);
    }

    /**
     * Runs a hardware wallet operation with timeout
     * @param operation The operation function to run
     * @param timeoutMs Timeout in milliseconds
     * @param deviceName The device name for error messages
     * @param operationName The operation name for error messages
     * @returns The result of the operation
     */
    private async _runWithTimeout<T>(
        operation: () => Promise<T>,
        timeoutMs: number,
        deviceName: string,
        operationName: string
    ): Promise<T> {
        const timeoutMessage = `${operationName} operation for ${deviceName} timed out after ${timeoutMs}ms`;

        try {
            return await withTimeout(operation(), timeoutMs, timeoutMessage);
        } catch (error) {
            log.error(`Hardware wallet operation failed: ${error.message}`);

            // Clean up any device-specific resources on timeout
            if (error.message.includes('timed out')) {
                await this._cleanupAbandonedConnection(deviceName as Devices);
            }

            throw error;
        }
    }

    /**
     * Cleans up resources for an abandoned hardware wallet connection
     * @param device The device to clean up
     */
    private async _cleanupAbandonedConnection(device: Devices): Promise<void> {
        log.debug(`Cleaning up abandoned connection for device: ${device}`);

        try {
            // For Ledger devices, try to close the connection
            if (device === Devices.LEDGER) {
                try {
                    // Try to close the offscreen document
                    await ledgerBridge.closeOffscreenDocument();
                } catch (e) {
                    log.debug(`Error closing offscreen document: ${e.message}`);
                }

                // Clear any stored connection status
                if (chrome.storage?.session) {
                    await chrome.storage.session.remove('ledger_connection_status');
                }
            }

            // Remove any tracking for this device
            if (chrome.storage?.session) {
                await chrome.storage.session.remove(`${device.toLowerCase()}_needs_user_interaction`);
            }

            log.debug(`Abandoned connection cleanup completed for ${device}`);
        } catch (error) {
            log.warn(`Error during abandoned connection cleanup for ${device}: ${error.message}`);
        }
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
        try {
            log.debug('Creating new vault and keychain');

            // Use runExclusive for cleaner mutex handling
            const vault = await this._mutex.runExclusive(async () => {
                let vault;
                const currentAccounts = await super.getAccounts();
                if (currentAccounts.length > 0) {
                    log.debug('Accounts already exist, performing full update');
                    vault = super.fullUpdate();
                } else {
                    log.debug('No accounts found, creating new vault and keychain');
                    vault = await super.createNewVaultAndKeychain(password);
                }
                return vault;
            });

            // Verify keyring outside of the mutex lock
            await this.verifyAccounts();
            log.debug('Vault creation successful, accounts verified');

            return vault;
        } catch (error) {
            log.error('Failed to create new vault and keychain:', error);
            throw error;
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
        try {
            log.debug('Creating new vault and restoring from seed');

            if (!seed || seed.trim() === '') {
                throw new Error('Seed phrase cannot be empty');
            }

            // Use runExclusive for cleaner mutex handling
            const vault = await this._mutex.runExclusive(async () => {
                return await super.createNewVaultAndRestore(password, seed);
            });

            // Verify keyring outside of the mutex lock
            await this.verifyAccounts();
            log.debug('Vault restoration successful, accounts verified');

            return vault;
        } catch (error) {
            log.error('Failed to create new vault and restore:', error);
            throw error;
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
        // Get primary keyring outside of mutex lock
        const primaryKeyring = super.getKeyringsByType(
            KeyringTypes.HD_KEY_TREE
        )[0];
        if (!primaryKeyring) {
            throw new Error(`No ${KeyringTypes.HD_KEY_TREE} found`);
        }

        let newAccount: string;

        // Now acquire mutex only for the account creation part
        await this._mutex.runExclusive(async () => {
            log.debug('Creating new account');

            // Add new account to the primary keyring
            await super.addNewAccount(primaryKeyring);

            // Recover the current accounts
            const accounts = await primaryKeyring.getAccounts();
            newAccount = accounts[accounts.length - 1];

            log.debug(`New account created successfully: ${newAccount}`);
        });

        // Verification happens after account creation and outside the mutex
        await this.verifyAccounts();

        return newAccount!;
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
     * Now uses hardware wallet handlers for consistency
     *
     * @param {Devices} device - The hardware wallet device type
     * @returns {string} The default HD derivation path for the device
     * @private
     */
    private _HDPathForDevice(device: Devices): string {
        try {
            const handler = HardwareWalletHandlerFactory.getHandler(device, this);
            return handler.getDefaultHDPath();
        } catch (e) {
            // Fallback to old implementation if handler creation fails
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
    }

    /**
     * Set the HD path for a hardware device
     * Delegates to the appropriate hardware wallet handler
     *
     * @param device - The hardware device type
     * @param hdPath - The HD path to set
     */
    public async setHDPath(device: Devices, hdPath: string): Promise<void> {
        log.debug(`Delegating HD path setting for ${device} to handler`);

        // Input validation
        if (!device) {
            throw new Error('Device is required');
        }
        if (!hdPath) {
            throw new Error('HD path is required');
        }

        // Use the hardware wallet handler to set the HD path
        const handler = HardwareWalletHandlerFactory.getHandler(device, this);
        await handler.setHDPath(hdPath);
    }

    /**
     * Retrieves the configured HD path for a hardware wallet device
     * Delegates to the appropriate hardware wallet handler
     *
     * @param {Devices} device - The hardware wallet device type
     * @returns {Promise<string>} The current HD path for the device
     * @throws {Error} If the device type is invalid
     */
    public async getHDPathForDevice(device: Devices): Promise<string> {
        try {
            log.debug(`Delegating HD path retrieval for ${device} to handler`);

            if (!device) {
                throw new Error('Device type must be specified');
            }

            // Use the hardware wallet handler to get the HD path
            const handler = HardwareWalletHandlerFactory.getHandler(device, this);
            return await handler.getHDPath();
        } catch (error) {
            log.error(`Failed to get HD path for ${device}:`, error);
            throw error;
        }
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
     * Uses the hardware wallet handler for cleanup
     * 
     * @param device The hardware wallet device type
     * @returns Promise resolving when the keyring is removed
     */
    public async removeDeviceKeyring(device: Devices): Promise<void> {
        log.debug(`Removing keyring for device ${device}`);
        try {
            // If we have a handler, use it for cleanup first
            if (HardwareWalletHandlerFactory.hasHandler(device)) {
                const handler = HardwareWalletHandlerFactory.getHandler(device, this);
                await handler.cleanup();
                HardwareWalletHandlerFactory.removeHandler(device);
            }

            // Now remove the keyring
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
        // Only create one restore promise at a time
        if (this.restorePromise) {
            log.debug("Returning existing hardware wallet restore promise");
            return this.restorePromise;
        }

        // Define timeout for hardware wallet restoration
        const RESTORE_TIMEOUT = 30000; // 30 seconds

        try {
            // Extract device and state from parameters
            const device = typeof paramsOrDevice === 'object' && 'device' in paramsOrDevice
                ? paramsOrDevice.device
                : paramsOrDevice as Devices;

            const state = typeof paramsOrDevice === 'object' && 'device' in paramsOrDevice
                ? paramsOrDevice.state
                : {};

            log.debug(`Starting hardware wallet restore for ${device}`);

            // Create and store the restore promise
            this.restorePromise = this._runWithTimeout(
                () => this.restoreHardwareWalletState({ device, state }),
                RESTORE_TIMEOUT,
                device,
                'restoreHardwareWallet'
            );

            // Get the result and clear the promise
            const result = await this.restorePromise;

            // Mark restore as completed and clear the promise
            this._clearRestorePromise(true);

            return result;
        } catch (error) {
            // Clear the promise on error and mark as not completed
            this._clearRestorePromise(false);

            log.error("Error restoring hardware wallet:", error);
            throw error;
        }
    }

    /**
     * Gets the stored HD path for a device, either from cache or storage
     * @param device - The hardware wallet device type
     * @returns The cached or stored HD path, or the default path if none found
     */
    private async _getStoredHDPath(device: Devices): Promise<string> {
        // Check cache first
        if (this._hdPathCache.has(device)) {
            return this._hdPathCache.get(device)!;
        }

        let hdPath: string | undefined;

        // Try session storage first for more recent values
        if (chrome.storage?.session) {
            try {
                const result = await chrome.storage.session.get('ledger_hd_path');
                if (result.ledger_hd_path && result.ledger_hd_path.path) {
                    hdPath = result.ledger_hd_path.path;
                    log.debug(`Retrieved HD path from session storage: ${hdPath}`);
                }
            } catch (e) {
                log.warn(`Failed to read HD path from session storage:`, e);
            }
        }

        // If not in session storage, try local storage
        if (!hdPath && chrome.storage?.local) {
            try {
                const result = await chrome.storage.local.get('ledger_hd_paths');
                if (result.ledger_hd_paths && result.ledger_hd_paths[device]) {
                    hdPath = result.ledger_hd_paths[device];
                    log.debug(`Retrieved HD path from local storage: ${hdPath}`);
                }
            } catch (e) {
                log.warn(`Failed to read HD path from local storage:`, e);
            }
        }

        // If still not found, use default
        if (!hdPath) {
            hdPath = this._HDPathForDevice(device);
            log.debug(`Using default HD path: ${hdPath}`);
        }

        // Cache the result
        this._hdPathCache.set(device, hdPath);
        return hdPath;
    }

    /**
     * Updates the HD path in cache and storage
     * @param device - The hardware wallet device type
     * @param hdPath - The HD path to store
     * @returns Promise resolving when storage operations complete
     */
    private async _updateStoredHDPath(device: Devices, hdPath: string): Promise<void> {
        // Update cache first
        this._hdPathCache.set(device, hdPath);

        // Prepare batch storage operations
        const operations: Array<{
            key: string;
            value: any;
            logSuccess?: string;
            logError?: string;
        }> = [];

        // Add HD path for session storage (temporary)
        operations.push({
            key: 'ledger_hd_path',
            value: {
                path: hdPath,
                timestamp: Date.now(),
                device: device
            },
            logSuccess: `Stored HD path ${hdPath} in session storage`,
            logError: `Failed to store HD path in session storage`
        });

        // Add HD path for persistent storage
        const devicePaths: Record<string, string> = {};
        devicePaths[device] = hdPath;

        operations.push({
            key: 'ledger_hd_paths',
            value: devicePaths,
            logSuccess: `Updated device HD paths in storage`,
            logError: `Failed to update device HD paths in storage`
        });

        // Execute all storage operations
        await this._batchStorageOperations(operations);
    }

    /**
     * Efficiently performs multiple storage operations in a batch for better performance
     * Handles errors gracefully for each operation
     * 
     * @param operations Array of storage operations to perform
     * @param storageType The type of storage to use ('local', 'session', or 'both')
     * @returns Promise that resolves when all operations complete (successfully or not)
     */
    private async _batchStorageOperations(
        operations: Array<{
            key: string;
            value: any;
            logSuccess?: string;
            logError?: string;
        }>,
        storageType: 'local' | 'session' | 'both' = 'both'
    ): Promise<void> {
        if (operations.length === 0) return;

        const storagePromises: Promise<void>[] = [];

        // Process session storage operations
        if ((storageType === 'session' || storageType === 'both') && chrome.storage?.session) {
            // Group operations for session storage for efficiency
            const sessionBatch: Record<string, any> = {};
            operations.forEach(op => {
                sessionBatch[op.key] = op.value;
            });

            const sessionPromise = chrome.storage.session.set(sessionBatch)
                .then(() => {
                    log.debug(`Successfully stored ${Object.keys(sessionBatch).length} items in session storage`);
                })
                .catch(error => {
                    log.error(`Failed batch session storage operation:`, error);
                    // Don't throw so other operations can continue
                });

            storagePromises.push(sessionPromise);
        }

        // Process local storage operations
        if ((storageType === 'local' || storageType === 'both') && chrome.storage?.local) {
            // Group operations for local storage for efficiency
            const localBatch: Record<string, any> = {};
            operations.forEach(op => {
                localBatch[op.key] = op.value;
            });

            const localPromise = chrome.storage.local.set(localBatch)
                .then(() => {
                    log.debug(`Successfully stored ${Object.keys(localBatch).length} items in local storage`);
                })
                .catch(error => {
                    log.error(`Failed batch local storage operation:`, error);
                    // Don't throw so other operations can continue
                });

            storagePromises.push(localPromise);
        }

        // Wait for all promises to settle
        if (storagePromises.length > 0) {
            await Promise.allSettled(storagePromises);
        }
    }

    /**
     * connectHardwareKeyring
     *
     * Connects to a hardware wallet device
     * For Ledger, this uses the new connection state manager
     * Now delegates to hardware wallet handlers
     *
     * @param device - The hardware wallet device type
     * @returns Promise resolving to true if connection succeeded, or an object indicating user gesture is needed
     */
    public async connectHardwareKeyring(
        device: Devices
    ): Promise<boolean | { needsUserGesture: boolean; deviceName: string; needsEthereumApp?: boolean; message?: string }> {
        try {
            log.debug(`Connecting hardware wallet keyring for device: ${device}`);

            // Use the hardware wallet handler to perform the connection
            const handler = HardwareWalletHandlerFactory.getHandler(device, this);
            return await handler.connect();
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

                // Clean up any abandoned connections on error
                await this._cleanupAbandonedConnection(device);
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
     * Now delegates to hardware wallet handlers
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

            // Use the hardware wallet handler to complete the connection
            const handler = HardwareWalletHandlerFactory.getHandler(device, this);
            return await handler.completeConnection();
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
     * Now delegates to hardware wallet handlers
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
                log.debug(`Delegating hardware wallet account import to ${device} handler`);

                // Use the hardware wallet handler to import accounts
                const handler = HardwareWalletHandlerFactory.getHandler(device, this);
                return await handler.importAccounts(accountIndexes);
            } catch (error) {
                // Clean up resources on error
                await this._cleanupAbandonedConnection(device);

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
     * Cache used to prevent redundant update calls
     * @param device The hardware wallet device type
     * @returns A promise that resolves when the state is persisted
     */
    private async persistHardwareKeyringState(device: Devices): Promise<void> {
        const now = Date.now();
        const deviceKey = device.toString();

        // Only update if it's been at least 500ms since the last update for this device
        // This prevents excessive updates during rapid operations
        if (KeyringControllerDerivated.lastUpdateTime[deviceKey] &&
            now - KeyringControllerDerivated.lastUpdateTime[deviceKey] < 500) {
            log.debug(`Skipping redundant state persistence for ${device}, last update was ${now - KeyringControllerDerivated.lastUpdateTime[deviceKey]}ms ago`);
            return;
        }

        try {
            log.debug(`Persisting keyring state for ${device}`);
            // Update the timestamp before doing the work
            KeyringControllerDerivated.lastUpdateTime[deviceKey] = now;

            // Get the latest state from the controller
            await this.fullUpdate();
        } catch (error) {
            log.error(`Error persisting keyring state for ${device}:`, error);
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

            // Also store in persistent state using chrome.storage.local
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

    // NEW: Method to get accounts from a seed phrase without saving the keyring
    public async getAccountsFromSeed(
        seedPhrase: string,
        password: string, // Password might be needed if seed is encrypted, or for future BIP39 passphrase use
        accountsToDiscover = 10 // Remove redundant type annotation
    ): Promise<ResponseDiscoverAccountsFromSeed> {
        log.debug(`Attempting to derive ${accountsToDiscover} accounts from provided seed`);

        if (!seedPhrase || seedPhrase.trim() === '') {
            log.error('getAccountsFromSeed: Seed phrase cannot be empty');
            throw new Error('Seed phrase cannot be empty');
        }

        // Note: The password isn't strictly needed for *derivation* from a standard mnemonic
        // unless it's used as a BIP39 passphrase, which SimpleHDKeyring doesn't directly support
        // in its constructor AFAIK. We keep it for potential future use or if underlying mechanisms change.
        // We *could* use the password to *verify* it against the *current* vault if unlocked,
        // as a security measure before proceeding, but the request implies we are in an import flow
        // where the vault might not exist or be locked with a different password.

        try {
            // Create a temporary, in-memory keyring instance
            const temporaryKeyring = new SimpleHDKeyring();
            // Initialize it with the provided mnemonic
            await temporaryKeyring.deserialize({
                mnemonic: seedPhrase,
                numberOfAccounts: accountsToDiscover, // Ensure we ask for enough
                hdPath: this.DEFAULT_BIP44_HD_PATH, // Use the standard path prefix
            });

            // Retrieve the derived accounts
            const accounts = await temporaryKeyring.getAccounts();

            if (accounts.length === 0) {
                log.warn('getAccountsFromSeed: No accounts derived from the seed phrase.');
                // This shouldn't happen with a valid mnemonic unless accountsToDiscover is 0
                return [];
            }

            // Format the result
            const discoveredAccounts: DiscoveredAccountInfo[] = accounts.map(
                (address: string, index: number) => ({
                    address: address.toLowerCase(), // Ensure consistent casing
                    index: index, // The index within the derived batch (0 to accountsToDiscover-1)
                })
            );

            log.debug(`Successfully derived ${discoveredAccounts.length} accounts from seed`);
            return discoveredAccounts;

        } catch (error) {
            log.error('getAccountsFromSeed: Error during temporary keyring creation or derivation:', error);
            // Check for specific errors if SimpleHDKeyring throws them
            if (error instanceof Error && error.message.toLowerCase().includes('invalid mnemonic')) {
                throw new Error('Invalid mnemonic provided.');
            }
            // Re-throw a generic error
            throw new Error('Failed to derive accounts from seed phrase.');
        }
        // Note: temporaryKeyring instance goes out of scope and is garbage collected,
        // it is never added to the main controller's keyrings array.
    }
}