import { TransactionWatcherControllerState } from '../../../../controllers/TransactionWatcherController';
import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { WatchedTransactionType } from '../../../../controllers/transactions/utils/types';

/**
 * This migration adds the allowances initial state for all the persisted active and hidden accounts.
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { transactions } =
            persistedState.TransactionWatcherControllerState;
        const { accounts, hiddenAccounts } =
            persistedState.AccountTrackerController;

        const newWatchedTxs: TransactionWatcherControllerState['transactions'] =
            {
                ...Object.entries(transactions).reduce(
                    (acc, [chainId, accountTxs]) => {
                        return {
                            ...acc,
                            [chainId]: {
                                ...Object.entries(accountTxs).reduce(
                                    (acc, [address, watchedTxsByType]) => {
                                        return {
                                            ...acc,
                                            [address]: {
                                                ...(watchedTxsByType || {}),
                                                [WatchedTransactionType.Native]:
                                                    {
                                                        transactions: {},
                                                        lastBlockQueried: 0,
                                                    },
                                            },
                                        };
                                    },
                                    accountTxs[chainId]
                                ),
                            },
                        };
                    },
                    transactions
                ),
            };

        return {
            ...persistedState,
            TransactionWatcherControllerState: {
                transactions: newWatchedTxs,
                tokenAllowanceEvents: {},
            },
            AccountTrackerController: {
                ...persistedState.AccountTrackerController,
                accounts: Object.keys(accounts).reduce((acc, address) => {
                    return {
                        ...acc,
                        [address]: {
                            ...accounts[address],
                            allowances: {},
                        },
                    };
                }, accounts),
                hiddenAccounts: Object.keys(hiddenAccounts).reduce(
                    (acc, address) => {
                        return {
                            ...acc,
                            [address]: {
                                ...hiddenAccounts[address],
                                allowances: {},
                            },
                        };
                    },
                    hiddenAccounts
                ),
            },
        };
    },
    version: '1.1.0',
} as IMigration;
