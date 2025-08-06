import { BlankAppState } from '@block-wallet/background/utils/constants/initialState';
import { IMigration } from '../IMigration';

/**
 * Adds enableTransactionSimulation flag defaulting to true
 */
export default {
    migrate: async (persistedState: BlankAppState) => {
        return {
            ...persistedState,
            PreferencesController: {
                ...persistedState.PreferencesController,
                settings: {
                    ...persistedState.PreferencesController.settings,
                    enableTransactionSimulation:
                        (persistedState.PreferencesController.settings as any)
                            .enableTransactionSimulation !== undefined
                            ? (persistedState.PreferencesController.settings as any)
                                  .enableTransactionSimulation
                            : true,
                },
            },
        } as BlankAppState;
    },
    version: '0.1.99',
} as IMigration;


