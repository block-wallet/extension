import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration forces the calculation of the EIP1559 compatibility to some networks
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        return {
            ...persistedState,
            PreferencesController: {
                ...persistedState.PreferencesController,
                tokensSortValue: 'CUSTOM',
            },
            AccountTrackerController: {
                ...persistedState.AccountTrackerController,
                accountTokensOrder: {},
            },
        };
    },
    version: '1.1.12',
} as IMigration;
