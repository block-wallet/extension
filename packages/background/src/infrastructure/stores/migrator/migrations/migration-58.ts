import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration adds the allowances initial state for all the persisted active and hidden accounts.
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { accounts, hiddenAccounts } =
            persistedState.AccountTrackerController;

        return {
            ...persistedState,
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
