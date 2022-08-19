import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * Refreshes the anti phishing image with the updated version of the library
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        return {
            ...persistedState,
            PreferencesController: {
                ...persistedState.PreferencesController,
                settings: {
                    ...persistedState.PreferencesController.settings,
                    // enable for launch of this feature
                    useAntiPhishingProtection: true,
                },
                antiPhishingImage: '', // REMOVED ON MV3 migration
                // await generatePhishingPrevention(
                //     createUuid(),
                //     175
                // ),
            },
        };
    },
    version: '0.1.33',
} as IMigration;
