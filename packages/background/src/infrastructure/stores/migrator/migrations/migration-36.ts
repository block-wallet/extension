import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
import { AccountType } from '../../../../controllers/AccountTrackerController';

/**
 * Run migrations to set the account type using the external boolean. Also, get rid of the external property.
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const previousValue = persistedState.AccountTrackerController.accounts;
        return {
            ...persistedState,
            AccountTrackerController: {
                ...persistedState.AccountTrackerController,
                accounts: Object.entries(previousValue).reduce(
                    (acc, [address, account]) => {
                        let newAccount = { ...account };
                        if ((account as any).external) {
                            newAccount = {
                                ...newAccount,
                                accountType: AccountType.EXTERNAL,
                            };
                        } else {
                            newAccount = {
                                ...account,
                                accountType:
                                    account.accountType ||
                                    AccountType.HD_ACCOUNT,
                            };
                        }
                        delete (newAccount as any).external;
                        return {
                            ...acc,
                            [address]: newAccount,
                        };
                    },
                    previousValue
                ),
            },
        };
    },
    version: '0.4.3',
} as IMigration;
