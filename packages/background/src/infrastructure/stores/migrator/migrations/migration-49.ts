import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration adds a default configuration related to bridges
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        return {
            ...persistedState,
            PreferencesController: {
                ...persistedState.PreferencesController,
                settings: {
                    ...persistedState.PreferencesController.settings,
                    hideBridgeInsufficientNativeTokenWarning:
                        persistedState.PreferencesController.settings
                            .hideBridgeInsufficientNativeTokenWarning ?? false,
                },
            },
        };
    },
    version: '0.8.0',
} as IMigration;
