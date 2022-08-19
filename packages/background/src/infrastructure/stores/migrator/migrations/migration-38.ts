import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * Initializes the hideDepositsExternalAccountsWarning flag in the preferences controller.
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        return {
            ...persistedState,
            PreferencesController: {
                ...persistedState.PreferencesController,
                settings: {
                    ...persistedState.PreferencesController.settings,
                    hideDepositsExternalAccountsWarning:
                        persistedState.PreferencesController.settings
                            .hideDepositsExternalAccountsWarning ?? false,
                },
            },
        };
    },
    version: '0.4.5',
} as IMigration;
