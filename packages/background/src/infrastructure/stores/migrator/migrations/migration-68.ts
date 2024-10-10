import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration adds a default configuration related to net worth
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        return {
            ...persistedState,
            PreferencesController: {
                ...persistedState.PreferencesController,
                settings: {
                    ...persistedState.PreferencesController.settings,
                    displayNetWorth:
                        persistedState.PreferencesController.settings
                            .displayNetWorth ?? true,
                },
            },
        };
    },
    version: '1.1.10',
} as IMigration;
