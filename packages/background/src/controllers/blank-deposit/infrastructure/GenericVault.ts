/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Mutex } from 'async-mutex';
import { BaseStore } from '../../../infrastructure/stores/BaseStore';
import encryptor, { Encryptor } from 'browser-passworder';
import { Hasheable, Hash } from '../../../utils/hasher';

export interface GenericVaultProps<S> {
    initialState?: string;
    defaultState: S;
    encryptor?: Encryptor;
}

export class GenericVault<S> extends BaseStore<{ vault: string }> {
    private readonly _vaultLock: Mutex;
    private readonly _encryptor: Encryptor;

    private defaultState: S;

    // when operating with deposits & changing network
    private unlockPhrase?: string;

    constructor(props: GenericVaultProps<S>) {
        super({ vault: props.initialState || '' });
        this._vaultLock = new Mutex();
        this._encryptor = props.encryptor || encryptor;

        this.defaultState = props.defaultState;
        this.unlockPhrase = undefined;
    }

    /**
     * isInitialized
     *
     * @returns Whether the vault has been initialized or not
     */
    public get isInitialized(): boolean {
        // If vault has default value i.e. is not an empty string,
        // it means it has already been initialized
        return this.store.getState().vault !== '';
    }

    /**
     * isUnlocked
     * @returns Whether the vault is unlocked or not
     */
    public get isUnlocked(): boolean {
        return this.isInitialized && this.unlockPhrase !== undefined;
    }

    /**
     * It acquires the vault mutex lock
     * @returns The releaseLock function
     */
    public async getVaultMutexLock(): Promise<{
        releaseMutexLock: () => void;
    }> {
        const releaseMutexLock = await this._vaultLock.acquire();
        return { releaseMutexLock };
    }

    /**
     * Initializes the Vault used for deposits, throws if already initialized before
     */
    @Hasheable
    public async initialize(@Hash unlockPhrase: string): Promise<void> {
        if (this.isInitialized) {
            throw new Error('Vault already initialized');
        }

        await this.lock(); // if we set the phrase here the vault will be unlocked
        await this.putStateAndLock(this.defaultState, unlockPhrase);
    }

    /**
     * DANGER
     *
     * Reinitializes the Vault. Overwrites current vault! the content of the vault
     * will be lost from storage.
     */
    @Hasheable
    public async reinitialize(@Hash unlockPhrase: string): Promise<void> {
        await this.lock(); // if we set the phrase here the vault will be unlocked
        await this.putStateAndLock(this.defaultState, unlockPhrase);
    }

    /**
     * Lock the vault to prevent access.
     */
    public async lock(): Promise<void> {
        const { releaseMutexLock } = await this.getVaultMutexLock();

        this.unlockPhrase = undefined;

        releaseMutexLock();
    }

    /**
     * Unlocks the vault with the provided unlockPhrase
     * @param unlockPhrase The vault unlock phrase
     */
    @Hasheable
    public async unlock(@Hash unlockPhrase: string): Promise<void> {
        // Check if the vault has already been initialized first
        if (!this.isInitialized) {
            throw new Error('Vault not initialized');
        }

        // Set unlocking phrase
        this.unlockPhrase = unlockPhrase;

        // Valid if vault can be unlocked with provided unlock phrase
        if (!(await this.retrieve())) {
            // Lock again
            await this.lock();
            throw new Error('Cannot unlock vault with provided unlock phrase');
        }
    }

    /**
     * Decrypts and returns the content of the vault.
     * The vault must be initilizated and unlocked.
     */
    public async retrieve(): Promise<S> {
        if (!this.isInitialized) {
            throw new Error('Vault not initialized');
        }
        if (!this.isUnlocked) {
            throw new Error('Vault locked');
        }

        const vault = this._encryptor.decrypt<S>(
            this.unlockPhrase!,
            this.store.getState().vault
        );
        return vault;
    }

    /**
     * It updates the vault state
     *
     * @param partialVaultState The partial state to update
     */
    public async update(partialState: Partial<S>): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Vault not initialized');
        }
        if (!this.isUnlocked) {
            throw new Error('Vault locked');
        }

        const vault = await this.retrieve();

        // Update and encrypt
        return this.putStateAndLock(
            {
                ...vault,
                ...partialState,
            },
            this.unlockPhrase!
        );
    }

    /**
     * Puts the updated state on the encrypted vault
     * @param unlockPhrase The vault unlock phrase
     */
    private async putStateAndLock(
        state: S,
        unlockPhrase: string
    ): Promise<void> {
        const encryptedVault = await this._encryptor.encrypt<S>(unlockPhrase, {
            ...state,
        });
        this.store.setState({ vault: encryptedVault });
    }
}
