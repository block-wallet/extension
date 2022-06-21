import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
/**
 * This migration adds a new flag to the Preferences settings indicating whether to inject BlockWallet as the default wallet or not
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        return {
            ...persistedState,
            PreferencesController: {
                ...persistedState.PreferencesController,
                settings: {
                    ...persistedState.PreferencesController.settings,
                    defaultBrowserWallet:
                        persistedState.PreferencesController.settings
                            .defaultBrowserWallet ?? true,
                },
            },
        };
    },
    version: '0.1.29',
} as IMigration;
