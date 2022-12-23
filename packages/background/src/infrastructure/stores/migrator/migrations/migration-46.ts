import { TransactionTypeEnum } from '../../../../controllers/TransactionWatcherController';
import { BigNumber } from '@ethersproject/bignumber';
import { BlankAppState } from '../../../../utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * Fixes incoming transactions statuses and values
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const transactionsByChain =
            persistedState.TransactionWatcherControllerState.transactions;

        for (const chainId in transactionsByChain) {
            const transactionsByAccount = transactionsByChain[chainId] || {};
            for (const account in transactionsByAccount) {
                const transactionsByType = transactionsByAccount[account] || {};
                for (const type in transactionsByType) {
                    const transactions =
                        transactionsByType[type as TransactionTypeEnum];
                    if (
                        type !== TransactionTypeEnum.Native &&
                        transactions &&
                        transactions.transactions
                    ) {
                        for (const hash in transactions.transactions) {
                            const tx = transactions.transactions[hash];
                            if (tx && tx.transactionParams) {
                                tx.transactionParams.value = BigNumber.from(0);
                            }
                        }
                    }
                }
            }
        }

        return {
            ...persistedState,
            TransactionWatcherControllerState: {
                ...persistedState.TransactionWatcherControllerState,
                transactions: transactionsByChain,
            },
        };
    },
    version: '0.7.4',
} as IMigration;
