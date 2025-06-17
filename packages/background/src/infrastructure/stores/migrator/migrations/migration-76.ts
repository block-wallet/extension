import { BlankAppState } from '../../../../utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * This migration adds theme preference support to user settings
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const { settings } = persistedState.PreferencesController;

        // Add theme property to existing settings if it doesn't exist
        const updatedSettings = {
            ...settings,
            theme: 'system' as 'light' | 'dark' | 'system',
        };

        return {
            ...persistedState,
            PreferencesController: {
                ...persistedState.PreferencesController,
                settings: updatedSettings,
            },
        };
    },
    version: '1.1.26',
} as IMigration;
