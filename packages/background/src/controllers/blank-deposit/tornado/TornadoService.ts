/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Mutex } from 'async-mutex';
import { BigNumber, Contract, ethers, Event, utils } from 'ethers';
import { Encryptor } from 'browser-passworder';
import { v4 as uuid } from 'uuid';

import NetworkController, { NetworkEvents } from '../../NetworkController';
import { GasPricesController } from '../../GasPricesController';
import {
    TransactionController,
    TransactionGasEstimation,
} from '../../transactions/TransactionController';
import { TokenController } from '../../erc-20/TokenController';

import {
    ComplianceInfo,
    IBlankDepositService,
    PairCount,
} from '../infrastructure/IBlankDepositService';

import { TornadoNotesService } from './TornadoNotesService';
import {
    currencyAmountPairToMapKey,
    getTornadoTokenDecimals,
    isNativeCurrency,
    parseRelayerError,
} from './utils';

import tornadoConfig from './config/config';
import { ITornadoContract, TornadoEvents } from './config/ITornadoContract';

import MixerAbi from './config/abis/Mixer.abi.json';
import TornadoProxyAbi from './config/abis/TornadoProxy.abi.json';

import {
    AvailableNetworks,
    CurrenciesByChain,
    CurrencyAmountArray,
    CurrencyAmountPair,
    DepositStatus,
    KnownCurrencies,
    ERC20KnownCurrencies,
    DEFAULT_TORNADO_CONFIRMATION,
    DEFAULT_TX_RECEIPT_TIMEOUT,
} from '../types';
import { IBlankDeposit } from '../BlankDeposit';
import { PreferencesController } from '../../PreferencesController';
import relayers from './config/relayers';
import { GasPriceLevels } from '../../GasPricesController';
import { BaseStoreWithLock } from '../../../infrastructure/stores/BaseStore';
import {
    BlankDepositControllerStoreState,
    BlankDepositEvents,
    PendingWithdrawal,
    PendingWithdrawalsStore,
    PendingWithdrawalStatus,
} from '../BlankDepositController';
import { IObservableStore } from '../../../infrastructure/stores/ObservableStore';
import ComposedStore from '../../../infrastructure/stores/ComposedStore';
import { EventEmitter } from 'events';
import {
    getFinalTransactionStatuses,
    TransactionMeta,
    TransactionStatus,
} from '../../transactions/utils/types';
import { EventsUpdateType, TornadoEventsDB } from './stores/TornadoEventsDB';
import { INoteDeposit } from '../notes/INoteDeposit';
import { BnMultiplyByFraction } from '../../../utils/bnUtils';
import { TokenOperationsController } from '../../erc-20/transactions/Transaction';
import {
    DepositTransaction,
    DepositTransactionPopulatedTransactionParams,
} from '../../erc-20/transactions/DepositTransaction';

import { FEATURES } from '../../../utils/constants/features';
import { Network } from '@block-wallet/background/utils/constants/networks';
import log from 'loglevel';
import { TornadoEventsService } from './TornadoEventsService';
import { Deposit, Withdrawal } from './stores/ITornadoEventsDB';
import { TransactionFeeData } from '../../erc-20/transactions/SignedTransaction';
import { BlankDepositVault } from '../BlankDepositVault';
import { NextDepositResult } from '../notes/INotesService';
import { ContractSignatureParser } from '../../transactions/ContractSignatureParser';

const tornadoDeployments = tornadoConfig.deployments as any;

export interface TornadoServiceProps {
    encryptor?: Encryptor | undefined;
    tornadoEventsDB?: TornadoEventsDB;
    preferencesController: PreferencesController;
    networkController: NetworkController;
    transactionController: TransactionController;
    gasPricesController: GasPricesController;
    tokenOperationsController: TokenOperationsController;
    tokenController: TokenController;
    tornadoEventsService: TornadoEventsService;
    initialState: BlankDepositControllerStoreState;
}

export type TornadoEventsStore = {
    [network in AvailableNetworks]: {
        [currencyPairKey: string]: {
            deposit: { events: Event[]; lastQueriedBlock: number };
            withdrawal: { events: Event[]; lastQueriedBlock: number };
        };
    };
};

export type TornadoContracts = Map<
    string,
    {
        contract: ITornadoContract;
        decimals: number;
        tokenAddress?: string;

        /**
         * The actual number of deposits
         */
        depositCount: number;
    }
>;

export const DEPOSIT_GAS_LIMIT = 12e5;
const WITHDRAWAL_GAS_LIMIT = 55e4;

export class TornadoService
    extends EventEmitter
    implements IBlankDepositService<BlankDepositControllerStoreState>
{
    // Controllers & Services
    private readonly _notesService: TornadoNotesService;
    private readonly _networkController: NetworkController;
    private readonly _transactionController: TransactionController;
    private readonly _gasPricesController: GasPricesController;
    private readonly _preferencesController: PreferencesController;
    private readonly _tokenController: TokenController;
    private readonly _tokenOperationsController: TokenOperationsController;
    private readonly _tornadoEventsService: TornadoEventsService;

    // Stores
    private readonly _blankDepositVault: BlankDepositVault;
    private readonly _pendingWithdrawalsStore: BaseStoreWithLock<PendingWithdrawalsStore>;
    private readonly _composedStore: ComposedStore<BlankDepositControllerStoreState>;
    private readonly _tornadoEventsDb: TornadoEventsDB;

    // Tornado Contracts
    private tornadoContracts: TornadoContracts;
    private proxyContract!: ITornadoContract;

    // Locks
    private readonly _depositLock: Mutex;

    constructor(props: TornadoServiceProps) {
        super();
        this._networkController = props.networkController;
        this._preferencesController = props.preferencesController;
        this._transactionController = props.transactionController;
        this._gasPricesController = props.gasPricesController;
        this._tokenController = props.tokenController;
        this._tokenOperationsController = props.tokenOperationsController;
        this._tornadoEventsService = props.tornadoEventsService;

        this._depositLock = new Mutex();

        /**
         * -- DB version should be changed in case new instances are added --
         * v1: Support to Goerli(testnet) and Mainnet
         * v2: Adds support to the following Networks:
         *   - Binance Smart Chain
         *   - xDAI (gnosis)
         *   - Polygon
         *   - Arbitrum
         *   - Avalanche
         *   - Optimism
         */
        this._tornadoEventsDb =
            props.tornadoEventsDB ||
            new TornadoEventsDB('blank_deposits_events', 2);

        this._blankDepositVault = new BlankDepositVault({
            networkController: this._networkController,
            vault: props.initialState.vaultState.vault,
            encryptor: props.encryptor,
        });

        this._notesService = new TornadoNotesService(
            this._networkController,
            this._tornadoEventsDb,
            this._blankDepositVault,
            this.updateTornadoEvents,
            async (pair: CurrencyAmountPair) => {
                return (await this.getDepositsFromPair(pair))
                    .filter((d) => d.status === DepositStatus.FAILED)
                    .sort((a, b) => a.depositIndex - b.depositIndex);
            }
        );
        this._pendingWithdrawalsStore = new BaseStoreWithLock(
            props.initialState.pendingWithdrawals
        );

        this.tornadoContracts = new Map();
        // Add network change listener
        props.networkController.addListener(
            NetworkEvents.NETWORK_CHANGE,
            async ({ chainId, name, features }: Network) => {
                if (!features.includes(FEATURES.TORNADO)) {
                    // If network is not supported, return
                    return;
                }

                // Set tornado contracts
                await this.setTornadoContract(chainId);

                const vault = await this._blankDepositVault.getVault(chainId);
                const { isImported } = vault;
                const { isInitialized } =
                    vault.deposits[name as AvailableNetworks];

                if (isImported && isInitialized) {
                    // On network change update the status of
                    // pending Deposits & Withdrawals if any
                    this.checkCurrentNetworkPending();
                }
            }
        );

        this._composedStore =
            new ComposedStore<BlankDepositControllerStoreState>({
                vaultState: this._blankDepositVault.store,
                pendingWithdrawals: this._pendingWithdrawalsStore.store,
            });
    }

    public updateDepositTree = async (
        pair: CurrencyAmountPair
    ): Promise<void> => {
        const key = currencyAmountPairToMapKey(pair);
        const contract = this.tornadoContracts.get(key);
        if (!contract) {
            return;
        }

        return this.updateTornadoEvents(
            TornadoEvents.DEPOSIT,
            pair,
            contract.contract
        );
    };

    /**
     * getPairAnonymitySet
     *
     * It returns the amount of deposits that a given pair pool has
     *
     * @param currencyPair The currency/amount pair
     * @param network The current network
     */
    public getPairAnonimitySet = async (
        currencyPair: CurrencyAmountPair,
        network: AvailableNetworks
    ): Promise<number> => {
        const lastDeposit = await this._tornadoEventsDb.getLastEventIndex(
            TornadoEvents.DEPOSIT,
            network,
            currencyPair
        );
        return lastDeposit + 1;
    };

    /**
     * getPairSubsequentDepositsCount
     *
     * It returns the amount of subsequent deposits after the user's most recent one
     *
     * @param currencyPair The currency/amount pair
     * @param network The current network
     * @returns The number of subsequent deposits after the user's most recent one
     */
    public getPairSubsequentDepositsCount = async (
        currencyPair: CurrencyAmountPair,
        network: AvailableNetworks
    ): Promise<number | undefined> => {
        const deposits = (await this.getDepositsFromPair(currencyPair)).sort(
            (a, b) => b.timestamp - a.timestamp
        );
        if (deposits.length === 0) {
            return undefined;
        }

        // Have to parse deposit, to prevent changing the deposit object structure
        const deposit = await this._notesService.parseDeposit(deposits[0].note);

        return this._tornadoEventsDb.getSubsequentDepositsCount(
            network,
            currencyPair,
            deposit.commitmentHex
        );
    };

    /**
     * checkIfReconstructionFailed
     *
     * It checks whether the browser was closed during deposit reconstruction
     */
    public async checkIfReconstructionFailed(
        chainId: number = this._networkController.network.chainId
    ): Promise<void> {
        const { isImported, isLoading } = await this.getImportingStatus(
            chainId
        );

        if (isImported && isLoading) {
            await this._blankDepositVault.failReconstruction(chainId);
        }
    }

    /**
     * isUnlocked
     *
     * @returns Whether the notes vault is unlocked
     */
    public get isUnlocked(): boolean {
        return this._blankDepositVault.isUnlocked;
    }

    public async getImportingStatus(
        chainId: number = this._networkController.network.chainId
    ): Promise<{
        isImported: boolean;
        isInitialized: boolean;
        isLoading: boolean;
        errorsInitializing: string[];
    }> {
        const { name } =
            this._networkController.getNetworkFromChainId(chainId)!;

        const vault = await this._blankDepositVault.getVault(chainId);

        const { isImported } = vault;
        const { isInitialized, isLoading, errorsInitializing } =
            vault.deposits[name as AvailableNetworks];

        return { isImported, isInitialized, isLoading, errorsInitializing };
    }

    /**
     * proxyContractAddress
     *
     * @returns The Tornado proxy contract address
     */
    public get proxyContractAddress(): string {
        return this.proxyContract.address;
    }

    public async getComplianceInformation(
        deposit: IBlankDeposit
    ): Promise<ComplianceInfo> {
        const depositComplianceInfo = {
            deposit: {},
            withdrawal: {},
        } as ComplianceInfo;

        const key = currencyAmountPairToMapKey(deposit.pair);
        const contract = this.tornadoContracts.get(key);
        if (!contract) {
            throw new Error('Unsopported pair instance');
        }

        const parsedDeposit = await this._notesService.parseDeposit(
            deposit.note
        );

        // Update deposit events
        await this.updateTornadoEvents(
            TornadoEvents.DEPOSIT,
            deposit.pair,
            contract.contract
        );

        const { name: network, chainId } = this._networkController.network;

        const depEv = await this._tornadoEventsDb.getDepositEventByCommitment(
            network as AvailableNetworks,
            deposit.pair,
            parsedDeposit.commitmentHex
        );

        if (!depEv) {
            throw new Error('Deposit not found on events');
        }

        // Get transaction receipt
        const receipt = await this._networkController
            .getProvider()
            .getTransactionReceipt(depEv.transactionHash);

        depositComplianceInfo.deposit = {
            pair: deposit.pair,
            spent: deposit.spent || false,
            timestamp: new Date(Number(depEv.timestamp) * 1000),
            commitment: parsedDeposit.commitmentHex,
            transactionHash: depEv.transactionHash,
            from: receipt.from,
        };

        if (!deposit.spent) {
            return depositComplianceInfo;
        }

        // Update withdrawal events
        await this.updateTornadoEvents(
            TornadoEvents.WITHDRAWAL,
            deposit.pair,
            contract.contract
        );

        const withdrawEv =
            await this._tornadoEventsDb.getWithdrawalEventByNullifier(
                network as AvailableNetworks,
                deposit.pair,
                parsedDeposit.nullifierHex
            );

        if (!withdrawEv) {
            // Deposit has not been withdrawn yet
            return depositComplianceInfo;
        }

        // Get timestamp
        const { timestamp } = await this._networkController
            .getProvider()
            .getBlock(withdrawEv.blockNumber);

        depositComplianceInfo.withdrawal = {
            pair: deposit.pair,
            to: withdrawEv.to,
            transactionHash: withdrawEv.transactionHash,
            timestamp: new Date(timestamp * 1000),
            fee: utils.formatUnits(
                BigNumber.from(withdrawEv.fee),
                getTornadoTokenDecimals(chainId, deposit.pair)
            ),
            feeBN: BigNumber.from(withdrawEv.fee),
            nullifier: parsedDeposit.nullifierHex,
        };

        return depositComplianceInfo;
    }

    /**
     * It checks for a pending withdrawal on the queue and processes its status
     *
     * @param pending The pending withdrawal
     */
    private checkPendingWithdrawal = async (pending: PendingWithdrawal) => {
        // If we're no longer on the pending withdrawal network, return
        if (this._networkController.network.chainId !== pending.chainId) {
            return;
        }

        // Tornado deposit confirmations for current network
        const depositConfirmations =
            this._networkController.network.tornadoIntervals
                ?.depositConfirmations || DEFAULT_TORNADO_CONFIRMATION;

        // Store provider and signature parser in case of network change
        const provider = this._networkController.getProvider();

        const contractSignatureParser = new ContractSignatureParser(
            this._networkController
        );

        // If pending withdrawal status is not PENDING return
        if (pending.status !== PendingWithdrawalStatus.PENDING) {
            return;
        }

        let transactionHash = '',
            status: PendingWithdrawalStatus = pending.status,
            errMessage = '';
        try {
            ({ txHash: transactionHash, status } =
                await this.getStatusFromRelayerJob(
                    pending.jobId,
                    pending.relayerUrl
                ));

            // Update pending withdrawal to CONFIRMED
            await this.updatePendingWithdrawal(pending.pendingId, {
                status,
                transactionHash,
                time: new Date().getTime(),
                chainId: pending.chainId,
            });

            try {
                const {
                    data,
                    value,
                    nonce,
                    gasPrice,
                    gasLimit,
                    maxFeePerGas,
                    maxPriorityFeePerGas,
                } = await provider.getTransaction(transactionHash);

                const methodSignature =
                    await contractSignatureParser.getMethodSignature(
                        data,
                        pending.toAddress
                    );

                // Await transaction receipt
                const transactionReceipt = await provider.waitForTransaction(
                    transactionHash,
                    depositConfirmations,
                    DEFAULT_TX_RECEIPT_TIMEOUT
                );

                // Add transaction receipt to pending withdrawal
                await this.updatePendingWithdrawal(pending.pendingId, {
                    transactionReceipt,
                    chainId: pending.chainId,
                    data,
                    methodSignature,
                    value,
                    nonce,
                    gasPrice,
                    gasLimit,
                    maxFeePerGas,
                    maxPriorityFeePerGas,
                });
            } catch (error) {
                log.error('Failed to update withdrawal transaction data.');
            }

            // Set deposit to spent only if the vault is still unlocked
            // & the network is still the same
            if (
                this.isUnlocked &&
                pending.chainId === this._networkController.network.chainId
            ) {
                // Get deposit from vault
                const deposit = (await this.getDeposits()).find(
                    (d) => d.id === pending.depositId
                );

                if (!deposit) {
                    throw new Error(
                        'Deposit associated to pending withdrawal not found in vault!'
                    );
                }

                // Set as spent
                await this._blankDepositVault.setSpent(
                    [deposit],
                    pending.chainId
                );
            }
            return { txHash: transactionHash, status };
        } catch (error) {
            status =
                'status' in error
                    ? error.status
                    : PendingWithdrawalStatus.REJECTED;
            errMessage = 'message' in error ? error.message || error : '';

            await this.updatePendingWithdrawal(pending.pendingId, {
                status,
                errMessage,
                chainId: pending.chainId,
            });
            return { status: errMessage };
        } finally {
            // Emit withdrawal state change
            this.emit(
                BlankDepositEvents.WITHDRAWAL_STATE_CHANGE,
                transactionHash,
                status,
                errMessage
            );
        }
    };

    /**
     * It checks for spent notes and updates their state on the vault
     */
    public updateNotesSpentState = async (): Promise<void> => {
        try {
            // Exclude pending withdrawals
            const pendingWithdrawals = this.getPendingWithdrawalsSet();

            const unspentDeposits = (await this.getDeposits()).filter(
                (d) =>
                    !d.spent &&
                    !pendingWithdrawals.has(d.id) &&
                    d.status === DepositStatus.CONFIRMED
            );

            if (unspentDeposits.length !== 0) {
                const depositsNotesToUpdate =
                    await this._notesService.updateUnspentNotes(
                        unspentDeposits
                    );

                return this._blankDepositVault.setSpent(
                    depositsNotesToUpdate,
                    this._networkController.network.chainId
                );
            }
        } catch (error) {
            log.error('Error checking for possible spent notes');
        }
    };

    /**
     * Returns a set of non-failed pending withdrawals deposit ids
     */
    private getPendingWithdrawalsSet() {
        const { name } = this._networkController.network;

        const pendingWithdrawals = new Set(
            this._pendingWithdrawalsStore.store
                .getState()
                [name as AvailableNetworks].pending.filter(
                    (p) => p.status !== PendingWithdrawalStatus.FAILED
                )
                .map((i) => i.depositId)
        );
        return pendingWithdrawals;
    }

    public async getNoteString(deposit: IBlankDeposit): Promise<string> {
        const { chainId } = this._networkController.network;
        return this._notesService.getNoteString(deposit, chainId);
    }

    /**
     * It returns the relayer service status
     */
    public async getServiceStatus(): Promise<{
        status: boolean;
        error: string;
    }> {
        return (await this.getRelayerStatus()).health;
    }

    /**
     * Processes pending  withdrawals on current network
     */
    private checkCurrentNetworkPendingWithdrawals = async () => {
        const { name } = this._networkController.network;

        const storeWithdrawals = this._pendingWithdrawalsStore.store.getState();
        if (name && name in storeWithdrawals) {
            const withdrawals = storeWithdrawals[name as AvailableNetworks];

            // Check pending withdrawals for current network
            withdrawals.pending.forEach(this.checkPendingWithdrawal);
        }
    };

    /**
     * Processes pending deposits on current network
     */
    private checkCurrentNetworkPendingDeposits = async () => {
        const { chainId } = this._networkController.network;

        // Get pending deposits
        const deposits = (await this.getDeposits(chainId)).filter(
            (d) => d.status === DepositStatus.PENDING
        );

        // Get Blank Transactions
        const blankDepositsDict = {} as {
            [depositID: string]: {
                status: TransactionStatus;
                index: number;
                chainId?: number;
            };
        };
        const blankTransactionsMetas =
            this._transactionController.getBlankDepositTransactions(chainId);
        blankTransactionsMetas.forEach((d, index) => {
            blankDepositsDict[d.blankDepositId!] = {
                index,
                status: d.status,
                chainId: d.chainId,
            };
        });

        for (const deposit of deposits) {
            const { id } = deposit;
            if (id in blankDepositsDict) {
                // Check if it's in a final state and update it,
                // otherwise run an async function to process the pending deposit
                if (
                    getFinalTransactionStatuses().includes(
                        blankDepositsDict[id].status
                    )
                ) {
                    await this._blankDepositVault.updateDepositStatus(
                        id,
                        blankDepositsDict[id].status ===
                            TransactionStatus.CONFIRMED
                            ? DepositStatus.CONFIRMED
                            : DepositStatus.FAILED,
                        blankDepositsDict[id].chainId
                    );
                } else {
                    this.processPendingDeposit(
                        blankTransactionsMetas[blankDepositsDict[id].index]
                    );
                }
            } else {
                // In case the transaction is not present for some reason, fail the deposit
                await this._blankDepositVault.updateDepositStatus(
                    id,
                    DepositStatus.FAILED,
                    chainId
                );
            }
        }
    };

    /**
     * It checks for current network pending deposits & withdrawals
     */
    private checkCurrentNetworkPending = () => {
        // Run jobs
        this.checkCurrentNetworkPendingDeposits();
        this.checkCurrentNetworkPendingWithdrawals();
    };

    /**
     * Initializes the Tornado events IndexedDB
     */
    private initDepositsIndexedDb = async () => {
        return this._tornadoEventsDb.createStoreInstances();
    };

    public async initialize(): Promise<void> {
        // Update events db
        await this.initDepositsIndexedDb();

        // On init, drop the unsubmitted withdrawals and
        // check for pending withdrawals updates from the relayer
        this.dropUnsubmittedWithdrawals();
        this.checkCurrentNetworkPendingWithdrawals();

        // Init Prover worker
        await this._notesService.initialize();
    }

    /**
     * Initialize the vault used for the deposits
     * @param unlockPhrase
     * @returns
     */
    public async initializeVault(unlockPhrase: string): Promise<void> {
        return this._blankDepositVault.initializeVault(unlockPhrase);
    }

    /**
     * reinitialize the vault used for the deposits, overwrites existing vault
     * @param unlockPhrase
     * @returns
     */
    public async reinitializeVault(unlockPhrase: string): Promise<void> {
        return this._blankDepositVault.reinitializeVault(unlockPhrase);
    }

    /**
     * It updates the Tornado events on the specific store instance
     */
    private updateTornadoEvents = async (
        eventType: TornadoEvents,
        currencyAmountPair: CurrencyAmountPair,
        contract: Contract,
        forceUpdate = false
    ) => {
        // Obtain network name & features set
        const {
            name: networkName,
            features,
            chainId,
        } = this._networkController.network;

        // Get current stored events
        if (!features.includes(FEATURES.TORNADO)) {
            throw new Error('Current network is not supported');
        }

        let fromBlockEvent =
            tornadoDeployments[`netId${chainId}`].currencies[
                currencyAmountPair.currency
            ].instances[currencyAmountPair.amount].initialBlock;
        let fromIndexEvent = 0;

        if (!forceUpdate) {
            [fromBlockEvent, fromIndexEvent] = await Promise.all([
                await this._tornadoEventsDb.getLastQueriedBlock(
                    eventType,
                    networkName as AvailableNetworks,
                    currencyAmountPair
                ),
                this._tornadoEventsDb.getLastEventIndex(
                    eventType,
                    networkName as AvailableNetworks,
                    currencyAmountPair
                ),
            ]);
        }

        let fetchPromise: Promise<Deposit[] | Withdrawal[]>;

        if (eventType === TornadoEvents.DEPOSIT) {
            fetchPromise = this._tornadoEventsService.getDeposits({
                chainId: chainId,
                pair: currencyAmountPair,
                from: fromIndexEvent,
                chainOptions: { contract, fromBlock: fromBlockEvent },
            });
        } else {
            fetchPromise = this._tornadoEventsService.getWithdrawals({
                chainId: chainId,
                pair: currencyAmountPair,
                from: fromIndexEvent,
                chainOptions: { contract, fromBlock: fromBlockEvent },
            });
        }

        if (forceUpdate) {
            await this._tornadoEventsDb.truncateEvents(
                networkName as AvailableNetworks,
                currencyAmountPair,
                { type: eventType } as EventsUpdateType
            );
        }

        const events = await fetchPromise;

        if (events.length) {
            return Promise.all([
                // Update events
                this._tornadoEventsDb.updateEvents(
                    networkName as AvailableNetworks,
                    currencyAmountPair,
                    {
                        type: eventType,
                        events:
                            eventType === TornadoEvents.DEPOSIT
                                ? (events as Deposit[])
                                : (events as Withdrawal[]),
                    } as EventsUpdateType
                ),

                // Update last fetched block
                this._tornadoEventsDb.updateLastQueriedBlock(
                    eventType,
                    networkName as AvailableNetworks,
                    currencyAmountPair,
                    events[events.length - 1]!.blockNumber
                ),
            ]) as unknown as Promise<void>;
        }
    };

    public getStore(): IObservableStore<BlankDepositControllerStoreState> {
        return this
            ._composedStore as unknown as IObservableStore<BlankDepositControllerStoreState>;
    }

    /**
     * It returns the list of deposits for the current or specified network
     */
    public async getDeposits(chainId?: number): Promise<IBlankDeposit[]> {
        return this._blankDepositVault.getDeposits(chainId);
    }

    /**
     * Locks the vault to prevent decrypting and operating with it
     */
    public async lock(): Promise<void> {
        await this._blankDepositVault.lock();
        return this._notesService.initRootPath();
    }

    /**
     * Unlocks the vault with the provided unlockPhrase and
     * inits the root paths for the deposit keys with the provided mnemonic
     */
    public async unlock(unlockPhrase: string, mnemonic: string): Promise<void> {
        // Unlock the vault
        await this._blankDepositVault.unlock(unlockPhrase);

        const { chainId, features } = this._networkController.network;

        // Set tornado contract and init root path
        const isSupported = features.includes(FEATURES.TORNADO);

        // Set tornado contracts if on supported network
        if (isSupported) {
            await this.setTornadoContract(chainId);
        }

        await this._notesService.initRootPath(mnemonic);

        if (isSupported) {
            // Check for reconstruction phase not completed
            await this.checkIfReconstructionFailed();

            // Check if a pending deposit transaction was approved while the app was locked
            this.checkCurrentNetworkPendingDeposits();
        }
    }

    /**
     * It resolves to the proxy contract address
     *
     * @param proxy The proxy contract ENS or address
     */
    private async getProxyFromENS(proxy: string): Promise<string> {
        // If proxy is not an ENS return it as is
        if (proxy.slice(-3) !== 'eth') {
            return proxy;
        }

        const resolver = await this._networkController
            .getProvider()
            .getResolver(proxy);

        if (!resolver) {
            throw new Error('Unable to get resolver');
        }

        const address = await resolver.getAddress();

        if (!address) {
            throw new Error('Unable to get the address from the ENS');
        }

        return address;
    }

    /**
     * It returns the relayer url from the ENS key
     *
     * @param ens The Ethereum Naming Service key
     */
    private async getRelayerURLFromENS(key: string): Promise<string> {
        // If key is not an ENS return it as is
        if (key.slice(-3) !== 'eth') {
            return key;
        }

        const resolver = await this._networkController
            .getProvider()
            .getResolver(key);

        if (!resolver) {
            return key;
        }

        return resolver.getText('url');
    }

    /**
     * getRelayerStatus
     * It query the relayer for its status
     */
    private async getRelayerStatus() {
        const { name } = this._networkController.network;

        const relayerUrl = await this.getRelayerURLFromENS(
            relayers[name as AvailableNetworks]
        );

        if (!relayerUrl) {
            throw new Error('Relayer for this network is not available');
        }

        // Fetch relayer status
        const response = await fetch(`https://${relayerUrl}/status`);
        if (!response.ok) {
            throw new Error(
                `Unable to connect to the relayer: ${response.statusText}`
            );
        }
        const relayerStatus = await response.json();

        return {
            ...relayerStatus,
            relayerUrl,
            networkName: name,
            health: {
                ...relayerStatus.health,
                status: relayerStatus.health.status === 'true',
            },
        } as {
            rewardAccount: string;
            ethPrices: {
                [currency in Exclude<
                    KnownCurrencies,
                    KnownCurrencies.ETH
                >]: string;
            };
            miningServiceFee: number;
            tornadoServiceFee: number;
            relayerUrl: string;
            networkName: AvailableNetworks;
            health: { status: boolean; error: string };
        };
    }

    /**
     * Returns the list of deposits in the vault for
     * the specified currency amount pair
     *
     * @param currencyAmountPair The currency/amount
     */
    private async getDepositsFromPair(currencyAmountPair: CurrencyAmountPair) {
        const { deposits } = await this._blankDepositVault.getVault(
            this._networkController.network.chainId
        );
        const depositsForNetwork =
            deposits[this._networkController.network.name as AvailableNetworks]
                .deposits;

        return depositsForNetwork.filter(
            (d) =>
                d.pair.amount === currencyAmountPair.amount &&
                d.pair.currency === currencyAmountPair.currency
        );
    }

    public async getUnspentDepositCount(
        currencyAmountPair?: CurrencyAmountPair,
        chainId = this._networkController.network.chainId
    ): Promise<number | { [key in KnownCurrencies]?: PairCount }> {
        const { name } =
            this._networkController.getNetworkFromChainId(chainId)!;

        // Exclude pending withdrawals
        const pendingWithdrawals = this.getPendingWithdrawalsSet();

        if (currencyAmountPair) {
            return (await this.getDepositsFromPair(currencyAmountPair)).filter(
                (d) =>
                    d.spent === false &&
                    !pendingWithdrawals.has(d.id) &&
                    d.status === DepositStatus.CONFIRMED
            ).length;
        } else {
            const unspentDeposits = (await this.getDeposits()).filter(
                (d) =>
                    d.spent === false &&
                    !pendingWithdrawals.has(d.id) &&
                    d.status === DepositStatus.CONFIRMED
            );

            const depositsCount = {} as {
                [key in KnownCurrencies]: {
                    pair: CurrencyAmountPair;
                    count: number;
                }[];
            };

            for (const [currency, amountList] of Object.entries(
                CurrencyAmountArray
            )) {
                // If the currency is supported in the current network, obtain the deposit count
                if (
                    CurrenciesByChain[name as AvailableNetworks].includes(
                        currency as KnownCurrencies
                    )
                ) {
                    const value = await Promise.all(
                        amountList.map(async (amount: any) => ({
                            pair: { amount, currency } as CurrencyAmountPair,
                            count: unspentDeposits.filter(
                                (d) =>
                                    d.pair.amount === amount &&
                                    d.pair.currency ===
                                        (currency as KnownCurrencies)
                            ).length,
                        }))
                    );
                    depositsCount[currency as KnownCurrencies] = value;
                }
            }

            return depositsCount;
        }
    }

    public async getDepositCount(
        currencyAmountPair: CurrencyAmountPair
    ): Promise<number> {
        return (await this.getDepositsFromPair(currencyAmountPair)).length;
    }

    public async getLatestDepositDate(
        currencyAmountPair: CurrencyAmountPair
    ): Promise<Date> {
        const depositsFromPair = await this.getDepositsFromPair(
            currencyAmountPair
        );
        const latestDate = depositsFromPair.sort(
            (a, b) => b.timestamp - a.timestamp
        )[0].timestamp;
        return new Date(latestDate);
    }

    /**
     * It sets the Tornado contract for the specific network
     * @param chainId The chainId
     */
    private setTornadoContract = async (
        chainId: number,
        ignoreENSProxy = true
    ) => {
        // Clear previous instances
        this.tornadoContracts = new Map();

        let proxy: string =
            tornadoDeployments[`netId${chainId}`]['defaultProxy'];

        if (!ignoreENSProxy) {
            try {
                proxy = await this.getProxyFromENS(
                    tornadoDeployments[`netId${chainId}`]['proxy']
                );
            } catch (error) {
                log.debug(
                    'Error resolving from proxy ENS. Defaulting to contained address'
                );
            }
        }

        this.proxyContract = new Contract(
            proxy,
            TornadoProxyAbi,
            this._networkController.getProvider()
        ) as ITornadoContract;

        for (const token of Object.keys(
            tornadoDeployments[`netId${chainId}`].currencies
        )) {
            for (const depositValue of Object.keys(
                tornadoDeployments[`netId${chainId}`].currencies[token]
                    .instances
            )) {
                const depositCount = await this.getDepositCount({
                    currency: token as KnownCurrencies,
                    amount: depositValue as any,
                });

                this.tornadoContracts.set(`${token}-${depositValue}`, {
                    contract: new Contract(
                        tornadoDeployments[`netId${chainId}`].currencies[
                            token
                        ].instances[depositValue].address,
                        MixerAbi,
                        this._networkController.getProvider()
                    ) as ITornadoContract,
                    decimals:
                        tornadoDeployments[`netId${chainId}`].currencies[token]
                            .decimals,
                    tokenAddress:
                        tornadoDeployments[`netId${chainId}`].currencies[token]
                            .tokenAddress,
                    depositCount,
                });
            }
        }

        this._notesService.setTornadoContracts(this.tornadoContracts);
    };

    /**
     * dropUnsubmittedWithdrawals
     *
     * It transitions all the pending "UNSUBMITTED" withdrawals to "FAILED" status
     */
    private dropUnsubmittedWithdrawals = async () => {
        const pendingState = this._pendingWithdrawalsStore.store.getState();

        let pendingWithdrawals: PendingWithdrawal[] = [];
        for (const { pending } of Object.values(pendingState)) {
            pendingWithdrawals = pendingWithdrawals.concat(pending);
        }

        const unsubmittedWithdrawals = pendingWithdrawals.filter(
            (d) => d.status === PendingWithdrawalStatus.UNSUBMITTED
        );

        for (const unsubmitted of unsubmittedWithdrawals) {
            await this.updatePendingWithdrawal(unsubmitted.pendingId, {
                status: PendingWithdrawalStatus.FAILED,
                statusMessage:
                    'Transitioned from UNSUBMITTED to FAILED on boot',
                chainId: unsubmitted.chainId,
            });
        }
    };

    public async importNotes(
        unlockPhrase?: string,
        mnemonic?: string
    ): Promise<void> {
        return this._notesService.importNotes(unlockPhrase, mnemonic);
    }

    /**
     * Checks for the job status on the relayer and awaits for
     * the transaction receipt if confirmed.
     *
     * @param id The job id
     * @param relayerUrl The relayer URL
     */
    private getStatusFromRelayerJob(
        id: string,
        relayerURL: string,
        waitForConfirmation = true
    ): Promise<{ status: PendingWithdrawalStatus; txHash: string }> {
        return new Promise((resolve, reject) => {
            const getRelayerStatus = async () => {
                try {
                    const response = await fetch(
                        `https://${relayerURL}/v1/jobs/${id}`
                    );
                    if (response.ok) {
                        const responseJson = await response.json();
                        if (response.status === 200) {
                            const { txHash, status, failedReason } =
                                responseJson;

                            if (status === PendingWithdrawalStatus.FAILED) {
                                reject({
                                    status,
                                    message: parseRelayerError(failedReason),
                                });
                                return;
                            }

                            if (waitForConfirmation) {
                                if (
                                    status === PendingWithdrawalStatus.CONFIRMED
                                ) {
                                    resolve({ status, txHash });
                                    return;
                                }
                            } else {
                                if (txHash) {
                                    resolve({ status, txHash });
                                    return;
                                }
                            }
                        }
                    }
                } catch (err) {
                    log.debug(
                        'Unable to resolve call to check for withdrawal job, retrying...'
                    );
                }

                setTimeout(() => {
                    getRelayerStatus();
                }, 3000);
            };

            getRelayerStatus();
        });
    }

    public async withdraw(
        deposit: IBlankDeposit,
        recipient: string
    ): Promise<string> {
        const { tornadoServiceFee, rewardAccount, relayerUrl, ethPrices } =
            await this.getRelayerStatus();

        // Calculate withdrawal gas cost & fees.
        // Relayer always uses fast gas price on legacy, we use maxFeePerGas for EIP1559
        const gasPrices = this._gasPricesController.getGasPricesLevels();
        const { fee, decimals } = this.calculateFeeAndTotal(
            deposit.pair,
            tornadoServiceFee,
            gasPrices,
            ethPrices
        );

        const parsedDeposit = await this._notesService.parseDeposit(
            deposit.note
        );

        // Add job to pending withdrawal
        const pending = await this.addPendingWithdrawal(
            deposit,
            recipient,
            decimals,
            relayerUrl
        );
        // Process withdrawal asynchronously and return promise
        this.processWithdrawal(
            deposit,
            parsedDeposit,
            relayerUrl,
            recipient,
            rewardAccount,
            fee,
            pending
        );

        return '';
    }

    /**
     * Processes the withdrawal asynchronously
     */
    private async processWithdrawal(
        deposit: IBlankDeposit,
        parsedDeposit: Omit<INoteDeposit, 'depositIndex'> & {
            nullifier: Buffer;
            secret: Buffer;
        },
        relayerUrl: string,
        recipient: string,
        rewardAccount: string | number | undefined,
        fee: BigNumber,
        pendingWithdrawal: PendingWithdrawal
    ) {
        let proof: any, args: string[];
        let pending = pendingWithdrawal;
        try {
            // Generate proof
            ({ proof, args } = await this._notesService.generateProof(
                deposit.pair,
                parsedDeposit,
                recipient,
                rewardAccount,
                fee.toString()
            ));
        } catch (error) {
            await this.updatePendingWithdrawal(pending.pendingId, {
                status: PendingWithdrawalStatus.FAILED,
                statusMessage: `Failed generating proof: ${
                    error.message || error
                }`,
                chainId: pending.chainId,
            });
            throw error;
        }

        // Send transaction via relayer
        // (We must use the config file directly to prevent issues when changing network)
        const contractAddress =
            tornadoDeployments[`netId${deposit.chainId}`].currencies[
                deposit.pair.currency
            ].instances[deposit.pair.amount].address;

        // const contractKey = currencyAmountPairToMapKey(deposit.pair);
        // const contractAddress = this.tornadoContracts.get(contractKey)?.contract
        //     .address;

        if (!contractAddress) {
            throw new Error('Unsupported network');
        }

        await this.updatePendingWithdrawal(pending.pendingId, {
            statusMessage: 'Sending withdrawal to relayer',
            chainId: pending.chainId,
        });

        let relayData: { id: string };
        try {
            const relay = await fetch(
                `https://${relayerUrl}/v1/tornadoWithdraw`,
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contract: contractAddress,
                        proof,
                        args,
                    }),
                }
            );

            if (!relay.ok) {
                try {
                    const err = await relay.json();
                    throw new Error(err.error);
                } catch (error) {
                    throw new Error(relay.statusText);
                }
            }

            relayData = await relay.json();
        } catch (error) {
            const errMessage =
                'Error submitting the withdrawal transaction via the relayer. ' +
                    error.message || error;
            await this.updatePendingWithdrawal(pending.pendingId, {
                status: PendingWithdrawalStatus.FAILED,
                errMessage,
                statusMessage: '',
                chainId: pending.chainId,
            });
            return;
        }

        // Add job to pending withdrawal
        pending = await this.updatePendingWithdrawal(pending.pendingId, {
            jobId: relayData.id,
            status: PendingWithdrawalStatus.PENDING,
            fee,
            statusMessage: 'Awaiting the relayer to proccess the withdrawal',
            chainId: pending.chainId,
        });

        // Start resolving the withdrawal asynchronously
        this.checkPendingWithdrawal(pending);

        // Wait for tx and return as soon as transaction is accepted
        try {
            const { txHash } = await this.getStatusFromRelayerJob(
                pending.jobId,
                pending.relayerUrl,
                false
            );

            if (txHash) {
                await this.updatePendingWithdrawal(pending.pendingId, {
                    statusMessage:
                        'Awaiting for the transaction to be confirmed',
                    transactionHash: txHash,
                    chainId: pending.chainId,
                });
            }
        } catch (error) {
            const errMessage =
                'Error submitting the withdrawal transaction via the relayer. ' +
                    error.message || error;
            await this.updatePendingWithdrawal(pending.pendingId, {
                status: PendingWithdrawalStatus.FAILED,
                errMessage,
                statusMessage: '',
                chainId: pending.chainId,
            });
        }
    }

    /**
     * Updates a pending withdrawal transaction
     * @param depositId The withdraw deposit id
     */
    private async updatePendingWithdrawal(
        pendingId: string,
        pendingWithdrawal: Partial<PendingWithdrawal>
    ) {
        // Lock store
        const { releaseMutexLock } =
            await this._pendingWithdrawalsStore.getStoreMutexLock();

        try {
            // At this point, chainId is always ensured.
            // Also, network will always be found, given that Tornado chains
            // mustn't be allowed to be removed
            const { name } = this._networkController.getNetworkFromChainId(
                pendingWithdrawal.chainId!
            )!;

            const pendingWithdrawals = [
                ...this._pendingWithdrawalsStore.store.getState()[
                    name as AvailableNetworks
                ].pending,
            ];

            const pendingWithdrawalIndex = pendingWithdrawals.findIndex(
                (p) => p.pendingId === pendingId
            );
            if (pendingWithdrawalIndex < 0) {
                throw new Error('Pending withdrawal not found');
            }

            // Remove chainId so it won't get updated
            delete pendingWithdrawal['chainId'];

            pendingWithdrawals[pendingWithdrawalIndex] = {
                ...pendingWithdrawals[pendingWithdrawalIndex],
                ...pendingWithdrawal,
            };

            this._pendingWithdrawalsStore.store.updateState({
                [name as AvailableNetworks]: {
                    pending: [...pendingWithdrawals],
                },
            });

            return pendingWithdrawals[pendingWithdrawalIndex];
        } finally {
            releaseMutexLock();
        }
    }

    /**
     * Adds a pending withdrawal transaction to the queue
     *
     * @param depositId The deposit id
     * @param pair The deposit pair
     * @param toAddress The withdrawal recipient
     * @param relayerUrl The relayer url
     */
    private async addPendingWithdrawal(
        { id: depositId, pair }: IBlankDeposit,
        toAddress: string,
        decimals: number,
        relayerUrl: string
    ) {
        // Lock store
        const { releaseMutexLock } =
            await this._pendingWithdrawalsStore.getStoreMutexLock();

        const { name, chainId } = this._networkController.network;

        const pendingWithdrawals =
            this._pendingWithdrawalsStore.store.getState()[
                name as AvailableNetworks
            ];

        const pending: PendingWithdrawal = {
            pendingId: uuid(),
            depositId,
            pair,
            toAddress,
            relayerUrl,
            status: PendingWithdrawalStatus.UNSUBMITTED,
            time: new Date().getTime(),
            decimals,
            jobId: '',
            errMessage: '',
            statusMessage: 'Generating proof',
            chainId,
        };

        this._pendingWithdrawalsStore.store.updateState({
            [name as AvailableNetworks]: {
                pending: [...pendingWithdrawals.pending, pending],
            },
        });

        releaseMutexLock();

        return pending;
    }

    /**
     * It returns the Withdrawal gas cost and fees using the FAST option (as the relayer does)
     */
    public async getWithdrawalFees(pair: CurrencyAmountPair): Promise<{
        relayerFee: BigNumber;
        gasFee: BigNumber;
        totalFee: BigNumber;
        total: BigNumber;
    }> {
        const { tornadoServiceFee, ethPrices } = await this.getRelayerStatus();

        // Calculate withdrawal gas cost & fees.
        // Relayer always uses fast gas price on legacy, we use maxFeePerGas for EIP1559
        const gasPrices = this._gasPricesController.getGasPricesLevels();
        const { fee, total, feePercent, gasCost } = this.calculateFeeAndTotal(
            pair,
            tornadoServiceFee,
            gasPrices,
            ethPrices
        );

        return {
            relayerFee: feePercent,
            gasFee: gasCost,
            totalFee: fee,
            total,
        };
    }

    /**
     * calculateFee
     *
     * It returns the withdrawal fee
     *
     * @param amount
     * @param relayerServiceFee
     */
    public calculateFeeAndTotal(
        currencyAmountPair: CurrencyAmountPair,
        relayerServiceFee: number,
        gasPrices: GasPriceLevels,
        ethPrices: {
            [key in ERC20KnownCurrencies]: string;
        }
    ): {
        total: BigNumber;
        fee: BigNumber;
        decimals: number;
        gasCost: BigNumber;
        feePercent: BigNumber;
    } {
        // Get Token decimals
        const decimals = this.tornadoContracts.get(
            currencyAmountPairToMapKey(currencyAmountPair)
        )?.decimals;

        if (!decimals) {
            throw new Error('Token decimals are not present on config');
        }

        // Parse relayer service fee
        const decimalsPoint =
            Math.floor(relayerServiceFee) === Number(relayerServiceFee)
                ? 0
                : relayerServiceFee.toString().split('.')[1].length;

        const relayerServiceFeeBN = utils.parseUnits(
            relayerServiceFee.toString(),
            decimalsPoint
        );

        const roundDecimal = 10 ** decimalsPoint;

        // If gasPrice is undefined, then it is EIP-1559
        let fastPrice: BigNumber;
        if (gasPrices.fast.gasPrice) {
            const gasPriceFast = BigNumber.from(gasPrices.fast.gasPrice);

            if (currencyAmountPair.currency !== KnownCurrencies.BNB) {
                // Gas bump based on Tornado cli fee calculation
                let fivePercent = BnMultiplyByFraction(gasPriceFast, 5, 100);
                const minValue = utils.parseUnits('3', 'gwei');
                fivePercent = fivePercent.lt(minValue) ? minValue : fivePercent;

                // Set bumped gas price
                fastPrice = gasPriceFast.add(fivePercent);
            } else {
                // In BSC gas price is always 5 gwei, so we must use always the average price
                // with no need for bumping it an extra 5%.
                fastPrice = BigNumber.from(gasPrices.average.gasPrice);
            }
        } else {
            // The relayer checks for the fee using the baseFee, for checking for the desired fee,
            // using here the maxFeePerGas we make it inclusive of the priority tip as well.
            fastPrice = gasPrices.fast.maxFeePerGas!;
        }

        // Calculate expense and total
        const expense = BigNumber.from(fastPrice).mul(
            BigNumber.from(WITHDRAWAL_GAS_LIMIT)
        );
        const total = utils.parseUnits(currencyAmountPair.amount, decimals);

        // fee to add to the total gas cost
        const feePercent = total
            .mul(relayerServiceFeeBN)
            .div(BigNumber.from(roundDecimal * 100));

        let desiredFee;
        // If user is depositing a native currency
        if (isNativeCurrency(currencyAmountPair.currency)) {
            desiredFee = expense.add(feePercent);
        } else {
            // If ERC20
            desiredFee = expense
                .mul(BigNumber.from(10).pow(decimals))
                .div(ethPrices[currencyAmountPair.currency]);

            desiredFee = desiredFee.add(feePercent);
        }

        return {
            total,
            fee: desiredFee,
            decimals,
            gasCost: desiredFee.sub(feePercent),
            feePercent,
        };
    }

    public async populateDepositTransaction(
        currencyAmountPair: CurrencyAmountPair,
        chainId?: number,
        customNonce?: number
    ): Promise<{
        populatedTransaction: ethers.PopulatedTransaction;
        nextDeposit: NextDepositResult['nextDeposit'];
    }> {
        // Get next free deposit & possible recovered ones
        const { nextDeposit, recoveredDeposits } =
            await this._notesService.getNextFreeDeposit(
                currencyAmountPair,
                false,
                chainId
            );

        if (recoveredDeposits) {
            this._blankDepositVault.addDeposits(recoveredDeposits, chainId);
        }

        const depositTransaction = this.getDepositTransaction();

        const populatedTransaction =
            await depositTransaction.populateTransaction({
                currencyAmountPair,
                nextDeposit,
            });

        if (customNonce) {
            populatedTransaction.nonce = customNonce;
        }

        return {
            populatedTransaction,
            nextDeposit,
        };
    }

    public async addAsNewDepositTransaction(
        currencyAmountPair: CurrencyAmountPair,
        populatedTransaction: ethers.PopulatedTransaction,
        feeData: TransactionFeeData
    ): Promise<TransactionMeta> {
        const depositTransaction = this.getDepositTransaction();

        return depositTransaction.addAsNewDepositTransaction(
            currencyAmountPair,
            populatedTransaction,
            feeData
        );
    }

    public async updateDepositTransactionGas(
        transactionId: string,
        feeData: TransactionFeeData
    ): Promise<void> {
        const depositTransaction = this.getDepositTransaction();

        return depositTransaction.updateTransactionGas(transactionId, feeData);
    }

    public async approveDepositTransaction(
        transactionId: string,
        currencyAmountPair?: CurrencyAmountPair,
        chainId: number = this._networkController.network.chainId,
        nextDeposit?: NextDepositResult['nextDeposit']
    ): Promise<void> {
        // Obtain previously generated unsubmitted transaction
        const transactionMeta =
            this._transactionController.getTransaction(transactionId);

        if (!transactionMeta) {
            throw new Error(`Deposit transaction (${transactionId}) not found`);
        }

        // Enforce having a correct pair
        currencyAmountPair = currencyAmountPair ?? transactionMeta.depositPair;

        if (!currencyAmountPair) {
            throw new Error(
                `Deposit transaction (${transactionId}) has a wrong pair set`
            );
        }

        if (!nextDeposit) {
            ({ nextDeposit } = await this._notesService.getNextFreeDeposit(
                currencyAmountPair,
                false,
                chainId
            ));
        }

        // Add the deposit to the vault
        await this._blankDepositVault.addDeposits(
            [
                {
                    id: transactionMeta.blankDepositId!,
                    note: nextDeposit.deposit.preImage.toString('hex'),
                    nullifierHex: nextDeposit.deposit.nullifierHex,
                    pair: nextDeposit.pair,
                    timestamp: new Date().getTime(),
                    spent: false,
                    depositAddress:
                        this._preferencesController.getSelectedAddress(),
                    status: DepositStatus.PENDING,
                    depositIndex: nextDeposit.deposit.depositIndex,
                    chainId,
                },
            ],
            chainId
        );

        // Start processing pending deposit (If transactions fails on approving phase this will set the deposit to failed)
        this.processPendingDeposit(transactionMeta);

        // Approve transaction
        const depositTransaction = this.getDepositTransaction();

        return depositTransaction.approveTransaction(transactionMeta.id);
    }

    public async getDepositTransactionResult(
        transactionId: string
    ): Promise<string> {
        const depositTransaction = this.getDepositTransaction();

        return depositTransaction.getTransactionResult(transactionId);
    }

    public async calculateDepositTransactionGasLimit(
        currencyAmountPair: CurrencyAmountPair,
        chainId = this._networkController.network.chainId
    ): Promise<TransactionGasEstimation> {
        const depositTransaction = this.getDepositTransaction();

        // Get next free deposit
        const { nextDeposit } = await this._notesService.getNextFreeDeposit(
            currencyAmountPair,
            false,
            chainId
        );

        return depositTransaction.calculateTransactionGasLimit({
            currencyAmountPair,
            nextDeposit,
        } as DepositTransactionPopulatedTransactionParams);
    }

    private getDepositTransaction(): DepositTransaction {
        return new DepositTransaction({
            networkController: this._networkController,
            preferencesController: this._preferencesController,
            transactionController: this._transactionController,
            proxyContract: this.proxyContract,
            tornadoContracts: this.tornadoContracts,
            tokenController: this._tokenController,
            tokenOperationsController: this._tokenOperationsController,
        });
    }

    public async getInstanceTokenAllowance(
        pair: CurrencyAmountPair
    ): Promise<BigNumber> {
        return this.getDepositTransaction().getTokenAllowance(pair);
    }

    /**
     * Initiates a deposit generation
     *
     * @param currencyAmountPair Currency - Amount pair
     * @param feeData Transaction fee data
     * @param customNonce Custom transaction nonce
     */
    public async deposit(
        currencyAmountPair: CurrencyAmountPair,
        feeData: TransactionFeeData,
        customNonce?: number
    ): Promise<string> {
        // Lock on deposit generation to prevent race condition on keys derivation
        const releaseLock = await this._depositLock.acquire();
        try {
            const { chainId } = this._networkController.network;
            const { populatedTransaction, nextDeposit } =
                await this.populateDepositTransaction(
                    currencyAmountPair,
                    chainId,
                    customNonce
                );

            const transactionMeta = await this.addAsNewDepositTransaction(
                currencyAmountPair,
                populatedTransaction,
                feeData
            );

            await this.approveDepositTransaction(
                transactionMeta.id,
                currencyAmountPair,
                chainId,
                nextDeposit
            );

            return this.getDepositTransactionResult(transactionMeta.id);
        } finally {
            releaseLock();
        }
    }

    /**
     * Submits an approval transaction to setup asset allowance
     *
     * @param allowance User selected allowance
     * @param feeData Deposit gas fee data
     * @param pair The deposit currency and amount values
     */
    public async depositAllowance(
        allowance: BigNumber,
        feeData: TransactionFeeData,
        pair: CurrencyAmountPair
    ): Promise<boolean> {
        const depositTransaction = this.getDepositTransaction();

        return depositTransaction.depositAllowance(allowance, feeData, pair);
    }

    /**
     * It processes a pending deposit transaction
     *
     * @param meta The transaction meta
     * @param [confirmations] The number of confirmations before marking a deposit as CONFIRMED
     * @param [timeout] Timeout for confirmations counting
     */
    private async processPendingDeposit(meta: TransactionMeta) {
        const provider = this._networkController.getProvider();

        // Check that meta is from the provider chain
        if (provider.network.chainId !== meta.chainId) {
            return;
        }

        if (!meta.blankDepositId) {
            throw new Error('Not a Blank deposit');
        }
        let depositStatus: DepositStatus;
        try {
            // Wait for transaction confirmation
            // For deposits, transaction waits for 4 confirmation
            await this._transactionController.waitForTransactionResult(
                meta.id,
                true
            );

            // Set deposit status to confirmed
            depositStatus = DepositStatus.CONFIRMED;
        } catch (error) {
            // Set deposit status to failed
            depositStatus = DepositStatus.FAILED;
            log.debug(
                'BlankDeposits - Failing deposit as transaction was not confirmed. ' +
                    error.message || error
            );
        }

        // Update deposit state only if vault is still unlocked
        // && network is still the same
        if (this.isUnlocked) {
            return this._blankDepositVault.updateDepositStatus(
                meta.blankDepositId,
                depositStatus,
                meta.chainId
            );
        }
    }
}
