import { BigNumber, ethers } from 'ethers';
import { TransactionReceipt } from '@ethersproject/providers';
import { BaseController } from '../../infrastructure/BaseController';
import NetworkController, { NetworkEvents } from '../NetworkController';
import { PreferencesController } from '../PreferencesController';
import {
    TransactionController,
    TransactionGasEstimation,
} from '../transactions/TransactionController';
import {
    ComplianceInfo,
    IBlankDepositService,
    PairCount,
} from './infrastructure/IBlankDepositService';
import { TornadoService } from './tornado/TornadoService';
import {
    AvailableNetworks,
    CurrenciesByChain,
    CurrencyAmountArray,
    CurrencyAmountPair,
    CurrencyAmountType,
    DepositStatus,
    KnownCurrencies,
} from './types';
import { IBlankDeposit } from './BlankDeposit';
import getCryptoRandom32 from './utils/getCryptoRandom32';
import { TokenController } from '../erc-20/TokenController';
import { TokenOperationsController } from '../erc-20/transactions/Transaction';
import { TransactionMeta } from '../transactions/utils/types';
import { Mutex } from 'async-mutex';
import { GasPricesController } from '../GasPricesController';
import { FEATURES } from '../../utils/constants/features';
import log from 'loglevel';
import { TornadoEventsService } from './tornado/TornadoEventsService';
import { IObservableStore } from '@block-wallet/background/infrastructure/stores/ObservableStore';
import { showBlankContractNotification } from '../../utils/notifications';
import { TransactionFeeData } from '../erc-20/transactions/SignedTransaction';
import { NextDepositResult } from './notes/INotesService';
import { ContractMethodSignature } from '../transactions/ContractSignatureParser';

export enum PendingWithdrawalStatus {
    UNSUBMITTED = 'UNSUBMITTED',
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    FAILED = 'FAILED',
    REJECTED = 'REJECTED',
    MINED = 'MINED',
}

export type PendingWithdrawal = {
    pendingId: string;
    relayerUrl: string;
    jobId: string;
    depositId: string;
    pair: CurrencyAmountPair;
    toAddress: string;
    time: number;
    fee?: BigNumber;
    decimals?: number;
    transactionReceipt?: TransactionReceipt;
    errMessage?: string;
    transactionHash?: string;
    status?: PendingWithdrawalStatus;
    statusMessage?: string;
    chainId: number;
    data?: string;
    methodSignature?: ContractMethodSignature;
    value?: BigNumber;
    nonce?: number;
    gasLimit?: BigNumber;
    gasPrice?: BigNumber;
    maxFeePerGas?: BigNumber;
    maxPriorityFeePerGas?: BigNumber;
};

export type PendingWithdrawalsStore = {
    [network in AvailableNetworks]: {
        pending: PendingWithdrawal[];
    };
};

export interface BlankDepositControllerStoreState {
    pendingWithdrawals: PendingWithdrawalsStore;
    vaultState: { vault: string };
}

export interface BlankDepositControllerUIStoreState {
    previousWithdrawals: {
        depositId: string;
        time: number;
        pair: CurrencyAmountPair;
    }[];
    depositsCount: {
        [key in KnownCurrencies]?: PairCount;
    };
    pendingWithdrawals: PendingWithdrawal[];
    pendingDeposits: {
        [currency in KnownCurrencies]?: {
            [amount in CurrencyAmountType[currency]]: boolean;
        };
    };
    isVaultInitialized: boolean;
    isImportingDeposits: boolean;
    areDepositsPending: boolean;
    areWithdrawalsPending: boolean;
    importingErrors: string[];
}

export interface BlankDepositControllerProps {
    networkController: NetworkController;
    transactionController: TransactionController;
    tokenController: TokenController;
    tokenOperationsController: TokenOperationsController;
    preferencesController: PreferencesController;
    gasPricesController: GasPricesController;
    tornadoEventsService: TornadoEventsService;
    initialState: BlankDepositControllerStoreState;
}

export enum BlankDepositEvents {
    WITHDRAWAL_STATE_CHANGE = 'WITHDRAWAL_STATE_CHANGE',
}

export class BlankDepositController extends BaseController<
    BlankDepositControllerStoreState,
    BlankDepositControllerUIStoreState
> {
    private readonly _blankDepositService: IBlankDepositService<BlankDepositControllerStoreState>;
    private readonly _preferencesController: PreferencesController;
    private readonly _networkController: NetworkController;

    private initializedMutex: Mutex;
    private isInitialized = false;

    /**
     * It initializes the BlankDepositController with the specific Service implentation
     *
     * @param props The BlankDepositController properties
     */
    constructor(props: BlankDepositControllerProps) {
        super();

        // Initialize with TornadoService
        this._blankDepositService = new TornadoService({
            networkController: props.networkController,
            preferencesController: props.preferencesController,
            transactionController: props.transactionController,
            gasPricesController: props.gasPricesController,
            tokenOperationsController: props.tokenOperationsController,
            tokenController: props.tokenController,
            tornadoEventsService: props.tornadoEventsService,
            initialState: props.initialState,
        });
        this._networkController = props.networkController;
        this._preferencesController = props.preferencesController;

        this.initializedMutex = new Mutex();

        // Listen to WITHDRAWAL_STATE_CHANGE events
        this._blankDepositService.on(
            BlankDepositEvents.WITHDRAWAL_STATE_CHANGE,
            (
                transactionHash: string,
                status: PendingWithdrawalStatus,
                errorMessage: string
            ) => {
                this.emit(
                    BlankDepositEvents.WITHDRAWAL_STATE_CHANGE,
                    transactionHash,
                    status,
                    errorMessage
                );
            }
        );

        // Show deposit notification
        this.subscribeNotifications();

        // Force update to UI store when network changes
        this._networkController.on(NetworkEvents.NETWORK_CHANGE, () => {
            this.store.notify();
        });

        // Subscribe to store updates
        this.store.subscribe(this.updateDepositsUIStore);
    }

    private subscribeNotifications() {
        this.on(
            BlankDepositEvents.WITHDRAWAL_STATE_CHANGE,
            async (
                transactionHash: string,
                status: 'CONFIRMED' | 'REJECTED' | 'FAILED',
                err: string
            ) => {
                let transaction = undefined;
                if (transactionHash) {
                    try {
                        transaction = await this._networkController
                            .getProvider()
                            .getTransaction(transactionHash);
                    } catch (error) {
                        log.error(
                            `Unable to fetch transaction data for TransactionHash: ${transactionHash} - Status: ${status}`
                        );
                    }
                }

                const meta: TransactionMeta = {
                    transactionParams: {
                        nonce: transaction?.nonce,
                        hash: transactionHash,
                    },
                    status:
                        status !== 'CONFIRMED'
                            ? transactionHash === ''
                                ? 'REJECTED'
                                : 'FAILED'
                            : status,
                    error: { message: err },
                } as TransactionMeta;

                showBlankContractNotification(meta);
            }
        );
    }

    /**
     * getPairAnonymitySet
     *
     * It returns the amount of deposits that a given pair pool has
     *
     * @param currencyPair The currency/amount pair
     */
    public async getPairAnonimitySet(
        currencyPair: CurrencyAmountPair
    ): Promise<number> {
        // Get pending withdrawals
        const { name, features } = this._networkController.network;

        // If network not supported, return zero value
        if (!features.includes(FEATURES.TORNADO)) {
            return 0;
        }

        return this._blankDepositService.getPairAnonimitySet(
            currencyPair,
            name as AvailableNetworks
        );
    }

    /**
     * getPairSubsequentDepositsCount
     *
     * It returns the amount of subsequent deposits after the user's most recent one
     *
     * @param currencyPair The currency/amount pair
     * @returns The number of subsequent deposits after the user's most recent one
     */
    public async getPairSubsequentDepositsCount(
        currencyPair: CurrencyAmountPair
    ): Promise<number | undefined> {
        // Get pending withdrawals
        const { name, features } = this._networkController.network;

        // If network not supported, return zero value
        if (!features.includes(FEATURES.TORNADO)) {
            return 0;
        }

        return this._blankDepositService.getPairSubsequentDepositsCount(
            currencyPair,
            name as AvailableNetworks
        );
    }

    /**
     * Convenience method to make initialization once the extension is ready
     */
    public async initialize(): Promise<void> {
        const releaseLock = await this.initializedMutex.acquire();
        try {
            if (!this.isInitialized) {
                await this._blankDepositService.initialize();
                this.isInitialized = true;
            }
        } catch (error) {
            this.isInitialized = false;
            log.error(error);
        } finally {
            releaseLock();
        }
    }

    /**
     * Initialize the vault used for the deposits
     * @param unlockPhrase
     * @returns
     */
    public async initializeVault(unlockPhrase: string): Promise<void> {
        return this._blankDepositService.initializeVault(unlockPhrase);
    }

    /**
     * reinitialize the vault used for the deposits, overwrites existing vault
     * @param unlockPhrase
     * @returns
     */
    public async reinitializeVault(unlockPhrase: string): Promise<void> {
        return this._blankDepositService.reinitializeVault(unlockPhrase);
    }

    public get store(): IObservableStore<BlankDepositControllerStoreState> {
        return this._blankDepositService.getStore();
    }

    /**
     * It unlocks the user's deposits and init the root paths
     *
     * @param password The user password
     * @param mnemonic The user previously unlocked mnemonic
     */
    public async unlock(password: string, mnemonic: string): Promise<void> {
        await this._blankDepositService.unlock(password, mnemonic);

        // Force update to UI store when unlocked
        this.store.notify();
    }

    /**
     * Locks the user's deposits
     */
    public lock(): Promise<void> {
        return this._blankDepositService.lock();
    }

    /**
     * It returns the date of the latest deposit made for the specified currency/amount pair
     * @param currencyAmountPair — The currency amount pair to look for
     */
    public async getLatestDepositDate(
        currencyAmountPair: CurrencyAmountPair
    ): Promise<Date> {
        return this._blankDepositService.getLatestDepositDate(
            currencyAmountPair
        );
    }

    /**
     * updateDepositsUIStore
     *
     * It updates from the persistable store the
     * state of the on UI store
     */
    private updateDepositsUIStore = async (
        state: BlankDepositControllerStoreState
    ) => {
        if (!this._blankDepositService.isUnlocked) {
            return;
        }

        // Get pending withdrawals
        const { name, features } = this._networkController.network;

        // If network not supported, update with empty values and return
        if (!features.includes(FEATURES.TORNADO)) {
            // Update mem store
            this.UIStore.updateState({
                previousWithdrawals: undefined,
                pendingDeposits: undefined,
                depositsCount: undefined,
                pendingWithdrawals: [],
                isVaultInitialized: undefined,
                isImportingDeposits: undefined,
                importingErrors: [],
                areDepositsPending: false,
                areWithdrawalsPending: false,
            });
            return;
        }

        const pendingWithdrawals =
            state.pendingWithdrawals[name as AvailableNetworks].pending;

        const getWithdrawalsForCompliance = async () => {
            const deposits = await this._blankDepositService.getDeposits();
            return deposits
                .filter((d) => d.spent)
                .map((d) => ({
                    depositId: d.id,
                    time: d.timestamp,
                    pair: d.pair,
                }));
        };

        // Get importing status
        const { isInitialized, isLoading, errorsInitializing } =
            await this._blankDepositService.getImportingStatus();

        const depositsCount =
            (await this._blankDepositService.getUnspentDepositCount()) as {
                [key in KnownCurrencies]: {
                    pair: CurrencyAmountPair;
                    count: number;
                }[];
            };

        const { pendingDeposits, areDepositsPending } =
            await this.getDepositingStatus();

        const areWithdrawalsPending =
            pendingWithdrawals.filter(
                (v) =>
                    v.status === PendingWithdrawalStatus.UNSUBMITTED ||
                    v.status === PendingWithdrawalStatus.PENDING ||
                    v.status === PendingWithdrawalStatus.MINED
            ).length > 0;

        // Update mem store
        this.UIStore.updateState({
            previousWithdrawals: await getWithdrawalsForCompliance(),
            pendingDeposits,
            depositsCount,
            pendingWithdrawals,
            areDepositsPending,
            areWithdrawalsPending,
            isVaultInitialized: isInitialized,
            isImportingDeposits: isLoading,
            importingErrors: errorsInitializing,
        });
    };

    /**
     * It return whether there are pending deposits for the pair
     */
    public async getDepositingStatus(
        chainId = this._networkController.network.chainId
    ): Promise<{
        pendingDeposits: BlankDepositControllerUIStoreState['pendingDeposits'];
        areDepositsPending: boolean;
    }> {
        const network = this._networkController.getNetworkFromChainId(chainId);
        const name = network?.name;

        const deposits = (await this._blankDepositService.getDeposits()).filter(
            (d) => d.status === DepositStatus.PENDING
        );

        const areDepositsPending = deposits.length !== 0;

        const values =
            {} as BlankDepositControllerUIStoreState['pendingDeposits'];

        // Build the list of pending statuses per chain/pair
        const networkCurrencies = CurrenciesByChain[name as AvailableNetworks];
        for (const currency of networkCurrencies) {
            // Get the denomination list for this currency (of this specific chain)
            const amountList = CurrencyAmountArray[currency as KnownCurrencies];

            // Set the empty object
            values[currency as KnownCurrencies] = {} as any;

            // Mark pending status for this currency/amount pair
            amountList.forEach(
                (amount: any) =>
                    // Mark if there's any deposit found for this pair with PENDING status (filter above)
                    ((values[currency as KnownCurrencies] as any)[amount] =
                        !!deposits.find(
                            (f) =>
                                f.pair.amount === amount &&
                                f.pair.currency === currency
                        ))
            );
        }

        return { pendingDeposits: values, areDepositsPending };
    }

    /**
     * getInstanceTokenAllowance
     *
     * @param pair The pair to check the allowance
     * @returns The granted allowance for the specified pair
     */
    public async getInstanceTokenAllowance(
        pair: CurrencyAmountPair
    ): Promise<BigNumber> {
        return this._blankDepositService.getInstanceTokenAllowance(pair);
    }

    /**
     * It fetches the oldest unspent deposit for the specified
     * currency/amount pair from the deposits list
     *
     * @param currencyAmountPair The currencyAmountPair to withdraw
     * @param withdrawAccountAddress The user selected address/account to withdraw the funds
     */
    public async getDepositToWithdraw(
        currencyAmountPair: CurrencyAmountPair
    ): Promise<IBlankDeposit> {
        const { name } = this._networkController.network;

        const pendingWithdrawals = new Set(
            this.store
                .getState()
                .pendingWithdrawals[name as AvailableNetworks].pending.filter(
                    (p) => p.status !== PendingWithdrawalStatus.FAILED
                )
                .map((i) => i.depositId)
        );

        const unspentDeposits = (
            await this._blankDepositService.getDeposits()
        ).filter(
            (d) =>
                !d.spent &&
                d.pair.amount === currencyAmountPair.amount &&
                d.pair.currency === currencyAmountPair.currency &&
                !pendingWithdrawals.has(d.id) &&
                d.status === DepositStatus.CONFIRMED
        );

        // Check for no results
        if (unspentDeposits.length === 0) {
            throw new Error(
                'There are no unspent deposits for this pair and account'
            );
        }

        // Pick a deposit randomly
        const randomIndex = getCryptoRandom32(unspentDeposits.length);

        return unspentDeposits[randomIndex];
    }

    /**
     * proxyContractAddress
     *
     * @returns The privacy solution proxy contract address
     */
    public get proxyContractAddress(): string {
        return this._blankDepositService.proxyContractAddress;
    }

    /**
     * It returns the formatted deposit note
     *
     * @param id The deposit id
     */
    public async getDepositNoteString(id: string): Promise<string> {
        const deposit = await this.getDeposit(id);

        return this._blankDepositService.getNoteString(deposit);
    }

    /**
     * It returns a Deposit
     * @param id The deposit id
     */
    public async getDeposit(id: string): Promise<IBlankDeposit> {
        const deposit = (await this._blankDepositService.getDeposits()).find(
            (d) => d.id === id
        );

        if (!deposit) {
            throw new Error('Deposit not found');
        }
        return deposit;
    }

    /**
     * It returns the list of deposits ordered by timestamp
     * with their notes string removed
     * @param spent Indicates if deposits should be filtered by spent status
     */
    public async getDeposits(filterBySpent = true): Promise<IBlankDeposit[]> {
        let deposits = await this._blankDepositService.getDeposits();
        deposits = filterBySpent ? deposits.filter((d) => !d.spent) : deposits;
        return deposits
            .sort((a, b) => a.timestamp - b.timestamp)
            .map((d) => ({
                ...d,
                note: '',
            }));
    }

    /**
     * It returns the count of the available non spent deposits
     * of a specific currency/amount pair
     *
     * @param currencyAmountPair The currency amount pair to look for
     */
    public async getUnspentDepositsCount(
        currencyAmountPair: CurrencyAmountPair
    ): Promise<number> {
        return this._blankDepositService.getUnspentDepositCount(
            currencyAmountPair
        ) as Promise<number>;
    }

    /**
     * It returns the count of the available deposits
     * of a specific currency/amount pair
     *
     * @param currencyAmountPair The currency amount pair to look for
     */
    public async getDepositsCount(
        currencyAmountPair: CurrencyAmountPair
    ): Promise<number> {
        return this._blankDepositService.getDepositCount(currencyAmountPair);
    }

    /**
     * It returns the count of every available non spent deposits
     * for the specified currency
     *
     * @param currency The currency to look for
     */
    public async getCurrencyDepositsCount(currency: KnownCurrencies): Promise<
        {
            pair: CurrencyAmountPair;
            count: number;
        }[]
    > {
        return Promise.all(
            CurrencyAmountArray[currency].map(async (amount: any) => ({
                pair: { amount, currency } as CurrencyAmountPair,
                count: (await this._blankDepositService.getUnspentDepositCount({
                    amount,
                    currency,
                })) as number,
            }))
        );
    }

    /**
     * It triggers the deposits tree update for the current network
     * (used to update the deposits tree and calculate the subsequent deposits accurately)
     *
     * @param pair The currency amount pair to update the tree for
     */
    public async updateDepositsTree(pair: CurrencyAmountPair): Promise<void> {
        return this._blankDepositService.updateDepositTree(pair);
    }

    /**
     * It checks for possible spent notes and updates their internal state
     */
    public async updateNotesSpentState(): Promise<void> {
        return this._blankDepositService.updateNotesSpentState();
    }

    /**
     * withdraw
     *
     * It withdraws the specified amount of tokens from a previous private deposit
     *
     * @param deposit The Blank deposit
     * @param address The address to withdraw to
     */
    public async withdraw(
        deposit: IBlankDeposit,
        address?: string
    ): Promise<string> {
        const selectedAddress = address
            ? address
            : this._preferencesController.getSelectedAddress();

        return this._blankDepositService.withdraw(deposit, selectedAddress);
    }

    /**
     * deposit
     *
     * It privately deposits an amount of a specific token
     *
     * @param currencyAmountPair The currency/amount pair
     * @param feeData The deposit gas fee data
     * @param customNonce Custom transaction nonce
     */
    public async deposit(
        currencyAmountPair: CurrencyAmountPair,
        feeData: TransactionFeeData,
        customNonce?: number
    ): Promise<string> {
        return this._blankDepositService.deposit(
            currencyAmountPair,
            feeData,
            customNonce
        );
    }

    /**
     * Submits an approval transaction to setup asset allowance
     *
     * @param allowance User selected allowance
     * @param feeData Deposit gas fee data
     * @param pair The deposit currency and amount values
     * @param customNonce Custom transaction nonce
     */
    public async depositAllowance(
        allowance: BigNumber,
        feeData: TransactionFeeData,
        pair: CurrencyAmountPair,
        customNonce?: number
    ): Promise<boolean> {
        return this._blankDepositService.depositAllowance(
            allowance,
            feeData,
            pair,
            customNonce
        );
    }

    /**
     * Populates the deposit transaction from the tornado contract.
     * @param currencyAmountPair
     */
    public async populateDepositTransaction(
        currencyAmountPair: CurrencyAmountPair
    ): Promise<{
        populatedTransaction: ethers.PopulatedTransaction;
        nextDeposit: NextDepositResult['nextDeposit'];
    }> {
        return this._blankDepositService.populateDepositTransaction(
            currencyAmountPair,
            this._networkController.network.chainId
        );
    }

    /**
     * Adds an unapproved tornado deposit transaction to the transaction state.
     * @param currencyAmountPair
     * @param feeData The deposit gas fee data
     */
    public async addAsNewDepositTransaction(
        currencyAmountPair: CurrencyAmountPair,
        feeData: TransactionFeeData
    ): Promise<TransactionMeta> {
        const { populatedTransaction } = await this.populateDepositTransaction(
            currencyAmountPair
        );

        return this._blankDepositService.addAsNewDepositTransaction(
            currencyAmountPair,
            populatedTransaction,
            feeData
        );
    }

    /**
     * Updates the gas configuration for an unnaproved deposit transaction.
     * @param transactionId the id of the transaction to be updated.
     * @param feeData The deposit gas fee data
     */
    public async updateDepositTransactionGas(
        transactionId: string,
        feeData: TransactionFeeData
    ): Promise<void> {
        return this._blankDepositService.updateDepositTransactionGas(
            transactionId,
            feeData
        );
    }

    /**
     * Approves a deposit transaction.
     * @param transactionId the id of the tornado transaction to be approved.
     */
    public async approveDepositTransaction(
        transactionId: string
    ): Promise<void> {
        return this._blankDepositService.approveDepositTransaction(
            transactionId
        );
    }

    /**
     * Gets the result of a tornado deposit transaction.
     * @param transactionId the id of the tornado deposit transaction to get the result.
     */
    public async getDepositTransactionResult(
        transactionId: string
    ): Promise<string> {
        return this._blankDepositService.getDepositTransactionResult(
            transactionId
        );
    }

    /**
     * Calculates the gas limit for a tornado deposit transaction.
     * @param currencyAmountPair The currency amount pair to look for
     */
    public async calculateDepositTransactionGasLimit(
        currencyAmountPair: CurrencyAmountPair
    ): Promise<TransactionGasEstimation> {
        return this._blankDepositService.calculateDepositTransactionGasLimit(
            currencyAmountPair
        );
    }
    /**
     * importDesposits
     *
     * Used to import the user's deposits when a new Keyring is added
     *
     * @param password The vault password
     * @param seedPhrase The account seed phrase
     */
    public async importDeposits(
        password?: string,
        mnemonic?: string
    ): Promise<void> {
        return this._blankDepositService.importNotes(password, mnemonic);
    }

    /**
     * It returns deposit and withdrawal information for compliance purposes
     *
     * @param deposit — The Blank deposit
     */
    public async getComplianceInformation(
        deposit: IBlankDeposit
    ): Promise<ComplianceInfo> {
        return this._blankDepositService.getComplianceInformation(deposit);
    }
    /**
     * It returns the Withdrawal gas cost and fees
     * @param pair The currency/amount pair
     */
    public async getWithdrawalFees(pair: CurrencyAmountPair): Promise<{
        totalFee: BigNumber;
        relayerFee: BigNumber;
        gasFee: BigNumber;
        total: BigNumber;
    }> {
        return this._blankDepositService.getWithdrawalFees(pair);
    }
}
