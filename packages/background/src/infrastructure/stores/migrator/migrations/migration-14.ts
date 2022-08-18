import { ReleaseNote } from '@block-wallet/background/controllers/PreferencesController';
import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * Add the release notes default state configurations
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        const userPreferences = persistedState.PreferencesController;
        return {
            ...persistedState,
            PreferencesController: {
                ...userPreferences,
                settings: {
                    ...userPreferences.settings,
                    subscribedToReleaseaNotes:
                        userPreferences.settings.subscribedToReleaseaNotes ??
                        true, //do not override this if this already set.
                },
                releaseNotesSettings: {
                    lastVersionUserSawNews:
                        userPreferences.releaseNotesSettings
                            ?.lastVersionUserSawNews ?? '0.1.3', //do not override this if this already set. Fixed version is 0.1.2 before this feature is implemented
                    latestReleaseNotes: [] as ReleaseNote[], //don't care about this, this is gonna be recalculated anyway
                },
            },
        };
    },
    version: '0.1.21',
} as IMigration;
