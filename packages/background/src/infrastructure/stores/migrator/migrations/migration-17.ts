import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';
/**
 * This migration adds support to the anti phishing image
 */
export default {
    migrate: async (
        persistedState: BlankAppState
    ): Promise<Partial<BlankAppState>> => {
        return {
            ...persistedState,
            PreferencesController: {
                ...persistedState.PreferencesController,
                settings: {
                    ...persistedState.PreferencesController.settings,
                    //disabled until we want to enable it
                    useAntiPhishingProtection:
                        persistedState.PreferencesController.settings
                            .useAntiPhishingProtection ?? false,
                },
                antiPhishingImage: '', // REMOVED ON MV3 MIGRATION
                // await generatePhishingPrevention(
                //     createUuid(),
                //     175
                // ),
            },
        };
    },
    version: '0.1.24',
} as IMigration;
