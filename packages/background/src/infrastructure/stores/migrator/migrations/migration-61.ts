import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration adds the subscribedToNotifications flag with true value to the user preferences
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        return {
            ...persistedState,
            PreferencesController: {
                ...persistedState.PreferencesController,
                settings: {
                    ...persistedState.PreferencesController.settings,

                    subscribedToNotifications:
                        persistedState.PreferencesController.settings
                            .subscribedToNotifications ?? true,
                },
            },
        };
    },
    version: '1.1.1',
} as IMigration;
