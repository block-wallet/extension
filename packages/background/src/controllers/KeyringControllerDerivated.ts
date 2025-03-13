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
import { isManifestV3 } from '../utils/manifest';

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
 * KeyringControllerDerivated
 * 
 * This class extends the base KeyringController to provide additional functionality
 * for managing keyrings, hardware wallets, and cryptographic operations.
 * It includes enhanced error handling, detailed logging, and robust keyring management.
 */
export default class KeyringControllerDerivated extends KeyringController {
    private readonly _mutex: Mutex;
    // private readonly _qrHardwareKeyring: QRHardwareKeyring;

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
            log.warn(`No HD paths defined for device ${device}, using BIP44 path as fallback`);
            return BIP44_PATH;
        }

        const defaultPath = hdPaths.find((data) => data.default)?.path;
        if (!defaultPath) {
            log.warn(`No default HD path found for device ${device}, using BIP44 path as fallback`);
            return BIP44_PATH;
        }

        return defaultPath;
    }

    /**
     * Sets the HD derivation path for a hardware wallet keyring
     *
     * Configures the specified hardware wallet to use a particular HD path
     * for deriving addresses. Validates that the path is recognized for the device.
     *
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

            const keyring = await this.getKeyringFromDevice(device);
            if (!keyring) {
                throw new Error(`No keyring found for device ${device}`);
            }

            if (!keyring.setHdPath) {
                throw new Error(`Device ${device} does not support HD path configuration`);
            }

            const hdPaths = HDPaths[device];
            if (!hdPaths) {
                throw new Error(`No HD paths defined for device ${device}`);
            }

            if (hdPaths.findIndex((data) => data.path === hdPath) === -1) {
                throw new Error(
                    `The provided HD path "${hdPath}" is not recognized as a valid path for ${device}`
                );
            }

            keyring.setHdPath(hdPath);
            log.debug(`HD path set successfully for ${device}`);

            if (device !== Devices.KEYSTONE) {
                if (!keyring.isUnlocked()) {
                    log.debug(`Unlocking keyring for ${device}`);
                    await keyring.unlock();
                }
            }
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
            const hdPath = keyring && keyring.hdPath !== ''
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
     * Connects to a hardware wallet device
     *
     * Establishes a connection to the specified hardware wallet type,
     * creating a new keyring if one doesn't exist. Handles device-specific
     * configuration such as Ledger transport method and Trezor timing.
     *
     * @param {Devices} device - The hardware wallet device type to connect
     * @returns {Promise<boolean>} True if the connection was successful
     * @throws {Error} If connection fails or device type is invalid
     */
    public async connectHardwareKeyring(device: Devices): Promise<boolean> {
        try {
            log.debug(`Connecting to hardware keyring for ${device}`);

            if (!device) {
                throw new Error('Device type must be specified');
            }

            const keyringType = this._getKeyringTypeFromDevice(device);
            let keyring = await this.getKeyringFromDevice(device);

            // If the keyring doesn't exist, create it
            if (!keyring) {
                log.debug(`No existing keyring found for ${device}, creating new keyring`);

                if (device === Devices.KEYSTONE) {
                    keyring = await this.addNewKeyring(keyringType);
                } else {
                    const hdPath = this._HDPathForDevice(device);
                    log.debug(`Using HD path ${hdPath} for new ${device} keyring`);

                    keyring = await this.addNewKeyring(keyringType, {
                        hdPath: hdPath,
                    });
                }

                // Prevents manifest error, research if we can avoid this
                if (device === Devices.TREZOR) {
                    log.debug('Trezor device detected, adding delay for proper initialization');
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                }
            } else {
                log.debug(`Using existing keyring for ${device}`);
            }

            if (device === Devices.LEDGER) {
                log.debug('Ledger device detected, setting transport method to webhid');
                // If it is a Ledger device, we set the transport method to 'webhid' by default.
                // This requires HID API (not supported directly from the extension) which requests for device connection.
                await keyring.updateTransportMethod('webhid');
            }

            // Unlock the keyring. If it's already unlocked it will resolve.
            // For Trezor devices, we force the unlock to prevent displaying
            // old accounts or accounts from a different device
            if (keyring.unlock) {
                log.debug(`Unlocking keyring for ${device}`);
                await keyring.unlock(device === Devices.TREZOR);
            }

            // Return whether we connected and unlocked the keyring successfully
            let connected = false;
            if (device === Devices.KEYSTONE) {
                connected = keyring.initialized;
                log.debug(`Keystone keyring initialized: ${connected}`);
            } else {
                connected = keyring.isUnlocked();
                log.debug(`Keyring unlocked successfully: ${connected}`);
            }

            if (!connected) {
                log.warn(`Failed to complete connection to ${device} hardware wallet`);
            } else {
                log.debug(`Successfully connected to hardware keyring for ${device}`);
            }

            return connected;
        } catch (error) {
            log.error(`Failed to connect hardware keyring for ${device}:`, error);
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
                log.debug(`Importing hardware wallet accounts for ${device} at indexes: ${accountIndexes.join(', ')}`);

                if (!device) {
                    throw new Error('Device type must be specified');
                }

                if (!accountIndexes || accountIndexes.length === 0) {
                    throw new Error('At least one account index must be specified');
                }

                // Validate all indexes are non-negative
                if (accountIndexes.some(index => index < 0)) {
                    throw new Error('Account indexes must be non-negative values');
                }

                const keyring = await this.getKeyringFromDevice(device);
                if (!keyring) {
                    throw new Error(`No keyring found for device ${device}. Make sure the device is connected.`);
                }

                if (!keyring.isUnlocked && !keyring.isUnlocked()) {
                    log.debug(`Keyring for ${device} is locked, attempting to unlock`);
                    if (keyring.unlock) {
                        await keyring.unlock();
                    } else {
                        throw new Error(`Unable to unlock keyring for ${device}`);
                    }
                }

                // Iterate over the list of added indexes and add each
                // selected account to the keyring
                const originalAccounts = await keyring.getAccounts();
                log.debug(`Original accounts before import: ${originalAccounts.length}`);

                for (const index of accountIndexes) {
                    log.debug(`Importing account at index ${index} from ${device}`);
                    try {
                        keyring.setAccountToUnlock(index);
                        await super.addNewAccount(keyring);
                    } catch (error) {
                        log.error(`Failed to import account at index ${index} from ${device}:`, error);
                        throw new Error(`Failed to import account at index ${index}: ${error.message}`);
                    }
                }

                // Return the list of all new added accounts
                const finalAccounts = await keyring.getAccounts();
                const importedAccounts = finalAccounts.slice(originalAccounts.length);

                log.debug(`Successfully imported ${importedAccounts.length} accounts from ${device}`);
                return finalAccounts;
            } catch (error) {
                log.error(`Hardware wallet account import failed for ${device}:`, error);
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
                throw new Error(`Invalid or unsupported device type: ${device}`);
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
            log.debug(`Found ${keyrings.length} keyrings of type ${keyringType}`);

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
                log.debug(`Removing ${accounts.length} accounts associated with ${device} keyring`);

                // Iterate over accounts and remove them
                for (const account of accounts) {
                    try {
                        await super.removeAccount(account);
                    } catch (error) {
                        log.error(`Failed to remove account ${account} during keyring removal:`, error);
                        // Continue with other accounts rather than failing completely
                    }
                }
            }

            // Get an updated keyring after account removal
            const updatedKeyring = await this.getKeyringFromDevice(device);
            if (updatedKeyring) {
                log.debug(`Removing keyring type ${this._getKeyringTypeFromDevice(device)}`);
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
     * setLedgerWebHIDTransportType
     *
     * Sets the transport method to WebHID for Ledger devices.
     */
    public async setLedgerWebHIDTransportType(): Promise<void> {
        const keyring = await this.getKeyringFromDevice(Devices.LEDGER);
        if (keyring) {
            // Set the transport method to 'webhid' by default in an asynchronously manner to avoid blocking the UI
            keyring.updateTransportMethod('webhid').catch((e: Error) => {
                log.error('setLedgerWebHIDTransportType', e.message);
            });
        }
    }

    // QR Hardware related methods

    /**
     * Get qr hardware keyring.
     *
     * @returns The added keyring
     */
    /*
    async getOrAddQRKeyring(): Promise<QRKeyring> {
        let keyring = await this.getKeyringFromDevice(Devices.KEYSTONE);
        if (!keyring) {
            await this.connectHardwareKeyring(Devices.KEYSTONE);
            keyring = await this.getKeyringFromDevice(Devices.KEYSTONE);
        }
        return keyring;
    }
    */

    /**
     * Returns accounts from the QR device by page
     *
     * @param page
     * @returns
     */
    /*
    async getQRPage(
        page: number
    ): Promise<{ balance: string; address: string; index: number }[]> {
        try {
            const keyring = await this.getOrAddQRKeyring();
            const currentPage = (await keyring.serialize()).page;

            let accounts;
            if (page > currentPage) {
                // increments
                for (let i = 1; i < page - currentPage; i++) {
                    await keyring.getNextPage();
                }
                accounts = await keyring.getNextPage();
            } else if (page < currentPage) {
                // decrements
                for (let i = 1; i < currentPage - page; i++) {
                    await keyring.getPreviousPage();
                }
                accounts = await keyring.getPreviousPage();
            } else {
                await keyring.getNextPage();
                accounts = await keyring.getPreviousPage();
            }

            return accounts.map((account: any) => {
                return {
                    ...account,
                    balance: '0x0',
                };
            });
        } catch (e) {
            throw new Error(`Unspecified error when connect QR Hardware, ${e}`);
        }
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
            /*
            if (device === Devices.KEYSTONE) {
                return (await this.getQRPage(pageIndex)) as [];
            } else */ if (device === Devices.TREZOR) {
                const currentPage = (await keyring.serialize()).page;

                let accounts;
                if (pageIndex > currentPage) {
                    // increments
                    for (let i = 1; i < pageIndex - currentPage; i++) {
                        await keyring.getNextPage();
                    }
                    accounts = await keyring.getNextPage();
                } else if (pageIndex < currentPage) {
                    // decrements
                    for (let i = 1; i < currentPage - pageIndex; i++) {
                        await keyring.getPreviousPage();
                    }
                    accounts = await keyring.getPreviousPage();
                } else {
                    await keyring.getNextPage();
                    accounts = await keyring.getPreviousPage();
                }
                return accounts;
            } else {
                return await keyring.getPage(pageIndex);
            }
        } catch (e) {
            throw new Error(`Unspecified error retrieving page, ${e}`);
        }
    }
}
