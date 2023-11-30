import KeyringController, {
    KeyringControllerProps,
    KeyringControllerState,
} from 'eth-keyring-controller';
import { Hash, Hasheable } from '../utils/hasher';
import { Mutex } from 'async-mutex';
import LedgerBridgeKeyring from '@block-wallet/eth-ledger-bridge-keyring';
import { TrezorKeyring } from '@block-wallet/eth-trezor-keyring';
import { Devices } from '../utils/types/hardware';
import log from 'loglevel';
import { HDPaths, BIP44_PATH } from '../utils/types/hardware';
import {
    AccessListEIP2930Transaction,
    Transaction,
    TypedTransaction,
} from '@ethereumjs/tx';
import { concatSig, SignTypedDataVersion } from '@metamask/eth-sig-util';
import {
    MetaMaskKeyring as QRKeyring,
    MetaMaskKeyring as QRHardwareKeyring,
} from '@keystonehq/metamask-airgapped-keyring';
import {
    DataType,
    ETHSignature,
    EthSignRequest,
} from '@keystonehq/bc-ur-registry-eth';

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

export enum KeyringControllerEvents {
    QR_TRANSACTION_SIGNATURE_REQUEST_GENERATED = 'QR_TRANSACTION_SIGNATURE_REQUEST_GENERATED',
    QR_MESSAGE_SIGNATURE_REQUEST_GENERATED = 'QR_MESSAGE_SIGNATURE_REQUEST_GENERATED',
    QR_SIGNATURE_SUBMIT = 'QR_SIGNATURE_SUBMIT',
}

/**
 * Available keyring types
 */
export enum KeyringTypes {
    SIMPLE_KEY_PAIR = 'Simple Key Pair',
    HD_KEY_TREE = 'HD Key Tree',
    TREZOR = 'Trezor Hardware',
    LEDGER = 'Ledger Hardware',
    QR = 'QR Hardware Wallet Device',
}

interface QRSignatureRequest {
    requestId: string;
    qrSignRequest: string[];
}

export default class KeyringControllerDerivated extends KeyringController {
    private readonly _mutex: Mutex;
    private readonly _qrHardwareKeyring: QRHardwareKeyring;

    constructor(opts: KeyringControllerProps) {
        opts.keyringTypes = [LedgerBridgeKeyring, TrezorKeyring, QRKeyring];
        super(opts);

        this._mutex = new Mutex();
        this._qrHardwareKeyring = new QRHardwareKeyring();
    }

    /**
     * getMutex
     *
     * Returns the mutex used to prevent concurrent access to the keyring
     *
     * @returns {Mutex}
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
     */
    @Hasheable
    public async createNewVaultAndKeychain(
        @Hash password: string
    ): Promise<KeyringControllerState> {
        const releaseLock = await this._mutex.acquire();
        try {
            let vault;
            const currentAccounts = await super.getAccounts();
            if (currentAccounts.length > 0) {
                vault = super.fullUpdate();
            } else {
                vault = await super.createNewVaultAndKeychain(password);
            }

            // Verify keyring
            await this.verifyAccounts();

            return vault;
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
     * @returns {Promise<Object>} A Promise that resolves to the state.
     */
    @Hasheable
    public async createNewVaultAndRestore(
        @Hash password: string,
        seed: string
    ): Promise<KeyringControllerState> {
        const releaseLock = await this._mutex.acquire();
        try {
            const vault = await super.createNewVaultAndRestore(password, seed);

            // Verify keyring
            await this.verifyAccounts();

            return vault;
        } finally {
            releaseLock();
        }
    }

    /**
     * Submit Password
     *
     * Attempts to decrypt the current vault and load its keyrings
     * into memory.
     *
     * Temporarily also migrates any old-style vaults first, as well.
     * (Pre MetaMask 3.0.0)
     *
     * @emits KeyringController#unlock
     * @param {string} password - The keyring controller password.
     * @returns {Promise<Object>} A Promise that resolves to the state.
     */
    @Hasheable
    public async submitPassword(
        @Hash password: string
    ): Promise<KeyringControllerState> {
        return super.submitPassword(password);
    }

    /**
     * Verify Password
     *
     * Attempts to decrypt the current vault with a given password
     * to verify its validity.
     *
     * @param {string} password
     */
    @Hasheable
    public async verifyPassword(@Hash password: string): Promise<void> {
        return super.verifyPassword(password);
    }

    /**
     * Verifies the validity of the current vault's seed phrase
     *
     * @param {string} password - The keyring controller password.
     *
     * @returns {Promise<string>} Seed phrase.
     */
    @Hasheable
    public async verifySeedPhrase(@Hash password: string): Promise<string> {
        await super.verifyPassword(password);
        await this.verifyAccounts();

        const primaryKeyring = super.getKeyringsByType(
            KeyringTypes.HD_KEY_TREE
        )[0];
        const serialized = await primaryKeyring.serialize();
        const seedPhrase = hexToString(bufferToHex(serialized.mnemonic));

        return seedPhrase;
    }

    /**
     * Creates a new account
     *
     * @param name new account's name
     */
    public async createAccount(): Promise<string> {
        const releaseLock = await this._mutex.acquire();
        try {
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
            return accounts[accounts.length - 1];
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
        const Keyring = keyringController.getKeyringClassForType(
            KeyringTypes.HD_KEY_TREE
        );
        const opts = {
            mnemonic: seedPhrase,
            numberOfAccounts: createdAccounts.length,
        };

        const keyring = new Keyring(opts);
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
     * _HDPathForDevice
     *
     * @param device The device to get the default hd path for
     * @returns The default hd path for the specified device
     */
    private _HDPathForDevice(device: Devices): string {
        const hdPaths = HDPaths[device];
        return hdPaths.find((data) => data.default)?.path ?? BIP44_PATH;
    }

    /**
     * setHDPath
     *
     * It sets the HD path of the device keyring
     *
     * @param {Devices} device - The device to set the path
     * @param {string} hdPath - The HD path of the keyring
     */
    public async setHDPath(device: Devices, hdPath: string): Promise<void> {
        const keyring = await this.getKeyringFromDevice(device);
        if (keyring.setHdPath) {
            const hdPaths = HDPaths[device];
            if (hdPaths.findIndex((data) => data.path === hdPath) === -1) {
                throw new Error(
                    'The provided HDPath is not recongnized as a valid path'
                );
            }
            keyring.setHdPath(hdPath);

            if (device !== Devices.KEYSTONE) {
                if (!keyring.isUnlocked()) await keyring.unlock();
            }
        }
    }

    /**
     * getHDPathForDevice
     *
     * Returns the configured HDPath for the Kerying of the provided device.
     * If the Keyring doesn't exists, returns the defualt device's HDPath.
     *
     * @param {Devices} device - The device to get its keyring's HDPath
     */
    public async getHDPathForDevice(device: Devices): Promise<string> {
        const keyring = await this.getKeyringFromDevice(device);
        return keyring && keyring.hdPath !== ''
            ? keyring.hdPath
            : this._HDPathForDevice(device);
    }

    /**
     * connectHardwareKeyring
     *
     * It connects a hardware device to the keyring controller
     *
     * @param device The device type to connect to
     * @returns Whether it connected to the device or not
     */
    public async connectHardwareKeyring(device: Devices): Promise<boolean> {
        const keyringType = this._getKeyringTypeFromDevice(device);
        let keyring = await this.getKeyringFromDevice(device);

        // If the keyring doesn't exist, create it
        if (!keyring) {
            if (device === Devices.KEYSTONE) {
                keyring = await this.addNewKeyring(keyringType);
            } else {
                keyring = await this.addNewKeyring(keyringType, {
                    hdPath: this._HDPathForDevice(device),
                });
            }
            // Prevents manifest error, research if we can avoid this
            device === Devices.TREZOR &&
                (await new Promise((resolve) => setTimeout(resolve, 5000)));
        }

        if (device === Devices.LEDGER) {
            // If it is a Ledger device, we set the transport method to 'webhid' by default.
            // This requires HID API (not supported directly from the extension) which requests for device connection.
            await keyring.updateTransportMethod('webhid');
        }

        // Unlock the keyring. If it's already unlocked it will resolve.
        // For Trezor devices, we force the unlock to prevent displaying
        // old accounts or accounts from a different device
        if (keyring.unlock) {
            await keyring.unlock(device === Devices.TREZOR);
        }

        // Return whether we connected and unlocked the keyring successfully
        if (device === Devices.KEYSTONE) {
            return keyring.initialized;
        } else {
            return keyring.isUnlocked();
        }
    }

    /**
     * importHardwareWalletAccounts
     *
     * Imports all the accounts that the user has specified from the device
     * into the keyring and returns a list of addresses
     *
     * @param accountIndexes The indexes of every selected account in the derivation path
     * @param device The device type
     *
     * @returns A list of added accounts to the device keyring
     */
    public async importHardwareWalletAccounts(
        accountIndexes: number[],
        device: Devices
    ): Promise<string[]> {
        return this._mutex.runExclusive(async (): Promise<string[]> => {
            const keyring = await this.getKeyringFromDevice(device);

            if (!keyring) return [];

            // Iterate over the list of added indexes and add each
            // selected account to the keyring
            for (const index of accountIndexes) {
                keyring.setAccountToUnlock(index);
                await super.addNewAccount(keyring);
            }

            // Return the list of all new added accounts
            return keyring.getAccounts();
        });
    }

    /**
     * _getKeyringTypeFromDevice
     *
     * @param device The device type
     * @returns The Keyring instance name
     */
    private _getKeyringTypeFromDevice(
        device: Devices
    ): KeyringTypes.LEDGER | KeyringTypes.TREZOR | KeyringTypes.QR {
        switch (device) {
            case Devices.LEDGER:
                return KeyringTypes.LEDGER;
            case Devices.TREZOR:
                return KeyringTypes.TREZOR;
            case Devices.KEYSTONE:
                return KeyringTypes.QR;
            default:
                throw new Error('Invalid device');
        }
    }

    /**
     * getKeyringFromDevice
     *
     * It returns the keyring instance for the specified device
     *
     * @param device The device type
     * @returns The Keyring instance
     */
    public async getKeyringFromDevice(device: Devices): Promise<any> {
        try {
            // Get the keyring for the specified device
            const keyringType = this._getKeyringTypeFromDevice(device);

            if (!keyringType) return null;

            const keyring = await this.getKeyringsByType(keyringType)[0];

            return keyring;
        } catch (error) {
            log.error('getKeyringFromDevice', error);
            return null;
        }
    }

    /**
     * removeDeviceKeyring
     *
     * It removes the keyring instance for the specified device
     *
     * @param device The device type
     * @returns The Keyring instance
     */
    public async removeDeviceKeyring(device: Devices): Promise<any> {
        try {
            // Get the keyring for the specified device
            const keyringType = this._getKeyringTypeFromDevice(device);
            if (!keyringType) return null;

            const keyring = await this.getKeyringsByType(keyringType)[0];
            if (!keyring) return null; // when you delete all the accounts the keyring is forgotten automatically.

            return keyring.forgetDevice();
        } catch (error) {
            log.error('removeDeviceKeyring', error);
            return null;
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
            return this._mutex.runExclusive(
                async (): Promise<TypedTransaction> => {
                    if (keyringType === KeyringTypes.TREZOR) {
                        await this.connectHardwareKeyring(Devices.TREZOR);
                    }
                    return super.signTransaction(ethTx, _fromAddress, opts);
                }
            );
        }
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
        if (keyringType === KeyringTypes.QR) {
            return await this._signQRMessage(msgParams, opts);
        } else {
            return this._mutex.runExclusive(async () => {
                if (keyringType === KeyringTypes.TREZOR) {
                    await this.connectHardwareKeyring(Devices.TREZOR);
                }
                return super.signMessage(msgParams, opts);
            });
        }
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
        if (keyringType === KeyringTypes.QR) {
            return await this._signQRMessage(msgParams, opts);
        } else {
            return this._mutex.runExclusive(async () => {
                if (keyringType === KeyringTypes.TREZOR) {
                    await this.connectHardwareKeyring(Devices.TREZOR);
                }
                return super.signPersonalMessage(msgParams, opts);
            });
        }
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
        if (keyringType === KeyringTypes.QR) {
            return await this._signQRMessage(msgParams, opts, true);
        } else {
            return this._mutex.runExclusive(async () => {
                if (keyringType === KeyringTypes.TREZOR) {
                    await this.connectHardwareKeyring(Devices.TREZOR);
                }
                return super.signTypedMessage(msgParams, opts);
            });
        }
    }

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
    async getOrAddQRKeyring(): Promise<QRKeyring> {
        let keyring = await this.getKeyringFromDevice(Devices.KEYSTONE);
        if (!keyring) {
            await this.connectHardwareKeyring(Devices.KEYSTONE);
            keyring = await this.getKeyringFromDevice(Devices.KEYSTONE);
        }
        return keyring;
    }

    /**
     * Returns accounts from the QR device by page
     *
     * @param page
     * @returns
     */
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

    /**
     * Submites the HDKey of the QR device
     *
     * @param cbor
     */
    async submitQRHardwareCryptoHDKey(cbor: string) {
        return this._mutex.runExclusive(async () => {
            const read = this._qrHardwareKeyring.readKeyring();
            this._qrHardwareKeyring.submitCryptoHDKey(cbor);
            await read;
            this.fullUpdate();
        });
    }

    /**
     * Submites the account of the QR device
     *
     * @param cbor
     */
    async submitQRHardwareCryptoAccount(cbor: string) {
        return this._mutex.runExclusive(async () => {
            const r = this._qrHardwareKeyring.readKeyring();
            this._qrHardwareKeyring.submitCryptoAccount(cbor);
            await r;
            this.fullUpdate();
        });
    }

    /**
     * Generates a ETH Sign request to be signed with a QR device
     *
     *
     * @param {TypedTransaction} ethTx - The transaction to sign.
     * @param {string} _fromAddress - The transaction 'from' address.
     * @returns {Promise<QRSignatureRequest>} The transaction sign request object QR as string.
     */
    /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
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

    /**
     * Generates a message sign request to be signed with a QR device
     *
     *
     * @param {Object} msgParams - The message parameters to sign.
     * @returns {Promise<QRSignatureRequest>} The message sign request object QR as string.
     */
    /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
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

    /**
     * Generates a typed message sign request to be signed with a QR device
     *
     *
     * @param {Object} msgParams - The message parameters to sign.
     * @returns {Promise<QRSignatureRequest>} The typed message sign request object QR as string.
     */
    /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
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

    /**
     * After requesting a QR sign this function waits for the signed message
     * @param signRequest
     * @returns
     */
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

    /**
     * Submits the signature generate by the QR device
     *
     * @param requestId
     * @param cbor
     */
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
            if (device === Devices.KEYSTONE) {
                return (await this.getQRPage(pageIndex)) as [];
            } else if (device === Devices.TREZOR) {
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
