/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
declare module 'eth-keyring-controller' {
    import { TypedTransaction } from '@ethereumjs/tx';
    import { IObservableStore } from '../infrastructure/stores/ObservableStore';
    import { EventEmitter } from 'events';

    export interface KeyringControllerState {
        isUnlocked: boolean;
        keyringTypes: any;
        keyrings: any[];
        vault: string;
    }

    export interface KeyringControllerMemState {
        isUnlocked: boolean;
        keyringTypes: any;
        keyrings: any[];
    }

    export interface KeyringControllerProps {
        initState?: Partial<KeyringControllerState>;
        encryptor?: any;
        keyringTypes?: any;
    }

    export type Keyring = any;

    export default class KeyringController extends EventEmitter {
        memStore: IObservableStore<KeyringControllerMemState>;
        store: IObservableStore<KeyringControllerState>;

        constructor(opts: KeyringControllerProps);

        /**
         * Get Keyring For Account
         *
         * Returns the currently initialized keyring that manages
         * the specified `address` if one exists.
         *
         * @param {string} address - An account address.
         * @returns {Promise<Keyring>} The keyring of the account, if it exists.
         */
        getKeyringForAccount(address: string): Promise<Keyring>;

        /**
         * Add New Account
         *
         * Calls the `addAccounts` method on the given keyring,
         * and then saves those changes.
         *
         * @param {Keyring} selectedKeyring - The currently selected keyring.
         * @returns {Promise<Object>} A Promise that resolves to the state.
         */
        addNewAccount(selectedKeyring: Keyring): Promise<object>;

        /**
         * Full Update
         *
         * Emits the `update` event and @returns a Promise that resolves to
         * the current state.
         *
         * Frequently used to end asynchronous chains in this class,
         * indicating consumers can often either listen for updates,
         * or accept a state-resolving promise to consume their results.
         *
         * @returns {KeyringControllerState} The controller state.
         */
        fullUpdate(): KeyringControllerState;

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
        createNewVaultAndKeychain(
            password: string
        ): Promise<KeyringControllerState>;

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
        createNewVaultAndRestore(
            password: string,
            seed: string
        ): Promise<KeyringControllerState>;

        /**
         * Set Locked
         * This method deallocates all secrets, and effectively locks MetaMask.
         *
         * @emits KeyringController#lock
         * @returns {Promise<Object>} A Promise that resolves to the state.
         */
        setLocked(): Promise<KeyringControllerState>;

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
        submitPassword(password: string): Promise<KeyringControllerState>;

        /**
         * Verify Password
         *
         * Attempts to decrypt the current vault with a given password
         * to verify its validity.
         *
         * @param {string} password
         */
        verifyPassword(password: string): Promise<void>;

        /**
         * Get Keyrings by Type
         *
         * Gets all keyrings of the given type.
         *
         * @param {string} type - The keyring types to retrieve.
         * @returns {Array<Keyring>} The keyrings.
         */
        getKeyringsByType(type: string): Array<Keyring>;

        /**
         * Add New Keyring
         *
         * Adds a new Keyring of the given `type` to the vault
         * and the current decrypted Keyrings array.
         *
         * All Keyring classes implement a unique `type` string,
         * and this is used to retrieve them from the keyringTypes array.
         *
         * @param {string} type - The type of keyring to add.
         * @param {Object} opts - The constructor options for the keyring.
         * @returns {Promise<Keyring>} The new keyring.
         */
        addNewKeyring(type: string, opts?: object): Promise<Keyring>;

        /**
         * Remove Empty Keyrings
         *
         * Loops through the keyrings and removes the ones with empty accounts
         * (usually after removing the last / only account) from a keyring
         */
        removeEmptyKeyrings(): Promise<void>;

        /**
         * Get Accounts
         *
         * Returns the public addresses of all current accounts
         * managed by all currently unlocked keyrings.
         *
         * @returns {Promise<Array<string>>} The array of accounts.
         */
        getAccounts(): Promise<Array<string>>;

        /**
         * Checks for duplicate keypairs, using the the first account in the given
         * array. Rejects if a duplicate is found.
         *
         * Only supports 'Simple Key Pair'.
         *
         * @param {string} type - The key pair type to check for.
         * @param {Array<string>} newAccountArray - Array of new accounts.
         * @returns {Promise<Array<string>>} The account, if no duplicate is found.
         */
        checkForDuplicate(
            type: string,
            newAccountArray: Array<string>
        ): Promise<Array<string>>;

        /**
         *
         * Remove Account
         *
         * Removes a specific account from a keyring
         * If the account is the last/only one then it also removes the keyring.
         *
         * @param {string|string[]} address - The address of the account to remove.
         * @returns {Promise<void>} A Promise that resolves if the operation was successful.
         */
        removeAccount(address: string | string[]): Promise<void>;

        /**
         * Get Keyring Class For Type
         *
         * Searches the current `keyringTypes` array
         * for a Keyring class whose unique `type` property
         * matches the provided `type`,
         * returning it if it exists.
         *
         * @param {string} type - The type whose class to get.
         * @returns {Keyring|undefined} The class, if it exists.
         */
        getKeyringClassForType(type: string): Keyring | undefined;

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
        signTransaction(
            ethTx: TypedTransaction,
            _fromAddress: string,
            opts?: object
        ): Promise<TypedTransaction>;

        /**
         * Export Account
         *
         * Requests the private key from the keyring controlling
         * the specified address.
         *
         * Returns a Promise that may resolve with the private key string.
         *
         * @param {string} address - The address of the account to export.
         * @returns {Promise<string>} The private key of the account.
         */
        exportAccount(address: string): Promise<string>;

        /**
         * Sign Message
         *
         * Attempts to sign the provided message parameters.
         * Used for eth_sign
         *
         * @param msgParams - The message parameters to sign.
         * @returns The raw signature.
         */
        signMessage(
            msgParams: {
                from: string;
                data: string;
            },
            opts?: { withAppKeyOrigin: boolean }
        ): Promise<string>;

        /**
         * Sign Personal Message
         *
         * Attempts to sign the provided message paramaters.
         * Prefixes the hash before signing per the personal sign expectation.
         *
         * @param {Object} msgParams - The message parameters to sign.
         * @returns {Promise<string>} The hexed signature.
         */
        signPersonalMessage(
            msgParams: {
                from: string;
                data: string;
            },
            opts?: {}
        ): Promise<string>;

        /**
         * Get encryption public key
         *
         * Get encryption public key for using in encrypt/decrypt process.
         *
         * @param {Object} address - The address to get the encryption public key for.
         * @returns {Promise<string>} The public key.
         */
        getEncryptionPublicKey(_address: any, opts?: {}): Promise<string>;

        /**
         * Decrypt Message
         *
         * Attempts to decrypt the provided message parameters.
         *
         * @param {Object} msgParams - The decryption message parameters.
         * @returns {Promise<string>} The raw decryption result.
         */
        decryptMessage(msgParams: any, opts?: {}): Promise<string>;

        /**
         * Sign Typed Data
         * (EIP712 https://github.com/ethereum/EIPs/pull/712#issuecomment-329988454)
         *
         * @param {Object} msgParams - The message parameters to sign.
         * @returns {Promise<string>} The raw signature.
         */
        signTypedMessage(
            msgParams: {
                from: string;
                data: TypedSignatureData<TypedSignatureMethods>;
            },
            opts: {
                version: 'V1' | 'V3' | 'V4';
            }
        ): Promise<string>;

        /**
         * Gets the app key address for the given Ethereum address and origin.
         *
         * @param {string} _address - The Ethereum address for the app key.
         * @param {string} origin - The origin for the app key.
         * @returns {string} The app key address.
         */
        getAppKeyAddress(_address: string, origin: string): string;

        /**
         * Exports an app key private key for the given Ethereum address and origin.
         *
         * @param {string} _address - The Ethereum address for the app key.
         * @param {string} origin - The origin for the app key.
         * @returns {string} The app key private key.
         */
        exportAppKeyForAddress(_address: string, origin: string): string;

        /**
         * Create First Key Tree
         *
         * - Clears the existing vault
         * - Creates a new vault
         * - Creates a random new HD Keyring with 1 account
         * - Makes that account the selected account
         * - Faucets that account on testnet
         * - Puts the current seed words into the state tree
         *
         * @returns {Promise<void>} - A promise that resovles if the operation was successful.
         */
        createFirstKeyTree(): Promise<void>;

        /**
         * Persist All Keyrings
         *
         * Iterates the current `keyrings` array,
         * serializes each one into a serialized array,
         * encrypts that array with the provided `password`,
         * and persists that encrypted string to storage.
         *
         * @param {string} password - The keyring controller password.
         * @returns {Promise<boolean>} Resolves to true once keyrings are persisted.
         */
        persistAllKeyrings(password?: string): Promise<boolean>;

        /**
         * Unlock Keyrings
         *
         * Attempts to unlock the persisted encrypted storage,
         * initializing the persisted keyrings to RAM.
         *
         * @param {string} password - The keyring controller password.
         * @returns {Promise<Array<Keyring>>} The keyrings.
         */
        unlockKeyrings(password: string): Promise<Array<any>>;

        /**
         * Restore Keyring
         *
         * Attempts to initialize a new keyring from the provided serialized payload.
         * On success, updates the memStore keyrings and returns the resulting
         * keyring instance.
         *
         * @param {Object} serialized - The serialized keyring.
         * @returns {Promise<Keyring>} The deserialized keyring.
         */
        restoreKeyring(serialized: any): Promise<any>;

        /**
         * Display For Keyring
         *
         * Is used for adding the current keyrings to the state object.
         * @param {Keyring} keyring
         * @returns {Promise<Object>} A keyring display object, with type and accounts properties.
         */
        displayForKeyring(keyring: any): Promise<any>;

        /**
         * Clear Keyrings
         *
         * Deallocates all currently managed keyrings and accounts.
         * Used before initializing a new vault.
         */
        clearKeyrings(): Promise<void>;
    }
}
