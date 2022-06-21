/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { GenericVault } from './infrastructure/GenericVault';
import {
    IBlankDepositVaultState,
    BlankDepositVaultState,
} from './infrastructure/IBlankDepositVaultState';
import { Encryptor } from 'browser-passworder';
import { AvailableNetworks, CurrencyAmountPair, DepositStatus } from './types';
import NetworkController from '../NetworkController';
import { IBlankDeposit } from './BlankDeposit';
import log from 'loglevel';
import { IObservableStore } from '@block-wallet/background/infrastructure/stores/ObservableStore';

export interface BlankDepositVaultProps {
    networkController: NetworkController;
    encryptor?: Encryptor | undefined;
    vault: string;
}

export class BlankDepositVault {
    private readonly _networkController: NetworkController;
    private readonly _vault: GenericVault<IBlankDepositVaultState>;

    constructor(props: BlankDepositVaultProps) {
        this._networkController = props.networkController;

        // Default vault state
        const defVaultState: BlankDepositVaultState = {
            deposits: [],
            errorsInitializing: [],
            isInitialized: false, // Default to false, we care about this only when wallet is imported
            isLoading: false,
        };

        this._vault = new GenericVault({
            initialState: props.vault,
            encryptor: props.encryptor,
            defaultState: {
                deposits: {
                    [AvailableNetworks.MAINNET]: defVaultState,
                    [AvailableNetworks.GOERLI]: defVaultState,
                    [AvailableNetworks.POLYGON]: defVaultState,
                    [AvailableNetworks.BSC]: defVaultState,
                    [AvailableNetworks.xDAI]: defVaultState,
                    [AvailableNetworks.ARBITRUM]: defVaultState,
                    [AvailableNetworks.AVALANCHEC]: defVaultState,
                    [AvailableNetworks.OPTIMISM]: defVaultState,
                },
                isImported: false,
            },
        });
    }

    public get store(): IObservableStore<{ vault: string }> {
        return this._vault.store;
    }

    /**
     * isUnlocked
     *
     * @returns Whether the notes vault is unlocked
     */
    public get isUnlocked(): boolean {
        return this._vault.isUnlocked;
    }

    /**
     * Locks the vault to prevent decrypting and operating with it
     */
    public async lock(): Promise<void> {
        return this._vault.lock();
    }

    /**
     * Unlocks the vault with the provided unlockPhrase.
     */
    public async unlock(unlockPhrase: string): Promise<void> {
        // Unlock the vault
        return this._vault.unlock(unlockPhrase);
    }

    /**
     * Initialize the vault used for the deposits
     * @param unlockPhrase
     * @returns
     */
    public async initializeVault(unlockPhrase: string): Promise<void> {
        return this._vault.initialize(unlockPhrase);
    }

    /**
     * reinitialize the vault used for the deposits, overwrites existing vault
     * @param unlockPhrase
     * @returns
     */
    public async reinitializeVault(unlockPhrase: string): Promise<void> {
        return this._vault.reinitialize(unlockPhrase);
    }

    /**
     * Return the vault if it is unlocked
     */
    public async getVault(
        chainId: number = this._networkController.network.chainId
    ): Promise<IBlankDepositVaultState> {
        if (!this.isUnlocked) {
            throw new Error('Vault locked');
        }

        const { name } =
            this._networkController.getNetworkFromChainId(chainId)!;

        let vault = await this._vault.retrieve();

        // v0.2.0 - Upgrade the vault to support a newly added Tornado chain if wallet is updated from a previous version
        if (
            !(name in vault.deposits) &&
            Object.values(AvailableNetworks).includes(name as AvailableNetworks)
        ) {
            await this._vault.update({
                deposits: {
                    ...vault.deposits,
                    [name]: {
                        deposits: [],
                        errorsInitializing: [],
                        isInitialized: false, // Default to false, we care about this only when wallet is imported
                        isLoading: false,
                    },
                },
            });
            vault = await this._vault.retrieve();
        }

        if (!name || !(name in vault.deposits)) {
            throw new Error('Network not supported');
        }

        return vault;
    }

    /**
     * failReconstruction
     *
     * It transitions the current network reconstruction status to failed
     */
    public async failReconstruction(
        chainId: number = this._networkController.network.chainId,
        error = 'Error reconstructing deposits'
    ) {
        return this.setDepositsVault(
            {
                isLoading: false,
                errorsInitializing: [error],
            },
            chainId
        );
    }

    /**
     * Updates the current or specified deposit vault state
     *
     * @param chainVaultState The specified chain vault to update
     * @param chainId The chainId to update the vault to
     */
    public async setDepositsVault(
        chainVaultState: Partial<BlankDepositVaultState>,
        chainId: number = this._networkController.network.chainId
    ): Promise<void> {
        const { name } =
            this._networkController.getNetworkFromChainId(chainId)!;

        const { releaseMutexLock } = await this._vault.getVaultMutexLock();
        try {
            const currentDeposits = await this._vault.retrieve();

            if (!name || !(name in currentDeposits.deposits))
                throw new Error('Unsupported network');

            const networkDeposits =
                currentDeposits.deposits[name as AvailableNetworks];

            return this._vault.update({
                deposits: {
                    ...currentDeposits.deposits,
                    [name as AvailableNetworks]: {
                        ...networkDeposits,
                        ...chainVaultState,
                    },
                },
            });
        } finally {
            releaseMutexLock();
        }
    }

    /**
     * getDepositVaultByChain
     *
     * @param chainId The current network chainId. It defaults to the current network
     * @returns The current chain stored deposit vault
     */
    private async getDepositVaultByChain(
        chainId: number = this._networkController.network.chainId
    ): Promise<BlankDepositVaultState> {
        const { name } =
            this._networkController.getNetworkFromChainId(chainId)!;

        const vault = await this.getVault(chainId);

        return vault.deposits[name as AvailableNetworks];
    }

    /**
     * getDerivedDepositIndex
     *
     * @param chainId The current network chainId. It defaults to the current network
     * @returns The current chain latest derived index
     */
    public async getDerivedDepositIndex(
        pair: CurrencyAmountPair,
        chainId?: number
    ): Promise<number> {
        const deposits = await this.getDeposits(chainId);

        const filteredDeposits = deposits.filter(
            (d) =>
                d.pair.amount === pair.amount &&
                d.pair.currency === pair.currency
        );

        // If there aren't any deposits return zero
        if (filteredDeposits.length === 0) {
            return 0;
        }

        const higherDepositIndex = filteredDeposits.sort(
            (a, b) => b.depositIndex - a.depositIndex
        )[0].depositIndex;

        // Otherwise, we must return the next to the latest deposit index
        return higherDepositIndex + 1;
    }

    /**
     * getDeposits
     *
     * It obtains from the vault the list of deposits from the current network
     *
     * @param chainId The current network chainId. It defaults to the current network
     * @returns The list of deposits from the current network
     */
    public async getDeposits(chainId?: number): Promise<IBlankDeposit[]> {
        return (await this.getDepositVaultByChain(chainId)).deposits;
    }

    /**
     * setSpent
     *
     * It updates a Blank deposit to spent
     *
     * @param deposits The deposits
     */
    public async setSpent(
        deposits: IBlankDeposit[],
        chainId: number = this._networkController.network.chainId
    ): Promise<void> {
        if (deposits.length === 0) {
            return;
        }

        const { name } =
            this._networkController.getNetworkFromChainId(chainId)!;

        const { releaseMutexLock } = await this._vault.getVaultMutexLock();
        try {
            const currentDeposits = await this.getVault(chainId);

            const networkDeposits =
                currentDeposits.deposits[name as AvailableNetworks];

            for (const deposit of deposits) {
                const depositIndex = networkDeposits.deposits.findIndex(
                    (d) => d.note === deposit.note
                );

                if (depositIndex < 0)
                    throw new Error('A deposit is not present in the vault');

                // Update spent and timestamp
                networkDeposits.deposits[depositIndex].spent = true;
                networkDeposits.deposits[depositIndex].timestamp =
                    new Date().getTime();
            }

            return this._vault.update({
                deposits: {
                    ...currentDeposits.deposits,
                    [name as AvailableNetworks]: {
                        ...networkDeposits,
                        deposits: [...networkDeposits.deposits],
                    },
                },
            });
        } finally {
            releaseMutexLock();
        }
    }

    /**
     * addDeposits
     *
     * It adds a list of deposits to the vault
     *
     * @param deposits The list of recovered deposits
     */
    public async addDeposits(
        deposits: IBlankDeposit[],
        chainId: number = this._networkController.network.chainId
    ): Promise<void> {
        const { name } =
            this._networkController.getNetworkFromChainId(chainId)!;

        const { releaseMutexLock } = await this._vault.getVaultMutexLock();
        try {
            const currentDeposits = await this.getVault(chainId);

            const networkDeposits =
                currentDeposits.deposits[name as AvailableNetworks];

            return this._vault.update({
                deposits: {
                    ...currentDeposits.deposits,
                    [name as AvailableNetworks]: {
                        ...networkDeposits,
                        deposits: [...networkDeposits.deposits, ...deposits],
                    },
                },
            });
        } finally {
            releaseMutexLock();
        }
    }

    /**
     * It drops a failed deposit
     *
     * @param depositId The deposit Id
     * @param status The deposit new status
     */
    public dropFailedDeposit = async (depositId: string): Promise<void> => {
        const { name, chainId } = this._networkController.network;

        const { releaseMutexLock } = await this._vault.getVaultMutexLock();

        try {
            const currentDeposits = await this.getVault(chainId);
            const networkDeposits =
                currentDeposits.deposits[name as AvailableNetworks];

            const deposit = networkDeposits.deposits.find(
                (d) => d.id === depositId
            );

            if (!deposit) {
                throw new Error('Deposit not found');
            }

            if (deposit.status !== DepositStatus.FAILED) {
                throw new Error('Can not drop a non failed deposit!');
            }

            const deposits = networkDeposits.deposits.filter(
                (d) => d.id !== depositId
            );

            return this._vault.update({
                deposits: {
                    ...currentDeposits.deposits,
                    [name as AvailableNetworks]: {
                        ...networkDeposits,
                        deposits: [...deposits],
                    },
                },
            });
        } finally {
            releaseMutexLock();
        }
    };

    /**
     * It updates a deposit status
     *
     * @param depositId The deposit Id
     * @param status The deposit new status
     */
    public updateDepositStatus = async (
        depositId: string,
        status: DepositStatus,
        chainId: number = this._networkController.network.chainId
    ): Promise<void> => {
        const { name } =
            this._networkController.getNetworkFromChainId(chainId)!;

        const { releaseMutexLock } = await this._vault.getVaultMutexLock();
        try {
            const currentDeposits = await this.getVault(chainId);

            const networkDeposits =
                currentDeposits.deposits[name as AvailableNetworks];

            const depositIndex = networkDeposits.deposits.findIndex(
                (d) => d.id === depositId
            );

            if (depositIndex < 0)
                throw new Error('The deposit is not present in the vault');

            // Update spent and timestamp
            networkDeposits.deposits[depositIndex].status = status;
            networkDeposits.deposits[depositIndex].timestamp =
                new Date().getTime();

            return this._vault.update({
                deposits: {
                    ...currentDeposits.deposits,
                    [name as AvailableNetworks]: {
                        ...networkDeposits,
                        deposits: [...networkDeposits.deposits],
                    },
                },
            });
        } finally {
            releaseMutexLock();
        }
    };

    public async importDeposit(
        depositsPromise: () => Promise<{
            deposits: IBlankDeposit[];
            errors: string[];
        }>,
        chainId: number = this._networkController.network.chainId
    ): Promise<void> {
        // Vault lock to prevent other instances or network changes to use the vault while importing
        let releaseMutexLock: (() => void) | undefined = undefined;
        releaseMutexLock = (await this._vault.getVaultMutexLock())
            .releaseMutexLock;
        try {
            // Set network deposits isLoading to true
            const { name } =
                this._networkController.getNetworkFromChainId(chainId)!;

            const currentDeposits = await this.getVault(chainId);

            const depositIsLoading =
                currentDeposits.deposits[name as AvailableNetworks];

            depositIsLoading.isLoading = true;
            depositIsLoading.isInitialized = false;

            await this._vault.update({
                deposits: {
                    ...currentDeposits.deposits,
                    [name as AvailableNetworks]: {
                        ...depositIsLoading,
                    },
                },
                isImported: true,
            });

            releaseMutexLock();

            const { deposits, errors } = await depositsPromise();

            releaseMutexLock = (await this._vault.getVaultMutexLock())
                .releaseMutexLock;

            // Update vault with new deposits
            // As we are reconstructing from the Zero index, we replace
            // the deposit state with the obtained result.
            // If at the moment there was any pending deposit, it WILL be replaced as well.
            const newDeposits: typeof currentDeposits.deposits = {
                [name as AvailableNetworks]: {
                    deposits: deposits,
                    isLoading: false,
                    isInitialized: true,
                    errorsInitializing: errors,
                } as BlankDepositVaultState,
            } as typeof currentDeposits.deposits;

            return this._vault.update({
                deposits: {
                    ...currentDeposits.deposits,
                    ...newDeposits,
                },
            });
        } catch (error) {
            log.error(
                'Unexpected error while reconstructing user deposits',
                error
            );
        } finally {
            if (releaseMutexLock) {
                releaseMutexLock();
            }
        }
    }
}
