import { BigNumber } from '@ethersproject/bignumber';
import { parseUnits } from 'ethers/lib/utils';
import { BaseController } from '../infrastructure/BaseController';
import { Network } from '../utils/constants/networks';
import { PrivacyAsyncController } from './privacy/PrivacyAsyncController';
import { PendingWithdrawal } from './privacy/types';
import { transactionToIncomingBridgeTransactionPlaceholder } from '../utils/incomingBridgePlaceholder';
import BridgeController, { BRIDGE_PENDING_STATUSES } from './BridgeController';
import NetworkController from './NetworkController';
import { PreferencesController } from './PreferencesController';
import { TransactionController } from './transactions/TransactionController';
import {
    getFinalTransactionStatuses,
    MetaType,
    TransactionCategories,
    TransactionMeta,
    TransactionStatus,
} from './transactions/utils/types';
import { compareAddresses } from './transactions/utils/utils';
import {
    TransactionTypeEnum,
    TransactionWatcherController,
} from './TransactionWatcherController';

export interface IActivityListState {
    activityList: {
        pending: TransactionMeta[];
        confirmed: TransactionMeta[];
    };
}

// PendingWithdrawalStatus for chunking purposes.
enum PendingWithdrawalStatus {
    UNSUBMITTED = 'UNSUBMITTED',
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    FAILED = 'FAILED',
    REJECTED = 'REJECTED',
    MINED = 'MINED',
}

export class ActivityListController extends BaseController<IActivityListState> {
    constructor(
        private readonly _transactionsController: TransactionController,
        private readonly _privacyController: PrivacyAsyncController,
        private readonly _preferencesController: PreferencesController,
        private readonly _networkController: NetworkController,
        private readonly _transactionWatcherController: TransactionWatcherController,
        private readonly _bridgeController: BridgeController
    ) {
        super();

        // If any of the following stores were updated trigger the ActivityList update
        this._transactionsController.UIStore.subscribe(this.onStoreUpdate);
        this._privacyController.UIStore.subscribe(this.onStoreUpdate);
        this._preferencesController.store.subscribe(this.onStoreUpdate);
        this._networkController.store.subscribe(this.onStoreUpdate);
        this._transactionWatcherController.store.subscribe(this.onStoreUpdate);
        this._bridgeController.store.subscribe(this.onStoreUpdate);
        this.onStoreUpdate();
    }

    /**
     * Ensure that 'currency' will be uppercase
     *
     * @param transactionMeta
     * @returns TransactionMeta with currency text uppercase
     */
    private transactionSymbolTransformation = (
        transactionMeta: TransactionMeta
    ): TransactionMeta => {
        if (transactionMeta.transferType?.currency) {
            transactionMeta.transferType.currency =
                transactionMeta.transferType.currency.toUpperCase();
        }
        return transactionMeta;
    };

    /**
     * Triggers on UI store update
     */
    private onStoreUpdate = () => {
        const { selectedAddress } =
            this._preferencesController.store.getState();

        const { network } = this._networkController;

        // Get parsed transactions
        const {
            confirmed: confirmedTransactions,
            pending: pendingTransactions,
        } = this.parseTransactions(selectedAddress);

        // Get parsed watched transactions
        const watchedTransactions = this.parseWatchedTransactions(
            network.chainId,
            selectedAddress
        );

        //Pending bridges placeholders for the current network
        const pendingIncomingBridgePlaceholders =
            this._parsePendingIncomingBridgePlaceholders();

        const confirmedIncomingBridgeTransactions =
            this.parseBridgeReceivingTransactions(
                network.chainId,
                selectedAddress
            );

        // Get parsed withdrawals
        const { confirmed: confirmedWithdrawals, pending: pendingWithdrawals } =
            this.parseWithdrawalTransactions(selectedAddress, network);

        // Concat all and order by time
        const confirmedConcated = confirmedTransactions
            .concat(confirmedWithdrawals)
            .concat(confirmedIncomingBridgeTransactions)
            .concat(watchedTransactions)
            .filter(
                (t1, index, self) =>
                    index ===
                    self.findIndex((t2) => {
                        const h1 = this.pickHash(t1);
                        const h2 = this.pickHash(t2);
                        return h1 && h2 && h1 === h2;
                    })
            );

        // sort
        const confirmedSorted = confirmedConcated
            .sort((t1, t2) => {
                t1 = this.getEffectiveTransaction(t1, confirmedConcated);
                t2 = this.getEffectiveTransaction(t2, confirmedConcated);

                const aBn = t1.transactionReceipt?.blockNumber || 0;
                const bBn = t2.transactionReceipt?.blockNumber || 0;

                if (aBn == bBn) {
                    if (
                        t2.transactionParams.nonce &&
                        t1.transactionParams.nonce
                    ) {
                        return (
                            t2.transactionParams.nonce -
                            t1.transactionParams.nonce
                        );
                    } else if (t1.transactionReceipt && t2.transactionReceipt) {
                        if (
                            t1.transactionReceipt.transactionIndex &&
                            t2.transactionReceipt.transactionIndex
                        ) {
                            return (
                                t2.transactionReceipt.transactionIndex -
                                t1.transactionReceipt.transactionIndex
                            );
                        }
                    }
                }

                // Confirmed ones ordered by block number descending
                return bBn - aBn;
            })
            .map((c: TransactionMeta) => {
                return this.transactionSymbolTransformation(c);
            });

        // Pendings ordered by time descending
        const pending = pendingWithdrawals
            .concat(pendingTransactions)
            .concat(pendingIncomingBridgePlaceholders)
            .sort((a, b) => a.time - b.time)
            .map((c: TransactionMeta) => {
                return this.transactionSymbolTransformation(c);
            });

        // Update state
        this.store.setState({
            activityList: {
                confirmed: confirmedSorted,
                pending,
            },
        });
    };

    /**
     * parseTransactions
     *
     * @param selectedAddress The user selected address
     * @returns The list of the user pending and confirmed transactions
     */
    private parseTransactions(selectedAddress: string) {
        // Filter by user outgoing transactions only
        const fromUser = (transaction: TransactionMeta) =>
            compareAddresses(
                transaction.transactionParams.from,
                selectedAddress
            );

        // Whether the transaction is on one of its final states
        const isOnFinalState = (t: TransactionMeta) =>
            getFinalTransactionStatuses().includes(t.status);

        const { transactions } =
            this._transactionsController.UIStore.getState();
        const userTransactions = transactions.filter(fromUser);

        return {
            confirmed: userTransactions.filter(isOnFinalState),
            pending: userTransactions.filter(
                (t) => t.status === TransactionStatus.SUBMITTED
            ),
        };
    }

    /**
     * parseWatchedTransactions
     *
     * @returns The watched transactions
     */
    private parseWatchedTransactions(
        chainId: number,
        selectedAddress: string
    ): TransactionMeta[] {
        const { transactions } =
            this._transactionWatcherController.store.getState();

        const watchedTransactions: TransactionMeta[] = [];

        if (chainId in transactions) {
            if (selectedAddress in transactions[chainId]) {
                const transactionsByAddress =
                    transactions[chainId][selectedAddress];

                for (const type in transactionsByAddress) {
                    const transactionType = type as TransactionTypeEnum;

                    const { transactions: transactionsByType } =
                        transactionsByAddress[transactionType];

                    for (const transactionHash in transactionsByType) {
                        watchedTransactions.push(
                            transactionsByType[transactionHash]
                        );
                    }
                }
            }
        }

        return watchedTransactions;
    }

    /**
     * parseBridgeReceivingTransactions
     *
     * @returns The incoming bridge transactions
     */
    private parseBridgeReceivingTransactions(
        chainId: number,
        selectedAddress: string
    ): TransactionMeta[] {
        const { bridgeReceivingTransactions } =
            this._bridgeController.store.getState();

        if (chainId in (bridgeReceivingTransactions || {})) {
            if (selectedAddress in bridgeReceivingTransactions[chainId]) {
                return (
                    Object.values(
                        bridgeReceivingTransactions[chainId][selectedAddress]
                    ) || []
                );
            }
        }

        return [];
    }

    /**
     * parseWithdrawalTransactions
     *
     * @returns The user pending and confirmed withdrawals
     */
    private parseWithdrawalTransactions(
        selectedAddress: string,
        network: Network
    ) {
        const { pendingWithdrawals } =
            this._privacyController.UIStore.getState();

        const { nativeCurrency } = network;

        if (!pendingWithdrawals) {
            return {
                confirmed: [],
                pending: [],
            };
        }

        const statusMap: {
            [key in PendingWithdrawalStatus]: TransactionStatus;
        } = {
            [PendingWithdrawalStatus.PENDING]: TransactionStatus.SUBMITTED,
            [PendingWithdrawalStatus.UNSUBMITTED]: TransactionStatus.SUBMITTED,
            [PendingWithdrawalStatus.CONFIRMED]: TransactionStatus.CONFIRMED,
            [PendingWithdrawalStatus.MINED]: TransactionStatus.CONFIRMED,
            [PendingWithdrawalStatus.FAILED]: TransactionStatus.FAILED,
            [PendingWithdrawalStatus.REJECTED]: TransactionStatus.REJECTED,
        };

        const mapFc = (w: PendingWithdrawal): TransactionMeta => {
            const decimals = w.decimals || nativeCurrency.decimals; // Default to ETH
            const amount = parseUnits(w.pair.amount, decimals).sub(
                w.fee ? BigNumber.from(w.fee) : BigNumber.from(0)
            );

            return {
                id: w.depositId,
                status: statusMap[
                    w.status || PendingWithdrawalStatus.UNSUBMITTED
                ],
                time: w.time,
                confirmationTime: w.time,
                transactionParams: {
                    to: w.toAddress,
                    from: w.transactionReceipt?.from,
                    value: w.value,
                    hash: w.transactionHash,
                    gasPrice: w.gasPrice,
                    nonce: w.nonce,
                    gasLimit: w.gasLimit,
                    maxFeePerGas:
                        w.transactionReceipt?.effectiveGasPrice ||
                        w.maxFeePerGas,
                    maxPriorityFeePerGas: w.maxPriorityFeePerGas,
                },
                transferType: {
                    amount,
                    decimals,
                    currency: w.pair.currency.toUpperCase(),
                },
                transactionReceipt: w.transactionReceipt,
                transactionCategory: TransactionCategories.BLANK_WITHDRAWAL,
                loadingGasValues: false,
                metaType: MetaType.REGULAR,
                blocksDropCount: 0,
                methodSignature: w.methodSignature,
                advancedData: {
                    withdrawFee: w.fee,
                },
            };
        };

        const confirmed = pendingWithdrawals
            .filter(
                (w) =>
                    w.status &&
                    [
                        PendingWithdrawalStatus.CONFIRMED,
                        PendingWithdrawalStatus.FAILED,
                        PendingWithdrawalStatus.REJECTED,
                    ].includes(w.status) &&
                    w.toAddress === selectedAddress
            )
            .map(mapFc);

        const pending = pendingWithdrawals
            .filter((w) =>
                [
                    PendingWithdrawalStatus.PENDING,
                    PendingWithdrawalStatus.UNSUBMITTED,
                ].includes(w.status || PendingWithdrawalStatus.UNSUBMITTED)
            )
            .map(mapFc);

        return { confirmed, pending };
    }

    /**
     * _parsePendingIncomingBridgePlaceholders
     *
     *  Incoming bridges that may or may not be converted into an incoming transaction for this network and account.
     *  - If the bridge is completed successfully, then it will appear as a trasnaction gathered by the BridgingController.
     *  - If the bridge failed, it will be filtered by the  tx.bridgeParams.status === BridgeStatus.PENDING condition
     *
     * @returns pending bridges placeholders for the destination network
     */
    private _parsePendingIncomingBridgePlaceholders(): TransactionMeta[] {
        const pendingIncomingBridgePlaceholders =
            this._transactionsController.store
                .getState()
                .transactions.filter((tx) => {
                    const { bridgeParams, transactionCategory, status } = tx;
                    if (!bridgeParams || !bridgeParams.status) {
                        return false;
                    }

                    return (
                        // Sending tx category is Bridge
                        transactionCategory === TransactionCategories.BRIDGE &&
                        // Destination chain transaction is the selected one
                        Number(tx.bridgeParams?.toChainId) ===
                            Number(this._networkController.network.chainId) &&
                        //There is no receiving hash YET
                        !bridgeParams.receivingTxHash &&
                        // Bridge is in a pending status
                        BRIDGE_PENDING_STATUSES.includes(bridgeParams.status) &&
                        // Sending transaction is submitted or confirmed
                        [
                            TransactionStatus.SUBMITTED,
                            TransactionStatus.CONFIRMED,
                        ].includes(status)
                    );
                })
                .map((tx) =>
                    transactionToIncomingBridgeTransactionPlaceholder(
                        tx,
                        this._networkController.network.chainId
                    )
                );

        return pendingIncomingBridgePlaceholders;
    }

    /**
     * Returns the hash of a transaction.
     * @param transaction
     * @returns
     */
    private pickHash(transaction: TransactionMeta): string | undefined {
        if (
            transaction.transactionParams &&
            transaction.transactionParams.hash
        ) {
            return transaction.transactionParams.hash;
        }
        if (
            transaction.transactionReceipt &&
            transaction.transactionReceipt.transactionHash
        ) {
            return transaction.transactionReceipt.transactionHash;
        }

        return undefined;
    }

    /**
     * If a transactions was replaced by a new one it returns the new one.
     * @param transaction
     * @param transactions
     * @returns
     */
    private getEffectiveTransaction(
        transaction: TransactionMeta,
        transactions: TransactionMeta[]
    ): TransactionMeta {
        if (transaction.replacedBy) {
            const replace = transactions.find(
                (t1) => t1.id === transaction.replacedBy
            );
            if (replace) {
                return replace;
            }
        }
        return transaction;
    }

    /**
     * Removes all activities from state
     *
     */
    public clearActivities(): void {
        this.store.setState({
            activityList: {
                pending: [],
                confirmed: [],
            },
        });
    }
}
