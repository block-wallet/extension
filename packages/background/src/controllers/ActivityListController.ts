import { BigNumber } from '@ethersproject/bignumber';
import isTokenExcluded from 'banned-assets';
import { parseUnits } from 'ethers/lib/utils';
import { BaseController } from '../infrastructure/BaseController';
import { Network } from '../utils/constants/networks';
import {
    BlankDepositController,
    PendingWithdrawal,
    PendingWithdrawalStatus,
} from './blank-deposit/BlankDepositController';
import { TransactionWatcherController } from './erc-20/TransactionWatcherController';
import { IncomingTransactionController } from './IncomingTransactionController';
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

export interface IActivityListState {
    activityList: {
        pending: TransactionMeta[];
        confirmed: TransactionMeta[];
    };
}

export class ActivityListController extends BaseController<IActivityListState> {
    constructor(
        private readonly _transactionsController: TransactionController,
        private readonly _blankDepositsController: BlankDepositController,
        private readonly _incomingTransactionsController: IncomingTransactionController,
        private readonly _preferencesController: PreferencesController,
        private readonly _networkController: NetworkController,
        private readonly _transactionWatcherController: TransactionWatcherController
    ) {
        super();

        // If any of the following stores were updated trigger the ActivityList update
        this._transactionsController.UIStore.subscribe(this.onStoreUpdate);
        this._blankDepositsController.UIStore.subscribe(this.onStoreUpdate);
        this._incomingTransactionsController.store.subscribe(
            this.onStoreUpdate
        );
        this._preferencesController.store.subscribe(this.onStoreUpdate);
        this._networkController.store.subscribe(this.onStoreUpdate);
        this._transactionWatcherController.store.subscribe(this.onStoreUpdate);
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

        const { selectedNetwork, network } = this._networkController;

        // Get parsed transactions
        const {
            confirmed: confirmedTransactions,
            pending: pendingTransactions,
        } = this.parseTransactions(selectedAddress);

        // Get parsed incoming transactions
        const incomingTransactions = this.parseIncomingTransactions(
            selectedAddress,
            selectedNetwork,
            [confirmedTransactions]
        );

        // Get parsed withdrawals
        const { confirmed: confirmedWithdrawals, pending: pendingWithdrawals } =
            this.parseWithdrawalTransactions(selectedAddress, network);

        const confirmedERC20TransferTransactions =
            this.parseERC20TransferTransactions(
                network.chainId,
                selectedAddress,
                [
                    incomingTransactions,
                    confirmedWithdrawals,
                    pendingWithdrawals,
                    confirmedTransactions,
                    pendingTransactions,
                ]
            );

        // Concat all and order by time
        const confirmedConcated = confirmedTransactions
            .concat(confirmedWithdrawals)
            .concat(incomingTransactions)
            .concat(confirmedERC20TransferTransactions)
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
     * parseIncomingTransactions
     *
     * @param selectedAddress The user selected address
     * @param selectedNetwork The user selected network
     * @returns The user incoming transactions
     */
    private parseIncomingTransactions(
        selectedAddress: string,
        selectedNetwork: string,
        transactionsArraysToFilter: TransactionMeta[][]
    ) {
        const { incomingTransactions } =
            this._incomingTransactionsController.store.getState();

        if (
            incomingTransactions &&
            selectedAddress in incomingTransactions &&
            selectedNetwork in incomingTransactions[selectedAddress]
        ) {
            let transactions = Object.values(
                incomingTransactions[selectedAddress][selectedNetwork].list
            );
            transactionsArraysToFilter.forEach(
                (transactionsToFilter: TransactionMeta[]) => {
                    transactions = transactions.filter(
                        (t1: TransactionMeta) => {
                            return !transactionsToFilter.some(
                                (t2: TransactionMeta) => {
                                    const h1 = this.pickHash(t1);
                                    const h2 = this.pickHash(t2);
                                    return h1 && h2 && h1 === h2;
                                }
                            );
                        }
                    );
                }
            );
            return transactions;
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
            this._blankDepositsController.UIStore.getState();

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
            const value = parseUnits(w.pair.amount, decimals).sub(
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
                    value,
                    hash: w.transactionHash,
                    // Set withdrawal fee on gasPrice for the sake of providing it to the UI
                    gasPrice: w.fee,
                },
                transferType: {
                    amount: value,
                    decimals: w.decimals!,
                    currency: w.pair.currency.toUpperCase(),
                },
                transactionReceipt: w.transactionReceipt,
                transactionCategory: TransactionCategories.BLANK_WITHDRAWAL,
                loadingGasValues: false,
                metaType: MetaType.REGULAR,
                blocksDropCount: 0,
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

    private parseERC20TransferTransactions(
        chainId: number,
        selectedAddress: string,
        transactionsArraysToFilter: TransactionMeta[][]
    ) {
        const { incomingTransactions, outgoingTransactions } =
            this._transactionWatcherController.getState(
                chainId,
                selectedAddress
            );

        let transactions: TransactionMeta[] = [];

        for (const transactionHash in incomingTransactions) {
            const transaction = incomingTransactions[transactionHash];
            if (transactions.indexOf(transaction) === -1) {
                transactions.push(transaction);
            }
        }
        for (const transactionHash in outgoingTransactions) {
            const transaction = outgoingTransactions[transactionHash];
            if (transactions.indexOf(transaction) === -1) {
                transactions.push(transaction);
            }
        }

        // filtering transactions of spam tokens
        // TODO: This has to be configurable for the user.
        transactions = transactions.filter((transaction: TransactionMeta) => {
            return (
                transaction.transactionReceipt &&
                !isTokenExcluded(
                    chainId,
                    transaction.transactionReceipt?.contractAddress
                )
            );
        });

        transactionsArraysToFilter.forEach(
            (transactionsToFilter: TransactionMeta[]) => {
                transactions = transactions.filter((t1: TransactionMeta) => {
                    return !transactionsToFilter.some((t2: TransactionMeta) => {
                        const h1 = this.pickHash(t1);
                        const h2 = this.pickHash(t2);
                        return h1 && h2 && h1 === h2;
                    });
                });
            }
        );

        return transactions;
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
