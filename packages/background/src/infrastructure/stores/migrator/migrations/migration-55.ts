import { BridgeControllerState } from '@block-wallet/background/controllers/BridgeController';
import { pruneTransaction } from '../../../../controllers/transactions/utils/utils';
import {
    TransactionTypeEnum,
    TransactionWatcherControllerState,
} from '../../../../controllers/TransactionWatcherController';
import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

const pruneBridgeTxs = (
    txs: BridgeControllerState['bridgeReceivingTransactions']
): BridgeControllerState['bridgeReceivingTransactions'] => {
    const newTxs = { ...txs };
    for (const chainId in newTxs) {
        const chainTxs = newTxs[chainId];
        if (chainTxs) {
            for (const addr in chainTxs) {
                const addrTxs = chainTxs[addr];
                if (addrTxs) {
                    newTxs[chainId][addr] = Object.entries(addrTxs).reduce(
                        (acc, [txHash, tx]) => {
                            return {
                                ...acc,
                                [txHash]: pruneTransaction(tx),
                            };
                        },
                        addrTxs
                    );
                }
            }
        }
    }
    return newTxs;
};

const pruneWatchedTxs = (
    txs: TransactionWatcherControllerState['transactions']
): TransactionWatcherControllerState['transactions'] => {
    const newTxs = { ...txs };
    for (const chainId in newTxs) {
        const chainTxs = newTxs[chainId];
        if (chainTxs) {
            for (const addr in chainTxs) {
                const addrTxs = chainTxs[addr];
                if (addrTxs) {
                    for (const type in addrTxs) {
                        const typeTxs = addrTxs[type as TransactionTypeEnum];
                        if (typeTxs && typeTxs.transactions) {
                            newTxs[chainId][addr][
                                type as TransactionTypeEnum
                            ].transactions = Object.entries(
                                typeTxs.transactions
                            ).reduce((acc, [txHash, tx]) => {
                                return {
                                    ...acc,
                                    [txHash]: pruneTransaction(tx),
                                };
                            }, typeTxs.transactions);
                        }
                    }
                }
            }
        }
    }
    return newTxs;
};

/**
 * This migration fixes zksync block explorer
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { transactions } = persistedState.TransactionController;
        const { bridgeReceivingTransactions } = persistedState.BridgeController;
        const { transactions: watchedTx } =
            persistedState.TransactionWatcherControllerState;

        const newTxsState = transactions
            ? transactions.map(pruneTransaction)
            : transactions;

        const newBridgeReceivingTxState = bridgeReceivingTransactions
            ? pruneBridgeTxs(bridgeReceivingTransactions)
            : bridgeReceivingTransactions;

        const newWatchedTxsState = watchedTx
            ? pruneWatchedTxs(watchedTx)
            : watchedTx;

        return {
            ...persistedState,
            TransactionController: {
                ...persistedState.TransactionController,
                transactions: newTxsState,
            },
            BridgeController: {
                ...persistedState.BridgeController,
                bridgeReceivingTransactions: newBridgeReceivingTxState,
            },
            TransactionWatcherControllerState: {
                transactions: newWatchedTxsState,
            },
        };
    },
    version: '0.8.6',
} as IMigration;
