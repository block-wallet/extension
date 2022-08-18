import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * Creates the hidden accounts object in the state if it doesn't exists
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        return {
            ...persistedState,
            AccountTrackerController: {
                ...persistedState.AccountTrackerController,
                hiddenAccounts:
                    persistedState.AccountTrackerController.hiddenAccounts ||
                    {},
            },
        };
    },
    version: '0.4.0',
} as IMigration;
