import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
/**
 * This migration adds a new flag to the Preferences settings indicating whether the user has dismissed the gas exceeds threshold warning
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        return {
            ...persistedState,
            PreferencesController: {
                ...persistedState.PreferencesController,
                settings: {
                    ...persistedState.PreferencesController.settings,
                    hideEstimatedGasExceedsThresholdWarning:
                        persistedState.PreferencesController.settings
                            .hideEstimatedGasExceedsThresholdWarning ?? false,
                },
            },
        };
    },
    version: '0.1.28',
} as IMigration;
