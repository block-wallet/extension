import {
    Accounts,
    AccountStatus,
} from '../../../../controllers/AccountTrackerController';
import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

const setAccountStatus = (
    accounts: Accounts,
    status: AccountStatus
): Accounts => {
    return Object.entries(accounts).reduce(
        (acc: Accounts, [key, value]) => ({
            ...acc,
            [key]: {
                ...value,
                status,
            },
        }),
        accounts
    );
};

/**
 * Initiliazes the filter preferences and sets the account status for the hidden and the accounts store.
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const previousValue =
            persistedState.PreferencesController.filters || {};
        return {
            ...persistedState,
            AccountTrackerController: {
                ...persistedState.AccountTrackerController,
                accounts: setAccountStatus(
                    persistedState.AccountTrackerController.accounts,
                    AccountStatus.ACTIVE
                ),
                hiddenAccounts: setAccountStatus(
                    persistedState.AccountTrackerController.hiddenAccounts ||
                        {},
                    AccountStatus.HIDDEN
                ),
            },
            PreferencesController: {
                ...persistedState.PreferencesController,
                filters: {
                    ...previousValue,
                    account: previousValue.account || ['all'],
                },
            },
        };
    },
    version: '0.4.1',
} as IMigration;
